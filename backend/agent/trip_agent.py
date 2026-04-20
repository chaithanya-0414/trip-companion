"""
TripSync AI — LangChain Agent
Handles all natural language trip management commands.
"""

import os
import json
import contextvars
from typing import Optional
from dotenv import load_dotenv

from langchain_groq import ChatGroq
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain.tools import tool
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage

load_dotenv()

from services import firebase_service as fb
from services.settlement_engine import calculate_settlements, get_expense_summary

# ─── LLM ──────────────────────────────────────────────────────────────────────
llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=0.3,
)

# ─── Session history store (list of BaseMessage, max 20 messages per session) ─
_session_histories: dict = {}

def _get_history(session_id: str) -> list:
    return _session_histories.setdefault(session_id, [])


# ─── Per-request context (thread-safe via ContextVar) ─────────────────────────
# Fix: was a plain module-level dict that concurrent async requests would overwrite.
# ContextVar gives each asyncio task its own isolated copy.
_ctx_var: contextvars.ContextVar[dict] = contextvars.ContextVar("trip_ctx", default={})


# ─── Sync itinerary generator (for use inside @tool) ─────────────────────────
# Fix: the tool previously called asyncio.run() which raises RuntimeError when
# an event loop is already running (FastAPI's). llm.invoke() is sync and safe here.
def _generate_itinerary_sync(
    destination: str,
    duration_days: int,
    group_size: int,
    budget_per_person: Optional[float] = None,
    preferences: Optional[str] = None,
    start_date: Optional[str] = None,
) -> list:
    budget_str = f"₹{budget_per_person} per person" if budget_per_person else "flexible budget"
    pref_str = preferences or "general sightseeing, food, relaxation"

    prompt = f"""Create a detailed {duration_days}-day travel itinerary for a group of {group_size} people visiting {destination}.
Budget: {budget_str}
Preferences: {pref_str}
Start Date: {start_date or 'flexible'}

Return a JSON array of day objects. Each day object must have:
- day (integer, 1-indexed)
- date (string, YYYY-MM-DD or null)
- location (string)
- theme (string, brief theme for the day)
- travel_notes (string or null)
- activities (array of objects with: time, activity, type, notes, cost_estimate)

Activity types: breakfast, lunch, dinner, travel, attraction, stay, misc

Keep activities realistic and balanced — avoid overpacking.
For groups: suggest group-friendly venues, pre-bookings, and cost-saving tips.

Return ONLY the JSON array, no markdown.
"""

    response = llm.invoke([HumanMessage(content=prompt)])
    content = response.content.strip()

    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
        content = content.strip()

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return [
            {
                "day": i, "date": None, "location": destination,
                "theme": f"Day {i} Exploration",
                "activities": [
                    {"time": "08:00", "activity": "Breakfast", "type": "breakfast", "notes": None, "cost_estimate": None},
                    {"time": "10:00", "activity": "Explore local attractions", "type": "attraction", "notes": None, "cost_estimate": None},
                    {"time": "13:00", "activity": "Lunch", "type": "lunch", "notes": None, "cost_estimate": None},
                    {"time": "15:00", "activity": "Afternoon activity", "type": "misc", "notes": None, "cost_estimate": None},
                    {"time": "19:00", "activity": "Dinner", "type": "dinner", "notes": None, "cost_estimate": None},
                ],
                "travel_notes": None,
            }
            for i in range(1, duration_days + 1)
        ]


# ─── Tools ────────────────────────────────────────────────────────────────────

@tool
def add_expense(amount: float, paid_by: str, category: str, description: str = "", proof_url: str = "", day: int = None) -> str:
    """
    Add a new expense to the trip.
    amount: The numeric amount spent (e.g. 1200.50). MUST be a number, not a string.
    category: One of food, travel, stay, misc, activity.
    paid_by: Name of the person who paid.
    """
    ctx = _ctx_var.get()
    valid_cats = {"food", "travel", "stay", "misc", "activity"}
    if category not in valid_cats:
        return f"❌ Invalid category '{category}'. Choose from: {', '.join(valid_cats)}."
    if amount <= 0:
        return "❌ Amount must be greater than 0."

    trip_id = ctx.get("trip_id", "default")
    expense_id = fb.add_expense({
        "tripId": trip_id,
        "amount": amount,
        "paidBy": paid_by,
        "category": category,
        "description": description,
        "proofUrl": proof_url,
        "day": day,
        "addedBy": ctx.get("uid", "agent"),
    })
    return (
        f"✅ Expense Added\n"
        f"  Amount: ₹{amount}\n"
        f"  Paid by: {paid_by}\n"
        f"  Category: {category}\n"
        f"  Description: {description or 'N/A'}\n"
        f"  Proof: {'Yes' if proof_url else 'No'}\n"
        f"  Status: Pending Approval\n"
        f"  Expense ID: {expense_id}"
    )


