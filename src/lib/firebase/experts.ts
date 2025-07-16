import { db, auth } from './config';
import {
	collection,
	doc,
	getDoc,
	getDocs,
	addDoc,
	updateDoc,
	deleteDoc,
	query,
	where,
	orderBy,
	serverTimestamp,
	onSnapshot,
	type Unsubscribe
} from 'firebase/firestore';
export type Expert = {
  id?: string;
  panelId: string;
  email: string;
  name: string;
  organization?: string;
  expertise?: string;
  status: 'invited' | 'accepted' | 'declined';
  invitedBy: string;
  invitedAt: Date;
  acceptedAt?: Date;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
};
import { browser } from '$app/environment';

const EXPERTS_COLLECTION = 'experts';

export async function createExpert(expert: Omit<Expert, 'id' | 'createdAt' | 'updatedAt' | 'invitedAt'>): Promise<string> {
	if (!auth.currentUser) {
		throw new Error('User must be authenticated to create an expert');
	}

	const docRef = await addDoc(collection(db, EXPERTS_COLLECTION), {
		...expert,
		invitedBy: auth.currentUser.uid,
		invitedAt: serverTimestamp(),
		createdAt: serverTimestamp(),
		updatedAt: serverTimestamp()
	});

	return docRef.id;
}

export async function updateExpert(id: string, updates: Partial<Expert>): Promise<void> {
	if (!auth.currentUser) {
		throw new Error('User must be authenticated to update an expert');
	}

	const expertRef = doc(db, EXPERTS_COLLECTION, id);
	
	// Remove fields that shouldn't be updated
	const { id: _, createdAt, invitedAt, ...updateData } = updates;
	
	await updateDoc(expertRef, {
		...updateData,
		updatedAt: serverTimestamp()
	});
}

export async function deleteExpert(id: string): Promise<void> {
	if (!auth.currentUser) {
		throw new Error('User must be authenticated to delete an expert');
	}

	await deleteDoc(doc(db, EXPERTS_COLLECTION, id));
}

export async function getExpert(id: string): Promise<Expert | null> {
	const docSnap = await getDoc(doc(db, EXPERTS_COLLECTION, id));
	
	if (!docSnap.exists()) {
		return null;
	}

	const data = docSnap.data();
	return {
		id: docSnap.id,
		...data,
		invitedAt: data.invitedAt?.toDate() || new Date(),
		acceptedAt: data.acceptedAt?.toDate(),
		createdAt: data.createdAt?.toDate() || new Date(),
		updatedAt: data.updatedAt?.toDate() || new Date()
	} as Expert;
}

export async function getExperts(filters?: {
	panelId?: string;
	status?: Expert['status'];
	userId?: string;
}): Promise<Expert[]> {
	const constraints = [orderBy('createdAt', 'desc')];

	if (filters?.panelId) {
		constraints.push(where('panelId', '==', filters.panelId));
	}

	if (filters?.status) {
		constraints.push(where('status', '==', filters.status));
	}

	if (filters?.userId) {
		constraints.push(where('userId', '==', filters.userId));
	}

	const q = query(collection(db, EXPERTS_COLLECTION), ...constraints);
	const querySnapshot = await getDocs(q);

	return querySnapshot.docs.map(doc => {
		const data = doc.data();
		return {
			id: doc.id,
			...data,
			invitedAt: data.invitedAt?.toDate() || new Date(),
			acceptedAt: data.acceptedAt?.toDate(),
			createdAt: data.createdAt?.toDate() || new Date(),
			updatedAt: data.updatedAt?.toDate() || new Date()
		} as Expert;
	});
}

export async function getExpertsByPanel(panelId: string): Promise<Expert[]> {
	return getExperts({ panelId });
}

export async function getExpertsByUser(userId: string): Promise<Expert[]> {
	return getExperts({ userId });
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

export async function acceptExpertInvitation(expertId: string): Promise<void> {
	if (!auth.currentUser) {
		throw new Error('User must be authenticated to accept invitation');
	}

	const expertRef = doc(db, EXPERTS_COLLECTION, expertId);
	await updateDoc(expertRef, {
		status: 'accepted',
		acceptedAt: serverTimestamp(),
		userId: auth.currentUser.uid,
		updatedAt: serverTimestamp()
	});
}

export async function declineExpertInvitation(expertId: string): Promise<void> {
	if (!auth.currentUser) {
		throw new Error('User must be authenticated to decline invitation');
	}

	const expertRef = doc(db, EXPERTS_COLLECTION, expertId);
	await updateDoc(expertRef, {
		status: 'declined',
		updatedAt: serverTimestamp()
	});
}