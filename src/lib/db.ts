import { db } from "./firebase";
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, writeBatch } from "firebase/firestore";

export interface UserData {
  name?: string;
  households: string[];
}

export interface HouseholdData {
  name: string;
  members: string[]; // userIds
}

export interface StatusData {
  userId: string;
  date: string; // YYYY-MM-DD
  work: number;
  backAt: string;
  eatOut: number;
  stayOut: number;
  invite: number;
  guestStay: number;
  memo?: string;
}

// Ensure user exists in users collection
export async function ensureUserRecord(userId: string) {
  const userRef = doc(db, "users", userId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    await setDoc(userRef, { name: "", households: [] });
  }
}

export async function getUserName(userId: string): Promise<string> {
  try {
    if (!userId) return "";
    const userRef = doc(db, "users", userId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data() as UserData;
      return data.name || "";
    }
  } catch (err) {
    console.warn("Failed to fetch user name", err);
  }
  return "";
}

export async function updateUserName(userId: string, name: string) {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, { name });
}

// For demo purposes, we will auto-create a household if the user has none.
// In a real app, they would create or join via invite code.
export async function getOrInitializeHousehold(userId: string): Promise<{id: string, members: string[]}> {
  const userRef = doc(db, "users", userId);
  let snap = await getDoc(userRef);
  
  if (!snap.exists()) {
    await ensureUserRecord(userId);
    snap = await getDoc(userRef);
  }

  const userData = snap.data() as UserData;
  if (userData.households && userData.households.length > 0) {
    const hhId = userData.households[0];
    const hhSnap = await getDoc(doc(db, "households", hhId));
    return { id: hhId, members: hhSnap.data()?.members || [userId] };
  }

  // Create a new household
  const householdRef = doc(collection(db, "households"));
  await setDoc(householdRef, {
    name: "My Household",
    members: [userId]
  });

  // Update user
  await updateDoc(userRef, {
    households: [householdRef.id]
  });

  return { id: householdRef.id, members: [userId] };
}

// Get all statuses for a household in a given month
export async function getStatusesForMonth(householdId: string, yearMonth: string): Promise<StatusData[]> {
  const statusesRef = collection(db, "households", householdId, "statuses");
  const start = `${yearMonth}-01`;
  const end = `${yearMonth}-31`;
  const q = query(statusesRef, where("date", ">=", start), where("date", "<=", end));
  const snap = await getDocs(q);
  
  return snap.docs.map(d => d.data() as StatusData);
}

// Update a status
export async function updateStatus(
  householdId: string, 
  userId: string, 
  date: string, 
  field: keyof Omit<StatusData, 'userId'|'date'>, 
  value: number | string
) {
  const statusId = `${date}_${userId}`;
  const statusRef = doc(db, "households", householdId, "statuses", statusId);
  
  const snap = await getDoc(statusRef);
  if (!snap.exists()) {
    await setDoc(statusRef, {
      userId,
      date,
      work: 1,
      backAt: "20-24",
      eatOut: 0,
      stayOut: 0,
      invite: 0,
      guestStay: 0,
      memo: "",
      [field]: value
    });
  } else {
    await updateDoc(statusRef, {
      [field]: value
    });
  }
}

// Cleanup statuses older than 7 days
export async function cleanupOldStatuses(householdId: string) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoffDateStr = sevenDaysAgo.toISOString().split("T")[0];

  const statusesRef = collection(db, "households", householdId, "statuses");
  const q = query(statusesRef, where("date", "<", cutoffDateStr));
  const snap = await getDocs(q);

  if (snap.empty) return;

  const batch = writeBatch(db);
  snap.docs.forEach((d) => {
    batch.delete(d.ref);
  });

  await batch.commit();
}
