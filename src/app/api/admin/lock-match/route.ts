import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Service role bypasses ALL RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { matchId, lock } = await req.json()
    if (!matchId) return NextResponse.json({ error: 'No matchId' }, { status: 400 })

    const { error } = await supabaseAdmin
      .from('matches')
      .update({ tip_lock_override: lock })
      .eq('id', matchId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, matchId, lock })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
