import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    message: "User authentication will be available when integrations are set up",
    status: "pending_setup"
  });
}