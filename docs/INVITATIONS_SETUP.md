# Invitations System Setup Guide

## Overview
The Delphi Healthcare Platform uses SendGrid to send email invitations to panel experts. This guide will help you set up the invitation system.

## Prerequisites
1. A SendGrid account with API access
2. Firebase project with Cloud Functions enabled
3. Firebase CLI installed locally

## Setup Steps

### 1. SendGrid Configuration

1. **Create a SendGrid Account**
   - Sign up at [sendgrid.com](https://sendgrid.com)
   - Verify your email address

2. **Generate API Key**
   - Go to Settings → API Keys
   - Click "Create API Key"
   - Select "Full Access" or "Restricted Access" with Mail Send permissions
   - Copy the API key (you won't be able to see it again)

3. **Verify Sender Identity**
   - Go to Settings → Sender Authentication
   - Either verify a single sender address or authenticate your domain
   - Use this verified email as your `SENDGRID_FROM_EMAIL`

### 2. Firebase Functions Configuration

Set the environment variables for your Firebase Functions:

```bash
# Set SendGrid API Key
firebase functions:config:set sendgrid.api_key="YOUR_SENDGRID_API_KEY"

# Set the from email (must be verified in SendGrid)
firebase functions:config:set sendgrid.from_email="noreply@yourdomain.com"

# Set your app URL (for invitation links)
firebase functions:config:set app.url="https://your-app-url.vercel.app"

# Optional: Set OpenAI key if using AI features
firebase functions:config:set openai.api_key="YOUR_OPENAI_API_KEY"
```

### 3. Deploy Functions

Deploy the updated Cloud Functions:

```bash
# Build and deploy functions
cd functions
pnpm install
pnpm build
firebase deploy --only functions
```

### 4. Update Firestore Security Rules

Ensure your Firestore security rules are up to date:

```bash
firebase deploy --only firestore:rules
```

## Testing the Invitation System

1. **Create a Panel**
   - Sign in to the app
   - Create a new panel or navigate to an existing one

2. **Send Invitations**
   - Click "Invite Experts"
   - Enter email addresses (comma or newline separated)
   - Optionally add a personal message
   - Click "Send Invitations"

3. **Check Invitation Status**
   - Invitations will appear in the panel's invitation list
   - Status will show as "pending", "accepted", "declined", or "expired"

4. **Accept an Invitation**
   - Recipients will receive an email with an invitation link
   - Clicking the link takes them to `/invitations/[token]`
   - New users can create an account
   - Existing users can sign in and accept

## Environment Variables Reference

### Frontend (.env)
- Standard Vite Firebase configuration variables

### Functions (firebase functions:config)
- `sendgrid.api_key`: Your SendGrid API key
- `sendgrid.from_email`: Verified sender email address
- `app.url`: Your application's URL for invitation links
- `openai.api_key`: (Optional) OpenAI API key for AI features

## Troubleshooting

### Invitations not sending
1. Check Firebase Functions logs: `firebase functions:log`
2. Verify SendGrid API key is set correctly
3. Ensure sender email is verified in SendGrid
4. Check for any domain authentication issues

### Recipients not receiving emails
1. Check spam/junk folders
2. Verify email addresses are correct
3. Check SendGrid activity feed for bounces/blocks
4. Ensure you're not hitting SendGrid rate limits

### Invitation links not working
1. Verify `app.url` is set correctly in Functions config
2. Check that the invitation hasn't expired (7 days)
3. Ensure the invitation token is valid

## Security Considerations

1. **API Keys**: Never commit API keys to version control
2. **Email Validation**: The system validates email formats before sending
3. **Rate Limiting**: Consider implementing rate limiting for bulk invitations
4. **Expiration**: Invitations expire after 7 days for security
5. **Authentication**: Only panel admins can send invitations

## Monitoring

Monitor your invitation system through:
1. Firebase Console → Functions logs
2. SendGrid Dashboard → Activity Feed
3. Firestore Console → panelInvitations collection

## Cost Considerations

- SendGrid: Free tier includes 100 emails/day
- Firebase Functions: Pay-per-invocation after free tier
- Consider batching invitations to optimize costs