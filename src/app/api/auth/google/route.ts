import { NextResponse } from "next/server";
import { GoogleCalendarService } from "~/lib/google-calendar";

export async function GET() {
  try {
    const googleCalendar = new GoogleCalendarService();
    const authUrl = googleCalendar.getAuthUrl();

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Google OAuth initiation error:", error);
    return NextResponse.json(
      { error: "Failed to initiate Google OAuth" },
      { status: 500 }
    );
  }
}