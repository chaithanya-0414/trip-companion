"""
Smart Settlement Engine
Minimizes the number of transactions required to settle debts in a group.
Uses the classic "min-transactions" greedy algorithm.
"""

from typing import List, Dict


def calculate_settlements(expenses: List[Dict]) -> List[Dict]:
    """
    Given a list of expenses, calculate who owes whom and how much.
    Returns optimized transactions that minimize the number of transfers.

    Each expense: { "amount": float, "paidBy": str, "splitAmong": list[str], ... }
    Fix: previously only collected participants from paidBy, ignoring splitAmong,
    so members who never paid anything were excluded from settlement calculations.
    """
    valid = [e for e in expenses if e.get("status") != "rejected"]
    if not valid:
        return []

    # Build net balance per person: positive = owed money, negative = owes money
    balance: Dict[str, float] = {}

    for e in valid:
        payer = e.get("paidBy", "Unknown")
        amount = e.get("amount", 0)
        split_among = e.get("splitAmong") or e.get("split_among") or []

        if not split_among:
            # No split list — cost falls only on payer, no debt created
            balance.setdefault(payer, 0)
            continue

        per_person = amount / len(split_among)

        # Payer is credited the full amount
        balance[payer] = balance.get(payer, 0) + amount

        # Each member in splitAmong is debited their share
        for person in split_among:
            balance[person] = balance.get(person, 0) - per_person

    balance = {p: round(v, 2) for p, v in balance.items()}
    return _minimize_transactions(balance)


def _minimize_transactions(balance: Dict[str, float]) -> List[Dict]:
    """
    Greedy algorithm to minimize the number of transactions.
    Sorts creditors and debtors and matches them greedily.
    """
    creditors = []  # (person, amount_owed_to_them)
    debtors = []    # (person, amount_they_owe)

    for person, net in balance.items():
        if net > 0.01:
            creditors.append([person, net])
        elif net < -0.01:
            debtors.append([person, -net])

    creditors.sort(key=lambda x: -x[1])
    debtors.sort(key=lambda x: -x[1])

    transactions = []
    i, j = 0, 0

    while i < len(creditors) and j < len(debtors):
        creditor, credit_amt = creditors[i]
        debtor, debt_amt = debtors[j]

        transfer = min(credit_amt, debt_amt)
        transactions.append({
            "from": debtor,
            "to": creditor,
            "amount": round(transfer, 2),
            "settled": False,
        })

        creditors[i][1] -= transfer
        debtors[j][1] -= transfer

        if creditors[i][1] < 0.01:
            i += 1
        if debtors[j][1] < 0.01:
            j += 1

    return transactions


def get_expense_summary(expenses: List[Dict]) -> Dict:
    """Returns summary stats for a list of expenses."""
    valid = [e for e in expenses if e.get("status") != "rejected"]
    if not valid:
        return {
            "total": 0,
            "count": 0,
            "highest_spender": None,
            "highest_spender_amount": 0,
            "category_breakdown": {},
            "per_person": 0,
            "participant_spending": {},
        }

    total = sum(e.get("amount", 0) for e in valid)
    paid_map: Dict[str, float] = {}
    category_map: Dict[str, float] = {}
    all_participants: set = set()

    for e in valid:
        payer = e.get("paidBy", "Unknown")
        paid_map[payer] = paid_map.get(payer, 0) + e.get("amount", 0)
        cat = e.get("category", "misc")
        category_map[cat] = category_map.get(cat, 0) + e.get("amount", 0)
        split_among = e.get("splitAmong") or e.get("split_among") or []
        all_participants.add(payer)
        all_participants.update(split_among)

    n = len(all_participants) if all_participants else 1
    highest_spender = max(paid_map, key=paid_map.get) if paid_map else None

    return {
        "total": round(total, 2),
        "count": len(valid),
        "highest_spender": highest_spender,
        "highest_spender_amount": round(paid_map.get(highest_spender, 0), 2),
        "category_breakdown": {k: round(v, 2) for k, v in category_map.items()},
        "per_person": round(total / n, 2),
        "participant_spending": {k: round(v, 2) for k, v in paid_map.items()},
    }
