import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const item = await prisma.menuItem.findUnique({ where: { id } })
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(item)
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()
  const item = await prisma.menuItem.update({
    where: { id },
    data: {
      name: body.name,
      category: body.category,
      description: body.description || null,
      imageUrl: body.imageUrl || null,
      ingredients: body.ingredients ? JSON.stringify(body.ingredients) : null,
      steps: body.steps ? JSON.stringify(body.steps) : null,
      notes: body.notes || null,
      price: body.price ?? 0,
      available: body.available ?? true,
      sortOrder: body.sortOrder ?? 0,
    },
  })
  return NextResponse.json(item)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.menuItem.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
