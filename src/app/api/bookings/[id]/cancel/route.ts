import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  return NextResponse.json({
    message: "Booking cancellation feature will be available when integrations are set up",
    bookingId: id,
    status: "pending_setup"
  });
}