@tool
def get_expenses(category: str = "", paid_by: str = "") -> str:
    """
    Retrieve all expenses for the current trip.
    Optionally filter by category (food/travel/stay/misc/activity) or paid_by (person name).
    """
    ctx = _ctx_var.get()
    trip_id = ctx.get("trip_id", "default")
    filters = {}
    if category:
        filters["category"] = category
    if paid_by:
        filters["paid_by"] = paid_by

    expenses = fb.get_expenses(filters)
    expenses = [e for e in expenses if e.get("tripId") == trip_id]

    if not expenses:
        return "No expenses found for the given filters."

    lines = [f"📊 Found {len(expenses)} expense(s):\n"]
    total = 0
    for e in expenses:
        total += e.get("amount", 0)
        lines.append(
            f"  • ₹{e['amount']} — {e.get('paidBy','?')} [{e.get('category','misc')}] "
            f"({e.get('status','pending')}) {e.get('description','')}"
        )
    lines.append(f"\n  💰 Total: ₹{round(total, 2)}")
    return "\n".join(lines)


@tool
def calculate_splits(no_input: str = "") -> str:
    """
    Calculate how group expenses should be split and who owes whom.
    Shows optimized settlement transactions to minimize number of transfers.
    """
    ctx = _ctx_var.get()
    trip_id = ctx.get("trip_id", "default")
    expenses = fb.get_expenses()
    expenses = [e for e in expenses if e.get("tripId") == trip_id]

    if not expenses:
        return "No expenses to split yet."

    summary = get_expense_summary(expenses)
    settlements = calculate_settlements(expenses)
    fb.save_settlements(trip_id, settlements)

    lines = [
        f"⚖️ Settlement Summary\n",
        f"  Total Spent: ₹{summary['total']}",
        f"  Expenses: {summary['count']}",
        f"  Per Person Share: ₹{summary['per_person']}",
        f"  Highest Spender: {summary['highest_spender']} (₹{summary['highest_spender_amount']})\n",
        f"  Category Breakdown:",
    ]
    for cat, amt in summary.get("category_breakdown", {}).items():
        lines.append(f"    {cat}: ₹{amt}")

    lines.append(f"\n  🔄 Optimized Settlements:")
    if not settlements:
        lines.append("  ✅ All expenses are evenly split — no transfers needed!")
    for s in settlements:
        status = "✅ Settled" if s.get("settled") else "⏳ Pending"
        lines.append(f"    {s['from']} → {s['to']}: ₹{s['amount']} [{status}]")

    return "\n".join(lines)


@tool
def create_itinerary(destination: str, duration_days: int, group_size: int, budget_per_person: float = 0, preferences: str = "", start_date: str = "") -> str:
    """
    Generate a detailed day-wise itinerary for a group trip.
    destination: City or region name.
    duration_days: Number of days (integer, e.g. 7). MUST be a pure number.
    group_size: Number of people (integer, e.g. 15). MUST be a pure number.
    budget_per_person: Budget per person in INR (float, e.g. 50000). 0 = no limit.
    preferences: Comma-separated preferences.
    start_date: Optional start date in YYYY-MM-DD format.
    """
    ctx = _ctx_var.get()
    trip_id = ctx.get("trip_id", "default")
    plan = _generate_itinerary_sync(
        destination=destination,
        duration_days=duration_days,
        group_size=group_size,
        budget_per_person=budget_per_person if budget_per_person else None,
        preferences=preferences,
        start_date=start_date,
    )
    fb.save_itinerary(trip_id, plan)
    lines = [f"🗺️ {duration_days}-Day {destination} Itinerary for {group_size} people\n"]
    for day in plan[:3]:
        lines.append(f"  Day {day['day']} — {day['location']}")
        for act in day.get("activities", [])[:3]:
            lines.append(f"    {act['time']}: {act['activity']}")
    if len(plan) > 3:
        lines.append(f"\n  ... and {len(plan) - 3} more days. View full itinerary in the Itinerary tab.")
    return "\n".join(lines)


@tool
def get_itinerary(no_input: str = "") -> str:
    """Retrieve the current trip itinerary."""
    ctx = _ctx_var.get()
    trip_id = ctx.get("trip_id", "default")
    data = fb.load_itinerary(trip_id)
    if not data or not data.get("plan"):
        return "No itinerary found. Use create_itinerary to generate one."
    plan = data["plan"]
    lines = [f"🗺️ Trip Itinerary ({len(plan)} days)\n"]
    for day in plan:
        lines.append(f"📅 Day {day['day']} — {day.get('location', '?')} ({day.get('theme', '')})")
        for act in day.get("activities", []):
            lines.append(f"   {act.get('time','')}: {act.get('activity','')}")
        lines.append("")
    return "\n".join(lines)


