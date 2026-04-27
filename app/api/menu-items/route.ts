import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const includeUnavailable = searchParams.get('includeUnavailable') === 'true'

  const items = await prisma.menuItem.findMany({
    where: {
      ...(category ? { category } : {}),
      ...(includeUnavailable ? {} : { available: true }),
    },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  })
  return NextResponse.json(items)
}

export async function POST(request: Request) {
  const body = await request.json()
  const item = await prisma.menuItem.create({
    data: {
      name: body.name,
      category: body.category,
      description: body.description || null,
      imageUrl: body.imageUrl || null,
      ingredients: body.ingredients ? JSON.stringify(body.ingredients) : null,
      steps: body.steps ? JSON.stringify(body.steps) : null,
      notes: body.notes || null,
      sortOrder: body.sortOrder ?? 0,
    },
  })
  return NextResponse.json(item, { status: 201 })
}
