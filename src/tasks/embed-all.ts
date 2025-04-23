import _fs from 'fs/promises'
import ora from 'ora'
import type { VueSnippet } from '../utils/file-processor.js'
import { getSnippetFiles, readSnippet, ensureCacheFile, updateCache, normalizePath } from '../utils/file-processor.js'
import { hashContent } from '../utils/hash.js'
import { batchProcessSnippets } from '../utils/batch-processor.js'
import { embedAndSync } from './embed-and-sync.js'

const CACHE_FILE = './embedding-cache.json'

interface ProcessingResult {
  id: string
  status: 'updated' | 'failed' | 'unchanged'
  message: string
}

interface ProcessingStats {
  total: number
  updated: number
  failed: number
  unchanged: number
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
  const spinner = ora({
    text: 'Processing snippets...',
    spinner: 'dots'
  }).start()

  try {
    // Get all snippet files
    const snippetFiles = await getSnippetFiles(snippetsDir)

    // If no snippets or batch processing disabled, use the original method
    if (snippetFiles.length === 0 || !useBatchProcessing || snippetFiles.length < 3) {
      spinner.text = 'Using individual processing for snippets...'
      return await processSeparately(snippetFiles)
    }

    spinner.text = 'Using batch processing for snippets...'

    // Process all snippets with metadata
    const snippetsWithMetadata: VueSnippet[] = []
    const snippetHashes = new Map<string, string>()

    // First pass - read all snippets and compute hashes
    spinner.text = 'Reading snippets and computing hashes...'
    for (const snippetPath of snippetFiles) {
      try {
        // Read snippet and its metadata
        const snippet = await readSnippet(snippetPath)

        // Compute hash of the content
        const hash = hashContent(snippet.content)
        snippetHashes.set(snippetPath, hash)
        snippetsWithMetadata.push(snippet)
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        spinner.warn(`Error reading snippet ${snippetPath}: ${errorMessage}`)
      }
    }

    // Process all snippets in batch
    spinner.text = 'Processing snippets in batch...'
    const { results } = await batchProcessSnippets(
      snippetsWithMetadata,
      snippetHashes,
    )

    // Update cache for all processed snippets
    spinner.text = 'Updating cache...'
    for (const [path, hash] of snippetHashes.entries()) {
      await updateCache(CACHE_FILE, path, hash)
    }

    // Compile stats
    const stats: ProcessingStats = {
      total: results.length,
      updated: results.filter(r => r.status === 'updated').length,
      failed: results.filter(r => r.status === 'failed').length,
      unchanged: results.filter(r => r.status === 'unchanged').length,
      results,
    }

    spinner.succeed(`Processed ${stats.total} snippets: ${stats.updated} updated, ${stats.failed} failed, ${stats.unchanged} unchanged`)
    return stats
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    spinner.fail(`Error in embedAll process: ${errorMessage}`)
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
  const spinner = ora({
    text: 'Processing snippets individually...',
    spinner: 'dots'
  }).start()

  try {
    // Process each snippet
    const results = await Promise.all(
      snippetFiles.map(async (snippetPath) => {
        return await embedAndSync(snippetPath)
      }),
    )

    // Compile stats
    const stats: ProcessingStats = {
      total: results.length,
      updated: results.filter(r => r.status === 'updated').length,
      failed: results.filter(r => r.status === 'failed').length,
      unchanged: results.filter(r => r.status === 'unchanged').length,
      results,
    }

    spinner.succeed(`Processed ${stats.total} snippets: ${stats.updated} updated, ${stats.failed} failed, ${stats.unchanged} unchanged`)
    return stats
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    spinner.fail(`Error in individual processing: ${errorMessage}`)
    throw error
  }
}
