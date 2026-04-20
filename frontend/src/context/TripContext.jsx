import React, { createContext, useContext, useState, useCallback } from 'react';

const TripContext = createContext(null);

const DEFAULT_TRIP = {
  trip_id: 'SYDON 001 ',
  title: 'Workathon SYDON',
  destination: '',
  start_date: '',
  end_date: '',
  duration_days: 0,
  group_size: 0,
  budget_total: 0,
};

const DEV_TRIP = {
  trip_id: 'TRIP001',
  title: 'Manali Workation',
  destination: 'Manali, India',
  start_date: '2026-04-27',
  end_date: '2026-05-09',
  duration_days: 14,
  group_size: 12,
  budget_total: 150000,
};

export function TripProvider({ children }) {
  const [trip, setTrip] = useState(() => {
    // Use seeded trip in dev mode
    if (sessionStorage.getItem('dev_bypass')) return DEV_TRIP;
    try {
      const saved = localStorage.getItem('tripsync_trip');
      return saved ? JSON.parse(saved) : DEFAULT_TRIP;
    } catch { return DEFAULT_TRIP; }
  });

  const [expenses, setExpenses] = useState([]);
  const [itinerary, setItinerary] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [members, setMembers] = useState([]);

  const updateTrip = useCallback((data) => {
    const updated = { ...trip, ...data };
    setTrip(updated);
    localStorage.setItem('tripsync_trip', JSON.stringify(updated));
  }, [trip]);

  return (
    <TripContext.Provider value={{
      trip, updateTrip,
      expenses, setExpenses,
      itinerary, setItinerary,
      settlements, setSettlements,
      members, setMembers,
    }}>
      {children}
    </TripContext.Provider>
  );
}

export const useTrip = () => {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error('useTrip must be used inside TripProvider');
  return ctx;
};
