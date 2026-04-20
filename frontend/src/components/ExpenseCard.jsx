import React from 'react';
import { CheckCircle, XCircle, ExternalLink } from 'lucide-react';

const CAT_EMOJI = { food: '🍽️', travel: '✈️', stay: '🏨', activity: '🎯', misc: '📦' };

export default function ExpenseCard({ expense, isAdmin, onApprove, onReject, delay = 1 }) {
  const { id, amount, paidBy, category, description, status, proofUrl, day } = expense;

  return (
    <div className={`glass-card animate-slide-up stagger-${delay}`} style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
      {/* Icon */}
      <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
        {CAT_EMOJI[category] || '📦'}
      </div>

      {/* Main info */}
      <div style={{ flex: 1, minWidth: '120px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: '700', fontSize: '16px' }}>₹{amount?.toLocaleString()}</span>
          <span className={`badge badge-${category || 'misc'}`}>{category}</span>
          {day && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Day {day}</span>}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{paidBy}</span>
          {description && <span> · {description}</span>}
        </div>
      </div>

      {/* Right side: status + actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        {proofUrl && (
          <a href={proofUrl} target="_blank" rel="noopener noreferrer" title="View receipt" style={{ color: 'var(--teal-400)', display: 'flex', alignItems: 'center' }}>
            <ExternalLink size={14} />
          </a>
        )}
        <span className={`badge badge-${status}`}>{status}</span>
        {isAdmin && status === 'pending' && (
          <>
            <button className="btn btn-success btn-sm" onClick={() => onApprove(id)} title="Approve">
              <CheckCircle size={13} /> Approve
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => onReject(id)} title="Reject">
              <XCircle size={13} /> Reject
            </button>
          </>
        )}
      </div>
    </div>
  );
}
