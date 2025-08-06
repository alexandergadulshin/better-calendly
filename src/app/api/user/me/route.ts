import { NextResponse } from "next/server";

export async function GET() {
  try {
    // TODO: Add authentication when Clerk integration is set up
    // For now, return placeholder user data or auth required message
    
    return NextResponse.json(
      { error: "Authentication setup required" },
      { status: 401 }
    );
    
    // Placeholder user data (will be enabled when auth is set up)
    /*
    return NextResponse.json({ 
      user: {
        id: 1,
        email: "user@example.com",
        username: "demo-user",
        firstName: "Demo",
        lastName: "User",
        timezone: "UTC",
        calendarConnected: false,
      }
    });
    */
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}