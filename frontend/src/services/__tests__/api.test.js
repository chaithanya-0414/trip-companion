/**
 * Tests for api.js — verifies correct endpoints and payloads are used.
 * Uses vi.mock to intercept axios without real HTTP calls.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock firebase so auth interceptor doesn't fail
vi.mock('../firebase', () => ({
  auth: { currentUser: null },
}));

// Mock axios entirely
vi.mock('axios', () => {
  const mockInstance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };
  return {
    default: {
      create: vi.fn(() => mockInstance),
    },
    __mockInstance: mockInstance,
  };
});

import axios from 'axios';
const mockApi = axios.create();

import {
  sendChatMessage,
  apiAddExpense,
  apiGetExpenses,
  apiApproveExpense,
  apiRejectExpense,
  apiCreateItinerary,
  apiGetItinerary,
  apiUpdateItineraryDay,
  apiGetUsers,
  apiRegisterUser,
  apiGetTripMeta,
  apiUpdateTripMeta,
  apiCalculateSettlements,
  apiMarkSettled,
} from '../api';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Chat API', () => {
  it('sendChatMessage posts to /chat', () => {
    mockApi.post.mockResolvedValueOnce({ data: {} });
    sendChatMessage('hello', 'session-1', 'TRIP001');
    expect(mockApi.post).toHaveBeenCalledWith('/chat', {
      message: 'hello',
      session_id: 'session-1',
      trip_id: 'TRIP001',
    });
  });
});

describe('Expenses API', () => {
  it('apiAddExpense posts to /expenses/add', () => {
    mockApi.post.mockResolvedValueOnce({ data: {} });
    const payload = { trip_id: 'T1', amount: 100, paid_by: 'Alice', category: 'food' };
    apiAddExpense(payload);
    expect(mockApi.post).toHaveBeenCalledWith('/expenses/add', payload);
  });

  it('apiGetExpenses gets /expenses with params', () => {
    mockApi.get.mockResolvedValueOnce({ data: {} });
    apiGetExpenses({ trip_id: 'T1', category: 'food' });
    expect(mockApi.get).toHaveBeenCalledWith('/expenses', {
      params: { trip_id: 'T1', category: 'food' },
    });
  });

  it('apiApproveExpense puts to /expenses/{id}/approve', () => {
    mockApi.put.mockResolvedValueOnce({ data: {} });
    apiApproveExpense('exp-123');
    expect(mockApi.put).toHaveBeenCalledWith('/expenses/exp-123/approve');
  });

  it('apiRejectExpense puts to /expenses/{id}/reject', () => {
    mockApi.put.mockResolvedValueOnce({ data: {} });
    apiRejectExpense('exp-456');
    expect(mockApi.put).toHaveBeenCalledWith('/expenses/exp-456/reject');
  });
});

describe('Itinerary API', () => {
  it('apiCreateItinerary posts to /itinerary/create', () => {
    mockApi.post.mockResolvedValueOnce({ data: {} });
    const payload = { trip_id: 'T1', destination: 'Goa', duration_days: 3, group_size: 4 };
    apiCreateItinerary(payload);
    expect(mockApi.post).toHaveBeenCalledWith('/itinerary/create', payload);
  });

  it('apiGetItinerary gets /itinerary/{tripId}', () => {
    mockApi.get.mockResolvedValueOnce({ data: {} });
    apiGetItinerary('TRIP001');
    expect(mockApi.get).toHaveBeenCalledWith('/itinerary/TRIP001');
  });

  it('apiUpdateItineraryDay puts to /itinerary/{tripId}/day/{day}', () => {
    mockApi.put.mockResolvedValueOnce({ data: {} });
    apiUpdateItineraryDay('TRIP001', 2, { title: 'Updated' });
    expect(mockApi.put).toHaveBeenCalledWith('/itinerary/TRIP001/day/2', { title: 'Updated' });
  });
});

describe('Users API', () => {
  it('apiGetUsers gets /users', () => {
    mockApi.get.mockResolvedValueOnce({ data: {} });
    apiGetUsers();
    expect(mockApi.get).toHaveBeenCalledWith('/users');
  });

  it('apiRegisterUser posts to /users/register', () => {
    mockApi.post.mockResolvedValueOnce({ data: {} });
    const payload = { uid: 'u1', name: 'Bob', email: 'bob@trip.com', role: 'user' };
    apiRegisterUser(payload);
    expect(mockApi.post).toHaveBeenCalledWith('/users/register', payload);
  });
});

describe('Trips API', () => {
  it('apiGetTripMeta gets /trips/{tripId}', () => {
    mockApi.get.mockResolvedValueOnce({ data: {} });
    apiGetTripMeta('TRIP001');
    expect(mockApi.get).toHaveBeenCalledWith('/trips/TRIP001');
  });

  it('apiUpdateTripMeta puts to /trips/{tripId}', () => {
    mockApi.put.mockResolvedValueOnce({ data: {} });
    apiUpdateTripMeta('TRIP001', { name: 'New Name' });
    expect(mockApi.put).toHaveBeenCalledWith('/trips/TRIP001', { name: 'New Name' });
  });
});

describe('Settlements API', () => {
  it('apiCalculateSettlements gets /settlements/calculate/{tripId}', () => {
    mockApi.get.mockResolvedValueOnce({ data: {} });
    apiCalculateSettlements('TRIP001');
    expect(mockApi.get).toHaveBeenCalledWith('/settlements/calculate/TRIP001');
  });

  it('apiMarkSettled posts to /settlements/{tripId}/mark-settled', () => {
    mockApi.post.mockResolvedValueOnce({ data: {} });
    apiMarkSettled('TRIP001', { from: 'Bob', to: 'Alice', amount: 100 });
    expect(mockApi.post).toHaveBeenCalledWith(
      '/settlements/TRIP001/mark-settled',
      { from: 'Bob', to: 'Alice', amount: 100 }
    );
  });
});
