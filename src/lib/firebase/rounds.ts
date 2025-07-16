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
import type { Round, Topic, Feedback, Panel } from './types';

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
        updatedAt: new Date()
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
    
    // Collect all agreement levels from all feedback items
    const allAgreements: number[] = [];
    const uniqueExperts = new Set<string>();
    
    feedback.forEach(item => {
      uniqueExperts.add(item.expertId);
      if (item.agreements) {
        Object.values(item.agreements).forEach(level => {
          allAgreements.push(level as number);
        });
      }
    });
    
    const totalParticipants = uniqueExperts.size;
    
    if (allAgreements.length === 0) {
      return {
        consensusLevel: 0,
        participationRate: 0,
        agreementScore: 0,
        standardDeviation: 0,
        totalParticipants,
        totalFeedback: feedback.length
      };
    }
    
    // Calculate statistics on agreement levels
    const avgAgreement = allAgreements.reduce((sum, level) => sum + level, 0) / allAgreements.length;
    
    // Calculate standard deviation of agreement levels
    const variance = allAgreements.reduce((sum, level) => {
      return sum + Math.pow(level - avgAgreement, 2);
    }, 0) / allAgreements.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Calculate consensus level based on research-informed metrics
    // 1. Low standard deviation indicates consensus (research: SD ≤ 1.0 for 5-point scales)
    const sdConsensus = Math.max(0, (1.0 - Math.min(standardDeviation, 1.0)) * 100);
    
    // 2. High absolute average agreement indicates strong consensus
    const avgConsensus = Math.abs(avgAgreement) / 2 * 100; // Normalize to 0-100
    
    // 3. Agreement concentration (% of experts agreeing in same direction)
    const positiveCount = allAgreements.filter(level => level > 0).length;
    const negativeCount = allAgreements.filter(level => level < 0).length;
    const neutralCount = allAgreements.filter(level => level === 0).length;
    const maxDirectionCount = Math.max(positiveCount, negativeCount, neutralCount);
    const directionConsensus = (maxDirectionCount / allAgreements.length) * 100;
    
    // Combined consensus score (weighted average)
    const consensusLevel = Math.round(
      (sdConsensus * 0.4) + (avgConsensus * 0.3) + (directionConsensus * 0.3)
    );
    
    // Agreement score (strength of consensus direction)
    const agreementScore = Math.abs(avgAgreement) / 2; // 0-1 scale
    
    // Get topic to calculate participation rate from panel
    const topicDoc = await getDoc(doc(db, 'topics', topicId));
    const topic = topicDoc.data() as Topic;
    
    // Get panel to calculate total experts
    const panelDoc = await getDoc(doc(db, 'panels', topic.panelId));
    const panel = panelDoc.data() as Panel;
    const totalExperts = (panel?.adminIds?.length || 0) + (panel?.expertIds?.length || 0) || 1;
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