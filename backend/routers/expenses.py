"""Expenses router — add, list, approve, reject."""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from models.schemas import ExpenseCreate
from services import firebase_service as fb
from routers.deps import get_current_user, require_admin

router = APIRouter()


@router.post("/add")
async def add_expense(data: ExpenseCreate, user=Depends(get_current_user)):
    try:
        expense_id = fb.add_expense({
            "tripId": data.trip_id,
            "amount": data.amount,
            "paidBy": data.paid_by,
            "category": data.category,
            "description": data.description,
            "proofUrl": data.proof_url,
            "day": data.day,
            "addedBy": user["uid"],
        })
        return {
            "success": True,
            "expense_id": expense_id,
            "message": f"✅ Expense of ₹{data.amount} added. Status: Pending approval.",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("")
async def get_expenses(
    trip_id: str = Query(...),
    category: Optional[str] = Query(None),
    paid_by: Optional[str] = Query(None),
    user=Depends(get_current_user),
):
    try:
        expenses = fb.get_expenses({"category": category, "paid_by": paid_by})
        # Filter by trip
        expenses = [e for e in expenses if e.get("tripId") == trip_id]
        return {"expenses": expenses, "count": len(expenses)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{expense_id}/approve")
async def approve_expense(expense_id: str, admin=Depends(require_admin)):
    expense = fb.get_expense_by_id(expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found.")
    fb.update_expense_status(expense_id, "approved")
    return {"success": True, "expense_id": expense_id, "status": "approved"}


@router.put("/{expense_id}/reject")
async def reject_expense(expense_id: str, admin=Depends(require_admin)):
    expense = fb.get_expense_by_id(expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found.")
    fb.update_expense_status(expense_id, "rejected")
    return {"success": True, "expense_id": expense_id, "status": "rejected"}
