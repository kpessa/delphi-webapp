# Deployment Guide for Vercel

## Prerequisites

1. A Vercel account (sign up at https://vercel.com)
2. Vercel CLI installed: `npm i -g vercel`
3. Git repository (GitHub, GitLab, or Bitbucket)

## Environment Variables

You need to set the following environment variables in Vercel:

### Firebase Configuration
```
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
VITE_FIREBASE_PROJECT_ID=your_project_id_here
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
VITE_FIREBASE_APP_ID=your_app_id_here
```

### Microsoft OAuth (if using)
```
VITE_MICROSOFT_CLIENT_ID=your_client_id_here
VITE_MICROSOFT_TENANT_ID=your_tenant_id_here
```

## Deployment Methods

### Method 1: Vercel Dashboard (Recommended)

1. Push your code to a Git repository
2. Go to https://vercel.com/dashboard
3. Click "New Project"
4. Import your Git repository
5. Configure environment variables in the dashboard
6. Click "Deploy"

### Method 2: Vercel CLI

1. Install Vercel CLI: `npm i -g vercel`
2. Run in project directory: `vercel`
3. Follow the prompts to link/create a project
4. Set environment variables: `vercel env add`
5. Deploy: `vercel --prod`

### Method 3: Automatic Deployment (CI/CD)

Vercel automatically deploys when you push to your Git repository:
- Production deployment: Push to `main` branch
- Preview deployment: Push to any other branch

## Setting Environment Variables in Vercel

### Via Dashboard:
1. Go to your project in Vercel Dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable with its value
4. Select which environments to apply to (Production, Preview, Development)

### Via CLI:
```bash
vercel env add VITE_FIREBASE_API_KEY
# Enter the value when prompted
# Repeat for each variable
```

## Post-Deployment Checklist

- [ ] Verify all environment variables are set
- [ ] Update Firebase authorized domains:
  - Add `your-app.vercel.app`
  - Add your custom domain (if using)
- [ ] Update OAuth redirect URIs (Google/Microsoft)
- [ ] Test authentication flows
- [ ] Test Firestore read/write operations
- [ ] Verify PWA installation works

## Custom Domain

To add a custom domain:
1. Go to Settings → Domains
2. Add your domain
3. Follow DNS configuration instructions
4. Update Firebase authorized domains with your custom domain

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure all dependencies are in package.json
- Verify environment variables are set

### Authentication Issues
- Verify Firebase authorized domains include Vercel URLs
- Check OAuth redirect URIs are updated
- Ensure environment variables are correctly set

### 404 Errors
- SvelteKit routing should work automatically with Vercel adapter
- If issues persist, check vercel.json configuration

## Security Notes

- Never commit `.env` files to Git
- Use Vercel's environment variable system
- Enable Vercel's DDoS protection (automatic)
- Consider enabling Vercel's Web Application Firewall (paid feature)