import { 
  doc, 
  getDoc,
  getDocs,
  collection,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  onSnapshot,
  type Unsubscribe,
  type QueryConstraint
} from 'firebase/firestore';
import { db } from './config';
import type { Topic } from './types';
import { browser } from '$app/environment';

const TOPICS_COLLECTION = 'topics';

export async function getTopic(topicId: string): Promise<Topic | null> {
  if (!browser) return null;
  
  try {
    const docRef = doc(db, TOPICS_COLLECTION, topicId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate()
      } as Topic;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching topic:', error);
    return null;
  }
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

export async function createTopic(topic: Omit<Topic, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  if (!browser) throw new Error('Firebase operations require browser environment');
  
  const topicData = {
    ...topic,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  const docRef = await addDoc(collection(db, TOPICS_COLLECTION), topicData);
  return docRef.id;
}

export async function updateTopic(topicId: string, updates: Partial<Topic>): Promise<void> {
  if (!browser) throw new Error('Firebase operations require browser environment');
  
  const docRef = doc(db, TOPICS_COLLECTION, topicId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.now()
  });
}

export async function getTopics(filters?: {
  panelId?: string;
  creatorId?: string;
  status?: Topic['status'];
  limit?: number;
}): Promise<Topic[]> {
  if (!browser) return [];

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
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate()
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