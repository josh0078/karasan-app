import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const active = searchParams.get('active') === 'true'
  const statusFilter = searchParams.get('status')

  const orders = await prisma.order.findMany({
    where: {
      ...(category ? { category } : {}),
      ...(active ? { status: { in: ['pending', 'in_progress'] } } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    include: {
      items: {
        include: { menuItem: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(orders)
}

export async function POST(request: Request) {
  const body = await request.json()
  const order = await prisma.order.create({
    data: {
      tableNumber: body.tableNumber,
      category: body.category,
      items: {
        create: body.items.map((it: { menuItemId: string; quantity: number }) => ({
          menuItemId: it.menuItemId,
          quantity: it.quantity,
        })),
      },
    },
    include: {
      items: { include: { menuItem: true } },
    },
  })
  return NextResponse.json(order, { status: 201 })
}
