import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const run = await db.analysisRun.findUnique({ where: { id: params.id } })
  if (!run) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ run })
}
