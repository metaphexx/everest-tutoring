/**
 * Pluggable text embeddings for semantic search.
 *
 * In production, set VOYAGE_API_KEY (and optionally VOYAGE_MODEL, default
 * voyage-3-lite) and embeddings come from Voyage AI - genuine semantic vectors,
 * so "families thinking about leaving" finds a note that says "considering other
 * options". Without a key, a deterministic local hashing embedding is used so
 * search still works offline in dev; it captures lexical/word-overlap similarity
 * rather than deep meaning. The rest of the app (lib/search.ts) is identical
 * either way - only the vector source changes.
 */

const VOYAGE_KEY = process.env.VOYAGE_API_KEY
const VOYAGE_MODEL = process.env.VOYAGE_MODEL || 'voyage-3-lite'

/** True when a real embeddings provider is configured. */
export const embeddingsLive = !!VOYAGE_KEY
export const LOCAL_MODEL = 'local-hash-256'
const LOCAL_DIM = 256

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 1)
}

function hashToken(token: string): number {
  let h = 2166136261
  for (let i = 0; i < token.length; i++) {
    h ^= token.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h) % LOCAL_DIM
}

/** Deterministic bag-of-words vector (unit length) for offline similarity. */
function localEmbed(text: string): number[] {
  const v = new Array(LOCAL_DIM).fill(0)
  const tokens = tokenize(text)
  for (const t of tokens) v[hashToken(t)] += 1
  // also fold in adjacent bigrams for a little phrase sensitivity
  for (let i = 0; i < tokens.length - 1; i++) v[hashToken(`${tokens[i]}_${tokens[i + 1]}`)] += 0.5
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1
  return v.map((x) => x / norm)
}

async function voyageEmbed(texts: string[]): Promise<number[][] | null> {
  try {
    const res = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${VOYAGE_KEY}` },
      body: JSON.stringify({ input: texts, model: VOYAGE_MODEL }),
    })
    if (!res.ok) return null
    const json = (await res.json()) as { data?: { embedding: number[] }[] }
    const vectors = json.data?.map((d) => d.embedding)
    return vectors && vectors.length === texts.length ? vectors : null
  } catch {
    return null
  }
}

/** Embed a batch of texts. Always returns a vector per input. */
export async function embed(texts: string[]): Promise<{ vectors: number[][]; model: string }> {
  if (texts.length === 0) return { vectors: [], model: embeddingsLive ? VOYAGE_MODEL : LOCAL_MODEL }
  if (VOYAGE_KEY) {
    const v = await voyageEmbed(texts)
    if (v) return { vectors: v, model: VOYAGE_MODEL }
    // fall through to local on any provider error
  }
  return { vectors: texts.map(localEmbed), model: LOCAL_MODEL }
}

/** Cosine similarity of two equal-length vectors. */
export function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb)
  return denom ? dot / denom : 0
}
