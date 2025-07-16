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
import type { Expert } from './types';

export type { Expert };

const COLLECTION_NAME = 'experts';

export async function createExpert(expert: Omit<Expert, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...expert,
    panelIds: expert.panelIds || [],
    createdAt: new Date(),
    updatedAt: new Date()
  });
  return docRef.id;
}

export async function updateExpert(id: string, updates: Partial<Expert>): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: new Date()
  });
}

export async function deleteExpert(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
}

export async function getExpert(id: string): Promise<Expert | null> {
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
  } as Expert;
}

export async function getExpertByUid(uid: string): Promise<Expert | null> {
  const q = query(collection(db, COLLECTION_NAME), where('uid', '==', uid));
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
    updatedAt: data.updatedAt?.toDate() || new Date()
  } as Expert;
}

export async function getExpertByEmail(email: string): Promise<Expert | null> {
  const q = query(collection(db, COLLECTION_NAME), where('email', '==', email));
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
    updatedAt: data.updatedAt?.toDate() || new Date()
  } as Expert;
}

export async function getExperts(constraints: QueryConstraint[] = []): Promise<Expert[]> {
  const q = query(collection(db, COLLECTION_NAME), ...constraints, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    } as Expert;
  });
}

export async function getExpertsByPanel(panelId: string): Promise<Expert[]> {
  return getExperts([where('panelIds', 'array-contains', panelId)]);
}

export async function getExpertsByIds(ids: string[]): Promise<Expert[]> {
  if (ids.length === 0) return [];
  
  const experts: Expert[] = [];
  for (const id of ids) {
    const expert = await getExpert(id);
    if (expert) {
      experts.push(expert);
    }
  }
  return experts;
}

export async function addPanelToExpert(expertId: string, panelId: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, expertId);
  await updateDoc(docRef, {
    panelIds: arrayUnion(panelId),
    updatedAt: new Date()
  });
}

export async function removePanelFromExpert(expertId: string, panelId: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, expertId);
  await updateDoc(docRef, {
    panelIds: arrayRemove(panelId),
    updatedAt: new Date()
  });
}

export async function createOrUpdateExpertFromAuth(user: { uid: string; email: string; displayName: string | null }): Promise<Expert> {
  let expert = await getExpertByUid(user.uid);
  
  if (!expert) {
    const expertId = await createExpert({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email.split('@')[0],
      panelIds: []
    });
    expert = await getExpert(expertId);
  } else {
    await updateExpert(expert.id!, {
      email: user.email,
      displayName: user.displayName || expert.displayName
    });
    expert = await getExpert(expert.id!);
  }
  
  return expert!;
}

export async function sendInvitationEmail(email: string, inviteLink: string, panelName: string): Promise<void> {
  console.log(`
    EMAIL INVITATION (stubbed):
    To: ${email}
    Subject: You've been invited to join "${panelName}" on Delphi
    
    You've been invited to join the panel "${panelName}" as an expert on the Delphi platform.
    
    Click here to accept the invitation: ${inviteLink}
    
    This link will expire in 7 days.
  `);
}

export async function sendBulkInvitations(emails: string[], panelId: string, panelName: string, invitedBy: string): Promise<{ sent: number; failed: string[] }> {
  const { createPanelInvitation } = await import('./panels');
  const sent = [];
  const failed = [];
  
  for (const email of emails) {
    try {
      const token = crypto.randomUUID();
      const invitationId = await createPanelInvitation({
        panelId,
        email: email.trim().toLowerCase(),
        token,
        status: 'pending',
        invitedBy
      });
      
      const inviteLink = `${window.location.origin}/invite/${token}`;
      await sendInvitationEmail(email, inviteLink, panelName);
      sent.push(email);
    } catch (error) {
      console.error(`Failed to send invitation to ${email}:`, error);
      failed.push(email);
    }
  }
  
  return { sent: sent.length, failed };
}