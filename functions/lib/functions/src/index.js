"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.onRoundClosed = exports.onNewFeedback = exports.onTopicAssigned = exports.processEmailDigest = exports.sendEmailNotification = exports.sendInvitationEmail = exports.generateRoundSummary = exports.extractTopic = exports.createNotification = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const openai_1 = __importDefault(require("openai"));
const mail_1 = __importDefault(require("@sendgrid/mail"));
const cors_1 = __importDefault(require("cors"));
// Initialize Firebase Admin
admin.initializeApp();
// Get configuration
const config = functions.config();
// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_NOTIFICATIONS_PER_WINDOW = 10; // Max 10 notifications per minute per user
const rateLimitMap = new Map();
// Initialize OpenAI
const openai = ((_a = config.openai) === null || _a === void 0 ? void 0 : _a.api_key) ? new openai_1.default({
    apiKey: config.openai.api_key,
}) : null;
// Initialize SendGrid
if ((_b = config.sendgrid) === null || _b === void 0 ? void 0 : _b.api_key) {
    mail_1.default.setApiKey(config.sendgrid.api_key);
}
// Enable CORS
const corsHandler = (0, cors_1.default)({ origin: true });
// Valid notification types
const VALID_NOTIFICATION_TYPES = [
    'topic_assigned',
    'new_feedback',
    'round_closed',
    'consensus_reached',
    'invitation'
];
// Helper function to check rate limit
function checkRateLimit(userId) {
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
function validateNotificationData(data) {
    var _a, _b;
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
            if (!((_a = data.data) === null || _a === void 0 ? void 0 : _a.topicId)) {
                return { valid: false, error: 'Missing topicId in data' };
            }
            break;
        case 'invitation':
            if (!((_b = data.data) === null || _b === void 0 ? void 0 : _b.panelId)) {
                return { valid: false, error: 'Missing panelId in data' };
            }
            break;
    }
    return { valid: true };
}
// HTTP function to create notifications (for internal use)
exports.createNotification = functions.https.onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        try {
            // Verify authentication
            const authHeader = req.headers.authorization;
            if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer '))) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const idToken = authHeader.split('Bearer ')[1];
            let decodedToken;
            try {
                decodedToken = await admin.auth().verifyIdToken(idToken);
            }
            catch (error) {
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
            const notification = {
                userId: req.body.userId,
                type: req.body.type,
                title: req.body.title,
                message: req.body.message,
                data: req.body.data || {},
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            };
            const docRef = await admin.firestore()
                .collection('notifications')
                .add(notification);
            res.status(201).json({
                success: true,
                notificationId: docRef.id
            });
        }
        catch (error) {
            console.error('Error creating notification:', error);
            res.status(500).json({ error: 'Failed to create notification' });
        }
    });
});
exports.extractTopic = functions.https.onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        try {
            // Verify authentication
            const authHeader = req.headers.authorization;
            if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer '))) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const idToken = authHeader.split('Bearer ')[1];
            let decodedToken;
            try {
                decodedToken = await admin.auth().verifyIdToken(idToken);
            }
            catch (error) {
                res.status(401).json({ error: 'Invalid token' });
                return;
            }
            const { rawText, panelContext } = req.body;
            if (!rawText || !rawText.trim()) {
                res.status(400).json({ error: 'Raw text is required' });
                return;
            }
            if (!openai) {
                res.status(500).json({ error: 'OpenAI not configured' });
                return;
            }
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{
                        role: 'system',
                        content: `You are a healthcare expert skilled at extracting key topics from discussions. 
          
          Given raw text (from emails, meeting notes, etc), extract:
          - title: A clear, concise title for the topic
          - description: A brief description of the issue/decision needed
          - question: The main question that needs expert input
          - suggestedFeedbackTypes: Array of relevant feedback types from: comment, rating, ranking, poll, comparison
          - confidence: Your confidence level (0-100) that this is a valid topic
          
          Context: ${panelContext || 'Healthcare decision-making panel'}
          
          Return valid JSON only.`
                    }, {
                        role: 'user',
                        content: rawText
                    }],
                temperature: 0.3,
                max_tokens: 500
            });
            const result = completion.choices[0].message.content;
            if (!result) {
                res.status(500).json({ error: 'Failed to extract topic' });
                return;
            }
            const extractedTopic = JSON.parse(result);
            res.status(200).json(extractedTopic);
        }
        catch (error) {
            console.error('Error extracting topic:', error);
            res.status(500).json({ error: 'Failed to extract topic' });
        }
    });
});
exports.generateRoundSummary = functions.https.onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        try {
            // Verify authentication
            const authHeader = req.headers.authorization;
            if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer '))) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const idToken = authHeader.split('Bearer ')[1];
            let decodedToken;
            try {
                decodedToken = await admin.auth().verifyIdToken(idToken);
            }
            catch (error) {
                res.status(401).json({ error: 'Invalid token' });
                return;
            }
            const { feedback, roundNumber, topicTitle } = req.body;
            if (!feedback || !Array.isArray(feedback)) {
                res.status(400).json({ error: 'Feedback array is required' });
                return;
            }
            if (!openai) {
                res.status(500).json({ error: 'OpenAI not configured' });
                return;
            }
            const feedbackText = feedback.map(f => `${f.type}: ${f.content}`).join('\n');
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{
                        role: 'system',
                        content: `You are a healthcare expert analyzing anonymous feedback from a Delphi panel.
          
          Create a summary of Round ${roundNumber} feedback for: ${topicTitle}
          
          Focus on:
          - Key themes and patterns
          - Areas of consensus and disagreement
          - Quantitative insights from ratings/rankings
          - Recommendations for next steps
          
          Keep it concise and actionable for healthcare decision-makers.`
                    }, {
                        role: 'user',
                        content: feedbackText
                    }],
                temperature: 0.3,
                max_tokens: 800
            });
            res.status(200).json({
                summary: completion.choices[0].message.content
            });
        }
        catch (error) {
            console.error('Error generating summary:', error);
            res.status(500).json({ error: 'Failed to generate summary' });
        }
    });
});
// Function to send invitation emails (v1)
exports.sendInvitationEmail = functions.https.onCall(async (data, context) => {
    var _a, _b, _c, _d, _e;
    console.log('sendInvitationEmail called with data:', data);
    console.log('Auth context:', (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid);
    // Verify authentication
    if (!context || !context.auth) {
        console.error('No authentication context');
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated to send invitations');
    }
    // Check if SendGrid is configured
    if (!((_b = config.sendgrid) === null || _b === void 0 ? void 0 : _b.api_key)) {
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
        const invitation = invitationDoc.data();
        // Check if invitation is still pending
        if (invitation.status !== 'pending') {
            throw new functions.https.HttpsError('failed-precondition', 'Invitation is no longer pending');
        }
        // Get the app URL from config or use default
        const appUrl = ((_c = config.app) === null || _c === void 0 ? void 0 : _c.url) || 'https://delphi-healthcare.vercel.app';
        const invitationUrl = `${appUrl}/invitations/${invitation.token}`;
        // Prepare email content
        const emailContent = {
            to: invitation.email,
            from: {
                email: ((_d = config.sendgrid) === null || _d === void 0 ? void 0 : _d.from_email) || 'noreply@delphi-healthcare.com',
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
        await mail_1.default.send(emailContent);
        console.log('Email sent successfully to:', invitation.email);
        return { success: true, message: 'Invitation email sent successfully' };
    }
    catch (error) {
        console.error('Error sending invitation email:', error);
        console.error('Error details:', error.message, (_e = error.response) === null || _e === void 0 ? void 0 : _e.body);
        throw new functions.https.HttpsError('internal', error.message || 'Failed to send invitation email');
    }
});
// Email notification function (using SendGrid or similar)
exports.sendEmailNotification = functions.firestore
    .document('notifications/{notificationId}')
    .onCreate(async (snap, context) => {
    const notification = snap.data();
    try {
        // Get user preferences
        const preferencesDoc = await admin.firestore()
            .collection('notificationPreferences')
            .doc(notification.userId)
            .get();
        const preferences = preferencesDoc.data();
        // Check if email notifications are enabled
        if (!(preferences === null || preferences === void 0 ? void 0 : preferences.email)) {
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
        }
        else {
            // For digest emails, store in a collection to be processed later
            await admin.firestore()
                .collection('emailDigestQueue')
                .add(Object.assign(Object.assign({}, notification), { queuedAt: admin.firestore.FieldValue.serverTimestamp(), frequency: preferences.emailFrequency }));
        }
    }
    catch (error) {
        console.error('Error processing email notification:', error);
    }
});
// Process email digest (run daily/weekly)
exports.processEmailDigest = functions.pubsub
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
        const dailyByUser = new Map();
        dailyDigests.forEach(doc => {
            const data = doc.data();
            if (!dailyByUser.has(data.userId)) {
                dailyByUser.set(data.userId, []);
            }
            dailyByUser.get(data.userId).push(data);
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
            const weeklyByUser = new Map();
            weeklyDigests.forEach(doc => {
                const data = doc.data();
                if (!weeklyByUser.has(data.userId)) {
                    weeklyByUser.set(data.userId, []);
                }
                weeklyByUser.get(data.userId).push(data);
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
    }
    catch (error) {
        console.error('Error processing email digest:', error);
    }
});
// Helper function to send immediate email
async function sendImmediateEmail(notification) {
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
async function sendDigestEmail(userId, notifications, frequency) {
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
function getEmailContent(notification) {
    var _a, _b, _c, _d, _e, _f;
    const baseUrl = ((_a = config.app) === null || _a === void 0 ? void 0 : _a.url) || 'https://delphi-platform.com';
    const templates = {
        topic_assigned: {
            subject: 'New Topic Assigned',
            html: `
        <h2>You've been assigned to a new topic</h2>
        <p><strong>${notification.title}</strong></p>
        <p>${notification.message}</p>
        <a href="${baseUrl}/topics/${(_b = notification.data) === null || _b === void 0 ? void 0 : _b.topicId}" style="background: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">View Topic</a>
      `
        },
        new_feedback: {
            subject: 'New Feedback on Your Topic',
            html: `
        <h2>New feedback received</h2>
        <p><strong>${notification.title}</strong></p>
        <p>${notification.message}</p>
        <a href="${baseUrl}/topics/${(_c = notification.data) === null || _c === void 0 ? void 0 : _c.topicId}" style="background: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">View Feedback</a>
      `
        },
        round_closed: {
            subject: 'Voting Round Closed',
            html: `
        <h2>A voting round has closed</h2>
        <p><strong>${notification.title}</strong></p>
        <p>${notification.message}</p>
        <a href="${baseUrl}/topics/${(_d = notification.data) === null || _d === void 0 ? void 0 : _d.topicId}" style="background: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">View Results</a>
      `
        },
        consensus_reached: {
            subject: 'Consensus Reached!',
            html: `
        <h2>Consensus has been reached</h2>
        <p><strong>${notification.title}</strong></p>
        <p>${notification.message}</p>
        <a href="${baseUrl}/topics/${(_e = notification.data) === null || _e === void 0 ? void 0 : _e.topicId}" style="background: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">View Consensus</a>
      `
        },
        invitation: {
            subject: 'You\'re Invited to Join a Panel',
            html: `
        <h2>Panel Invitation</h2>
        <p><strong>${notification.title}</strong></p>
        <p>${notification.message}</p>
        <a href="${baseUrl}/panels/${(_f = notification.data) === null || _f === void 0 ? void 0 : _f.panelId}" style="background: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Join Panel</a>
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
function getDigestEmailContent(notifications, frequency) {
    var _a;
    const baseUrl = ((_a = config.app) === null || _a === void 0 ? void 0 : _a.url) || 'https://delphi-platform.com';
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
async function createValidatedNotification(notificationData) {
    const validation = validateNotificationData(notificationData);
    if (!validation.valid) {
        console.error('Invalid notification data:', validation.error);
        return null;
    }
    return admin.firestore().collection('notifications').add(Object.assign(Object.assign({}, notificationData), { createdAt: admin.firestore.FieldValue.serverTimestamp() }));
}
// Notification triggers for various events
exports.onTopicAssigned = functions.firestore
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
    if (!panel)
        return;
    // Create notifications for all panel experts
    const batch = admin.firestore().batch();
    for (const expertId of panel.expertIds) {
        const notificationData = {
            userId: expertId,
            type: 'topic_assigned',
            title: 'New Topic Assigned',
            message: `You have been assigned to provide feedback on: ${topic.title}`.substring(0, 500),
            data: { topicId, panelId: topic.panelId },
            read: false
        };
        // Validate before adding to batch
        const validation = validateNotificationData(notificationData);
        if (validation.valid) {
            const notificationRef = admin.firestore().collection('notifications').doc();
            batch.set(notificationRef, Object.assign(Object.assign({}, notificationData), { createdAt: admin.firestore.FieldValue.serverTimestamp() }));
        }
    }
    await batch.commit();
});
exports.onNewFeedback = functions.firestore
    .document('feedback/{feedbackId}')
    .onCreate(async (snap, context) => {
    const feedback = snap.data();
    // Get the topic to find the creator
    const topicDoc = await admin.firestore()
        .collection('topics')
        .doc(feedback.topicId)
        .get();
    const topic = topicDoc.data();
    if (!topic || feedback.expertId === topic.createdBy)
        return;
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
exports.onRoundClosed = functions.firestore
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
        if (!topic)
            return;
        const panelDoc = await admin.firestore()
            .collection('panels')
            .doc(topic.panelId)
            .get();
        const panel = panelDoc.data();
        if (!panel)
            return;
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
//# sourceMappingURL=index.js.map