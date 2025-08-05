import { sql } from "drizzle-orm";
import { 
  index, 
  pgEnum, 
  pgTableCreator
} from "drizzle-orm/pg-core";

/**
 * Multi-project schema for Calendly MVP
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `better-calendly_${name}`);

// Enums
export const bookingStatusEnum = pgEnum("booking_status", ["confirmed", "cancelled"]);
export const locationTypeEnum = pgEnum("location_type", ["phone", "video", "in_person"]);
export const fieldTypeEnum = pgEnum("field_type", ["text", "email", "phone", "textarea"]);

// Users table
export const users = createTable(
  "user",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    clerkId: d.varchar({ length: 255 }).notNull().unique(),
    email: d.varchar({ length: 255 }).notNull().unique(),
    username: d.varchar({ length: 50 }).notNull().unique(),
    firstName: d.varchar({ length: 100 }),
    lastName: d.varchar({ length: 100 }),
    timezone: d.varchar({ length: 50 }).notNull().default("UTC"),
    calendarConnected: d.boolean().notNull().default(false),
    calendarAccessToken: d.text(),
    calendarRefreshToken: d.text(),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("user_clerk_id_idx").on(t.clerkId),
    index("user_email_idx").on(t.email),
    index("user_username_idx").on(t.username),
  ],
);

// Meeting Types table
export const meetingTypes = createTable(
  "meeting_type",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: d.integer().notNull().references(() => users.id, { onDelete: "cascade" }),
    name: d.varchar({ length: 255 }).notNull(),
    durationMinutes: d.integer().notNull(),
    description: d.text(),
    advanceNoticeHours: d.integer().notNull().default(2),
    dailyLimit: d.integer(),
    locationType: locationTypeEnum().notNull().default("video"),
    locationDetails: d.text(),
    active: d.boolean().notNull().default(true),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("meeting_type_user_idx").on(t.userId),
    index("meeting_type_active_idx").on(t.active),
  ],
);

// Availability table
export const availability = createTable(
  "availability",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: d.integer().notNull().references(() => users.id, { onDelete: "cascade" }),
    dayOfWeek: d.integer().notNull(), // 0 = Sunday, 6 = Saturday
    startTime: d.varchar({ length: 5 }).notNull(), // HH:MM format
    endTime: d.varchar({ length: 5 }).notNull(), // HH:MM format
    active: d.boolean().notNull().default(true),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  }),
  (t) => [
    index("availability_user_day_idx").on(t.userId, t.dayOfWeek),
  ],
);

// Bookings table
export const bookings = createTable(
  "booking",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    meetingTypeId: d.integer().notNull().references(() => meetingTypes.id, { onDelete: "cascade" }),
    inviteeName: d.varchar({ length: 255 }).notNull(),
    inviteeEmail: d.varchar({ length: 255 }).notNull(),
    inviteePhone: d.varchar({ length: 20 }),
    scheduledTime: d.timestamp({ withTimezone: true }).notNull(),
    status: bookingStatusEnum().notNull().default("confirmed"),
    cancellationReason: d.text(),
    calendarEventId: d.varchar({ length: 255 }),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("booking_meeting_type_idx").on(t.meetingTypeId),
    index("booking_scheduled_time_idx").on(t.scheduledTime),
    index("booking_invitee_email_idx").on(t.inviteeEmail),
  ],
);

// Custom Questions table
export const customQuestions = createTable(
  "custom_question",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    meetingTypeId: d.integer().notNull().references(() => meetingTypes.id, { onDelete: "cascade" }),
    questionText: d.varchar({ length: 500 }).notNull(),
    required: d.boolean().notNull().default(false),
    fieldType: fieldTypeEnum().notNull().default("text"),
    orderIndex: d.integer().notNull().default(0),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  }),
  (t) => [
    index("custom_question_meeting_type_idx").on(t.meetingTypeId),
  ],
);

// Booking Responses table
export const bookingResponses = createTable(
  "booking_response",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    bookingId: d.integer().notNull().references(() => bookings.id, { onDelete: "cascade" }),
    questionId: d.integer().notNull().references(() => customQuestions.id, { onDelete: "cascade" }),
    responseText: d.text().notNull(),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  }),
  (t) => [
    index("booking_response_booking_idx").on(t.bookingId),
    index("booking_response_question_idx").on(t.questionId),
  ],
);
