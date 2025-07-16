import { 
  doc, 
  getDoc,
  collection,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  onSnapshot,
  type Unsubscribe
} from 'firebase/firestore';
import { db } from './config';
import type { Expert } from './types';
import { browser } from '$app/environment';

const EXPERTS_COLLECTION = 'experts';

export async function getExpert(expertId: string): Promise<Expert | null> {
  if (!browser) return null;
  
  try {
    const docRef = doc(db, EXPERTS_COLLECTION, expertId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        invitedAt: data.invitedAt.toDate(),
        acceptedAt: data.acceptedAt?.toDate(),
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate()
      } as Expert;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching expert:', error);
    return null;
  }
}

export async function getExpertsByPanel(panelId: string): Promise<Expert[]> {
  if (!browser) return [];
  
  try {
    const q = query(
      collection(db, EXPERTS_COLLECTION),
      where('panelId', '==', panelId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        invitedAt: data.invitedAt.toDate(),
        acceptedAt: data.acceptedAt?.toDate(),
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate()
      } as Expert;
    });
  } catch (error) {
    console.error('Error fetching experts:', error);
    return [];
  }
}

export async function getExpertByUserId(userId: string): Promise<Expert | null> {
  if (!browser) return null;
  
  try {
    const q = query(
      collection(db, EXPERTS_COLLECTION),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        invitedAt: data.invitedAt.toDate(),
        acceptedAt: data.acceptedAt?.toDate(),
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate()
      } as Expert;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching expert by user ID:', error);
    return null;
  }
}

export function subscribeExpert(
  expertId: string,
  callback: (expert: Expert | null) => void
): Unsubscribe {
  if (!browser) {
    callback(null);
    return () => {};
  }

  const docRef = doc(db, EXPERTS_COLLECTION, expertId);
  
  return onSnapshot(docRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      callback({
        id: doc.id,
        ...data,
        invitedAt: data.invitedAt.toDate(),
        acceptedAt: data.acceptedAt?.toDate(),
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate()
      } as Expert);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error('Error subscribing to expert:', error);
    callback(null);
  });
}

export async function createExpert(expert: Omit<Expert, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  if (!browser) throw new Error('Firebase operations require browser environment');
  
  const expertData = {
    ...expert,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  const docRef = await addDoc(collection(db, EXPERTS_COLLECTION), expertData);
  return docRef.id;
}

export async function updateExpert(expertId: string, updates: Partial<Expert>): Promise<void> {
  if (!browser) throw new Error('Firebase operations require browser environment');
  
  const docRef = doc(db, EXPERTS_COLLECTION, expertId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.now()
  });
}

export async function getExpertsByIds(expertIds: string[]): Promise<Expert[]> {
  if (!browser || expertIds.length === 0) return [];
  
  // Note: This is a simplified implementation
  // In production, you'd want to use 'in' queries or batch requests
  const experts: Expert[] = [];
  for (const id of expertIds) {
    const expert = await getExpert(id);
    if (expert) experts.push(expert);
  }
  return experts;
}

export async function sendBulkInvitations(invitations: any[]): Promise<void> {
  // Stub implementation for now
  console.log('Bulk invitations not implemented yet:', invitations);
}

export async function removePanelFromExpert(expertId: string, panelId: string): Promise<void> {
  // Stub implementation for now
  console.log('Remove panel from expert not implemented yet:', expertId, panelId);
}