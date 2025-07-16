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
	arrayUnion,
	arrayRemove,
	onSnapshot,
	type Unsubscribe
} from 'firebase/firestore';
export type Panel = {
  id?: string;
  name: string;
  description: string;
  creatorId: string;
  adminIds: string[];
  expertIds: string[];
  status: 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
};
import { browser } from '$app/environment';

const PANELS_COLLECTION = 'panels';

export async function createPanel(panel: Omit<Panel, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
	if (!auth.currentUser) {
		throw new Error('User must be authenticated to create a panel');
	}

	const docRef = await addDoc(collection(db, PANELS_COLLECTION), {
		...panel,
		creatorId: auth.currentUser.uid,
		createdAt: serverTimestamp(),
		updatedAt: serverTimestamp()
	});

	return docRef.id;
}

export async function updatePanel(id: string, updates: Partial<Panel>): Promise<void> {
	if (!auth.currentUser) {
		throw new Error('User must be authenticated to update a panel');
	}

	const panelRef = doc(db, PANELS_COLLECTION, id);
	
	// Remove fields that shouldn't be updated
	const { id: _, createdAt, ...updateData } = updates;
	
	await updateDoc(panelRef, {
		...updateData,
		updatedAt: serverTimestamp()
	});
}

export async function deletePanel(id: string): Promise<void> {
	if (!auth.currentUser) {
		throw new Error('User must be authenticated to delete a panel');
	}

	await deleteDoc(doc(db, PANELS_COLLECTION, id));
}

export async function getPanel(id: string): Promise<Panel | null> {
	const docSnap = await getDoc(doc(db, PANELS_COLLECTION, id));
	
	if (!docSnap.exists()) {
		return null;
	}

	const data = docSnap.data();
	return {
		id: docSnap.id,
		...data,
		createdAt: data.createdAt?.toDate() || new Date(),
		updatedAt: data.updatedAt?.toDate() || new Date()
	} as Panel;
}

export async function getPanels(filters?: {
	creatorId?: string;
	status?: Panel['status'];
}): Promise<Panel[]> {
	const constraints = [orderBy('createdAt', 'desc')];

	if (filters?.creatorId) {
		constraints.push(where('creatorId', '==', filters.creatorId));
	}

	if (filters?.status) {
		constraints.push(where('status', '==', filters.status));
	}

	const q = query(collection(db, PANELS_COLLECTION), ...constraints);
	const querySnapshot = await getDocs(q);

	return querySnapshot.docs.map(doc => {
		const data = doc.data();
		return {
			id: doc.id,
			...data,
			createdAt: data.createdAt?.toDate() || new Date(),
			updatedAt: data.updatedAt?.toDate() || new Date()
		} as Panel;
	});
}

export async function getPanelsByCreator(creatorId: string): Promise<Panel[]> {
	return getPanels({ creatorId });
}

export async function getActivePanels(): Promise<Panel[]> {
	return getPanels({ status: 'active' });
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

export async function addExpertToPanel(panelId: string, expertId: string): Promise<void> {
	if (!auth.currentUser) {
		throw new Error('User must be authenticated to add expert to panel');
	}

	const panelRef = doc(db, PANELS_COLLECTION, panelId);
	await updateDoc(panelRef, {
		expertIds: arrayUnion(expertId),
		updatedAt: serverTimestamp()
	});
}

export async function removeExpertFromPanel(panelId: string, expertId: string): Promise<void> {
	if (!auth.currentUser) {
		throw new Error('User must be authenticated to remove expert from panel');
	}

	const panelRef = doc(db, PANELS_COLLECTION, panelId);
	await updateDoc(panelRef, {
		expertIds: arrayRemove(expertId),
		updatedAt: serverTimestamp()
	});
}