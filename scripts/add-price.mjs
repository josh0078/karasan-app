import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

await client.execute(`ALTER TABLE "MenuItem" ADD COLUMN "price" REAL NOT NULL DEFAULT 0`)

console.log('✓ Preisspalte erfolgreich hinzugefügt!')
await client.close()
