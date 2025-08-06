import { NextRequest, NextResponse } from "next/server";

// GET /api/meeting-types - List meeting types
export async function GET() {
  return NextResponse.json({
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

// POST /api/meeting-types - Create meeting type
export async function POST(request: NextRequest) {
  const body = await request.json();
  
  return NextResponse.json({
    message: "Meeting type creation will be available when integrations are set up",
    data: body,
    status: "pending_setup"
  });
}