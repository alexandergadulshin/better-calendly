import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  
  return NextResponse.json({
    user: {
      username,
      firstName: "Demo",
      lastName: "User",
      timezone: "UTC"
    },
    meetingTypes: [
      {
        id: 1,
        name: "Demo Meeting",
        durationMinutes: 30,
        active: true,
        description: "This is a demo meeting type"
      }
    ],
    message: "Demo data - will be replaced when integrations are set up"
  });
}