import { render, screen, fireEvent } from '@testing-library/react';
import ExpenseCard from '../ExpenseCard';

const baseExpense = {
  id: 'exp-001',
  amount: 1500,
  paidBy: 'Alice',
  category: 'food',
  description: 'Team lunch',
  status: 'pending',
  proofUrl: null,
  day: 2,
};

describe('ExpenseCard', () => {
  it('renders the amount', () => {
    render(<ExpenseCard expense={baseExpense} isAdmin={false} />);
    expect(screen.getByText(/1,500/)).toBeInTheDocument();
  });

  it('renders paidBy name', () => {
    render(<ExpenseCard expense={baseExpense} isAdmin={false} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<ExpenseCard expense={baseExpense} isAdmin={false} />);
    expect(screen.getByText(/Team lunch/)).toBeInTheDocument();
  });

  it('renders category badge', () => {
    render(<ExpenseCard expense={baseExpense} isAdmin={false} />);
    expect(screen.getByText('food')).toBeInTheDocument();
  });

  it('renders day number', () => {
    render(<ExpenseCard expense={baseExpense} isAdmin={false} />);
    expect(screen.getByText('Day 2')).toBeInTheDocument();
  });

  it('shows food emoji for food category', () => {
    render(<ExpenseCard expense={baseExpense} isAdmin={false} />);
    expect(screen.getByText('🍽️')).toBeInTheDocument();
  });

  it('shows travel emoji for travel category', () => {
    render(<ExpenseCard expense={{ ...baseExpense, category: 'travel' }} isAdmin={false} />);
    expect(screen.getByText('✈️')).toBeInTheDocument();
  });

  it('shows stay emoji for stay category', () => {
    render(<ExpenseCard expense={{ ...baseExpense, category: 'stay' }} isAdmin={false} />);
    expect(screen.getByText('🏨')).toBeInTheDocument();
  });

  it('shows status badge', () => {
    render(<ExpenseCard expense={baseExpense} isAdmin={false} />);
    expect(screen.getByText('pending')).toBeInTheDocument();
  });

  it('shows approved status', () => {
    render(<ExpenseCard expense={{ ...baseExpense, status: 'approved' }} isAdmin={false} />);
    expect(screen.getByText('approved')).toBeInTheDocument();
  });

  it('shows rejected status', () => {
    render(<ExpenseCard expense={{ ...baseExpense, status: 'rejected' }} isAdmin={false} />);
    expect(screen.getByText('rejected')).toBeInTheDocument();
  });

  describe('admin controls', () => {
    it('shows approve and reject buttons for admin on pending expense', () => {
      render(<ExpenseCard expense={baseExpense} isAdmin={true} onApprove={vi.fn()} onReject={vi.fn()} />);
      expect(screen.getByTitle('Approve')).toBeInTheDocument();
      expect(screen.getByTitle('Reject')).toBeInTheDocument();
    });

    it('hides admin buttons for non-admin', () => {
      render(<ExpenseCard expense={baseExpense} isAdmin={false} />);
      expect(screen.queryByTitle('Approve')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Reject')).not.toBeInTheDocument();
    });

    it('hides admin buttons when expense is already approved', () => {
      render(
        <ExpenseCard
          expense={{ ...baseExpense, status: 'approved' }}
          isAdmin={true}
          onApprove={vi.fn()}
          onReject={vi.fn()}
        />
      );
      expect(screen.queryByTitle('Approve')).not.toBeInTheDocument();
    });

    it('hides admin buttons when expense is already rejected', () => {
      render(
        <ExpenseCard
          expense={{ ...baseExpense, status: 'rejected' }}
          isAdmin={true}
          onApprove={vi.fn()}
          onReject={vi.fn()}
        />
      );
      expect(screen.queryByTitle('Reject')).not.toBeInTheDocument();
    });

    it('calls onApprove with expense id when Approve clicked', () => {
      const onApprove = vi.fn();
      render(<ExpenseCard expense={baseExpense} isAdmin={true} onApprove={onApprove} onReject={vi.fn()} />);
      fireEvent.click(screen.getByTitle('Approve'));
      expect(onApprove).toHaveBeenCalledWith('exp-001');
    });

    it('calls onReject with expense id when Reject clicked', () => {
      const onReject = vi.fn();
      render(<ExpenseCard expense={baseExpense} isAdmin={true} onApprove={vi.fn()} onReject={onReject} />);
      fireEvent.click(screen.getByTitle('Reject'));
      expect(onReject).toHaveBeenCalledWith('exp-001');
    });
  });

  describe('proof URL', () => {
    it('shows receipt link when proofUrl is provided', () => {
      render(
        <ExpenseCard
          expense={{ ...baseExpense, proofUrl: 'https://example.com/receipt.jpg' }}
          isAdmin={false}
        />
      );
      const link = screen.getByTitle('View receipt');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://example.com/receipt.jpg');
    });

    it('hides receipt link when proofUrl is null', () => {
      render(<ExpenseCard expense={baseExpense} isAdmin={false} />);
      expect(screen.queryByTitle('View receipt')).not.toBeInTheDocument();
    });
  });

  it('does not render day when day is not provided', () => {
    render(<ExpenseCard expense={{ ...baseExpense, day: undefined }} isAdmin={false} />);
    expect(screen.queryByText(/Day/)).not.toBeInTheDocument();
  });
});
