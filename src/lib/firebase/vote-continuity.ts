import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './config';
import type { Feedback, AgreementLevel } from './types';

/**
 * Get a user's previous round agreements for vote continuity
 */
export async function getPreviousRoundAgreements(
  topicId: string,
  currentRoundNumber: number,
  expertId: string
): Promise<Record<string, AgreementLevel>> {
  if (typeof window === 'undefined') {
    throw new Error('Firebase operations must be run in browser environment');
  }

  try {
    const previousRoundNumber = currentRoundNumber - 1;
    if (previousRoundNumber < 1) {
      return {}; // No previous round
    }

    // Get all feedback from the previous round
    const feedbackRef = collection(db, 'feedback');
    const q = query(
      feedbackRef,
      where('topicId', '==', topicId),
      where('roundNumber', '==', previousRoundNumber)
    );

    const snapshot = await getDocs(q);
    const previousFeedback = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Feedback[];

    // Extract user's agreements from previous round
    const previousAgreements: Record<string, AgreementLevel> = {};
    
    previousFeedback.forEach(feedback => {
      if (feedback.agreements && feedback.agreements[expertId] !== undefined) {
        // Map feedback ID to the user's previous agreement level
        previousAgreements[feedback.id!] = feedback.agreements[expertId];
      }
    });

    return previousAgreements;
  } catch (error) {
    console.error('Error getting previous round agreements:', error);
    return {};
  }
}

/**
 * Get agreement trends for a specific feedback item across rounds
 */
export async function getFeedbackAgreementTrends(
  topicId: string,
  feedbackId: string,
  maxRounds: number = 5
): Promise<Array<{
  roundNumber: number;
  averageAgreement: number;
  participantCount: number;
  consensusLevel: number;
}>> {
  if (typeof window === 'undefined') {
    throw new Error('Firebase operations must be run in browser environment');
  }

  try {
    const trends = [];

    for (let round = 1; round <= maxRounds; round++) {
      const feedbackRef = collection(db, 'feedback');
      const q = query(
        feedbackRef,
        where('topicId', '==', topicId),
        where('roundNumber', '==', round)
      );

      const snapshot = await getDocs(q);
      const roundFeedback = snapshot.docs.find(doc => doc.id === feedbackId);

      if (roundFeedback?.data().agreements) {
        const agreements = Object.values(roundFeedback.data().agreements) as number[];
        const averageAgreement = agreements.reduce((sum, level) => sum + level, 0) / agreements.length;
        
        // Calculate consensus as concentration around the mean
        const variance = agreements.reduce((sum, level) => 
          sum + Math.pow(level - averageAgreement, 2), 0) / agreements.length;
        const standardDeviation = Math.sqrt(variance);
        const consensusLevel = Math.max(0, (1.0 - Math.min(standardDeviation, 1.0)) * 100);

        trends.push({
          roundNumber: round,
          averageAgreement: Math.round(averageAgreement * 100) / 100,
          participantCount: agreements.length,
          consensusLevel: Math.round(consensusLevel)
        });
      }
    }

    return trends;
  } catch (error) {
    console.error('Error getting feedback agreement trends:', error);
    return [];
  }
}

/**
 * Calculate opinion stability for an expert across rounds
 */
export async function calculateExpertStability(
  topicId: string,
  expertId: string,
  currentRoundNumber: number
): Promise<{
  averageChange: number;
  stabilityScore: number; // 0-100, higher = more stable
  totalChanges: number;
}> {
  if (typeof window === 'undefined') {
    throw new Error('Firebase operations must be run in browser environment');
  }

  try {
    const changes = [];

    for (let round = 2; round <= currentRoundNumber; round++) {
      const currentAgreements = await getPreviousRoundAgreements(topicId, round + 1, expertId);
      const previousAgreements = await getPreviousRoundAgreements(topicId, round, expertId);

      // Compare agreements for same feedback items
      Object.keys(currentAgreements).forEach(feedbackId => {
        if (previousAgreements[feedbackId] !== undefined) {
          const change = Math.abs(currentAgreements[feedbackId] - previousAgreements[feedbackId]);
          changes.push(change);
        }
      });
    }

    if (changes.length === 0) {
      return { averageChange: 0, stabilityScore: 100, totalChanges: 0 };
    }

    const averageChange = changes.reduce((sum, change) => sum + change, 0) / changes.length;
    const stabilityScore = Math.max(0, (1 - averageChange / 4) * 100); // 4 is max possible change (-2 to +2)

    return {
      averageChange: Math.round(averageChange * 100) / 100,
      stabilityScore: Math.round(stabilityScore),
      totalChanges: changes.length
    };
  } catch (error) {
    console.error('Error calculating expert stability:', error);
    return { averageChange: 0, stabilityScore: 0, totalChanges: 0 };
  }
}