import { auth, clerkClient } from '@clerk/nextjs/server'
import { eq } from 'drizzle-orm'
import { db } from '~/server/db'
import { users } from '~/server/db/schema'

export async function getCurrentUser() {
  const { userId } = await auth()
  
  if (!userId) {
    return null
  }

  // Try to find user in our database
  const [dbUser] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, userId))
    .limit(1)

  // If user doesn't exist in our database, create them
  if (!dbUser) {
    try {
      const clerkUser = await (await clerkClient()).users.getUser(userId)
      return await createOrUpdateUserFromClerk(clerkUser)
    } catch (error) {
      console.error('Error creating user from Clerk data:', error)
      return null
    }
  }

  return dbUser
}

export async function requireAuth() {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error('Unauthorized')
  }
  
  return user
}

export function generateUsername(email: string): string {
  const baseUsername = email.split("@")[0]!.toLowerCase();
  // Remove special characters and replace with hyphens
  return baseUsername.replace(/[^a-z0-9]/g, "-");
}

export async function createOrUpdateUserFromClerk(clerkUser: {
  id: string
  emailAddresses: Array<{ emailAddress: string }>
  firstName?: string | null
  lastName?: string | null
}) {
  const email = clerkUser.emailAddresses[0]?.emailAddress
  if (!email) {
    throw new Error('No email found for user')
  }

  // Check if user already exists
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkUser.id))
    .limit(1)

  if (existingUser) {
    // Update existing user
    const [updatedUser] = await db
      .update(users)
      .set({
        email,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
      })
      .where(eq(users.clerkId, clerkUser.id))
      .returning()

    return updatedUser!
  }

  // Generate unique username
  let username = generateUsername(email)
  let usernameExists = true
  let counter = 1

  while (usernameExists) {
    const existingUsername = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1)

    if (existingUsername.length === 0) {
      usernameExists = false
    } else {
      username = `${generateUsername(email)}-${counter}`
      counter++
    }
  }

  // Create new user
  const [newUser] = await db
    .insert(users)
    .values({
      clerkId: clerkUser.id,
      email,
      username,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
    })
    .returning()

  return newUser!
}