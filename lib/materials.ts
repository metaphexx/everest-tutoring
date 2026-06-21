/**
 * Teaching materials / booklet suggestions, sourced from the Everest Google Drive.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ DEV HAND-OFF NOTES  (booklets live on Google Drive - wire this up)        │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ This module currently returns SCAFFOLD suggestions so the tutor UI works  │
 * │ end-to-end. To make it read the real Drive of booklets/materials:         │
 * │                                                                            │
 * │ 1. Auth: create a Google Cloud service account, enable the Drive API,     │
 * │    and share the booklets folder with the service account email           │
 * │    (read-only). Store creds as env:                                        │
 * │      GOOGLE_DRIVE_CLIENT_EMAIL, GOOGLE_DRIVE_PRIVATE_KEY,                   │
 * │      GOOGLE_DRIVE_BOOKLETS_FOLDER_ID                                        │
 * │    `hasDrive` below flips to true once these are set.                       │
 * │                                                                            │
 * │ 2. Library: `npm i googleapis`. Build a client with google.auth.JWT and    │
 * │    scope https://www.googleapis.com/auth/drive.readonly.                    │
 * │                                                                            │
 * │ 3. Folder convention (recommended so matching is reliable):                │
 * │      Booklets/<Year>/<Subject>/<Topic-or-Week>.pdf                          │
 * │    e.g. Booklets/Year 9/Maths/Week 3 - Linear Equations.pdf                 │
 * │    List with drive.files.list({ q: "'<folderId>' in parents", ... }).       │
 * │                                                                            │
 * │ 4. Matching: rank files for a given {yearLevel, subject, topic} by folder   │
 * │    path + filename similarity to the topic. Optionally let the AI pick:     │
 * │    pass the candidate filenames + the week's topic to lib/ai.ts and ask     │
 * │    which booklet(s) to print (it already does structured output).           │
 * │                                                                            │
 * │ 5. Return webViewLink (open) + webContentLink (download/print) per file.    │
 * │    For "what to print", surface page count via the PDF metadata if needed.  │
 * │                                                                            │
 * │ Keep the MaterialSuggestion shape below stable so the tutor UI needs no     │
 * │ changes when the real Drive lookup lands.                                   │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

const real = (v: string | undefined) => !!v && v.trim().length > 0 && !v.includes('...')

/** True once real Google Drive service-account creds are configured. */
export const hasDrive =
  real(process.env.GOOGLE_DRIVE_CLIENT_EMAIL) &&
  real(process.env.GOOGLE_DRIVE_PRIVATE_KEY) &&
  real(process.env.GOOGLE_DRIVE_BOOKLETS_FOLDER_ID)

export type MaterialSuggestion = {
  title: string
  fileName: string
  driveUrl: string | null // webViewLink once Drive is wired
  reason: string // why this booklet for this week
  source: 'drive' | 'suggested' // 'suggested' = scaffold until Drive is connected
}

/**
 * Suggest booklets to print for a class this week. Real implementation reads the
 * Drive folder (see hand-off notes); for now it returns a sensible scaffold so
 * tutors see the workflow and devs have a stable contract to fill in.
 */
export async function suggestMaterials(input: {
  yearLevel: number
  subject: string
  topic: string | null
  weekOf?: Date
}): Promise<MaterialSuggestion[]> {
  if (hasDrive) {
    // DEV: replace this branch with the real Drive lookup described above.
    return fetchFromDrive(input)
  }

  const topic = input.topic?.trim()
  const base = `Y${input.yearLevel} ${input.subject}`
  if (!topic) {
    return [
      {
        title: `${base} - core practice set`,
        fileName: `${base} Practice.pdf`,
        driveUrl: null,
        reason: 'No outline topic for this week yet, so the standard practice booklet is the safe default.',
        source: 'suggested',
      },
    ]
  }
  return [
    {
      title: `${base} - ${topic} booklet`,
      fileName: `${base} - ${topic}.pdf`,
      driveUrl: null,
      reason: `Matches this week's topic (${topic}) from the course outline.`,
      source: 'suggested',
    },
    {
      title: `${base} - ${topic} practice questions`,
      fileName: `${base} - ${topic} Practice.pdf`,
      driveUrl: null,
      reason: 'Exam-style questions to run as a short prac in the back half of the session.',
      source: 'suggested',
    },
  ]
}

// Placeholder for the real Drive integration (only reached when hasDrive is true).
async function fetchFromDrive(_input: {
  yearLevel: number
  subject: string
  topic: string | null
  weekOf?: Date
}): Promise<MaterialSuggestion[]> {
  // DEV: implement with googleapis per the hand-off notes at the top of this file.
  return []
}
