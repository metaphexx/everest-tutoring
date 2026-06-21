import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

// Max 10 MB per file. Students upload photos of worksheets, PDFs and screenshots.
const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
  'application/pdf',
])
const EXT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'image/heic': 'heic', 'image/heif': 'heif', 'application/pdf': 'pdf',
}

// Single shared upload endpoint. Used by the Ask composer, School Materials and
// tutor resources. TODO(prod): write to object storage (S3 / Vercel Blob) and
// stream rather than buffering; the local-disk path below is for dev/preview.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Expected multipart form data' }, { status: 400 })
  }

  const file = form.get('file')
  const kind = String(form.get('kind') ?? 'upload')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File is too large (max 10 MB).' }, { status: 413 })
  }
  if (file.type && !ALLOWED.has(file.type)) {
    return NextResponse.json({ error: 'Please upload an image or a PDF.' }, { status: 415 })
  }

  const ext = EXT[file.type] ?? (path.extname(file.name).replace('.', '') || 'bin')
  const id = randomBytes(12).toString('hex')
  const fileName = `${id}.${ext}`
  const dir = path.join(process.cwd(), 'public', 'uploads')
  await mkdir(dir, { recursive: true })
  const bytes = Buffer.from(await file.arrayBuffer())
  await writeFile(path.join(dir, fileName), bytes)

  const url = `/uploads/${fileName}`
  const record = await prisma.fileAttachment.create({
    data: {
      kind,
      url,
      mimeType: file.type || null,
      sizeBytes: file.size,
      originalName: file.name || null,
      uploadedById: user.id,
    },
  })

  return NextResponse.json({
    id: record.id,
    url: record.url,
    originalName: record.originalName,
    mimeType: record.mimeType,
    sizeBytes: record.sizeBytes,
  })
}
