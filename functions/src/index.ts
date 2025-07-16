import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import OpenAI from 'openai';
import sgMail from '@sendgrid/mail';
import cors from 'cors';
import type { ExtractTopicRequest, ExtractTopicResponse, FeedbackType, PanelInvitation, Notification, NotificationPreferences, NotificationType } from '../../src/lib/firebase/types';

// Initialize Firebase Admin
admin.initializeApp();

// Get configuration
const config = functions.config();

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_NOTIFICATIONS_PER_WINDOW = 10; // Max 10 notifications per minute per user
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Initialize OpenAI
const openai = config.openai?.api_key ? new OpenAI({
  apiKey: config.openai.api_key,
}) : null;

// Initialize SendGrid
if (config.sendgrid?.api_key) {
  sgMail.setApiKey(config.sendgrid.api_key);
}

// Enable CORS
const corsHandler = cors({ origin: true });

// Valid notification types
const VALID_NOTIFICATION_TYPES: NotificationType[] = [
  'topic_assigned', 
  'new_feedback', 
  'round_closed', 
  'consensus_reached', 
  'invitation'
];

// Helper function to check rate limit
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    });
    return true;
  }
  
  if (userLimit.count >= MAX_NOTIFICATIONS_PER_WINDOW) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

// Helper function to validate notification data
function validateNotificationData(data: any): { valid: boolean; error?: string } {
  // Check required fields
  if (!data.userId || typeof data.userId !== 'string') {
    return { valid: false, error: 'Invalid or missing userId' };
  }
  
  if (!data.type || !VALID_NOTIFICATION_TYPES.includes(data.type)) {
    return { valid: false, error: 'Invalid or missing notification type' };
  }
  
  if (!data.title || typeof data.title !== 'string' || data.title.length > 100) {
    return { valid: false, error: 'Invalid or missing title (max 100 chars)' };
  }
  
  if (!data.message || typeof data.message !== 'string' || data.message.length > 500) {
    return { valid: false, error: 'Invalid or missing message (max 500 chars)' };
  }
  
  if (data.data && typeof data.data !== 'object') {
    return { valid: false, error: 'Invalid data field (must be object)' };
  }
  
  // Validate type-specific data
  switch (data.type) {
    case 'topic_assigned':
    case 'new_feedback':
    case 'round_closed':
    case 'consensus_reached':
      if (!data.data?.topicId) {
        return { valid: false, error: 'Missing topicId in data' };
      }
      break;
    case 'invitation':
      if (!data.data?.panelId) {
        return { valid: false, error: 'Missing panelId in data' };
      }
      break;
  }
  
  return { valid: true };
}

// HTTP function to create notifications (for internal use)
export const createNotification = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      // Verify authentication
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const idToken = authHeader.split('Bearer ')[1];
      let decodedToken;
      try {
        decodedToken = await admin.auth().verifyIdToken(idToken);
      } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
        return;
      }

      // Check rate limit
      if (!checkRateLimit(decodedToken.uid)) {
        res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
        return;
      }

      // Validate notification data
      const validation = validateNotificationData(req.body);
      if (!validation.valid) {
        res.status(400).json({ error: validation.error });
        return;
      }

      // Create notification
      const notification: Notification = {
        userId: req.body.userId,
        type: req.body.type,
        title: req.body.title,
        message: req.body.message,
        data: req.body.data || {},
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp() as any
      };

      const docRef = await admin.firestore()
        .collection('notifications')
        .add(notification);

      res.status(201).json({ 
        success: true, 
        notificationId: docRef.id 
      });
    } catch (error) {
      console.error('Error creating notification:', error);
      res.status(500).json({ error: 'Failed to create notification' });
    }
  });
});

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

