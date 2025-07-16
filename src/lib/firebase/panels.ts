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
  arrayUnion,
  arrayRemove,
  type Unsubscribe
} from 'firebase/firestore';
import { db } from './config';
import type { Panel } from './types';
import { browser } from '$app/environment';

const PANELS_COLLECTION = 'panels';

export async function getPanel(panelId: string): Promise<Panel | null> {
  if (!browser) return null;
  
  try {
    const docRef = doc(db, PANELS_COLLECTION, panelId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate()
      } as Panel;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching panel:', error);
    return null;
  }
}

export async function getPanels(): Promise<Panel[]> {
  if (!browser) return [];
  
  try {
    const q = query(
      collection(db, PANELS_COLLECTION),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate()
      } as Panel;
    });
  } catch (error) {
    console.error('Error fetching panels:', error);
    return [];
  }
}

export function subscribePanel(
  panelId: string,
  callback: (panel: Panel | null) => void
): Unsubscribe {
  if (!browser) {
    callback(null);
    return () => {};
  }

  const docRef = doc(db, PANELS_COLLECTION, panelId);
  
  return onSnapshot(docRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      callback({
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate()
      } as Panel);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error('Error subscribing to panel:', error);
    callback(null);
  });
}

export async function createPanel(panel: Omit<Panel, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  if (!browser) throw new Error('Firebase operations require browser environment');
  
  const panelData = {
    ...panel,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  const docRef = await addDoc(collection(db, PANELS_COLLECTION), panelData);
  return docRef.id;
}

export async function updatePanel(panelId: string, updates: Partial<Panel>): Promise<void> {
  if (!browser) throw new Error('Firebase operations require browser environment');
  
  const docRef = doc(db, PANELS_COLLECTION, panelId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.now()
  });
}

// Temporary type for panel invitations
export interface PanelInvitation {
  id?: string;
  panelId: string;
  email: string;
  status: 'pending' | 'accepted' | 'declined';
  invitedBy: string;
  invitedAt: Date;
}

export async function getInvitationsByPanel(panelId: string): Promise<PanelInvitation[]> {
  // Stub implementation for now
  if (!browser) return [];
  
  console.log('Panel invitations not implemented yet for panel:', panelId);
  return [];
}

export async function removeExpertFromPanel(panelId: string, expertId: string): Promise<void> {
  if (!browser) throw new Error('Firebase operations require browser environment');
  
  const docRef = doc(db, PANELS_COLLECTION, panelId);
  await updateDoc(docRef, {
    expertIds: arrayRemove(expertId),
    updatedAt: Timestamp.now()
  });
}

export async function addExpertToPanel(panelId: string, expertId: string): Promise<void> {
  if (!browser) throw new Error('Firebase operations require browser environment');
  
  const docRef = doc(db, PANELS_COLLECTION, panelId);
  await updateDoc(docRef, {
    expertIds: arrayUnion(expertId),
    updatedAt: Timestamp.now()
  });
}