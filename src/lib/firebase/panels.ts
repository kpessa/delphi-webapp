import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  arrayUnion,
  arrayRemove,
  type QueryConstraint
} from 'firebase/firestore';
import { db } from './config';
import type { Panel } from './types';

export type { Panel };

const COLLECTION_NAME = 'panels';

export async function createPanel(panel: Omit<Panel, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...panel,
    expertIds: panel.expertIds || [],
    createdAt: new Date(),
    updatedAt: new Date()
  });
  return docRef.id;
}

export async function updatePanel(id: string, updates: Partial<Panel>): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: new Date()
  });
}

export async function deletePanel(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
}

export async function getPanel(id: string): Promise<Panel | null> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const snapshot = await getDoc(docRef);
  
  if (!snapshot.exists()) {
    return null;
  }
  
  const data = snapshot.data();
  return {
    id: snapshot.id,
    ...data,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date()
  } as Panel;
}

export async function getPanels(constraints: QueryConstraint[] = []): Promise<Panel[]> {
  const q = query(collection(db, COLLECTION_NAME), ...constraints, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    } as Panel;
  });
}

export async function getPanelsByAdmin(adminId: string): Promise<Panel[]> {
  return getPanels([where('adminIds', 'array-contains', adminId)]);
}

export async function getPanelsByExpert(expertId: string): Promise<Panel[]> {
  return getPanels([where('expertIds', 'array-contains', expertId)]);
}

export async function addExpertToPanel(panelId: string, expertId: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, panelId);
  await updateDoc(docRef, {
    expertIds: arrayUnion(expertId),
    updatedAt: new Date()
  });
}

export async function removeExpertFromPanel(panelId: string, expertId: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, panelId);
  await updateDoc(docRef, {
    expertIds: arrayRemove(expertId),
    updatedAt: new Date()
  });
}

export async function addAdminToPanel(panelId: string, adminId: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, panelId);
  await updateDoc(docRef, {
    adminIds: arrayUnion(adminId),
    updatedAt: new Date()
  });
}

export async function removeAdminFromPanel(panelId: string, adminId: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, panelId);
  await updateDoc(docRef, {
    adminIds: arrayRemove(adminId),
    updatedAt: new Date()
  });
}

export interface PanelInvitation {
  id?: string;
  panelId: string;
  email: string;
  token: string;
  status: 'pending' | 'accepted' | 'declined';
  invitedBy: string;
  createdAt: Date;
  acceptedAt?: Date;
}

const INVITATIONS_COLLECTION = 'panelInvitations';

export async function createPanelInvitation(invitation: Omit<PanelInvitation, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, INVITATIONS_COLLECTION), {
    ...invitation,
    createdAt: new Date()
  });
  return docRef.id;
}

export async function getInvitationByToken(token: string): Promise<PanelInvitation | null> {
  const q = query(collection(db, INVITATIONS_COLLECTION), where('token', '==', token));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return null;
  }
  
  const doc = snapshot.docs[0];
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate() || new Date(),
    acceptedAt: data.acceptedAt?.toDate()
  } as PanelInvitation;
}

export async function acceptInvitation(invitationId: string): Promise<void> {
  const docRef = doc(db, INVITATIONS_COLLECTION, invitationId);
  await updateDoc(docRef, {
    status: 'accepted',
    acceptedAt: new Date()
  });
}

export async function getInvitationsByPanel(panelId: string): Promise<PanelInvitation[]> {
  const q = query(collection(db, INVITATIONS_COLLECTION), where('panelId', '==', panelId), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      acceptedAt: data.acceptedAt?.toDate()
    } as PanelInvitation;
  });
}