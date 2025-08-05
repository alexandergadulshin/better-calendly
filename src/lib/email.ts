import { Resend } from "resend";
import { format } from "date-fns";
import { env } from "~/env";

const resend = new Resend(env.RESEND_API_KEY);

export interface BookingEmailData {
  hostName: string;
  hostEmail: string;
  inviteeName: string;
  inviteeEmail: string;
  meetingTitle: string;
  duration: number;
  scheduledTime: Date;
  locationType: string;
  locationDetails?: string;
  bookingId: number;
  username: string;
}

export interface ReminderEmailData extends BookingEmailData {
  reminderType: "24hours" | "1hour";
}

export class EmailService {
  private formatDateTime(date: Date): string {
    return format(date, "EEEE, MMMM do, yyyy 'at' h:mm a");
  }

  private formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours === 0) {
      return `${remainingMinutes} minutes`;
    } else if (remainingMinutes === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      return `${hours} hour${hours > 1 ? 's' : ''} and ${remainingMinutes} minutes`;
    }
  }

  private getLocationText(locationType: string, locationDetails?: string): string {
    switch (locationType) {
      case "video":
        return "Video call (Google Meet link will be provided)";
      case "phone":
        return `Phone call${locationDetails ? ` at ${locationDetails}` : ""}`;
      case "in_person":
        return locationDetails || "In person";
      default:
        return "Location to be determined";
    }
  }

  async sendBookingConfirmation(data: BookingEmailData): Promise<void> {
    const formattedDate = this.formatDateTime(data.scheduledTime);
    const formattedDuration = this.formatDuration(data.duration);
    const locationText = this.getLocationText(data.locationType, data.locationDetails);

    // Email to invitee (booking confirmation)
    await resend.emails.send({
      from: env.FROM_EMAIL,
      to: data.inviteeEmail,
      subject: `Meeting Confirmed: ${data.meetingTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4f46e5;">Meeting Confirmed!</h2>
          
          <p>Hi ${data.inviteeName},</p>
          
          <p>Your meeting with ${data.hostName} has been confirmed.</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #374151;">${data.meetingTitle}</h3>
            <p><strong>When:</strong> ${formattedDate}</p>
            <p><strong>Duration:</strong> ${formattedDuration}</p>
            <p><strong>Location:</strong> ${locationText}</p>
            <p><strong>With:</strong> ${data.hostName} (${data.hostEmail})</p>
          </div>
          
          <p>You'll receive a reminder email 24 hours and 1 hour before the meeting.</p>
          
          <p>Need to reschedule or cancel? Contact ${data.hostEmail} directly.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            This meeting was scheduled through Better Calendly
          </p>
        </div>
      `,
    });

    // Email to host (new booking notification)
    await resend.emails.send({
      from: env.FROM_EMAIL,
      to: data.hostEmail,
      subject: `New Booking: ${data.meetingTitle} with ${data.inviteeName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">New Meeting Booked!</h2>
          
          <p>Hi ${data.hostName},</p>
          
          <p>You have a new meeting booking from ${data.inviteeName}.</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #374151;">${data.meetingTitle}</h3>
            <p><strong>When:</strong> ${formattedDate}</p>
            <p><strong>Duration:</strong> ${formattedDuration}</p>
            <p><strong>Location:</strong> ${locationText}</p>
            <p><strong>Attendee:</strong> ${data.inviteeName} (${data.inviteeEmail})</p>
          </div>
          
          <p>The meeting has been automatically added to your calendar if you have Google Calendar connected.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            Manage your bookings at: <a href="${env.NEXTAUTH_URL}/dashboard">Better Calendly Dashboard</a>
          </p>
        </div>
      `,
    });
  }

  async sendCancellationEmail(data: BookingEmailData, reason?: string): Promise<void> {
    const formattedDate = this.formatDateTime(data.scheduledTime);

    // Email to invitee
    await resend.emails.send({
      from: env.FROM_EMAIL,
      to: data.inviteeEmail,
      subject: `Meeting Cancelled: ${data.meetingTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Meeting Cancelled</h2>
          
          <p>Hi ${data.inviteeName},</p>
          
          <p>Unfortunately, your meeting with ${data.hostName} scheduled for ${formattedDate} has been cancelled.</p>
          
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          
          <p>If you'd like to reschedule, you can book a new time at: 
             <a href="${env.NEXTAUTH_URL}/${data.username}">Book with ${data.hostName}</a>
          </p>
          
          <p>Sorry for any inconvenience caused.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            This notification was sent by Better Calendly
          </p>
        </div>
      `,
    });

    // Email to host
    await resend.emails.send({
      from: env.FROM_EMAIL,
      to: data.hostEmail,
      subject: `Meeting Cancelled: ${data.meetingTitle} with ${data.inviteeName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Meeting Cancelled</h2>
          
          <p>Hi ${data.hostName},</p>
          
          <p>Your meeting with ${data.inviteeName} scheduled for ${formattedDate} has been cancelled.</p>
          
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          
          <p>The meeting has been removed from your calendar.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            Manage your bookings at: <a href="${env.NEXTAUTH_URL}/dashboard">Better Calendly Dashboard</a>
          </p>
        </div>
      `,
    });
  }

  async sendReminderEmail(data: ReminderEmailData): Promise<void> {
    const formattedDate = this.formatDateTime(data.scheduledTime);
    const formattedDuration = this.formatDuration(data.duration);
    const locationText = this.getLocationText(data.locationType, data.locationDetails);
    const timeUntil = data.reminderType === "24hours" ? "24 hours" : "1 hour";

    // Email to invitee
    await resend.emails.send({
      from: env.FROM_EMAIL,
      to: data.inviteeEmail,
      subject: `Reminder: Meeting with ${data.hostName} in ${timeUntil}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f59e0b;">Meeting Reminder</h2>
          
          <p>Hi ${data.inviteeName},</p>
          
          <p>This is a reminder that you have a meeting with ${data.hostName} in ${timeUntil}.</p>
          
          <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <h3 style="margin-top: 0; color: #92400e;">${data.meetingTitle}</h3>
            <p><strong>When:</strong> ${formattedDate}</p>
            <p><strong>Duration:</strong> ${formattedDuration}</p>
            <p><strong>Location:</strong> ${locationText}</p>
          </div>
          
          <p>Need to cancel or reschedule? Please contact ${data.hostEmail} as soon as possible.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            This reminder was sent by Better Calendly
          </p>
        </div>
      `,
    });

    // Email to host
    await resend.emails.send({
      from: env.FROM_EMAIL,
      to: data.hostEmail,
      subject: `Reminder: Meeting with ${data.inviteeName} in ${timeUntil}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f59e0b;">Meeting Reminder</h2>
          
          <p>Hi ${data.hostName},</p>
          
          <p>This is a reminder that you have a meeting with ${data.inviteeName} in ${timeUntil}.</p>
          
          <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <h3 style="margin-top: 0; color: #92400e;">${data.meetingTitle}</h3>
            <p><strong>When:</strong> ${formattedDate}</p>
            <p><strong>Duration:</strong> ${formattedDuration}</p>
            <p><strong>Location:</strong> ${locationText}</p>
            <p><strong>Attendee:</strong> ${data.inviteeName} (${data.inviteeEmail})</p>
          </div>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            Manage your bookings at: <a href="${env.NEXTAUTH_URL}/dashboard">Better Calendly Dashboard</a>
          </p>
        </div>
      `,
    });
  }
}