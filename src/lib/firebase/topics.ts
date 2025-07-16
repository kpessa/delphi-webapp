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
	runTransaction,
	type QueryConstraint,
	limit,
	Timestamp,
	onSnapshot,
	type Unsubscribe
} from 'firebase/firestore';
import type { Topic } from './types';
import { browser } from '$app/environment';

const TOPICS_COLLECTION = 'topics';

export async function createTopic(topic: Omit<Topic, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
	if (!auth.currentUser) {
		throw new Error('User must be authenticated to create a topic');
	}

	// Ensure createdBy is set correctly
	const topicData = {
		...topic,
		createdBy: topic.createdBy || auth.currentUser.uid,
		createdAt: serverTimestamp(),
		updatedAt: serverTimestamp()
	};
	
	// Remove any undefined values to prevent Firestore errors
	Object.keys(topicData).forEach(key => {
		if (topicData[key] === undefined) {
			delete topicData[key];
		}
	});
	
	// Create topic and first round in a transaction
	return await runTransaction(db, async (transaction) => {
		// Create the topic with 2 rounds by default
		const topicRef = doc(collection(db, TOPICS_COLLECTION));
		const topicDataWithRounds = {
			...topicData,
			totalRounds: 2,
			roundNumber: 1
		};
		transaction.set(topicRef, topicDataWithRounds);
		
		// Create the first round
		const roundRef = doc(collection(db, 'rounds'));
		const roundData = {
			topicId: topicRef.id,
			roundNumber: 1,
			status: 'active',
			startDate: serverTimestamp()
		};
		transaction.set(roundRef, roundData);
		
		// Update topic with current round ID and active status
		transaction.update(topicRef, {
			currentRoundId: roundRef.id,
			status: 'active'
		});
		
		return topicRef.id;
	});
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

export function subscribeTopic(
  topicId: string,
  callback: (topic: Topic | null) => void
): Unsubscribe {
  if (!browser) {
    callback(null);
    return () => {};
  }

  const docRef = doc(db, TOPICS_COLLECTION, topicId);
  
  return onSnapshot(docRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      callback({
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate()
      } as Topic);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error('Error subscribing to topic:', error);
    callback(null);
  });
}

export async function getTopics(filters?: {
	creatorId?: string;
	status?: Topic['status'];
	panelId?: string;
	limit?: number;
}): Promise<Topic[]> {
	const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];

	if (filters?.creatorId) {
		constraints.push(where('createdBy', '==', filters.creatorId));
	}

	if (filters?.status) {
		constraints.push(where('status', '==', filters.status));
	}

	if (filters?.panelId) {
		constraints.push(where('panelId', '==', filters.panelId));
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

export async function getTopicsByCreator(creatorId: string): Promise<Topic[]> {
	return getTopics({ creatorId });
}

export async function getActiveTopics(): Promise<Topic[]> {
	return getTopics({ status: 'active' });
}

export async function getTopicsByPanel(panelId: string): Promise<Topic[]> {
	return getTopics({ panelId });
}