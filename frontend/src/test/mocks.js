/**
 * Shared mock factories for tests.
 */

export const mockUser = {
  uid: 'test-user-1',
  email: 'test@trip.com',
  displayName: 'Test User',
};

export const mockAdminProfile = {
  name: 'Test Admin',
  email: 'admin@trip.com',
  role: 'admin',
};

export const mockUserProfile = {
  name: 'Test User',
  email: 'test@trip.com',
  role: 'user',
};

export const mockExpense = {
  id: 'exp-001',
  amount: 1500,
  paidBy: 'Alice',
  category: 'food',
  description: 'Team lunch',
  status: 'pending',
  proofUrl: null,
  day: 2,
  tripId: 'TRIP001',
};

export const mockApprovedExpense = {
  ...mockExpense,
  id: 'exp-002',
  status: 'approved',
};

export const mockRejectedExpense = {
  ...mockExpense,
  id: 'exp-003',
  status: 'rejected',
};

export const mockAuthContext = (overrides = {}) => ({
  user: mockUser,
  profile: mockUserProfile,
  loading: false,
  isAdmin: false,
  ...overrides,
});

export const mockTripContext = (overrides = {}) => ({
  tripId: 'TRIP001',
  tripTitle: 'Test Trip',
  destination: 'Goa, India',
  startDate: '2025-01-01',
  endDate: '2025-01-05',
  groupSize: 4,
  budget: 50000,
  expenses: [],
  itinerary: null,
  settlements: [],
  members: [],
  updateTrip: vi.fn(),
  ...overrides,
});
