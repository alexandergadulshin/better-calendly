# Better Calendly - Setup Guide

## Overview
Better Calendly is a complete scheduling automation platform built with Next.js, TypeScript, Drizzle ORM, and PostgreSQL.

## Features ✅
- **User Authentication** - JWT-based registration/login system
- **Meeting Types Management** - Create, edit, and manage different meeting types
- **Availability Setting** - Set working hours and available time slots
- **Real-time Booking** - Conflict detection and daily limits
- **Google Calendar Integration** - Two-way sync with Google Calendar
- **Email Notifications** - Automated confirmations, reminders, and cancellations
- **Timezone Support** - Proper timezone handling across the app
- **Public Booking Pages** - Clean interface for invitees
- **Dashboard** - User management interface
- **Security** - Rate limiting, input validation, and security headers

## Prerequisites
- Node.js 18+ and pnpm
- PostgreSQL database
- Google Cloud Console project (for Calendar API)
- Email service account (Resend recommended)

## Installation

### 1. Clone and Install Dependencies
```bash
cd "/Users/yoni/cs projects/calendly better/better-calendly"
pnpm install
```

### 2. Database Setup
Start PostgreSQL and create the database:
```bash
createdb better-calendly
```

### 3. Environment Configuration
Update the `.env` file with your actual values:

```env
# Database
DATABASE_URL="postgresql://your_user@localhost:5432/better-calendly"

# Authentication
JWT_SECRET="your-super-secret-jwt-key-32-chars-minimum"

# Google Calendar OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
NEXTAUTH_URL="http://localhost:3000"

# Email Service (Resend)
RESEND_API_KEY="your-resend-api-key"
FROM_EMAIL="noreply@yourdomain.com"

# Cron Job Secret
CRON_SECRET="your-secure-cron-secret"
```

### 4. Google Calendar API Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Calendar API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/api/auth/google/callback`
5. Copy the Client ID and Client Secret to your `.env` file

### 5. Email Service Setup (Resend)
1. Sign up at [Resend](https://resend.com/)
2. Create an API key
3. Verify your domain or use their development domain
4. Add the API key and from email to your `.env` file

### 6. Database Migration
```bash
pnpm db:push
```

### 7. Start Development Server
```bash
pnpm dev
```

## Usage

### For Users (Hosts)
1. **Register**: Create an account at `/register`
2. **Connect Calendar**: Link your Google Calendar from the dashboard
3. **Set Availability**: Configure your working hours
4. **Create Meeting Types**: Set up different types of meetings
5. **Share Booking Link**: Share `yourdomain.com/your-username` with others

### For Invitees
1. Visit the host's booking link
2. Select a meeting type
3. Choose an available time slot
4. Fill in contact information
5. Receive confirmation email

### Admin Features
- **Dashboard**: Overview of bookings and statistics
- **Meeting Management**: Create, edit, disable meeting types
- **Booking Management**: View, cancel bookings
- **Calendar Sync**: Automatic Google Calendar integration

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/google` - Google OAuth initiation
- `GET /api/auth/google/callback` - OAuth callback

### User Management
- `GET /api/user/me` - Get current user
- `GET /api/users/[username]/public` - Get public user data

### Meeting Types
- `GET /api/meeting-types` - List user's meeting types
- `POST /api/meeting-types` - Create meeting type
- `GET /api/meeting-types/[id]` - Get meeting type
- `PUT /api/meeting-types/[id]` - Update meeting type
- `DELETE /api/meeting-types/[id]` - Delete meeting type

### Availability
- `GET /api/availability` - Get user availability
- `POST /api/availability` - Set user availability
- `GET /api/availability/[username]/[meetingTypeId]` - Get available slots

### Bookings
- `GET /api/bookings` - List user's bookings
- `POST /api/bookings` - Create booking (public)
- `PUT /api/bookings/[id]/cancel` - Cancel booking

### Cron Jobs
- `GET /api/cron/reminders` - Send reminder emails (requires auth)

## Security Features

### Rate Limiting
- Auth endpoints: 5 attempts per 15 minutes
- API endpoints: 60 requests per minute
- Booking endpoints: 3 bookings per minute

### Input Validation
- Email format validation
- Phone number validation
- Input sanitization
- SQL injection prevention

### Security Headers
- Content Security Policy
- XSS Protection
- CSRF Protection
- Frame Options

## Email Templates
The system sends automated emails for:
- **Booking Confirmations** - Sent to both host and invitee
- **Cancellation Notifications** - When meetings are cancelled
- **24-hour Reminders** - Day before the meeting
- **1-hour Reminders** - Hour before the meeting

## Cron Jobs / Scheduled Tasks
Set up cron jobs to send reminder emails:

```bash
# Send reminders every hour
0 * * * * curl -H "Authorization: Bearer your-cron-secret" https://yourdomain.com/api/cron/reminders
```

Or use Vercel Cron Functions in production.

## Production Deployment

### Environment Variables
Make sure to set all environment variables in production:
- Use strong JWT secrets (32+ characters)
- Use production database URLs
- Set up proper email domain
- Use secure cron secrets

### Database
- Use connection pooling
- Set up database backups
- Monitor performance

### Monitoring
- Set up error tracking (Sentry)
- Monitor API response times
- Track email delivery rates

## Troubleshooting

### Common Issues
1. **Database Connection**: Check PostgreSQL is running and credentials are correct
2. **Google Calendar**: Verify OAuth credentials and redirect URLs
3. **Email Delivery**: Check Resend API key and domain verification
4. **Timezone Issues**: Ensure proper timezone handling in availability settings

### Debug Mode
Enable debug logging by setting `NODE_ENV=development` and check console logs.

## Tech Stack
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Drizzle ORM
- **Database**: PostgreSQL
- **Authentication**: JWT tokens, Google OAuth
- **Email**: Resend
- **Calendar**: Google Calendar API
- **Security**: Rate limiting, input validation, security headers

## Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License
This project is for educational purposes. Ensure compliance with all third-party service terms.