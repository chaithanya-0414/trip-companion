import axios from 'axios';
import { auth } from './firebase';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({ baseURL: BASE_URL });

// Attach Firebase ID token to every request
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Agent Chat ──────────────────────────────────
export const sendChatMessage = (message, sessionId, tripId) =>
  api.post('/chat', { message, session_id: sessionId, trip_id: tripId });

// ─── Expenses ────────────────────────────────────
export const apiAddExpense = (data) => api.post('/expenses/add', data);
export const apiGetExpenses = (params) => api.get('/expenses', { params });
export const apiApproveExpense = (id) => api.put(`/expenses/${id}/approve`);
export const apiRejectExpense = (id) => api.put(`/expenses/${id}/reject`);

// ─── Itinerary ───────────────────────────────────
export const apiCreateItinerary = (data) => api.post('/itinerary/create', data);
export const apiGetItinerary = (tripId) => api.get(`/itinerary/${tripId}`);
export const apiUpdateItineraryDay = (tripId, day, changes) =>
  api.put(`/itinerary/${tripId}/day/${day}`, changes);

// ─── Users ───────────────────────────────────────
export const apiGetUsers = () => api.get('/users');
export const apiRegisterUser = (data) => api.post('/users/register', data);

// ─── Trips ───────────────────────────────────────
export const apiGetTripMeta = (tripId) => api.get(`/trips/${tripId}`);
export const apiUpdateTripMeta = (tripId, data) => api.put(`/trips/${tripId}`, data);

// ─── Settlements ─────────────────────────────────
export const apiCalculateSettlements = (tripId) =>
  api.get(`/settlements/calculate/${tripId}`);
export const apiMarkSettled = (tripId, settlement) =>
  api.post(`/settlements/${tripId}/mark-settled`, settlement);

export default api;
