import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const subcategory = searchParams.get('subcategory')
    const includeUnavailable = searchParams.get('includeUnavailable') === 'true'

    const items = await prisma.menuItem.findMany({
      where: {
        ...(category ? { category } : {}),
        ...(subcategory ? { subcategory } : {}),
        ...(includeUnavailable ? {} : { available: true }),
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })
    return NextResponse.json(items)
  } catch (e) {
    console.error('GET /api/menu-items error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const item = await prisma.menuItem.create({
      data: {
        name: body.name,
        category: body.category,
        subcategory: body.subcategory || '',
        description: body.description || null,
        imageUrl: body.imageUrl || null,
        ingredients: body.ingredients ? JSON.stringify(body.ingredients) : null,
        steps: body.steps ? JSON.stringify(body.steps) : null,
        notes: body.notes || null,
        price: body.price ?? 0,
        sortOrder: body.sortOrder ?? 0,
      },
    })
    return NextResponse.json(item, { status: 201 })
  } catch (e) {
    console.error('POST /api/menu-items error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
