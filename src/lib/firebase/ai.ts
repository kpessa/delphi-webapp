import { auth } from './config';
import type { ExtractTopicRequest, ExtractTopicResponse } from './types';

const FUNCTIONS_URL = import.meta.env.VITE_FUNCTIONS_URL || 'http://localhost:5001/delphi-webapp/us-central1';

export async function extractTopicFromText(rawText: string, panelContext?: string): Promise<ExtractTopicResponse> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated to extract topics');
  }

  const idToken = await user.getIdToken();

  const response = await fetch(`${FUNCTIONS_URL}/extractTopic`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      rawText,
      panelContext,
    } as ExtractTopicRequest),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to extract topic');
  }

  return response.json();
}

export async function generateRoundSummary(topicId: string, roundNumber: number): Promise<{ summary: string }> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated');
  }

  const idToken = await user.getIdToken();

  const response = await fetch(`${FUNCTIONS_URL}/generateRoundSummary`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      topicId,
      roundNumber,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate summary');
  }

  return response.json();
}