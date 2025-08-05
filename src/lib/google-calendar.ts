import { google } from "googleapis";
import { env } from "~/env";

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
  conferenceData?: {
    createRequest: {
      requestId: string;
      conferenceSolutionKey: {
        type: "hangoutsMeet";
      };
    };
  };
}

export interface BusyTime {
  start: string;
  end: string;
}

export class GoogleCalendarService {
  private oauth2Client;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      `${env.NEXTAUTH_URL}/api/auth/google/callback`
    );
  }

  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/userinfo.email",
      ],
      prompt: "consent",
    });
  }

  getTokensFromCode(code: string): Promise<any> {
    return new Promise((resolve, reject) => {
      // @ts-ignore - using callback version to avoid TypeScript issues
      this.oauth2Client.getAccessToken(code, (err: any, tokens: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(tokens);
        }
      });
    });
  }

  setCredentials(accessToken: string, refreshToken?: string) {
    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  }

  async refreshAccessToken(refreshToken: string) {
    this.oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });
    
    const { credentials } = await this.oauth2Client.refreshAccessToken();
    return credentials;
  }

  async createEvent(event: CalendarEvent): Promise<string | null> {
    const calendar = google.calendar({ version: "v3", auth: this.oauth2Client });

    try {
      const response = await calendar.events.insert({
        calendarId: "primary",
        requestBody: event,
        conferenceDataVersion: event.conferenceData ? 1 : undefined,
      });

      return response.data.id || null;
    } catch (error) {
      console.error("Error creating calendar event:", error);
      throw new Error("Failed to create calendar event");
    }
  }

  async updateEvent(eventId: string, event: Partial<CalendarEvent>): Promise<void> {
    const calendar = google.calendar({ version: "v3", auth: this.oauth2Client });

    try {
      await calendar.events.patch({
        calendarId: "primary",
        eventId,
        requestBody: event,
      });
    } catch (error) {
      console.error("Error updating calendar event:", error);
      throw new Error("Failed to update calendar event");
    }
  }

  async deleteEvent(eventId: string): Promise<void> {
    const calendar = google.calendar({ version: "v3", auth: this.oauth2Client });

    try {
      await calendar.events.delete({
        calendarId: "primary",
        eventId,
      });
    } catch (error) {
      console.error("Error deleting calendar event:", error);
      throw new Error("Failed to delete calendar event");
    }
  }

  async getBusyTimes(startTime: string, endTime: string): Promise<BusyTime[]> {
    const calendar = google.calendar({ version: "v3", auth: this.oauth2Client });

    try {
      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin: startTime,
          timeMax: endTime,
          items: [{ id: "primary" }],
        },
      });

      const busyTimes = response.data.calendars?.primary?.busy || [];
      return busyTimes.map(busy => ({
        start: busy.start!,
        end: busy.end!,
      }));
    } catch (error) {
      console.error("Error getting busy times:", error);
      return [];
    }
  }

  async getUserEmail(): Promise<string | null> {
    try {
      const oauth2 = google.oauth2({ version: "v2", auth: this.oauth2Client });
      const response = await oauth2.userinfo.get();
      return response.data.email || null;
    } catch (error) {
      console.error("Error getting user email:", error);
      return null;
    }
  }
}