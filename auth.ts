import NextAuth from 'next-auth'
import Resend from 'next-auth/providers/resend'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/db'
import { resend } from '@/lib/resend'

// In dev the Resend key is a placeholder, so we can't actually send. Detect a
// real key; when absent, magic links are logged to the server console instead.
const hasResendKey =
  !!process.env.RESEND_API_KEY &&
  process.env.RESEND_API_KEY.startsWith('re_') &&
  !process.env.RESEND_API_KEY.includes('...')

const FROM = `${process.env.FROM_NAME ?? 'Everest Tutoring'} <${process.env.FROM_EMAIL ?? 'noreply@everesttutoring.com.au'}>`

function magicLinkEmail(url: string) {
  return `
    <!DOCTYPE html><html><body style="font-family: Arial, sans-serif; background:#f8fafb; margin:0; padding:40px 20px;">
      <div style="max-width:480px; margin:0 auto; background:#fff; border-radius:16px; padding:36px; box-shadow:0 4px 24px rgba(0,32,63,.08);">
        <p style="color:#009dff; font-weight:700; margin:0 0 4px;">Everest Tutoring × HSHS</p>
        <h2 style="color:#00203F; margin:0 0 16px;">Sign in to your account</h2>
        <p style="color:#475569; line-height:1.6;">Click the button below to sign in. This link is valid for 24 hours and can only be used once.</p>
        <a href="${url}" style="display:inline-block; margin:20px 0; background:linear-gradient(135deg,#009dff,#007acc); color:#fff; text-decoration:none; font-weight:600; padding:14px 28px; border-radius:999px;">Sign in to Everest</a>
        <p style="color:#94a3b8; font-size:12px; line-height:1.6;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    </body></html>`
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  trustHost: true,
  pages: { signIn: '/login', verifyRequest: '/check-email', error: '/login' },
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY ?? 'dev-placeholder',
      from: process.env.FROM_EMAIL ?? 'noreply@everesttutoring.com.au',
      async sendVerificationRequest({ identifier: email, url }) {
        if (!hasResendKey) {
          // Dev fallback: print the magic link so login is testable without keys.
          console.log(`\n🔑  Magic sign-in link for ${email}:\n${url}\n`)
          return
        }
        const res = await resend.emails.send({
          from: FROM,
          to: email,
          subject: 'Your Everest Tutoring sign-in link',
          html: magicLinkEmail(url),
        })
        if (res.error) throw new Error(`Resend error: ${res.error.message}`)
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id
        token.role = (user as { role?: string }).role ?? 'parent'
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? session.user.id
        session.user.role = (token.role as string) ?? 'parent'
      }
      return session
    },
  },
})
