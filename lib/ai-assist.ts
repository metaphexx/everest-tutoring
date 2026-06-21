import { aiEnabled } from '@/lib/ai'
import { cachedText } from '@/lib/ai-cache'

const AU = 'Use Australian English. Be warm, concise and human. Do not use em dashes.'

/**
 * A short win-back note for an at-risk family. Cheap model (draft tier = Haiku) -
 * the admin always edits and sends it themselves. Falls back to a sensible
 * template when AI is off.
 */
export async function draftWinBack(input: { parentName: string; students: string[]; reasons: string[] }): Promise<string> {
  const kids = input.students.join(' and ') || 'your child'
  if (!aiEnabled) {
    return `Hi ${input.parentName},\n\nWe have loved having ${kids} at Everest this term and want to make sure the program is working well for your family. If anything has not been quite right - timing, cost, or how things are going - we would really like to hear from you and put it right.\n\nIs there a good time this week for a quick chat?\n\nWarm regards,\nThe Everest Tutoring team`
  }
  try {
    return await cachedText({
      task: 'draft',
      maxTokens: 350,
      system: `You write short, genuine retention emails for a tutoring centre (Everest Tutoring x Harrisdale SHS). ${AU} 4-6 sentences. Acknowledge the concern implied by the signals without quoting them mechanically, offer a specific next step (a quick call or a small adjustment), and never sound desperate or salesy. Sign off as "The Everest Tutoring team". Output the email body only.`,
      messages: [{ role: 'user', content: `Parent: ${input.parentName}. Student(s): ${kids}. Risk signals: ${input.reasons.join('; ')}. Write a win-back email.` }],
    })
  } catch {
    return ''
  }
}

/**
 * A suggested first-draft answer to a student's question, for the tutor to edit.
 * Uses the report tier (Sonnet) since it is student-facing teaching content.
 */
export async function suggestQuestionAnswer(input: { title: string; body: string; subject: string; yearLevel: number }): Promise<string> {
  if (!aiEnabled) {
    return `Great question. Let's break it down step by step in our next class - in the meantime, try writing out what you already know about this and where exactly you get stuck, and bring it along.`
  }
  try {
    return await cachedText({
      task: 'report',
      maxTokens: 500,
      system: `You are an experienced ${input.subject} tutor helping a Year ${input.yearLevel} student. ${AU} Give a clear, encouraging answer that teaches the method rather than just the final answer, in 3-6 short sentences or steps. This is a draft the human tutor will review and edit before sending, so stay accurate and do not invent specifics about the student's work.`,
      messages: [{ role: 'user', content: `Question title: ${input.title}\nQuestion: ${input.body}` }],
    })
  } catch {
    return ''
  }
}

/**
 * Triage a support message: a one-line category + a suggested reply draft.
 * Cheap model (draft tier).
 */
export async function suggestSupportReply(input: { topic: string; body: string }): Promise<{ category: string; draft: string }> {
  if (!aiEnabled) {
    return { category: 'general', draft: `Hi, thanks for getting in touch. We have received your message and someone from the Everest team will get back to you shortly. If it is urgent, you can call us on 0404 604 673.` }
  }
  try {
    const text = await cachedText({
      task: 'draft',
      maxTokens: 400,
      jsonSchema: {
        type: 'object', additionalProperties: false,
        properties: { category: { type: 'string', enum: ['billing', 'scheduling', 'academic', 'complaint', 'general'] }, draft: { type: 'string' } },
        required: ['category', 'draft'],
      },
      system: `You triage parent support messages for a tutoring centre and draft a helpful reply for an admin to edit. ${AU} Classify the message and write a 2-4 sentence reply. The admin sends it, so never promise refunds or commitments; offer to help and a next step. Return JSON only.`,
      messages: [{ role: 'user', content: `Subject: ${input.topic}\nMessage: ${input.body}` }],
    })
    const parsed = JSON.parse(text) as { category: string; draft: string }
    return { category: parsed.category ?? 'general', draft: parsed.draft ?? '' }
  } catch {
    return { category: 'general', draft: '' }
  }
}
