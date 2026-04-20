import { render, screen, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthProvider, useAuth } from '../AuthContext';

// Mock firebase service
vi.mock('../../services/firebase', () => ({
  onAuthChange: vi.fn((cb) => {
    cb(null);  // default: no user
    return vi.fn();  // unsubscribe
  }),
  getUserProfile: vi.fn().mockResolvedValue(null),
}));

function TestConsumer() {
  const { user, profile, loading, isAdmin } = useAuth();
  if (loading) return <div>loading</div>;
  return (
    <div>
      <span data-testid="user">{user ? user.email : 'no-user'}</span>
      <span data-testid="role">{profile?.role ?? 'no-role'}</span>
      <span data-testid="isAdmin">{isAdmin ? 'admin' : 'not-admin'}</span>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });

  it('provides null user when not authenticated', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
    });
    expect(screen.getByTestId('user').textContent).toBe('no-user');
  });

  it('useAuth throws outside provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow('useAuth must be used inside AuthProvider');
    consoleError.mockRestore();
  });

  describe('dev bypass mode', () => {
    it('sets admin user when dev_bypass=admin', async () => {
      sessionStorage.setItem('dev_bypass', 'admin');
      sessionStorage.setItem('active_dev_email', 'admin@tripsync.local');

      await act(async () => {
        render(
          <AuthProvider>
            <TestConsumer />
          </AuthProvider>
        );
      });

      expect(screen.getByTestId('user').textContent).toBe('admin@tripsync.local');
      expect(screen.getByTestId('isAdmin').textContent).toBe('admin');
    });

    it('sets regular user when dev_bypass=user', async () => {
      sessionStorage.setItem('dev_bypass', 'user');
      sessionStorage.setItem('active_dev_email', 'emp@tripsync.local');

      await act(async () => {
        render(
          <AuthProvider>
            <TestConsumer />
          </AuthProvider>
        );
      });

      expect(screen.getByTestId('user').textContent).toBe('emp@tripsync.local');
      expect(screen.getByTestId('isAdmin').textContent).toBe('not-admin');
    });

    it('uses profile from mock_profiles if available', async () => {
      const profiles = {
        'custom@trip.com': { id: 'u99', name: 'Custom', email: 'custom@trip.com', role: 'admin' },
      };
      localStorage.setItem('mock_profiles', JSON.stringify(profiles));
      sessionStorage.setItem('dev_bypass', 'user');
      sessionStorage.setItem('active_dev_email', 'custom@trip.com');

      await act(async () => {
        render(
          <AuthProvider>
            <TestConsumer />
          </AuthProvider>
        );
      });

      expect(screen.getByTestId('isAdmin').textContent).toBe('admin');
    });
  });

  describe('isAdmin computed property', () => {
    it('is false when role is user', async () => {
      sessionStorage.setItem('dev_bypass', 'user');
      sessionStorage.setItem('active_dev_email', 'u@trip.com');

      await act(async () => {
        render(
          <AuthProvider>
            <TestConsumer />
          </AuthProvider>
        );
      });

      expect(screen.getByTestId('isAdmin').textContent).toBe('not-admin');
    });

    it('is true when role is admin', async () => {
      sessionStorage.setItem('dev_bypass', 'admin');
      sessionStorage.setItem('active_dev_email', 'a@trip.com');

      await act(async () => {
        render(
          <AuthProvider>
            <TestConsumer />
          </AuthProvider>
        );
      });

      expect(screen.getByTestId('isAdmin').textContent).toBe('admin');
    });
  });
});
