import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  runTransaction,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from './config';
import type { Round, Topic, Feedback } from './types';

export async function createNewRound(topicId: string): Promise<Round> {
  if (typeof window === 'undefined') {
    throw new Error('Firebase operations must be run in browser environment');
  }

  try {
    return await runTransaction(db, async (transaction) => {
      // Get the topic to check current round
      const topicRef = doc(db, 'topics', topicId);
      const topicDoc = await transaction.get(topicRef);
      
      if (!topicDoc.exists()) {
        throw new Error('Topic not found');
      }
      
      const topic = topicDoc.data() as Topic;
      
      // Check if there's an active round
      const roundsRef = collection(db, 'rounds');
      const activeRoundQuery = query(
        roundsRef,
        where('topicId', '==', topicId),
        where('status', '==', 'active')
      );
      const activeRounds = await getDocs(activeRoundQuery);
      
      if (!activeRounds.empty) {
        throw new Error('There is already an active round for this topic');
      }
      
      // Create new round
      const newRoundNumber = topic.roundNumber + 1;
      const roundId = `${topicId}_round_${newRoundNumber}`;
      const newRound: Round = {
        id: roundId,
        topicId,
        roundNumber: newRoundNumber,
        status: 'active',
        startDate: new Date(),
      };
      
      // Update topic round number
      transaction.update(topicRef, {
        roundNumber: newRoundNumber,
        updatedAt: serverTimestamp()
      });
      
      // Create the round document
      transaction.set(doc(db, 'rounds', roundId), {
        ...newRound,
        startDate: Timestamp.fromDate(newRound.startDate)
      });
      
      return newRound;
    });
  } catch (error) {
    console.error('Error creating new round:', error);
    throw error;
  }
}

export async function completeRound(topicId: string, roundNumber: number): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('Firebase operations must be run in browser environment');
  }

  try {
    const roundId = `${topicId}_round_${roundNumber}`;
    const roundRef = doc(db, 'rounds', roundId);
    
    // Get AI-generated summary first
    const summary = await getRoundSummary(topicId, roundNumber);
    
    // Update round status
    await updateDoc(roundRef, {
      status: 'completed',
      endDate: serverTimestamp(),
      summary
    });
    
  } catch (error) {
    console.error('Error completing round:', error);
    throw error;
  }
}

export async function getRoundSummary(topicId: string, roundNumber: number): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('Firebase operations must be run in browser environment');
  }

  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated');
    }

    const idToken = await user.getIdToken();
    
    // Call the Cloud Function
    const response = await fetch(`${import.meta.env.VITE_FIREBASE_FUNCTIONS_URL}/generateRoundSummary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({ topicId, roundNumber })
    });

    if (!response.ok) {
      throw new Error('Failed to generate summary');
    }

    const result = await response.json();
    return result.summary;
  } catch (error) {
    console.error('Error getting round summary:', error);
    throw error;
  }
}

export async function getRoundsForTopic(topicId: string): Promise<Round[]> {
  if (typeof window === 'undefined') {
    throw new Error('Firebase operations must be run in browser environment');
  }

  try {
    const roundsRef = collection(db, 'rounds');
    const q = query(
      roundsRef, 
      where('topicId', '==', topicId),
      orderBy('roundNumber', 'asc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startDate: doc.data().startDate?.toDate() || new Date(),
      endDate: doc.data().endDate?.toDate()
    } as Round));
  } catch (error) {
    console.error('Error getting rounds:', error);
    throw error;
  }
}

export interface ConsensusMetrics {
  consensusLevel: number; // 0-100
  participationRate: number; // 0-100
  agreementScore: number; // 0-1
  standardDeviation: number;
  totalParticipants: number;
  totalFeedback: number;
}

export async function calculateConsensus(topicId: string, roundNumber: number): Promise<ConsensusMetrics> {
  if (typeof window === 'undefined') {
    throw new Error('Firebase operations must be run in browser environment');
  }

  try {
    // Get all feedback for this round
    const feedbackRef = collection(db, 'feedback');
    const q = query(
      feedbackRef,
      where('topicId', '==', topicId),
      where('roundNumber', '==', roundNumber)
    );
    
    const snapshot = await getDocs(q);
    const feedback = snapshot.docs.map(doc => doc.data() as Feedback);
    
    if (feedback.length === 0) {
      return {
        consensusLevel: 0,
        participationRate: 0,
        agreementScore: 0,
        standardDeviation: 0,
        totalParticipants: 0,
        totalFeedback: 0
      };
    }
    
    // Get unique participants
    const uniqueExperts = new Set(feedback.map(f => f.expertId));
    const totalParticipants = uniqueExperts.size;
    
    // Calculate vote distribution
    const voteCounts = feedback.map(f => f.voteCount);
    const totalVotes = voteCounts.reduce((sum, count) => sum + count, 0);
    const avgVotes = totalVotes / feedback.length;
    
    // Calculate standard deviation
    const variance = voteCounts.reduce((sum, count) => {
      return sum + Math.pow(count - avgVotes, 2);
    }, 0) / feedback.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Calculate agreement score based on vote concentration
    const maxVotes = Math.max(...voteCounts);
    const agreementScore = maxVotes / (totalVotes || 1);
    
    // Calculate consensus level (inverse of normalized standard deviation)
    const maxPossibleStdDev = Math.sqrt(totalVotes * totalVotes / feedback.length);
    const normalizedStdDev = standardDeviation / (maxPossibleStdDev || 1);
    const consensusLevel = Math.round((1 - normalizedStdDev) * 100);
    
    // Get topic to calculate participation rate
    const topicDoc = await getDoc(doc(db, 'topics', topicId));
    const topic = topicDoc.data() as Topic;
    const panelDoc = await getDoc(doc(db, 'panels', topic.panelId));
    const totalExperts = panelDoc.data()?.expertIds?.length || 1;
    const participationRate = Math.round((totalParticipants / totalExperts) * 100);
    
    return {
      consensusLevel: Math.max(0, Math.min(100, consensusLevel)),
      participationRate: Math.max(0, Math.min(100, participationRate)),
      agreementScore: Math.max(0, Math.min(1, agreementScore)),
      standardDeviation,
      totalParticipants,
      totalFeedback: feedback.length
    };
  } catch (error) {
    console.error('Error calculating consensus:', error);
    throw error;
  }
}

export async function getCurrentRound(topicId: string): Promise<Round | null> {
  if (typeof window === 'undefined') {
    throw new Error('Firebase operations must be run in browser environment');
  }

  try {
    const roundsRef = collection(db, 'rounds');
    const q = query(
      roundsRef,
      where('topicId', '==', topicId),
      where('status', '==', 'active')
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
      startDate: doc.data().startDate?.toDate() || new Date(),
      endDate: doc.data().endDate?.toDate()
    } as Round;
  } catch (error) {
    console.error('Error getting current round:', error);
    throw error;
  }
}