<<<<<<< HEAD
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
  if (!config.sendgrid?.api_key) {
    console.error('SendGrid API key not found in config');
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

    // Get the app URL from config or use default
    const appUrl = config.app?.url || 'https://delphi-healthcare.vercel.app';
    const invitationUrl = `${appUrl}/invitations/${invitation.token}`;

    // Prepare email content
    const emailContent = {
      to: invitation.email,
      from: {
        email: config.sendgrid?.from_email || 'noreply@delphi-healthcare.com',
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
=======
// Email notification function (using SendGrid or similar)
export const sendEmailNotification = functions.firestore
  .document('notifications/{notificationId}')
  .onCreate(async (snap, context) => {
    const notification = snap.data() as Notification;
    
    try {
      // Get user preferences
      const preferencesDoc = await admin.firestore()
        .collection('notificationPreferences')
        .doc(notification.userId)
        .get();
      
      const preferences = preferencesDoc.data() as NotificationPreferences;
      
      // Check if email notifications are enabled
      if (!preferences?.email) {
        console.log(`Email notifications disabled for user ${notification.userId}`);
        return;
      }
      
      // Check if this notification type is enabled
      const typePreferenceMap = {
        'topic_assigned': preferences.topicAssigned,
        'new_feedback': preferences.newFeedback,
        'round_closed': preferences.roundClosed,
        'consensus_reached': preferences.consensusReached,
        'invitation': true // Always send invitation emails
      };
      
      if (!typePreferenceMap[notification.type]) {
        console.log(`Notification type ${notification.type} disabled for user ${notification.userId}`);
        return;
      }
      
      // Handle immediate vs digest emails
      if (preferences.emailFrequency === 'immediate') {
        await sendImmediateEmail(notification);
      } else {
        // For digest emails, store in a collection to be processed later
        await admin.firestore()
          .collection('emailDigestQueue')
          .add({
            ...notification,
            queuedAt: admin.firestore.FieldValue.serverTimestamp(),
            frequency: preferences.emailFrequency
          });
      }
    } catch (error) {
      console.error('Error processing email notification:', error);
    }
  });

// Process email digest (run daily/weekly)
export const processEmailDigest = functions.pubsub
  .schedule('0 9 * * *') // Run daily at 9 AM
  .timeZone('America/New_York')
  .onRun(async (context) => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    try {
      // Process daily digests
      const dailyDigests = await admin.firestore()
        .collection('emailDigestQueue')
        .where('frequency', '==', 'daily')
        .where('queuedAt', '>=', admin.firestore.Timestamp.fromDate(oneDayAgo))
        .get();
      
      // Group by user
      const dailyByUser = new Map<string, any[]>();
      dailyDigests.forEach(doc => {
        const data = doc.data();
        if (!dailyByUser.has(data.userId)) {
          dailyByUser.set(data.userId, []);
        }
        dailyByUser.get(data.userId)!.push(data);
      });
      
      // Send daily digests
      for (const [userId, notifications] of dailyByUser) {
        await sendDigestEmail(userId, notifications, 'daily');
      }
      
      // Process weekly digests (only on Mondays)
      if (now.getDay() === 1) {
        const weeklyDigests = await admin.firestore()
          .collection('emailDigestQueue')
          .where('frequency', '==', 'weekly')
          .where('queuedAt', '>=', admin.firestore.Timestamp.fromDate(oneWeekAgo))
          .get();
        
        const weeklyByUser = new Map<string, any[]>();
        weeklyDigests.forEach(doc => {
          const data = doc.data();
          if (!weeklyByUser.has(data.userId)) {
            weeklyByUser.set(data.userId, []);
          }
          weeklyByUser.get(data.userId)!.push(data);
        });
        
        for (const [userId, notifications] of weeklyByUser) {
          await sendDigestEmail(userId, notifications, 'weekly');
        }
      }
      
      // Clean up processed notifications
      const batch = admin.firestore().batch();
      dailyDigests.forEach(doc => batch.delete(doc.ref));
      if (now.getDay() === 1) {
        const weeklyDigests = await admin.firestore()
          .collection('emailDigestQueue')
          .where('frequency', '==', 'weekly')
          .get();
        weeklyDigests.forEach(doc => batch.delete(doc.ref));
      }
      await batch.commit();
      
    } catch (error) {
      console.error('Error processing email digest:', error);
    }
  });

// Helper function to send immediate email
async function sendImmediateEmail(notification: Notification) {
  // Get user email
  const userRecord = await admin.auth().getUser(notification.userId);
  const email = userRecord.email;
  
  if (!email) {
    console.log(`No email found for user ${notification.userId}`);
    return;
  }
  
  const emailContent = getEmailContent(notification);
  
  // TODO: Integrate with SendGrid or your email provider
  console.log(`Sending email to ${email}:`, emailContent);
  
  // Example SendGrid integration (uncomment when ready):
  // const sgMail = require('@sendgrid/mail');
  // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  // 
  // const msg = {
  //   to: email,
  //   from: 'notifications@delphi-platform.com',
  //   subject: emailContent.subject,
  //   html: emailContent.html,
  // };
  // 
  // await sgMail.send(msg);
}

// Helper function to send digest email
async function sendDigestEmail(userId: string, notifications: any[], frequency: 'daily' | 'weekly') {
  const userRecord = await admin.auth().getUser(userId);
  const email = userRecord.email;
  
  if (!email) {
    console.log(`No email found for user ${userId}`);
    return;
  }
  
  const digestContent = getDigestEmailContent(notifications, frequency);
  
  // TODO: Send digest email
  console.log(`Sending ${frequency} digest to ${email}:`, digestContent);
}

// Helper function to generate email content
function getEmailContent(notification: Notification) {
  const baseUrl = process.env.APP_URL || 'https://delphi-platform.com';
  
  const templates = {
    topic_assigned: {
      subject: 'New Topic Assigned',
      html: `
        <h2>You've been assigned to a new topic</h2>
        <p><strong>${notification.title}</strong></p>
        <p>${notification.message}</p>
        <a href="${baseUrl}/topics/${notification.data?.topicId}" style="background: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">View Topic</a>
      `
    },
    new_feedback: {
      subject: 'New Feedback on Your Topic',
      html: `
        <h2>New feedback received</h2>
        <p><strong>${notification.title}</strong></p>
        <p>${notification.message}</p>
        <a href="${baseUrl}/topics/${notification.data?.topicId}" style="background: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">View Feedback</a>
      `
    },
    round_closed: {
      subject: 'Voting Round Closed',
      html: `
        <h2>A voting round has closed</h2>
        <p><strong>${notification.title}</strong></p>
        <p>${notification.message}</p>
        <a href="${baseUrl}/topics/${notification.data?.topicId}" style="background: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">View Results</a>
      `
    },
    consensus_reached: {
      subject: 'Consensus Reached!',
      html: `
        <h2>Consensus has been reached</h2>
        <p><strong>${notification.title}</strong></p>
        <p>${notification.message}</p>
        <a href="${baseUrl}/topics/${notification.data?.topicId}" style="background: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">View Consensus</a>
      `
    },
    invitation: {
      subject: 'You\'re Invited to Join a Panel',
      html: `
        <h2>Panel Invitation</h2>
        <p><strong>${notification.title}</strong></p>
        <p>${notification.message}</p>
        <a href="${baseUrl}/panels/${notification.data?.panelId}" style="background: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Join Panel</a>
      `
    }
  };
  
  const template = templates[notification.type];
  
  return {
    subject: template.subject,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #F3F4F6; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .footer { background: #F3F4F6; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Delphi Platform</h1>
          </div>
          <div class="content">
            ${template.html}
          </div>
          <div class="footer">
            <p>This email was sent by Delphi Platform</p>
            <p><a href="${baseUrl}/settings/notifications">Manage notification preferences</a></p>
          </div>
        </div>
      </body>
      </html>
    `
  };
}

// Helper function to generate digest email content
function getDigestEmailContent(notifications: any[], frequency: 'daily' | 'weekly') {
  const baseUrl = process.env.APP_URL || 'https://delphi-platform.com';
  const period = frequency === 'daily' ? 'Daily' : 'Weekly';
  
  const notificationsList = notifications
    .map(n => `
      <div style="border-left: 3px solid #3B82F6; padding-left: 15px; margin: 15px 0;">
        <h3>${n.title}</h3>
        <p>${n.message}</p>
        <p style="font-size: 12px; color: #666;">${new Date(n.createdAt.toDate()).toLocaleString()}</p>
      </div>
    `)
    .join('');
  
  return {
    subject: `Your ${period} Delphi Platform Digest`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #F3F4F6; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .footer { background: #F3F4F6; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Your ${period} Digest</h1>
            <p>${notifications.length} notifications</p>
          </div>
          <div class="content">
            <h2>Here's what you missed:</h2>
            ${notificationsList}
            <div style="text-align: center; margin: 30px 0;">
              <a href="${baseUrl}/notifications" style="background: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View All Notifications</a>
            </div>
          </div>
          <div class="footer">
            <p>This is your ${frequency} digest from Delphi Platform</p>
            <p><a href="${baseUrl}/settings/notifications">Change email preferences</a></p>
          </div>
        </div>
      </body>
      </html>
    `
  };
}

// Helper function to create a validated notification
async function createValidatedNotification(notificationData: Omit<Notification, 'createdAt'>) {
  const validation = validateNotificationData(notificationData);
  if (!validation.valid) {
    console.error('Invalid notification data:', validation.error);
    return null;
  }
  
  return admin.firestore().collection('notifications').add({
    ...notificationData,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

// Notification triggers for various events
export const onTopicAssigned = functions.firestore
  .document('topics/{topicId}')
  .onCreate(async (snap, context) => {
    const topic = snap.data();
    const topicId = context.params.topicId;
    
    // Get panel experts
    const panelDoc = await admin.firestore()
      .collection('panels')
      .doc(topic.panelId)
      .get();
    
    const panel = panelDoc.data();
    if (!panel) return;
    
    // Create notifications for all panel experts
    const batch = admin.firestore().batch();
    
    for (const expertId of panel.expertIds) {
      const notificationData = {
        userId: expertId,
        type: 'topic_assigned' as NotificationType,
        title: 'New Topic Assigned',
        message: `You have been assigned to provide feedback on: ${topic.title}`.substring(0, 500),
        data: { topicId, panelId: topic.panelId },
        read: false
      };
      
      // Validate before adding to batch
      const validation = validateNotificationData(notificationData);
      if (validation.valid) {
        const notificationRef = admin.firestore().collection('notifications').doc();
        batch.set(notificationRef, {
          ...notificationData,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }
    
    await batch.commit();
  });

export const onNewFeedback = functions.firestore
  .document('feedback/{feedbackId}')
  .onCreate(async (snap, context) => {
    const feedback = snap.data();
    
    // Get the topic to find the creator
    const topicDoc = await admin.firestore()
      .collection('topics')
      .doc(feedback.topicId)
      .get();
    
    const topic = topicDoc.data();
    if (!topic || feedback.expertId === topic.createdBy) return;
    
    // Notify topic creator with validation
    await createValidatedNotification({
      userId: topic.createdBy,
      type: 'new_feedback',
      title: 'New Feedback Received',
      message: `New ${feedback.type} on your topic: ${topic.title}`.substring(0, 500),
      data: { topicId: feedback.topicId, feedbackId: context.params.feedbackId },
      read: false
    });
  });

export const onRoundClosed = functions.firestore
  .document('rounds/{roundId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    
    // Check if round was just closed
    if (before.status === 'active' && after.status === 'completed') {
      // Get topic and panel
      const topicDoc = await admin.firestore()
        .collection('topics')
        .doc(after.topicId)
        .get();
      
      const topic = topicDoc.data();
      if (!topic) return;
      
      const panelDoc = await admin.firestore()
        .collection('panels')
        .doc(topic.panelId)
        .get();
      
      const panel = panelDoc.data();
      if (!panel) return;
      
      // Notify all participants
      const batch = admin.firestore().batch();
      
      for (const expertId of panel.expertIds) {
        const notificationRef = admin.firestore().collection('notifications').doc();
        batch.set(notificationRef, {
          userId: expertId,
          type: 'round_closed',
          title: 'Voting Round Closed',
          message: `Round ${after.roundNumber} has closed for: ${topic.title}`,
          data: { topicId: after.topicId, roundNumber: after.roundNumber },
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      
      await batch.commit();
    }
  });
>>>>>>> origin/main
