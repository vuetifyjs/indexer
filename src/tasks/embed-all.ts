import _fs from 'fs/promises'
import type { VueSnippet } from '../utils/file-processor.js'
import { getSnippetFiles, readSnippet, ensureCacheFile, updateCache } from '../utils/file-processor.js'
import { hashContent } from '../utils/hash.js'
import { batchProcessSnippets } from '../utils/batch-processor.js'
import { embedAndSync } from './embed-and-sync.js'

const CACHE_FILE = './embedding-cache.json'

interface ProcessingResult {
  id: string
  status: string
  message: string
}

interface ProcessingStats {
  total: number
  updated: number
  unchanged: number
  failed: number
  results: ProcessingResult[]
}

/**
 * Processes all Vue component snippets in the project
 * Using batch processing for better efficiency when many snippets exist
 *
 * @param snippetsDir Directory containing the snippets
 * @param useBatchProcessing Whether to use batch processing (default: true)
 * @returns Summary of processing results
 */
export async function embedAll (
  snippetsDir: string = 'src/snippets',
  useBatchProcessing: boolean = true,
): Promise<ProcessingStats> {
  try {
    // Get all snippet files
    const snippetFiles = await getSnippetFiles(snippetsDir)
    console.log(`Found ${snippetFiles.length} snippet files to process`)

    // If no snippets or batch processing disabled, use the original method
    if (snippetFiles.length === 0 || !useBatchProcessing || snippetFiles.length < 3) {
      console.log('Using individual processing for snippets...')
      return await processSeparately(snippetFiles)
    }

    console.log('Using batch processing for snippets...')

    // Read cache file
    const cache = await ensureCacheFile(CACHE_FILE)

    // Process all snippets with metadata
    const snippetsWithMetadata: VueSnippet[] = []
    const snippetHashes = new Map<string, string>()

    // First pass - read all snippets and compute hashes
    console.log('Reading snippets and computing hashes...')
    for (const snippetPath of snippetFiles) {
      try {
        // Read snippet and its metadata
        const snippet = await readSnippet(snippetPath)

        // Compute hash of the content
        const hash = hashContent(snippet.content)

        // Check if hash has changed
        if (cache[snippetPath] === hash) {
          // Mark as unchanged
          console.log(`No changes detected for snippet: ${snippet.id}`)
          snippetHashes.set(snippetPath, hash)
        } else {
          console.log(`Changes detected for snippet: ${snippet.id}`)
          snippetHashes.set(snippetPath, hash)
          snippetsWithMetadata.push(snippet)
        }
      } catch (error: unknown) {
        console.error(`Error reading snippet ${snippetPath}:`, error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('Error details:', errorMessage)
      }
    }

    // Process all snippets in batch
    const { results, unchanged } = await batchProcessSnippets(
      snippetsWithMetadata,
      snippetHashes,
    )

    // Update cache for all processed snippets
    for (const [path, hash] of snippetHashes.entries()) {
      await updateCache(CACHE_FILE, path, hash)
    }

    // Build final results array, including unchanged items
    const finalResults = [
      ...results,
      ...unchanged.map(id => ({
        id,
        status: 'unchanged' as const,
        message: `No changes detected for snippet: ${id}`,
      })),
    ]

    // Compile stats
    const stats: ProcessingStats = {
      total: finalResults.length,
      updated: finalResults.filter(r => r.status === 'updated').length,
      unchanged: finalResults.filter(r => r.status === 'unchanged').length,
      failed: finalResults.filter(r => r.status === 'failed').length,
      results: finalResults,
    }

    console.log('Embedding process completed:')
    console.log(`Total: ${stats.total}, Updated: ${stats.updated}, Unchanged: ${stats.unchanged}, Failed: ${stats.failed}`)

    return stats
  } catch (error: unknown) {
    console.error('Error in embedAll process:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to process all snippets: ${errorMessage}`)
  }
}

/**
 * Process snippets individually (original method)
 *
 * @param snippetFiles Array of snippet file paths
 * @returns Results in the same format as embedAll
 */
async function processSeparately (snippetFiles: string[]): Promise<ProcessingStats> {
  // Process each snippet
  const results = await Promise.all(
    snippetFiles.map(async (snippetPath) => {
      console.log(`Processing snippet individually: ${snippetPath}`)
      return await embedAndSync(snippetPath)
    }),
  )

  // Compile stats
  const stats: ProcessingStats = {
    total: results.length,
    updated: results.filter(r => r.status === 'updated').length,
    unchanged: results.filter(r => r.status === 'unchanged').length,
    failed: results.filter(r => r.status === 'failed').length,
    results,
  }

  console.log('Individual processing completed:')
  console.log(`Total: ${stats.total}, Updated: ${stats.updated}, Unchanged: ${stats.unchanged}, Failed: ${stats.failed}`)

  return stats
}
