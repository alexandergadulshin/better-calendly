import { auth, currentUser } from '@clerk/nextjs/server'
import { supabaseAdmin } from './supabase'
import type { User } from './supabase'

export async function requireAuth() {
  const { userId } = await auth()
  
  if (!userId) {
    throw new Error('Unauthorized')
  }
  
  return { userId }
}

export async function getCurrentUser(): Promise<User | null> {
  const user = await currentUser()
  
  if (!user) {
    return null
  }
  
  // Get user from Supabase database
  const { data: dbUser } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('clerk_id', user.id)
    .single()
  
  if (!dbUser) {
    // Create user in database if they don't exist
    const newUser = {
      clerk_id: user.id,
      email: user.emailAddresses[0]?.emailAddress || '',
      username: user.username || user.emailAddresses[0]?.emailAddress.split('@')[0] || '',
      first_name: user.firstName,
      last_name: user.lastName,
      timezone: 'UTC'
    }
    
    const { data: createdUser } = await supabaseAdmin
      .from('users')
      .insert(newUser)
      .select()
      .single()
    
    return createdUser
  }
  
  return dbUser
}

export async function syncUserWithClerk() {
  const user = await currentUser()
  
  if (!user) {
    return null
  }
  
  // Update user in database with latest Clerk data
  const { data: updatedUser } = await supabaseAdmin
    .from('users')
    .upsert({
      clerk_id: user.id,
      email: user.emailAddresses[0]?.emailAddress || '',
      username: user.username || user.emailAddresses[0]?.emailAddress.split('@')[0] || '',
      first_name: user.firstName,
      last_name: user.lastName,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'clerk_id'
    })
    .select()
    .single()
  
  return updatedUser
}