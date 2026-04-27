import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { status } = await request.json()
  const order = await prisma.order.update({ where: { id }, data: { status } })
  return NextResponse.json(order)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.order.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
