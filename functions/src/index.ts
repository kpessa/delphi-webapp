import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import OpenAI from 'openai';
import cors from 'cors';
import type { ExtractTopicRequest, ExtractTopicResponse, FeedbackType, Notification, NotificationPreferences } from '../../src/lib/firebase/types';

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
      const notificationRef = admin.firestore().collection('notifications').doc();
      batch.set(notificationRef, {
        userId: expertId,
        type: 'topic_assigned',
        title: 'New Topic Assigned',
        message: `You have been assigned to provide feedback on: ${topic.title}`,
        data: { topicId, panelId: topic.panelId },
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
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
    
    // Notify topic creator
    await admin.firestore().collection('notifications').add({
      userId: topic.createdBy,
      type: 'new_feedback',
      title: 'New Feedback Received',
      message: `New ${feedback.type} on your topic: ${topic.title}`,
      data: { topicId: feedback.topicId, feedbackId: context.params.feedbackId },
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
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