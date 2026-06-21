'use server'

import { z } from 'zod'
import { AuthError } from 'next-auth'
import { signIn } from '@/auth'

export type LoginState = { error?: string } | undefined

const emailSchema = z.string().email()

export async function requestMagicLink(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const next = String(formData.get('next') ?? '') || '/account'

  if (!emailSchema.safeParse(email).success) {
    return { error: 'Please enter a valid email address.' }
  }

  try {
    // On success this throws a redirect to the verifyRequest page (/check-email).
    await signIn('resend', { email, redirectTo: next })
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: 'Could not send your sign-in link. Please try again.' }
    }
    throw err // re-throw the NEXT_REDIRECT so navigation happens
  }

  return undefined
}
