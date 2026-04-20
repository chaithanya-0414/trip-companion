import React from 'react';

export default function StatsCard({ icon: Icon, label, value, sub, glow = 'teal', delay = 0 }) {
  const glowClass = `stat-glow-${glow}`;
  const iconColors = { teal: 'var(--teal-400)', amber: 'var(--amber-400)', blue: '#60A5FA' };
  const bgColors = { teal: 'rgba(44,255,204,0.08)', amber: 'rgba(255,184,48,0.08)', blue: 'rgba(96,165,250,0.08)' };
  const color = iconColors[glow] || iconColors.teal;
  const bg = bgColors[glow] || bgColors.teal;

  return (
    <div className={`glass-card ${glowClass} animate-slide-up stagger-${delay}`} style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} color={color} />
        </div>
      </div>
      <div style={{ fontSize: '26px', fontWeight: '800', letterSpacing: '-0.5px', marginBottom: '2px' }}>{value}</div>
      <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '2px' }}>{label}</div>
      {sub && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  );
}
