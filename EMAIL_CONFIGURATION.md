# Email Notification Configuration Guide

This guide explains how to set up email notifications for the Delphi Platform.

## Prerequisites

1. Firebase project with Cloud Functions enabled
2. Email service provider (SendGrid, Mailgun, AWS SES, etc.)
3. Domain verification for sending emails

## Email Service Setup

### Option 1: SendGrid

1. Create a SendGrid account at https://sendgrid.com
2. Verify your sender domain
3. Generate an API key with full access
4. Set the environment variable in Firebase:
   ```bash
   firebase functions:config:set sendgrid.api_key="YOUR_API_KEY"
   firebase functions:config:set app.url="https://your-app-domain.com"
   ```

### Option 2: AWS SES

1. Set up AWS SES in your preferred region
2. Verify your domain and email addresses
3. Create IAM credentials with SES send permissions
4. Set the environment variables:
   ```bash
   firebase functions:config:set aws.access_key_id="YOUR_ACCESS_KEY"
   firebase functions:config:set aws.secret_access_key="YOUR_SECRET_KEY"
   firebase functions:config:set aws.region="us-east-1"
   firebase functions:config:set app.url="https://your-app-domain.com"
   ```

## Implementation

The email functionality is already implemented in `functions/src/index.ts`. To enable it:

1. Uncomment the email service integration code in the `sendImmediateEmail` function
2. Install the required npm package:
   ```bash
   cd functions
   npm install @sendgrid/mail  # or your chosen provider
   ```
3. Deploy the functions:
   ```bash
   firebase deploy --only functions
   ```

## Email Templates

Email templates are defined in `functions/src/index.ts` in the `getEmailContent` function. Customize them as needed for your organization.

## Testing

1. Enable email notifications in user settings (`/settings/notifications`)
2. Send a test notification using the "Send test notification" button
3. Check the Functions logs for any errors:
   ```bash
   firebase functions:log
   ```

## Troubleshooting

### Emails not sending
- Check Firebase Functions logs for errors
- Verify environment variables are set correctly
- Ensure email service API key is valid
- Check domain verification status

### Emails going to spam
- Set up SPF, DKIM, and DMARC records
- Use a verified sender domain
- Avoid spam trigger words in content
- Include unsubscribe links

## Security Considerations

- Never commit API keys to version control
- Use Firebase environment configuration for sensitive data
- Implement rate limiting to prevent abuse
- Validate email addresses before sending

## Monitoring

Monitor email delivery rates and bounces through:
- Your email service provider's dashboard
- Firebase Functions logs
- Custom logging to Firebase Analytics

For additional help, consult your email service provider's documentation.