// ─────────────────────────────────────────────────
//  Firebase JS SDK — Frontend Service (Dev Mocked)
// ─────────────────────────────────────────────────

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// ⚠️  REPLACE WITH YOUR FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};

// Check if we are in Dev Mode (missing API keys)
export const IS_DEV = firebaseConfig.apiKey.includes("YOUR_FIREBASE") || !firebaseConfig.apiKey;

export let app, auth, db, storage;

if (!IS_DEV) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
} else {
  // Mock objects for Dev Mode to prevent property access crashes
  app = {};
  auth = { currentUser: null };
  db = {};
  storage = {};
}

// ─── Auth helpers ────────────────────────────────
export const loginUser = async (email, password) => {
  if (IS_DEV) {
    const role = email.toLowerCase().includes('admin') ? 'admin' : 'user';
    sessionStorage.setItem('dev_bypass', role);
    window.dispatchEvent(new Event('dev_login'));
    return { user: { uid: role === 'admin' ? 'dev-admin' : 'dev-user', email } };
  }
  return signInWithEmailAndPassword(auth, email, password);
};

export const registerUser = async (email, password) => {
  if (IS_DEV) {
    const role = email.toLowerCase().includes('admin') ? 'admin' : 'user';
    sessionStorage.setItem('dev_bypass', role);
    window.dispatchEvent(new Event('dev_login'));
    return { user: { uid: role === 'admin' ? 'dev-admin' : 'dev-user', email } };
  }
  return createUserWithEmailAndPassword(auth, email, password);
};

export const logoutUser = () => {
  if (IS_DEV) {
    sessionStorage.removeItem('dev_bypass');
    sessionStorage.removeItem('active_dev_email');
    window.dispatchEvent(new Event('dev_logout'));
    return Promise.resolve();
  }
  return signOut(auth);
};

export const onAuthChange = (cb) => {
  if (IS_DEV) {
    setTimeout(() => cb(null), 0);
    return () => {}; 
  }
  return onAuthStateChanged(auth, cb);
};

// ─── User collection helpers ─────────────────────
export const createUserProfile = async (uid, data) => {
  if (IS_DEV) {
    const allProfilesStr = localStorage.getItem('mock_profiles') || '{}';
    const allProfiles = JSON.parse(allProfilesStr);
    allProfiles[data.email] = { ...data, id: uid };
    localStorage.setItem('mock_profiles', JSON.stringify(allProfiles));
    sessionStorage.setItem('active_dev_email', data.email);
    return Promise.resolve();
  }
  await setDoc(doc(db, 'users', uid), {
    ...data,
    role: data.role || 'user',
    createdAt: serverTimestamp(),
  });
};

export const getUserProfile = async (uid) => {
  if (IS_DEV) {
    const activeEmail = sessionStorage.getItem('active_dev_email');
    const allProfilesStr = localStorage.getItem('mock_profiles') || '{}';
    const allProfiles = JSON.parse(allProfilesStr);
    return allProfiles[activeEmail] ? allProfiles[activeEmail] : { id: uid, role: 'user', name: activeEmail ? activeEmail.split('@')[0] : 'Dev User' };
  }
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const getAllUsers = async () => {
  if (IS_DEV) return [];
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// ─── Expense helpers ─────────────────────────────
export const addExpense = async (expenseData) => {
  if (IS_DEV) return { id: 'mock-eid' };
  return await addDoc(collection(db, 'expenses'), {
    ...expenseData,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
};

export const getExpenses = async (filters = {}) => {
  if (IS_DEV) return [];
  let q = collection(db, 'expenses');
  const constraints = [orderBy('createdAt', 'desc')];
  if (filters.category) constraints.unshift(where('category', '==', filters.category));
  if (filters.paidBy) constraints.unshift(where('paidBy', '==', filters.paidBy));
  const snap = await getDocs(query(q, ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const updateExpenseStatus = async (id, status) => {
  if (IS_DEV) return;
  await updateDoc(doc(db, 'expenses', id), { status, updatedAt: serverTimestamp() });
};

// ─── Itinerary helpers ───────────────────────────
export const setItinerary = async (tripId, plan) => {
  if (IS_DEV) return;
  await setDoc(doc(db, 'itineraries', tripId), {
    plan,
    updatedAt: serverTimestamp(),
  });
};

export const getItinerary = async (tripId) => {
  if (IS_DEV) return null;
  const snap = await getDoc(doc(db, 'itineraries', tripId));
  return snap.exists() ? snap.data() : null;
};

export const updateItineraryDay = async (tripId, day, changes) => {
  if (IS_DEV) return;
  const snap = await getDoc(doc(db, 'itineraries', tripId));
  if (!snap.exists()) return;
  const plan = snap.data().plan || [];
  const updated = plan.map((d) => (d.day === day ? { ...d, ...changes } : d));
  await updateDoc(doc(db, 'itineraries', tripId), { plan: updated, updatedAt: serverTimestamp() });
};

// ─── Trip meta ───────────────────────────────────
export const setTripMeta = async (tripId, meta) => {
  if (IS_DEV) return;
  await setDoc(doc(db, 'trips', tripId), { ...meta, updatedAt: serverTimestamp() });
};

export const getTripMeta = async (tripId) => {
  if (IS_DEV) return null;
  const snap = await getDoc(doc(db, 'trips', tripId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

// ─── Storage — receipt upload ─────────────────────
export const uploadReceipt = async (file, expenseId) => {
  if (IS_DEV) return 'https://via.placeholder.com/150';
  const storageRef = ref(storage, `receipts/${expenseId}/${file.name}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
};

// ─── Settlement helpers ───────────────────────────
export const saveSettlements = async (tripId, settlements) => {
  if (IS_DEV) return;
  await setDoc(doc(db, 'settlements', tripId), {
    settlements,
    updatedAt: serverTimestamp(),
  });
};

export const getSettlements = async (tripId) => {
  if (IS_DEV) return [];
  const snap = await getDoc(doc(db, 'settlements', tripId));
  return snap.exists() ? snap.data().settlements : [];
};
