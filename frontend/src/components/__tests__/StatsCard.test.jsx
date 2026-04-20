import { render, screen } from '@testing-library/react';
import { DollarSign } from 'lucide-react';
import StatsCard from '../StatsCard';

describe('StatsCard', () => {
  const defaultProps = {
    icon: DollarSign,
    label: 'Total Spent',
    value: '₹45,000',
    sub: '90% of budget',
    glow: 'teal',
  };

  it('renders the value', () => {
    render(<StatsCard {...defaultProps} />);
    expect(screen.getByText('₹45,000')).toBeInTheDocument();
  });

  it('renders the label', () => {
    render(<StatsCard {...defaultProps} />);
    expect(screen.getByText('Total Spent')).toBeInTheDocument();
  });

  it('renders the sub text when provided', () => {
    render(<StatsCard {...defaultProps} />);
    expect(screen.getByText('90% of budget')).toBeInTheDocument();
  });

  it('does not render sub when omitted', () => {
    render(<StatsCard {...defaultProps} sub={undefined} />);
    expect(screen.queryByText('90% of budget')).not.toBeInTheDocument();
  });

  it('applies teal glow class by default', () => {
    const { container } = render(<StatsCard {...defaultProps} />);
    expect(container.firstChild).toHaveClass('stat-glow-teal');
  });

  it('applies amber glow class when specified', () => {
    const { container } = render(<StatsCard {...defaultProps} glow="amber" />);
    expect(container.firstChild).toHaveClass('stat-glow-amber');
  });

  it('applies blue glow class when specified', () => {
    const { container } = render(<StatsCard {...defaultProps} glow="blue" />);
    expect(container.firstChild).toHaveClass('stat-glow-blue');
  });

  it('renders numeric values as strings', () => {
    render(<StatsCard {...defaultProps} value={42} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('applies animate-slide-up class', () => {
    const { container } = render(<StatsCard {...defaultProps} />);
    expect(container.firstChild).toHaveClass('animate-slide-up');
  });
});