@tool
def update_itinerary(day: int, changes: str) -> str:
    """
    Update a specific day in the itinerary.
    Only admins can use this.
    changes: JSON string of changes to apply to that day.
    day: Day number to update (1-indexed).
    """
    ctx = _ctx_var.get()
    if ctx.get("role", "user") != "admin":
        return "❌ Only admins can update the itinerary."
    trip_id = ctx.get("trip_id", "default")
    try:
        changes_dict = json.loads(changes) if isinstance(changes, str) else changes
        fb.update_itinerary_day(trip_id, day, changes_dict)
        return f"✅ Day {day} itinerary updated successfully."
    except Exception as e:
        return f"❌ Failed to update: {str(e)}"


@tool
def approve_expense(expense_id: str) -> str:
    """
    Approve a pending expense by its ID. Only admins can approve.
    expense_id: The unique ID of the expense to approve.
    """
    ctx = _ctx_var.get()
    if ctx.get("role", "user") != "admin":
        return "❌ Only admins can approve expenses."
    expense = fb.get_expense_by_id(expense_id)
    if not expense:
        return f"❌ Expense {expense_id} not found."
    fb.update_expense_status(expense_id, "approved")
    return f"✅ Expense {expense_id} approved.\n  Amount: ₹{expense.get('amount')}\n  Paid by: {expense.get('paidBy')}"


@tool
def reject_expense(expense_id: str) -> str:
    """
    Reject a pending expense by its ID. Only admins can reject.
    expense_id: The unique ID of the expense to reject.
    """
    ctx = _ctx_var.get()
    if ctx.get("role", "user") != "admin":
        return "❌ Only admins can reject expenses."
    expense = fb.get_expense_by_id(expense_id)
    if not expense:
        return f"❌ Expense {expense_id} not found."
    fb.update_expense_status(expense_id, "rejected")
    return f"🚫 Expense {expense_id} rejected.\n  Amount: ₹{expense.get('amount')}\n  Paid by: {expense.get('paidBy')}"


@tool
def get_users(no_input: str = "") -> str:
    """List all members of the trip group."""
    users = fb.get_all_users()
    if not users:
        return "No members found in the group."
    lines = [f"👥 Group Members ({len(users)} total)\n"]
    for u in users:
        lines.append(f"  • {u.get('name','?')} ({u.get('email','?')}) — Role: {u.get('role','user')}")
    return "\n".join(lines)


# ─── Agent setup ──────────────────────────────────────────────────────────────

TOOLS = [
    add_expense,
    get_expenses,
    calculate_splits,
    create_itinerary,
    get_itinerary,
    update_itinerary,
    approve_expense,
    reject_expense,
    get_users,
]

SYSTEM_PROMPT = """You are TripSync AI — a friendly, smart group travel companion chatbot.

You help groups of people manage their trips: expenses, itineraries, settlements, and logistics.
You work on both a web app AND a WhatsApp bot, so you must handle natural, conversational language.

## How to respond:

### For trip actions → USE THE APPROPRIATE TOOL:
| What the user says (examples) | Tool to call |
|---|---|
| "add 500 for lunch", "I paid ₹1200 for hotel", "spent 800 on fuel" | add_expense |
| "show expenses", "what did we spend", "list all costs" | get_expenses |
| "who owes whom", "calculate split", "how do we settle", "settlements" | calculate_splits |
| "plan a trip to Goa", "create itinerary for 5 days", "make a 3-day plan" | create_itinerary |
| "show itinerary", "what's the plan", "day 2 activities" | get_itinerary |
| "update day 3", "change day 1 activities" | update_itinerary |
| "approve expense X", "ok expense X" | approve_expense |
| "reject expense X", "cancel expense X" | reject_expense |
| "who's in the group", "list members", "team members" | get_users |

### For general conversation → answer naturally WITHOUT tools:
- Greetings ("hi", "thanks", "great") → respond warmly
- General travel questions ("best time to visit Goa?") → answer from knowledge
- Trip advice ("what should we pack?") → give helpful suggestions
- Anything NOT requiring the database → respond conversationally

## Input understanding:
- "500 for dinner by Rahul" → amount=500, category="food", paid_by="Rahul", description="dinner"
- "plan Manali 7 days 12 people 5000 budget" → destination="Manali", duration_days=7, group_size=12, budget_per_person=5000
- "Riya paid 2000 for hotel" → amount=2000, category="stay", paid_by="Riya"
- If required info is genuinely missing (e.g. no amount given for expense), ask ONE clear question

## Rules:
1. Use tools ONLY for actual data operations — never fabricate data.
2. Pass numeric args as pure numbers (7, not "7 days").
3. Admin role = full access. Non-admin = cannot approve/reject/update itinerary.
4. After every tool call, confirm clearly what was done.
5. Keep responses concise — no unnecessary walls of text.
6. Use emojis tastefully for clarity and friendliness.

## Expense categories: food | travel | stay | misc | activity

Current user role: {user_role}
Trip ID: {trip_id}
"""

