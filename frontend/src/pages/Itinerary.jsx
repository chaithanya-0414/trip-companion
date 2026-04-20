import React, { useState, useEffect } from 'react';
import { useTrip } from '../context/TripContext';
import { useAuth } from '../context/AuthContext';
import { apiCreateItinerary, apiGetItinerary } from '../services/api';
import { Map, Plus, ChevronDown, ChevronUp, Loader, Utensils, Plane, BedDouble, Camera, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const TYPE_CONFIG = {
  breakfast: { icon: '🍳', color: '#FB923C' },
  lunch:     { icon: '🍽️', color: '#FBBF24' },
  dinner:    { icon: '🌙', color: '#A78BFA' },
  travel:    { icon: '✈️', color: '#60A5FA' },
  attraction:{ icon: '🎯', color: 'var(--teal-400)' },
  stay:      { icon: '🏨', color: '#34D399' },
  misc:      { icon: '📌', color: '#94A3B8' },
};

function DayCard({ dayPlan, index }) {
  const [open, setOpen] = useState(index === 0);
  const { day, location, theme, activities = [], travel_notes } = dayPlan;

  return (
    <div className="glass-card animate-slide-up" style={{ overflow: 'hidden', animationDelay: `${index * 0.05}s` }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 20px',
        background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
      }}>
        <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, var(--teal-600), var(--teal-500))', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '10px', color: 'var(--navy-950)', fontWeight: '600', lineHeight: 1 }}>DAY</span>
          <span style={{ fontSize: '18px', color: 'var(--navy-950)', fontWeight: '900', lineHeight: 1 }}>{day}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-primary)' }}>{location}</div>
          {theme && <div style={{ fontSize: '12px', color: 'var(--teal-400)', marginTop: '2px' }}>{theme}</div>}
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{activities.length} activities</div>
        </div>
        <div style={{ color: 'var(--text-muted)' }}>{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>
      </button>

      {open && (
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--glass-border)' }}>
          {travel_notes && (
            <div style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.15)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginTop: '14px', marginBottom: '14px', fontSize: '12px', color: '#93C5FD' }}>
              ✈️ {travel_notes}
            </div>
          )}
          <div style={{ position: 'relative', paddingLeft: '24px', marginTop: '14px' }}>
            {/* Timeline line */}
            <div style={{ position: 'absolute', left: '7px', top: '8px', bottom: '8px', width: '2px', background: 'var(--glass-border)', borderRadius: '99px' }} />
            {activities.map((act, i) => {
              const cfg = TYPE_CONFIG[act.type] || TYPE_CONFIG.misc;
              return (
                <div key={i} style={{ position: 'relative', display: 'flex', gap: '14px', marginBottom: i < activities.length - 1 ? '16px' : '0' }}>
                  {/* Dot */}
                  <div style={{ position: 'absolute', left: '-21px', top: '4px', width: '10px', height: '10px', borderRadius: '50%', background: cfg.color, border: '2px solid var(--navy-950)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Clock size={10} /> {act.time}
                      </span>
                      <span style={{ fontSize: '11px', color: cfg.color }}>{cfg.icon}</span>
                      <span style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-primary)' }}>{act.activity}</span>
                      {act.cost_estimate && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>~₹{act.cost_estimate}</span>}
                    </div>
                    {act.notes && <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '3px' }}>{act.notes}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Itinerary() {
  const { trip, itinerary, setItinerary } = useTrip();
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showGen, setShowGen] = useState(false);
  const [genForm, setGenForm] = useState({ destination: trip.destination || '', duration_days: trip.duration_days || 3, group_size: trip.group_size || 12, budget_per_person: '', preferences: '', start_date: '' });

  useEffect(() => { loadItinerary(); }, []);

  const loadItinerary = async () => {
    try {
      const res = await apiGetItinerary(trip.trip_id);
      setItinerary(res.data.plan || []);
    } catch { setItinerary([]); }
    finally { setLoading(false); }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!genForm.destination) return toast.error('Destination is required');
    setGenerating(true);
    try {
      const res = await apiCreateItinerary({ ...genForm, trip_id: trip.trip_id, duration_days: parseInt(genForm.duration_days), group_size: parseInt(genForm.group_size), budget_per_person: genForm.budget_per_person ? parseFloat(genForm.budget_per_person) : null });
      setItinerary(res.data.plan || []);
      setShowGen(false);
      toast.success(`${genForm.duration_days}-day itinerary created! 🗺️`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to generate itinerary');
    } finally { setGenerating(false); }
  };

  const plan = Array.isArray(itinerary) ? itinerary : [];

  return (
    <div className="page-container">
      <div className="page-header animate-fade-in">
        <div>
          <h1 className="page-title">Trip <span className="gradient-text">Itinerary</span></h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            {plan.length > 0 ? `${plan.length}-day plan` : 'No itinerary yet'}
          </p>
        </div>
        <button className="btn btn-primary" id="generate-itinerary-btn" onClick={() => setShowGen(!showGen)}>
          {showGen ? '✕ Cancel' : <><Plus size={14} /> Generate Itinerary</>}
        </button>
      </div>

      {/* Generate Form */}
      {showGen && (
        <div className="glass-card animate-slide-up" style={{ padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ fontWeight: '700', marginBottom: '20px' }}>🤖 AI Itinerary Generator</h3>
          <form onSubmit={handleGenerate}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              {[
                { name: 'destination', label: 'Destination *', placeholder: 'Manali, HP' },
                { name: 'duration_days', label: 'Days', type: 'number', placeholder: '7' },
                { name: 'group_size', label: 'Group Size', type: 'number', placeholder: '12' },
                { name: 'budget_per_person', label: 'Budget/Person (₹)', type: 'number', placeholder: '5000' },
                { name: 'start_date', label: 'Start Date', type: 'date' },
                { name: 'preferences', label: 'Preferences', placeholder: 'adventure, food, culture' },
              ].map(({ name, label, placeholder, type = 'text' }) => (
                <div key={name}>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '5px', fontWeight: '500' }}>{label}</label>
                  <input className="input" type={type} placeholder={placeholder} value={genForm[name]} onChange={e => setGenForm({ ...genForm, [name]: e.target.value })} required={name === 'destination'} />
                </div>
              ))}
            </div>
            <button type="submit" className="btn btn-primary" disabled={generating}>
              {generating ? (
                <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Generating with Gemini AI...</>
              ) : (
                <><Map size={14} /> Generate Itinerary</>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Itinerary Cards */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '72px', borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      ) : plan.length === 0 ? (
        <div className="glass-card" style={{ padding: '60px', textAlign: 'center' }}>
          <Map size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px', display: 'block' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>No itinerary yet</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Use the AI generator to create a day-wise plan instantly.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {plan.map((day, i) => <DayCard key={i} dayPlan={day} index={i} />)}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
