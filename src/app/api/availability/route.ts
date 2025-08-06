import { NextRequest, NextResponse } from "next/server";

// GET /api/availability - Get availability
export async function GET() {
  return NextResponse.json({
    availability: [],
    message: "Availability system will be available when integrations are set up"
  });
}

// PUT /api/availability - Update availability
export async function PUT(request: NextRequest) {
  const body = await request.json();
  
  return NextResponse.json({
    message: "Availability updates will be available when integrations are set up",
    data: body,
    status: "pending_setup"
  });
}