import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string; meetingTypeId: string }> }
) {
  const { username, meetingTypeId } = await params;
  
  return NextResponse.json({
    availableSlots: [],
    message: "Available slots will be shown when integrations are set up",
    username,
    meetingTypeId,
    dateRange: {
      start: new Date().toISOString(),
      end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }
  });
}