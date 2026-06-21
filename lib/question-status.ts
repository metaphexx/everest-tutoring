// Pure display metadata for question statuses. No server imports, so this is safe
// to use from both client and server components.
export type QuestionStatus = 'waiting_for_tutor' | 'tutor_replied' | 'follow_up_needed' | 'solved'

export const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  waiting_for_tutor: { label: 'Waiting for tutor', color: '#B45309', bg: 'rgba(245,166,35,.16)' },
  tutor_replied: { label: 'Tutor replied', color: '#007ECC', bg: 'rgba(0,157,255,.14)' },
  follow_up_needed: { label: 'Follow-up needed', color: '#6D28D9', bg: 'rgba(124,92,255,.14)' },
  solved: { label: 'Solved', color: '#15803D', bg: 'rgba(34,160,91,.16)' },
}

export function statusMeta(status: string) {
  return STATUS_META[status] ?? { label: status, color: '#5E6B7C', bg: 'rgba(15,42,79,.08)' }
}
