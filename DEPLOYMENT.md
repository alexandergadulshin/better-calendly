# Deployment Guide - Better Calendly

## Prerequisites

Before deploying, you need accounts and API keys for the following services:

1. **Vercel Account** - for hosting and database
2. **Clerk Account** - for authentication
3. **Google Cloud Console** - for Calendar API
4. **Resend Account** - for email notifications

## Step 1: Set Up External Services

### Clerk Authentication
1. Go to [clerk.com](https://clerk.com) and create an account
2. Create a new application
3. In the Clerk dashboard, go to "API Keys"
4. Copy your `Publishable key` and `Secret key`
5. Configure sign-in/sign-up URLs:
   - Sign-in URL: `/sign-in`
   - Sign-up URL: `/sign-up`
   - After sign-in URL: `/dashboard`
   - After sign-up URL: `/dashboard`

### Google Calendar API
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable the Google Calendar API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `https://your-domain.vercel.app/api/auth/google/callback`
5. Copy your `Client ID` and `Client Secret`

### Resend Email Service
1. Go to [resend.com](https://resend.com) and create an account
2. Create an API key
3. Verify your domain for sending emails

## Step 2: Deploy to Vercel

### Option 1: Deploy via Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow the prompts:
# - Link to existing project or create new
# - Set up environment variables
```

### Option 2: Deploy via GitHub
1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your GitHub repository
4. Configure environment variables (see below)

## Step 3: Set Up Vercel Postgres

1. In your Vercel dashboard, go to your project
2. Go to "Storage" tab
3. Create a new Postgres database
4. Copy the connection strings provided

## Step 4: Configure Environment Variables

In your Vercel project dashboard, go to Settings > Environment Variables and add:

### Database (Vercel Postgres)
```
POSTGRES_URL=your-vercel-postgres-url
POSTGRES_PRISMA_URL=your-vercel-postgres-prisma-url
POSTGRES_URL_NON_POOLING=your-vercel-postgres-non-pooling-url
POSTGRES_USER=your-postgres-user
POSTGRES_HOST=your-postgres-host
POSTGRES_PASSWORD=your-postgres-password
POSTGRES_DATABASE=your-postgres-database
```

### Clerk Authentication
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

### Google Calendar
```
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXTAUTH_URL=https://your-domain.vercel.app
```

### Email Service
```
RESEND_API_KEY=re_...
FROM_EMAIL=noreply@yourdomain.com
```

### Security
```
CRON_SECRET=your-secure-random-string
NODE_ENV=production
```

## Step 5: Set Up Database Schema

After deployment, you need to set up your database:

```bash
# Run database migrations
npx drizzle-kit push
```

Or use the Drizzle Studio to inspect your database:
```bash
npx drizzle-kit studio
```

## Step 6: Configure Clerk Webhooks

1. In Clerk dashboard, go to "Webhooks"
2. Add webhook endpoint: `https://your-domain.vercel.app/api/webhooks/clerk`
3. Select events: `user.created`, `user.updated`, `user.deleted`
4. Copy the signing secret
5. Add to environment variables:
   ```
   CLERK_WEBHOOK_SECRET=whsec_...
   ```

## Step 7: Test Your Deployment

1. Visit your deployed URL
2. Test user registration/login
3. Test creating meeting types
4. Test booking functionality
5. Test Google Calendar integration
6. Verify email notifications work

## Troubleshooting

### Build Errors
- Check that all environment variables are set
- Ensure database connection strings are correct
- Verify Clerk keys are valid

### Runtime Errors
- Check Vercel function logs
- Verify webhook endpoints are accessible
- Test API routes individually

### Database Issues
- Ensure Vercel Postgres is properly configured
- Run database migrations
- Check connection strings format

## Security Checklist

- [ ] All environment variables are set as encrypted
- [ ] Webhook secrets are configured
- [ ] Database access is restricted
- [ ] API keys are not exposed in client code
- [ ] CORS is properly configured

## Post-Deployment Steps

1. Set up domain (optional)
2. Configure custom email domain
3. Set up monitoring and alerts
4. Test all functionality thoroughly
5. Set up backup strategy

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Verify all environment variables
3. Test API endpoints individually
4. Check service status pages (Clerk, Resend, Google)