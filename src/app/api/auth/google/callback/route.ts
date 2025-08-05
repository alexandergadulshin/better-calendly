import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { GoogleCalendarService } from "~/lib/google-calendar";
import { auth } from "@clerk/nextjs/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        new URL("/dashboard?error=google_auth_cancelled", request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/dashboard?error=missing_code", request.url)
      );
    }

    // Get current user from Clerk
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.redirect(
        new URL("/sign-in?error=not_authenticated", request.url)
      );
    }

    // Get user from database
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1);

    if (!dbUser) {
      return NextResponse.redirect(
        new URL("/sign-in?error=user_not_found", request.url)
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