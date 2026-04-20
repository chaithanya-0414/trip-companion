import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthChange, getUserProfile } from '../services/firebase';

const AuthContext = createContext(null);

// Dev bypass mock user (used when sessionStorage.dev_bypass is set)
const DEV_USER = {
  uid: 'dev-user',
  email: 'admin@tripsync.local',
  displayName: 'Dev Admin',
};
const DEV_PROFILE = {
  name: 'Dev Admin',
  email: 'admin@tripsync.local',
  role: 'admin',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for dev bypass first
    const devBypass = sessionStorage.getItem('dev_bypass');
    const activeEmail = sessionStorage.getItem('active_dev_email');
    if (devBypass) {
      const isDevAdmin = devBypass === 'admin';
      const allProfilesStr = localStorage.getItem('mock_profiles') || '{}';
      const allProfiles = JSON.parse(allProfilesStr);
      const profileData = allProfiles[activeEmail];

      setUser({
        uid: profileData?.id || (isDevAdmin ? 'dev-admin' : 'dev-employee'),
        email: profileData?.email || activeEmail,
        displayName: profileData?.name || (isDevAdmin ? 'Dev Admin' : 'Dev User'),
      });
      setProfile(profileData || {
        name: isDevAdmin ? 'Dev Admin' : (activeEmail ? activeEmail.split('@')[0] : 'Dev User'),
        email: activeEmail,
        role: isDevAdmin ? 'admin' : 'user',
      });
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const prof = await getUserProfile(firebaseUser.uid);
          setProfile(prof || { role: 'user', name: firebaseUser.email });
        } catch {
          setProfile({ role: 'user', name: firebaseUser.email });
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Listen for dev login/logout events
  useEffect(() => {
    const handleDevUpdate = () => {
      const devBypass = sessionStorage.getItem('dev_bypass');
      const activeEmail = sessionStorage.getItem('active_dev_email');
      if (devBypass) {
        const isDevAdmin = devBypass === 'admin';
        const allProfilesStr = localStorage.getItem('mock_profiles') || '{}';
        const allProfiles = JSON.parse(allProfilesStr);
        const profileData = allProfiles[activeEmail];

        setUser({
          uid: profileData?.id || (isDevAdmin ? 'dev-admin' : 'dev-employee'),
          email: profileData?.email || activeEmail,
          displayName: profileData?.name || (isDevAdmin ? 'Dev Admin' : 'Dev User'),
        });
        setProfile(profileData || {
          name: isDevAdmin ? 'Dev Admin' : (activeEmail ? activeEmail.split('@')[0] : 'Dev User'),
          email: activeEmail,
          role: isDevAdmin ? 'admin' : 'user',
        });
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    };

    window.addEventListener('dev_login', handleDevUpdate);
    window.addEventListener('dev_logout', handleDevUpdate);
    return () => {
      window.removeEventListener('dev_login', handleDevUpdate);
      window.removeEventListener('dev_logout', handleDevUpdate);
    };
  }, []);

  const isAdmin = profile?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
