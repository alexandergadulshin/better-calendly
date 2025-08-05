import { NextRequest, NextResponse } from "next/server";
import { sendScheduledReminders } from "~/lib/reminder-scheduler";

export async function GET(request: NextRequest) {
  try {
    // Simple API key protection for cron endpoint
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.CRON_SECRET || "default-cron-secret";
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await sendScheduledReminders();

    return NextResponse.json({
      success: true,
      message: "Reminders sent successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to send reminders",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}