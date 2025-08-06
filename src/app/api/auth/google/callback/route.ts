import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { GoogleCalendarService } from "~/lib/google-calendar";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        new URL("/?error=google_auth_cancelled", request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/?error=missing_code", request.url)
      );
    }

    // TODO: Add authentication when Clerk integration is set up
    // For now, redirect back home since no auth is configured
    return NextResponse.redirect(
      new URL("/?message=auth_setup_required", request.url)
    );

    // Get user from database (placeholder - will be enabled when auth is set up)
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, 1)) // placeholder user ID
      .limit(1);

    if (!dbUser) {
      return NextResponse.redirect(
        new URL("/?error=user_not_found", request.url)
      );
    }

    // Exchange code for tokens
    const googleCalendar = new GoogleCalendarService();
    const tokens = await googleCalendar.getTokensFromCode(code) as any;

    if (!tokens?.access_token) {
      return NextResponse.redirect(
        new URL("/dashboard?error=token_exchange_failed", request.url)
      );
    }

    // Update user with calendar tokens
    await db
      .update(users)
      .set({
        calendarConnected: true,
        calendarAccessToken: tokens.access_token,
        calendarRefreshToken: tokens.refresh_token || null,
      })
      .where(eq(users.id, dbUser.id));

    return NextResponse.redirect(
      new URL("/dashboard?success=calendar_connected", request.url)
    );
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/dashboard?error=auth_failed", request.url)
    );
  }
}