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
	type QueryConstraint,
	limit,
	Timestamp
} from 'firebase/firestore';
import type { Topic } from './types';

const TOPICS_COLLECTION = 'topics';

export async function createTopic(topic: Omit<Topic, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
	if (!auth.currentUser) {
		throw new Error('User must be authenticated to create a topic');
	}

	const docRef = await addDoc(collection(db, TOPICS_COLLECTION), {
		...topic,
		creatorId: auth.currentUser.uid,
		createdAt: serverTimestamp(),
		updatedAt: serverTimestamp()
	});

	return docRef.id;
}

export async function updateTopic(id: string, updates: Partial<Topic>): Promise<void> {
	if (!auth.currentUser) {
		throw new Error('User must be authenticated to update a topic');
	}

	const topicRef = doc(db, TOPICS_COLLECTION, id);
	
	// Remove fields that shouldn't be updated
	const { id: _, createdAt, ...updateData } = updates;
	
	await updateDoc(topicRef, {
		...updateData,
		updatedAt: serverTimestamp()
	});
}

export async function deleteTopic(id: string): Promise<void> {
	if (!auth.currentUser) {
		throw new Error('User must be authenticated to delete a topic');
	}

	await deleteDoc(doc(db, TOPICS_COLLECTION, id));
}

export async function getTopic(id: string): Promise<Topic | null> {
	const docSnap = await getDoc(doc(db, TOPICS_COLLECTION, id));
	
	if (!docSnap.exists()) {
		return null;
	}

	const data = docSnap.data();
	return {
		id: docSnap.id,
		...data,
		createdAt: data.createdAt?.toDate() || new Date(),
		updatedAt: data.updatedAt?.toDate() || new Date()
	} as Topic;
}

export async function getTopics(filters?: {
	panelId?: string;
	creatorId?: string;
	status?: Topic['status'];
	limit?: number;
}): Promise<Topic[]> {
	const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];

	if (filters?.panelId) {
		constraints.push(where('panelId', '==', filters.panelId));
	}

	if (filters?.creatorId) {
		constraints.push(where('creatorId', '==', filters.creatorId));
	}

	if (filters?.status) {
		constraints.push(where('status', '==', filters.status));
	}

	if (filters?.limit) {
		constraints.push(limit(filters.limit));
	}

	const q = query(collection(db, TOPICS_COLLECTION), ...constraints);
	const querySnapshot = await getDocs(q);

	return querySnapshot.docs.map(doc => {
		const data = doc.data();
		return {
			id: doc.id,
			...data,
			createdAt: data.createdAt?.toDate() || new Date(),
			updatedAt: data.updatedAt?.toDate() || new Date()
		} as Topic;
	});
}

export async function getTopicsByPanel(panelId: string): Promise<Topic[]> {
	return getTopics({ panelId });
}

export async function getTopicsByCreator(creatorId: string): Promise<Topic[]> {
	return getTopics({ creatorId });
}

export async function getActiveTopics(): Promise<Topic[]> {
	return getTopics({ status: 'active' });
}