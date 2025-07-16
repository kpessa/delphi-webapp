import { auth } from './config';
import type { ExtractTopicRequest, ExtractTopicResponse } from './types';

const FUNCTIONS_URL = import.meta.env.VITE_FUNCTIONS_URL || 'http://localhost:5001/delphi-webapp/us-central1';

export async function extractTopicFromText(rawText: string, panelContext?: string): Promise<ExtractTopicResponse> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated to extract topics');
  }

  try {
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
      throw new Error('Function unavailable');
    }

    return response.json();
  } catch (error) {
    // Fallback: Create a meaningful topic structure from the raw text
    console.warn('AI extraction unavailable, using enhanced fallback:', error);
    
    return createFallbackTopic(rawText, panelContext);
  }
}

function createFallbackTopic(rawText: string, panelContext?: string): ExtractTopicResponse {
  const text = rawText.trim();
  
  // Extract potential title from first sentence or line
  const firstSentence = text.split(/[.!?]\s+/)[0];
  const firstLine = text.split('\n')[0];
  const titleSource = firstSentence.length < firstLine.length ? firstSentence : firstLine;
  
  // Clean and create title
  let title = titleSource
    .replace(/^(subject|topic|discussion|re:?)\s*:?\s*/i, '') // Remove email prefixes
    .replace(/^\W+/, '') // Remove leading punctuation
    .trim();
  
  // If title is too long, find key phrases
  if (title.length > 80) {
    const words = title.split(/\s+/);
    const keyWords = words.filter(word => 
      word.length > 3 && 
      !/^(the|and|but|for|are|this|that|with|have|will|would|could|should)$/i.test(word)
    );
    title = keyWords.slice(0, 6).join(' ');
  }
  
  // Ensure title isn't empty
  if (!title || title.length < 3) {
    title = 'Discussion Topic';
  }
  
  // Create description (first paragraph or 2 sentences)
  const paragraphs = text.split('\n\n');
  const firstParagraph = paragraphs[0];
  const sentences = firstParagraph.split(/[.!?]\s+/);
  let description = sentences.slice(0, 2).join('. ');
  if (description.length > 400) {
    description = description.slice(0, 400) + '...';
  }
  
  // Create a meaningful question
  let question = '';
  
  // Look for existing questions in the text
  const questionMatches = text.match(/[^.!]*\?/g);
  if (questionMatches && questionMatches.length > 0) {
    question = questionMatches[0].trim();
  } else {
    // Generate question based on content patterns
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('should we') || lowerText.includes('what should')) {
      question = `What should be our approach to ${title.toLowerCase()}?`;
    } else if (lowerText.includes('problem') || lowerText.includes('issue') || lowerText.includes('challenge')) {
      question = `How should we address the challenges related to ${title.toLowerCase()}?`;
    } else if (lowerText.includes('implement') || lowerText.includes('proposal') || lowerText.includes('plan')) {
      question = `What are your thoughts on implementing this proposal for ${title.toLowerCase()}?`;
    } else if (lowerText.includes('policy') || lowerText.includes('procedure') || lowerText.includes('protocol')) {
      question = `How should we proceed with the policy regarding ${title.toLowerCase()}?`;
    } else if (lowerText.includes('budget') || lowerText.includes('cost') || lowerText.includes('funding')) {
      question = `What are your recommendations for the financial aspects of ${title.toLowerCase()}?`;
    } else {
      question = `What are your expert opinions on ${title.toLowerCase()}?`;
    }
  }
  
  // Determine suggested feedback types based on content
  const lowerText = text.toLowerCase();
  const suggestedTypes: ('idea' | 'solution' | 'concern')[] = ['idea'];
  
  if (lowerText.includes('problem') || lowerText.includes('issue') || lowerText.includes('challenge')) {
    suggestedTypes.push('solution', 'concern');
  } else if (lowerText.includes('proposal') || lowerText.includes('plan') || lowerText.includes('implement')) {
    suggestedTypes.push('solution', 'concern');
  } else {
    suggestedTypes.push('solution');
  }
  
  return {
    title: title.charAt(0).toUpperCase() + title.slice(1),
    description,
    question,
    suggestedFeedbackTypes: [...new Set(suggestedTypes)], // Remove duplicates
    confidence: 0.6 // Slightly higher confidence for enhanced processing
  };
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