def _build_agent(user_role: str, trip_id: str) -> AgentExecutor:
    system_content = SYSTEM_PROMPT.format(user_role=user_role, trip_id=trip_id)
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_content),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])
    agent = create_tool_calling_agent(llm, TOOLS, prompt)
    return AgentExecutor(
        agent=agent,
        tools=TOOLS,
        verbose=False,
        max_iterations=6,
        handle_parsing_errors="Parsing error — please restate your request clearly.",
        return_intermediate_steps=True,
    )


async def get_agent_response(
    message: str,
    session_id: str,
    user_uid: str,
    user_role: str = "user",
    trip_id: str = "default",
) -> dict:
    """Main entry point for the agent."""
    _ctx_var.set({"uid": user_uid, "role": user_role, "trip_id": trip_id or "default"})

    agent_executor = _build_agent(user_role, trip_id or "default")
    history = _get_history(session_id)

    try:
        result = await agent_executor.ainvoke({
            "input": message,
            "chat_history": history,
        })

        output = result.get("output", "")

        # Update history, keep last 20 messages (10 exchanges)
        history.append(HumanMessage(content=message))
        history.append(AIMessage(content=output))
        _session_histories[session_id] = history[-20:]

        tool_calls = []
        for step in result.get("intermediate_steps", []):
            if isinstance(step, tuple) and len(step) == 2:
                action, observation = step
                tool_calls.append({
                    "tool": getattr(action, "tool", ""),
                    "input": getattr(action, "tool_input", {}),
                    "output": str(observation),
                })

        return {"output": output, "tool_calls": tool_calls}
    except Exception as e:
        return {"output": f"❌ Agent error: {str(e)}", "tool_calls": []}


async def generate_itinerary_with_agent(
    destination: str,
    duration_days: int,
    group_size: int,
    budget_per_person: Optional[float] = None,
    preferences: Optional[str] = None,
    start_date: Optional[str] = None,
) -> list:
    """Generate a structured itinerary using the LLM directly (async, for router use)."""
    budget_str = f"₹{budget_per_person} per person" if budget_per_person else "flexible budget"
    pref_str = preferences or "general sightseeing, food, relaxation"

    prompt = f"""Create a detailed {duration_days}-day travel itinerary for a group of {group_size} people visiting {destination}.
Budget: {budget_str}
Preferences: {pref_str}
Start Date: {start_date or 'flexible'}

Return a JSON array of day objects. Each day object must have:
- day (integer, 1-indexed)
- date (string, YYYY-MM-DD or null)
- location (string)
- theme (string, brief theme for the day)
- travel_notes (string or null)
- activities (array of objects with: time, activity, type, notes, cost_estimate)

Activity types: breakfast, lunch, dinner, travel, attraction, stay, misc

Keep activities realistic and balanced — avoid overpacking.
For groups: suggest group-friendly venues, pre-bookings, and cost-saving tips.

Return ONLY the JSON array, no markdown.
"""

    response = await llm.ainvoke([HumanMessage(content=prompt)])
    content = response.content.strip()

    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
        content = content.strip()

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return [
            {
                "day": i, "date": None, "location": destination,
                "theme": f"Day {i} Exploration",
                "activities": [
                    {"time": "08:00", "activity": "Breakfast", "type": "breakfast", "notes": None, "cost_estimate": None},
                    {"time": "10:00", "activity": "Explore local attractions", "type": "attraction", "notes": None, "cost_estimate": None},
                    {"time": "13:00", "activity": "Lunch", "type": "lunch", "notes": None, "cost_estimate": None},
                    {"time": "15:00", "activity": "Afternoon activity", "type": "misc", "notes": None, "cost_estimate": None},
                    {"time": "19:00", "activity": "Dinner", "type": "dinner", "notes": None, "cost_estimate": None},
                ],
                "travel_notes": None,
            }
            for i in range(1, duration_days + 1)
        ]
