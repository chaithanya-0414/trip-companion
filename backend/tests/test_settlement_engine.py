"""Unit tests for the settlement calculation engine."""

import pytest
from services.settlement_engine import calculate_settlements, get_expense_summary


# ─── calculate_settlements ────────────────────────────────────────────────────

def test_empty_expenses_returns_no_settlements():
    assert calculate_settlements([]) == []


def test_all_rejected_returns_no_settlements():
    expenses = [
        {"amount": 300, "paidBy": "Alice", "splitAmong": ["Alice", "Bob"], "status": "rejected"},
    ]
    assert calculate_settlements(expenses) == []


def test_simple_two_person_split():
    # Alice paid 200 for both → Bob owes Alice 100
    expenses = [
        {"amount": 200, "paidBy": "Alice", "splitAmong": ["Alice", "Bob"], "status": "approved"},
    ]
    result = calculate_settlements(expenses)
    assert len(result) == 1
    assert result[0]["from"] == "Bob"
    assert result[0]["to"] == "Alice"
    assert result[0]["amount"] == 100.0
    assert result[0]["settled"] is False


def test_equal_payers_no_settlement():
    # Alice and Bob each paid 100 for each other → net zero
    expenses = [
        {"amount": 200, "paidBy": "Alice", "splitAmong": ["Alice", "Bob"], "status": "approved"},
        {"amount": 200, "paidBy": "Bob",   "splitAmong": ["Alice", "Bob"], "status": "approved"},
    ]
    result = calculate_settlements(expenses)
    assert result == []


def test_three_person_minimized_transactions():
    # Alice paid 300 for all three
    # Each owes 100; Alice net +200, Bob net -100, Charlie net -100
    expenses = [
        {"amount": 300, "paidBy": "Alice", "splitAmong": ["Alice", "Bob", "Charlie"], "status": "approved"},
    ]
    result = calculate_settlements(expenses)
    assert len(result) == 2
    froms = {t["from"] for t in result}
    assert froms == {"Bob", "Charlie"}
    for t in result:
        assert t["to"] == "Alice"
        assert t["amount"] == 100.0


def test_rejected_expenses_excluded():
    expenses = [
        {"amount": 300, "paidBy": "Alice", "splitAmong": ["Alice", "Bob"], "status": "approved"},
        {"amount": 200, "paidBy": "Charlie", "splitAmong": ["Alice", "Bob", "Charlie"], "status": "rejected"},
    ]
    result = calculate_settlements(expenses)
    # Only the 300 expense counts
    assert len(result) == 1
    assert result[0]["from"] == "Bob"
    assert result[0]["to"] == "Alice"
    assert result[0]["amount"] == 150.0


def test_no_split_among_creates_no_debt():
    # Expense with no splitAmong — payer bears it alone, no debt
    expenses = [
        {"amount": 500, "paidBy": "Alice", "splitAmong": [], "status": "approved"},
    ]
    result = calculate_settlements(expenses)
    assert result == []


def test_pending_expenses_included():
    # pending status should count (only rejected is excluded)
    expenses = [
        {"amount": 200, "paidBy": "Alice", "splitAmong": ["Alice", "Bob"], "status": "pending"},
    ]
    result = calculate_settlements(expenses)
    assert len(result) == 1
    assert result[0]["from"] == "Bob"
    assert result[0]["amount"] == 100.0


def test_fractional_amounts_rounded():
    # 100 split among 3 → 33.33... each
    expenses = [
        {"amount": 100, "paidBy": "Alice", "splitAmong": ["Alice", "Bob", "Charlie"], "status": "approved"},
    ]
    result = calculate_settlements(expenses)
    for t in result:
        # amounts should be rounded to 2 decimal places
        assert t["amount"] == round(t["amount"], 2)


# ─── get_expense_summary ─────────────────────────────────────────────────────

def test_summary_empty():
    summary = get_expense_summary([])
    assert summary["total"] == 0
    assert summary["count"] == 0
    assert summary["highest_spender"] is None


def test_summary_all_rejected():
    expenses = [
        {"amount": 500, "paidBy": "Alice", "category": "food", "status": "rejected", "splitAmong": []},
    ]
    summary = get_expense_summary(expenses)
    assert summary["total"] == 0
    assert summary["highest_spender"] is None


def test_summary_totals():
    expenses = [
        {"amount": 300, "paidBy": "Alice", "category": "food",   "status": "approved", "splitAmong": ["Alice", "Bob"]},
        {"amount": 200, "paidBy": "Bob",   "category": "travel", "status": "approved", "splitAmong": ["Alice", "Bob"]},
        {"amount": 100, "paidBy": "Alice", "category": "food",   "status": "pending",  "splitAmong": ["Alice", "Bob"]},
    ]
    summary = get_expense_summary(expenses)
    assert summary["total"] == 600
    assert summary["count"] == 3
    assert summary["highest_spender"] == "Alice"
    assert summary["highest_spender_amount"] == 400
    assert summary["category_breakdown"]["food"] == 400
    assert summary["category_breakdown"]["travel"] == 200


def test_summary_per_person():
    expenses = [
        {"amount": 400, "paidBy": "Alice", "category": "food", "status": "approved", "splitAmong": ["Alice", "Bob"]},
    ]
    summary = get_expense_summary(expenses)
    assert summary["per_person"] == 200.0
