import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTrip } from '../context/TripContext';
import { sendChatMessage } from '../services/api';
import { MessageCircle, X, Send, Bot, User, Sparkles, Loader } from 'lucide-react';

const QUICK_COMMANDS = [
  'Who owes whom?',
  'Show all expenses',
  'Show today\'s plan',
  'Filter food expenses',
];

export default function ChatPanel() {
  const { user, profile } = useAuth();
  const { trip } = useTrip();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      content: `👋 Hi ${profile?.name?.split(' ')[0] || 'there'}! I'm TripSync AI — your group travel companion.\n\nYou can ask me to:\n• Plan your itinerary: "Plan a 7-day Goa trip for 15 people"\n• Add expenses: "Add ₹1200 lunch paid by Rahul"\n• Split costs: "Who owes whom?"\n• Show plans: "Show Day 3 activities"\n\nWhat can I help you with?`,
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const res = await sendChatMessage(msg, sessionId, trip.trip_id);
      setMessages(prev => [...prev, { role: 'ai', content: res.data.response || '⚠️ No response from agent.' }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: '❌ Sorry, I encountered an error. Please try again.' }]);
    } finally { setLoading(false); }
  };

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  return (
    <>
      {/* FAB Button */}
      <button
        id="chat-fab"
        onClick={() => setOpen(!open)}
        style={{
          position: 'fixed', bottom: '28px', right: '28px', zIndex: 1000,
          width: '56px', height: '56px', borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--teal-500), var(--teal-600))',
          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 24px rgba(0,229,176,0.4)',
          transition: 'all 0.3s ease',
          transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          animation: 'pulse-glow 3s ease-in-out infinite',
        }}
        title="Open AI Chat"
      >
        {open ? <X size={22} color="var(--navy-950)" /> : <MessageCircle size={22} color="var(--navy-950)" />}
      </button>

      {/* Chat Panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: '96px', right: '28px', zIndex: 999,
          width: '380px', maxWidth: 'calc(100vw - 56px)',
          height: '520px', maxHeight: 'calc(100vh - 120px)',
          background: 'var(--navy-900)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-xl)',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          animation: 'slideUp 0.3s ease',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--navy-800)' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--teal-500), var(--teal-600))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={18} color="var(--navy-950)" />
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '14px' }}>TripSync AI</div>
              <div style={{ fontSize: '11px', color: 'var(--teal-400)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span className="teal-dot" style={{ width: '6px', height: '6px' }} />
                Online · Gemini powered
              </div>
            </div>
            <Sparkles size={14} color="var(--teal-400)" style={{ marginLeft: 'auto' }} />
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {msg.role === 'ai' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                    <Bot size={11} color="var(--teal-400)" />
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>TRIPSYNC AI</span>
                  </div>
                )}
                <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Loader size={13} color="var(--teal-400)" style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Thinking...</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick Commands */}
          <div style={{ padding: '0 12px 8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {QUICK_COMMANDS.map(cmd => (
              <button key={cmd} onClick={() => send(cmd)} style={{
                padding: '4px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: '500',
                background: 'rgba(44,255,204,0.08)', color: 'var(--teal-400)',
                border: '1px solid rgba(44,255,204,0.2)', cursor: 'pointer', fontFamily: 'Inter',
                transition: 'all 0.2s ease',
              }}>
                {cmd}
              </button>
            ))}
          </div>

          {/* Input */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--glass-border)', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder='Ask anything... "Add ₹500 dinner paid by Priya"'
              rows={1}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '13px',
                fontFamily: 'Inter', padding: '10px 12px', outline: 'none', resize: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--teal-500)'}
              onBlur={e => e.target.style.borderColor = 'var(--glass-border)'}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              style={{
                width: '38px', height: '38px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
                background: input.trim() && !loading ? 'linear-gradient(135deg, var(--teal-500), var(--teal-600))' : 'rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                transition: 'all 0.2s ease',
              }}
            >
              <Send size={15} color={input.trim() && !loading ? 'var(--navy-950)' : 'var(--text-muted)'} />
            </button>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } } @keyframes pulse-glow { 0%,100% { box-shadow: 0 4px 24px rgba(0,229,176,0.4); } 50% { box-shadow: 0 4px 36px rgba(0,229,176,0.7); } }`}</style>
    </>
  );
}
