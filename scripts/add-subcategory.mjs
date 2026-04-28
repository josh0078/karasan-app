import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

try {
  await client.execute(`ALTER TABLE "MenuItem" ADD COLUMN "subcategory" TEXT NOT NULL DEFAULT ''`)
  console.log('✓ Unterkategorie-Spalte erfolgreich hinzugefügt!')
} catch (e) {
  if (e.message?.includes('duplicate column')) {
    console.log('ℹ Spalte existiert bereits, nichts zu tun.')
  } else {
    throw e
  }
}

await client.close()
