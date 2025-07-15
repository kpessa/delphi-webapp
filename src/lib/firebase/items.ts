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
  type QueryConstraint
} from 'firebase/firestore';
import { db } from './config';
import type { Item, ItemType, ItemCategory, ItemScope } from './types';

export type { Item };

const COLLECTION_NAME = 'items';

export async function createItem(item: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...item,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  return docRef.id;
}

export async function updateItem(id: string, updates: Partial<Item>): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: new Date()
  });
}

export async function deleteItem(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
}

export async function getItem(id: string): Promise<Item | null> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const snapshot = await getDoc(docRef);
  
  if (!snapshot.exists()) {
    return null;
  }
  
  return {
    id: snapshot.id,
    ...snapshot.data()
  } as Item;
}

export async function getItemsByAdmin(adminId: string): Promise<Item[]> {
  try {
    // Try the optimized query first
    const constraints: QueryConstraint[] = [
      where('adminIds', 'array-contains', adminId),
      orderBy('createdAt', 'desc')
    ];
    
    const q = query(collection(db, COLLECTION_NAME), ...constraints);
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Item));
  } catch (error: any) {
    // If index is not ready, fall back to simpler query and sort in memory
    if (error.code === 'failed-precondition' && error.message.includes('index')) {
      console.warn('Index not ready, using fallback query');
      
      const simpleQuery = query(
        collection(db, COLLECTION_NAME),
        where('adminIds', 'array-contains', adminId)
      );
      const snapshot = await getDocs(simpleQuery);
      
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Item));
      
      // Sort by createdAt in memory
      return items.sort((a, b) => {
        const aDate = a.createdAt instanceof Date ? a.createdAt : a.createdAt.toDate();
        const bDate = b.createdAt instanceof Date ? b.createdAt : b.createdAt.toDate();
        return bDate.getTime() - aDate.getTime();
      });
    }
    throw error;
  }
}

export async function getItemsByExpert(expertId: string): Promise<Item[]> {
  const constraints: QueryConstraint[] = [
    where('expertIds', 'array-contains', expertId),
    where('status', '==', 'active'),
    orderBy('createdAt', 'desc')
  ];
  
  const q = query(collection(db, COLLECTION_NAME), ...constraints);
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Item));
}

// New functions for filtering by type, category, and scope
export async function getItemsByType(type: ItemType): Promise<Item[]> {
  const constraints: QueryConstraint[] = [
    where('type', '==', type),
    orderBy('createdAt', 'desc')
  ];
  
  const q = query(collection(db, COLLECTION_NAME), ...constraints);
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Item));
}

export async function getItemsByCategory(category: ItemCategory): Promise<Item[]> {
  const constraints: QueryConstraint[] = [
    where('category', '==', category),
    orderBy('createdAt', 'desc')
  ];
  
  const q = query(collection(db, COLLECTION_NAME), ...constraints);
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Item));
}

export async function getItemsByScope(scope: ItemScope): Promise<Item[]> {
  const constraints: QueryConstraint[] = [
    where('scope', '==', scope),
    orderBy('createdAt', 'desc')
  ];
  
  const q = query(collection(db, COLLECTION_NAME), ...constraints);
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Item));
}