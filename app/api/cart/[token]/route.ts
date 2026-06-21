import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getCartByToken } from '@/lib/abandoned'

// Returns a saved (abandoned) cart so the /book funnel can pre-fill itself from a
// recovery link. Returns 404 once the cart is paid or unknown.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const cart = await getCartByToken(token)
  if (!cart) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(cart)
}
