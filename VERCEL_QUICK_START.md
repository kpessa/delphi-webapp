# Quick Deploy to Vercel

## Step 1: Prepare Your Repository

Make sure your code is pushed to GitHub, GitLab, or Bitbucket:

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

## Step 2: Deploy to Vercel

### Option A: One-Click Deploy (Easiest)

1. Go to https://vercel.com/new
2. Import your Git repository
3. Vercel will auto-detect SvelteKit
4. Add environment variables (see below)
5. Click "Deploy"

### Option B: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts, then set env variables
vercel env add VITE_FIREBASE_API_KEY production
# (repeat for each variable)

# Deploy to production
vercel --prod
```

## Step 3: Set Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_MICROSOFT_CLIENT_ID (optional)
VITE_MICROSOFT_TENANT_ID (optional)
```

Copy values from your local `.env` file.

## Step 4: Update Firebase Settings

1. Go to Firebase Console → Authentication → Settings → Authorized domains
2. Add your Vercel domains:
   - `your-app.vercel.app`
   - `*.vercel.app` (for preview deployments)
   - Your custom domain (if using)

## Step 5: Update OAuth Providers

### For Google Sign-In:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to APIs & Services → Credentials
3. Edit your OAuth 2.0 Client
4. Add to Authorized JavaScript origins:
   - `https://your-app.vercel.app`
   - Your custom domain

### For Microsoft Sign-In:
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to App registrations
3. Add redirect URIs:
   - `https://your-app.vercel.app/auth/login`
   - Your custom domain

## That's it! 🎉

Your app should now be live at `https://your-app.vercel.app`

## Next Steps

- [ ] Test all authentication methods
- [ ] Verify Firestore operations work
- [ ] Test PWA installation
- [ ] Set up a custom domain (optional)
- [ ] Enable analytics (optional)

## Troubleshooting

- **Build fails**: Check logs, ensure all dependencies are listed in package.json
- **Auth not working**: Verify environment variables and authorized domains
- **404 errors**: Should not happen with SvelteKit adapter-vercel
- **Slow cold starts**: Normal for serverless, consider upgrading to Pro for better performance