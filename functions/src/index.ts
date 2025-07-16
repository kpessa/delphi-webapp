import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import OpenAI from 'openai';
import cors from 'cors';
import type { ExtractTopicRequest, ExtractTopicResponse, FeedbackType } from '../../src/lib/firebase/types';

// Initialize Firebase Admin
admin.initializeApp();

// Initialize OpenAI
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Enable CORS
const corsHandler = cors({ origin: true });

export const extractTopic = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      // Verify authentication
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const idToken = authHeader.split('Bearer ')[1];
      try {
        await admin.auth().verifyIdToken(idToken);
      } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
        return;
      }

      // Check if OpenAI is available
      if (!openai) {
        res.status(503).json({ error: 'OpenAI service not configured' });
        return;
      }

      // Get request data
      const { rawText, panelContext }: ExtractTopicRequest = req.body;

      if (!rawText || typeof rawText !== 'string') {
        res.status(400).json({ error: 'Missing or invalid rawText' });
        return;
      }

      // Create the prompt for OpenAI
      const systemPrompt = `You are an expert at extracting structured information from unstructured text to create topics for group discussion using the Delphi method.

The Delphi method is a structured communication technique for gathering expert opinions anonymously over multiple rounds to reach consensus.

Your task is to extract:
1. A clear, concise title (max 100 chars)
2. A detailed description providing context (max 500 chars)
3. A specific, actionable question that experts can provide feedback on
4. Suggested feedback types that would be most helpful

Context about the panel (if provided): ${panelContext || 'General purpose panel'}`;

      const userPrompt = `Extract a topic for Delphi method discussion from the following text:

${rawText}

Respond in JSON format with this structure:
{
  "title": "string",
  "description": "string",
  "question": "string",
  "suggestedFeedbackTypes": ["idea", "solution", "concern"],
  "confidence": 0.0-1.0
}`;

      // Call OpenAI
      const completion = await openai!.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 1000,
      });

      const result = JSON.parse(completion.choices[0].message.content || '{}');

      // Validate and ensure feedback types are valid
      const validFeedbackTypes: FeedbackType[] = ['idea', 'solution', 'concern', 'vote', 'refinement'];
      result.suggestedFeedbackTypes = result.suggestedFeedbackTypes.filter(
        (type: string) => validFeedbackTypes.includes(type as FeedbackType)
      );

      // If no valid types, default to common ones
      if (result.suggestedFeedbackTypes.length === 0) {
        result.suggestedFeedbackTypes = ['idea', 'solution', 'concern'];
      }

      const response: ExtractTopicResponse = {
        title: result.title || 'Untitled Topic',
        description: result.description || '',
        question: result.question || 'What are your thoughts on this topic?',
        suggestedFeedbackTypes: result.suggestedFeedbackTypes,
        confidence: result.confidence || 0.7,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error extracting topic:', error);
      res.status(500).json({ error: 'Failed to extract topic' });
    }
  });
});

// Function to generate round summaries
export const generateRoundSummary = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      // Similar auth check...
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Check if OpenAI is available
      if (!openai) {
        res.status(503).json({ error: 'OpenAI service not configured' });
        return;
      }

      const { topicId, roundNumber } = req.body;

      // Fetch feedback from Firestore
      const feedbackSnapshot = await admin.firestore()
        .collection('feedback')
        .where('topicId', '==', topicId)
        .where('roundNumber', '==', roundNumber)
        .get();

      const feedback = feedbackSnapshot.docs.map(doc => doc.data());

      if (feedback.length === 0) {
        res.status(200).json({ summary: 'No feedback provided in this round.' });
        return;
      }

      // Create summary prompt
      const feedbackText = feedback.map(f => `${f.type}: ${f.content}`).join('\n');
      
      const completion = await openai!.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'Summarize the key themes, agreements, and disagreements from this Delphi method round feedback.'
          },
          {
            role: 'user',
            content: feedbackText
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      res.status(200).json({ 
        summary: completion.choices[0].message.content 
      });
    } catch (error) {
      console.error('Error generating summary:', error);
      res.status(500).json({ error: 'Failed to generate summary' });
    }
  });
});