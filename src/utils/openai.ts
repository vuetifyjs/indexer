import { OpenAI } from 'openai'

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required')
}

// Initialize the OpenAI client with API key from environment
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * Generates a dense embedding vector for the provided text
 *
 * @param text The text to embed
 * @returns An array of numbers representing the embedding vector
 */
export async function embed (text: string): Promise<number[]> {
  try {
    const res = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float',
    })

    return res.data[0].embedding
  } catch (error: unknown) {
    console.error('Error generating embedding:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to generate embedding: ${errorMessage}`)
  }
}

// Note: the newest OpenAI model is "gpt-4o" which was released May 13, 2024.
// This is not used here as we're using the embeddings API
