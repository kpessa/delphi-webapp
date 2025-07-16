import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp,
  increment,
  arrayUnion,
  arrayRemove,
  type Unsubscribe
} from 'firebase/firestore';
import { db } from './config';
import type { Feedback } from './types';
import { browser } from '$app/environment';

const FEEDBACK_COLLECTION = 'feedback';

export async function submitFeedback(
  topicId: string, 
  feedback: Omit<Feedback, 'id' | 'createdAt' | 'updatedAt' | 'upvotes' | 'downvotes'>
): Promise<string> {
  if (!browser) throw new Error('Firebase operations require browser environment');
  
  const feedbackData = {
    ...feedback,
    topicId,
    upvotes: [],
    downvotes: [],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  const docRef = await addDoc(collection(db, FEEDBACK_COLLECTION), feedbackData);
  return docRef.id;
}

export function getFeedbackForTopic(
  topicId: string, 
  roundNumber: number,
  callback: (feedback: Feedback[]) => void
): Unsubscribe {
  if (!browser) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, FEEDBACK_COLLECTION),
    where('topicId', '==', topicId),
    where('roundNumber', '==', roundNumber),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const feedback: Feedback[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      feedback.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate()
      } as Feedback);
    });
    callback(feedback);
  });
}

export async function voteFeedback(
  feedbackId: string, 
  userId: string, 
  voteType: 'up' | 'down'
): Promise<void> {
  if (!browser) throw new Error('Firebase operations require browser environment');
  
  const feedbackRef = doc(db, FEEDBACK_COLLECTION, feedbackId);
  
  if (voteType === 'up') {
    await updateDoc(feedbackRef, {
      upvotes: arrayUnion(userId),
      downvotes: arrayRemove(userId), // Remove from downvotes if previously downvoted
      updatedAt: Timestamp.now()
    });
  } else {
    await updateDoc(feedbackRef, {
      downvotes: arrayUnion(userId),
      upvotes: arrayRemove(userId), // Remove from upvotes if previously upvoted
      updatedAt: Timestamp.now()
    });
  }
}

export async function removeVote(
  feedbackId: string,
  userId: string,
  voteType: 'up' | 'down'
): Promise<void> {
  if (!browser) throw new Error('Firebase operations require browser environment');
  
  const feedbackRef = doc(db, FEEDBACK_COLLECTION, feedbackId);
  
  if (voteType === 'up') {
    await updateDoc(feedbackRef, {
      upvotes: arrayRemove(userId),
      updatedAt: Timestamp.now()
    });
  } else {
    await updateDoc(feedbackRef, {
      downvotes: arrayRemove(userId),
      updatedAt: Timestamp.now()
    });
  }
}

export function subscribeToNewFeedback(
  topicId: string,
  roundNumber: number,
  onNewFeedback: (feedback: Feedback) => void
): Unsubscribe {
  if (!browser) return () => {};

  const q = query(
    collection(db, FEEDBACK_COLLECTION),
    where('topicId', '==', topicId),
    where('roundNumber', '==', roundNumber),
    orderBy('createdAt', 'desc')
  );

  let isInitialLoad = true;
  
  return onSnapshot(q, (snapshot) => {
    if (!isInitialLoad) {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          onNewFeedback({
            id: change.doc.id,
            ...data,
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate()
          } as Feedback);
        }
      });
    } else {
      isInitialLoad = false;
    }
  });
}