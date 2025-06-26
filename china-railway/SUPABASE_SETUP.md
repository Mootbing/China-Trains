# Supabase Google Authentication Setup

This guide will walk you through setting up Google OAuth authentication with Supabase for your China Railway application.

## Prerequisites

- A Google Cloud Platform (GCP) accountBB
- A Supabase account
- Your Next.js application (already set up)

## Step 1: Set up Google Cloud Platform (GCP)

### 1.1 Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter a project name (e.g., "China Railway Auth")
4. Click "Create"

### 1.2 Enable Google+ API

1. In the Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Google+ API" and click on it
3. Click "Enable"

### 1.3 Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - User Type: External
   - App name: "China Railway"
   - User support email: Your email
   - Developer contact information: Your email
   - Save and continue through the steps

4. Create OAuth 2.0 Client ID:
   - Application type: "Web application"
   - Name: "China Railway Web Client"
   - Authorized JavaScript origins:
     - `http://localhost:3000` (for development)
     - `https://your-domain.com` (for production)
   - Authorized redirect URIs:
     - `http://localhost:3000/auth/callback` (for development)
     - `https://your-domain.com/auth/callback` (for production)
   - Click "Create"

5. **Save the Client ID and Client Secret** - you'll need these for Supabase

## Step 2: Set up Supabase

### 2.1 Create a Supabase Project

1. Go to [Supabase](https://supabase.com/) and sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - Name: "china-railway"
   - Database Password: Create a strong password
   - Region: Choose closest to your users
5. Click "Create new project"

### 2.2 Configure Google OAuth Provider

1. In your Supabase dashboard, go to "Authentication" → "Providers"
2. Find "Google" and click "Edit"
3. Enable Google provider by toggling it on
4. Enter your Google OAuth credentials:
   - **Client ID**: Your Google OAuth Client ID
   - **Client Secret**: Your Google OAuth Client Secret
5. Click "Save"

### 2.3 Get Supabase Credentials

1. Go to "Settings" → "API"
2. Copy the following values:
   - **Project URL** (e.g., `https://your-project.supabase.co`)
   - **anon public** key

## Step 3: Configure Your Application

### 3.1 Create Environment Variables

Create a `.env.local` file in your project root:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Replace the values with your actual Supabase credentials.

### 3.2 Update Google OAuth Redirect URIs

In your Google Cloud Console, add this redirect URI to your OAuth 2.0 client:
```
https://your-project.supabase.co/auth/v1/callback
```

Replace `your-project` with your actual Supabase project reference.

## Step 4: Test the Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000`

3. Click "Continue with Google"

4. You should be redirected to Google's OAuth consent screen

5. After authorization, you should be redirected back to your app and see your profile information

## Troubleshooting

### Common Issues:

1. **"Invalid redirect URI" error**:
   - Make sure the redirect URI in Google Cloud Console matches exactly
   - Include both development and production URLs

2. **"Client ID not found" error**:
   - Verify your Google OAuth Client ID is correct
   - Ensure the Google+ API is enabled

3. **"Invalid client secret" error**:
   - Double-check your Google OAuth Client Secret
   - Make sure there are no extra spaces

4. **CORS errors**:
   - Ensure your domain is added to authorized origins in Google Cloud Console
   - Check that your Supabase project URL is correct

### Environment Variables Check:

Make sure your `.env.local` file has the correct format:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Security Notes

- Never commit your `.env.local` file to version control
- Keep your Google OAuth Client Secret secure
- Use environment variables for all sensitive configuration
- Consider implementing additional security measures like email verification

## Production Deployment

When deploying to production:

1. Update your Google OAuth redirect URIs to include your production domain
2. Update your Supabase project settings with production URLs
3. Set up proper environment variables in your hosting platform
4. Consider enabling additional security features in Supabase (email confirmation, etc.)

## Next Steps

After successful authentication setup, you can:

1. Create user profiles in your Supabase database
2. Implement role-based access control
3. Add additional authentication providers (GitHub, Discord, etc.)
4. Set up user preferences and settings
5. Implement protected routes and middleware 