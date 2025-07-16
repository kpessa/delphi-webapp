import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import OpenAI from 'openai';
import sgMail from '@sendgrid/mail';
import cors from 'cors';
import type { ExtractTopicRequest, ExtractTopicResponse, FeedbackType, PanelInvitation } from '../../src/lib/firebase/types';

// Initialize Firebase Admin
admin.initializeApp();

// Initialize OpenAI
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

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

// Function to send invitation emails (v1)
export const sendInvitationEmail = functions.https.onCall(async (data: any, context: any) => {
  console.log('sendInvitationEmail called with data:', data);
  console.log('Auth context:', context.auth?.uid);
  
  // Verify authentication
  if (!context || !context.auth) {
    console.error('No authentication context');
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated to send invitations');
  }

  // Check if SendGrid is configured
  if (!process.env.SENDGRID_API_KEY) {
    console.error('SendGrid API key not found in environment');
    throw new functions.https.HttpsError('failed-precondition', 'SendGrid is not configured');
  }

  const { invitationId } = data;

  if (!invitationId) {
    throw new functions.https.HttpsError('invalid-argument', 'Invitation ID is required');
  }

  try {
    // Get invitation from Firestore
    const invitationDoc = await admin.firestore()
      .collection('panelInvitations')
      .doc(invitationId)
      .get();

    if (!invitationDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Invitation not found');
    }

    const invitation = invitationDoc.data() as PanelInvitation;

    // Check if invitation is still pending
    if (invitation.status !== 'pending') {
      throw new functions.https.HttpsError('failed-precondition', 'Invitation is no longer pending');
    }

    // Get the app URL from environment or use default
    const appUrl = process.env.APP_URL || 'https://delphi-healthcare.vercel.app';
    const invitationUrl = `${appUrl}/invitations/${invitation.token}`;

    // Prepare email content
    const emailContent = {
      to: invitation.email,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || 'noreply@delphi-healthcare.com',
        name: 'Delphi Healthcare Platform'
      },
      subject: `Invitation to join ${invitation.panelName} as an Expert`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 14px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Delphi Healthcare Platform</h1>
            </div>
            <div class="content">
              <h2>You're Invited to Join as an Expert</h2>
              
              <p>Dear Expert,</p>
              
              <p>${invitation.invitedByName || 'A panel administrator'} has invited you to join the <strong>${invitation.panelName}</strong> panel as an expert contributor.</p>
              
              ${invitation.message ? `
                <p><strong>Personal message:</strong></p>
                <p style="background-color: white; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0;">
                  ${invitation.message}
                </p>
              ` : ''}
              
              <p>As an expert panel member, you will:</p>
              <ul>
                <li>Provide anonymous feedback on important healthcare initiatives</li>
                <li>Participate in structured rounds of discussion</li>
                <li>Help reach consensus on critical decisions</li>
                <li>Contribute your expertise to improve healthcare outcomes</li>
              </ul>
              
              <p style="text-align: center;">
                <a href="${invitationUrl}" class="button">Accept Invitation</a>
              </p>
              
              <p style="font-size: 14px; color: #6b7280;">
                This invitation will expire in 7 days. If you have any questions, please contact the panel administrator.
              </p>
            </div>
            <div class="footer">
              <p>This is an automated email from Delphi Healthcare Platform.<br>
              Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        You're Invited to Join ${invitation.panelName} as an Expert
        
        Dear Expert,
        
        ${invitation.invitedByName || 'A panel administrator'} has invited you to join the ${invitation.panelName} panel as an expert contributor.
        
        ${invitation.message ? `Personal message: ${invitation.message}` : ''}
        
        As an expert panel member, you will:
        - Provide anonymous feedback on important healthcare initiatives
        - Participate in structured rounds of discussion
        - Help reach consensus on critical decisions
        - Contribute your expertise to improve healthcare outcomes
        
        Accept your invitation here: ${invitationUrl}
        
        This invitation will expire in 7 days.
        
        This is an automated email from Delphi Healthcare Platform.
      `
    };

    // Send email
    await sgMail.send(emailContent);

    console.log('Email sent successfully to:', invitation.email);
    return { success: true, message: 'Invitation email sent successfully' };
  } catch (error: any) {
    console.error('Error sending invitation email:', error);
    console.error('Error details:', error.message, error.response?.body);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to send invitation email');
  }
});