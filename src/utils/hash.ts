import crypto from 'crypto'

/**
 * Creates a SHA-256 hash of the provided content
 *
 * @param content The string content to hash
 * @returns A hex string representation of the hash
 */
export function hashContent (content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex')
}
