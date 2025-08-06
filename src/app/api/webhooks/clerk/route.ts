import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { supabaseAdmin } from "~/lib/supabase";

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET || "";

export async function POST(request: NextRequest) {
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  // Get headers and body
  const headerPayload = request.headers;
  const payload = await request.text();

  // Get Svix headers for verification
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json(
      { error: "Missing required headers" },
      { status: 400 }
    );
  }

  // Create new Svix instance with secret
  const wh = new Webhook(webhookSecret);

  let evt: any;

  try {
    evt = wh.verify(payload, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  const { id, ...attributes } = evt.data;
  const eventType = evt.type;

  try {
    switch (eventType) {
      case "user.created":
        await supabaseAdmin
          .from('users')
          .insert({
            clerk_id: id,
            email: attributes.email_addresses?.[0]?.email_address || '',
            username: attributes.username || attributes.email_addresses?.[0]?.email_address?.split('@')[0] || '',
            first_name: attributes.first_name,
            last_name: attributes.last_name,
          });
        break;

      case "user.updated":
        await supabaseAdmin
          .from('users')
          .update({
            email: attributes.email_addresses?.[0]?.email_address || '',
            username: attributes.username || attributes.email_addresses?.[0]?.email_address?.split('@')[0] || '',
            first_name: attributes.first_name,
            last_name: attributes.last_name,
            updated_at: new Date().toISOString(),
          })
          .eq('clerk_id', id);
        break;

      case "user.deleted":
        await supabaseAdmin
          .from('users')
          .delete()
          .eq('clerk_id', id);
        break;

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}