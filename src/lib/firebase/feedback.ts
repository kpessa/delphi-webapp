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
	increment,
	arrayUnion,
	arrayRemove,
	type QueryConstraint,
	limit
} from 'firebase/firestore';
import type { Feedback } from './types';

const FEEDBACK_COLLECTION = 'feedback';

export async function createFeedback(feedback: Omit<Feedback, 'id' | 'createdAt' | 'updatedAt' | 'voteCount' | 'votedBy'>): Promise<string> {
	if (!auth.currentUser) {
		throw new Error('User must be authenticated to create feedback');
	}

	const docRef = await addDoc(collection(db, FEEDBACK_COLLECTION), {
		...feedback,
		expertId: auth.currentUser.uid,
		voteCount: 0,
		votedBy: [],
		createdAt: serverTimestamp(),
		updatedAt: serverTimestamp()
	});

	return docRef.id;
}

export async function updateFeedback(id: string, updates: Partial<Feedback>): Promise<void> {
	if (!auth.currentUser) {
		throw new Error('User must be authenticated to update feedback');
	}

	const feedbackRef = doc(db, FEEDBACK_COLLECTION, id);
	
	// Remove fields that shouldn't be updated
	const { id: _, createdAt, voteCount, votedBy, ...updateData } = updates;
	
	await updateDoc(feedbackRef, {
		...updateData,
		updatedAt: serverTimestamp()
	});
}

export async function deleteFeedback(id: string): Promise<void> {
	if (!auth.currentUser) {
		throw new Error('User must be authenticated to delete feedback');
	}

	await deleteDoc(doc(db, FEEDBACK_COLLECTION, id));
}

export async function getFeedback(id: string): Promise<Feedback | null> {
	const docSnap = await getDoc(doc(db, FEEDBACK_COLLECTION, id));
	
	if (!docSnap.exists()) {
		return null;
	}

	const data = docSnap.data();
	return {
		id: docSnap.id,
		...data,
		createdAt: data.createdAt?.toDate() || new Date(),
		updatedAt: data.updatedAt?.toDate() || new Date()
	} as Feedback;
}

export async function getFeedbackList(filters?: {
	topicId?: string;
	roundId?: string;
	expertId?: string;
	type?: Feedback['type'];
	parentId?: string;
	limit?: number;
}): Promise<Feedback[]> {
	const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];

	if (filters?.topicId) {
		constraints.push(where('topicId', '==', filters.topicId));
	}

	if (filters?.roundId) {
		constraints.push(where('roundId', '==', filters.roundId));
	}

	if (filters?.expertId) {
		constraints.push(where('expertId', '==', filters.expertId));
	}

	if (filters?.type) {
		constraints.push(where('type', '==', filters.type));
	}

	if (filters?.parentId !== undefined) {
		constraints.push(where('parentId', '==', filters.parentId));
	}

	if (filters?.limit) {
		constraints.push(limit(filters.limit));
	}

	const q = query(collection(db, FEEDBACK_COLLECTION), ...constraints);
	const querySnapshot = await getDocs(q);

	return querySnapshot.docs.map(doc => {
		const data = doc.data();
		return {
			id: doc.id,
			...data,
			createdAt: data.createdAt?.toDate() || new Date(),
			updatedAt: data.updatedAt?.toDate() || new Date()
		} as Feedback;
	});
}

export async function getFeedbackByTopic(topicId: string): Promise<Feedback[]> {
	return getFeedbackList({ topicId });
}

export async function getFeedbackByRound(roundId: string): Promise<Feedback[]> {
	return getFeedbackList({ roundId });
}

export async function getRefinements(parentId: string): Promise<Feedback[]> {
	return getFeedbackList({ parentId, type: 'refinement' });
}

export async function voteFeedback(feedbackId: string): Promise<void> {
	if (!auth.currentUser) {
		throw new Error('User must be authenticated to vote');
	}

	const feedbackRef = doc(db, FEEDBACK_COLLECTION, feedbackId);
	const feedbackDoc = await getDoc(feedbackRef);
	
	if (!feedbackDoc.exists()) {
		throw new Error('Feedback not found');
	}

	const votedBy = feedbackDoc.data().votedBy || [];
	const hasVoted = votedBy.includes(auth.currentUser.uid);

	if (hasVoted) {
		// Remove vote
		await updateDoc(feedbackRef, {
			voteCount: increment(-1),
			votedBy: arrayRemove(auth.currentUser.uid),
			updatedAt: serverTimestamp()
		});
	} else {
		// Add vote
		await updateDoc(feedbackRef, {
			voteCount: increment(1),
			votedBy: arrayUnion(auth.currentUser.uid),
			updatedAt: serverTimestamp()
		});
	}
}

export async function hasUserVoted(feedbackId: string, userId: string): Promise<boolean> {
	const feedback = await getFeedback(feedbackId);
	return feedback ? feedback.votedBy.includes(userId) : false;
}