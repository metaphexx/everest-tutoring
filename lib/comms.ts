// Quiet-hours guard for non-urgent SMS (reminders, marketing). We never text
// families late at night. Transactional messages (booking confirmation, opt-out
// replies, a fresh seat offer) are exempt and send any time.
//
// Window: 8am–8pm AWST (UTC+8, no DST in WA). Outside that, automated SMS is
// skipped by its cron and re-attempted on the next run inside the window.
export const SMS_WINDOW = { startHour: 8, endHour: 20 }

export function awstHour(now: Date = new Date()): number {
  return (now.getUTCHours() + 8) % 24
}

export function inQuietHours(now: Date = new Date()): boolean {
  const h = awstHour(now)
  return h < SMS_WINDOW.startHour || h >= SMS_WINDOW.endHour
}
