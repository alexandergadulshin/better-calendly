import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  return NextResponse.json({
    meetingType: {
      id: parseInt(id),
      name: "Demo Meeting",
      durationMinutes: 30,
      active: true,
      description: "This is a demo meeting type"
    },
    message: "Demo data - will be replaced when integrations are set up"
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  
  return NextResponse.json({
    message: "Meeting type updates will be available when integrations are set up",
    meetingTypeId: id,
    data: body,
    status: "pending_setup"
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  return NextResponse.json({
    message: "Meeting type deletion will be available when integrations are set up",
    meetingTypeId: id,
    status: "pending_setup"
  });
}