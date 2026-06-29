/**
 * Generate TOKEN_ENCRYPTION_KEY cho OAuth token encryption (AES-256-GCM).
 *
 * Usage:
 *   cd frontend && npx tsx tests/setup/generate-encryption-key.ts
 *
 * Output:
 *   - 32-byte random key, base64-encoded (44 chars)
 *   - Copy vao .env.local va .env.test.local:
 *     TOKEN_ENCRYPTION_KEY=<output>
 *
 * Note:
 *   - lib/env.ts validation yeu cau key >= 32 chars (line 72-74)
 *   - Moi lan chay se tao key MOI (existing tokens se KHONG decrypt duoc)
 *   - Chi generate 1 LAN cho moi environment (dev, staging, prod)
 */
import { randomBytes } from 'crypto'

function main() {
  const key = randomBytes(32).toString('base64')
  console.log('=== TOKEN_ENCRYPTION_KEY (32-byte base64) ===\n')
  console.log(key)
  console.log(`\nLength: ${key.length} chars`)
  console.log('\nCopy vao .env.local va .env.test.local:')
  console.log(`TOKEN_ENCRYPTION_KEY=${key}`)
  console.log('\nCANH BAO: Moi key moi se KHONG decrypt duoc tokens cu.')
  console.log('Chi generate 1 lan cho moi environment.')
}

main()