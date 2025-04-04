import 'dotenv/config'
import { embedAll } from './tasks/embedAll'
import { embedAndSync } from './tasks/embedAndSync'

/**
 * Main entry point for the application
 */
async function main() {
  // Check for required environment variables
  if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY environment variable is required')
    process.exit(1)
  }

  if (!process.env.PINECONE_API_KEY) {
    console.error('Error: PINECONE_API_KEY environment variable is required')
    process.exit(1)
  }

  try {
    // Parse command line arguments
    const args = process.argv.slice(2)

    // Parse flags
    const useBatchProcessing = !args.includes('--no-batch')
    const verbose = args.includes('--verbose')

    // Filter out flags for path processing
    const pathArgs = args.filter(arg => !arg.startsWith('--'))

    // If specific file path provided, only process that file
    if (pathArgs.length > 0 && pathArgs[0].endsWith('.vue')) {
      console.log(`Processing single file: ${pathArgs[0]}`)
      const result = await embedAndSync(pathArgs[0])
      console.log(`Result: ${result.status} - ${result.message}`)
    } else {
      // Process all snippets
      console.log('Processing all snippets...')

      if (verbose) {
        console.log('Verbose mode enabled')
      }

      if (useBatchProcessing) {
        console.log('Batch processing enabled (use --no-batch to disable)')
      } else {
        console.log('Batch processing disabled')
      }

      // Get the snippets directory path if provided
      let snippetsDir = 'src/snippets'
      const dirArgIndex = pathArgs.findIndex(arg => arg === '--dir' || arg === '-d')
      if (dirArgIndex >= 0 && pathArgs.length > dirArgIndex + 1) {
        snippetsDir = pathArgs[dirArgIndex + 1]
      }

      const results = await embedAll(snippetsDir, useBatchProcessing)
      console.log(`Processed ${results.total} snippets: ${results.updated} updated, ${results.unchanged} unchanged, ${results.failed} failed`)

      if (verbose && results.results.length > 0) {
        console.log('\nDetailed results:')
        results.results.forEach(result => {
          console.log(`- ${result.id}: ${result.status} - ${result.message}`)
        })
      }
    }
  } catch (error: any) {
    console.error('Error in main process:', error)
    console.error('Error message:', error?.message || 'Unknown error')
    process.exit(1)
  }
}

/**
 * Displays usage information
 */
function showHelp() {
  console.log(`
Vue Snippets Embedder - Process and index Vue component snippets to Pinecone

Usage:
  node dist/index.js [options] [file]

Options:
  --no-batch       Disable batch processing (process each snippet individually)
  --verbose        Show detailed output
  --dir, -d <path> Specify snippets directory (default: src/snippets)
  --help, -h       Show this help message

Examples:
  node dist/index.js                           # Process all snippets with batch processing
  node dist/index.js --no-batch                # Process all snippets individually
  node dist/index.js src/snippets/v-card/basic.vue  # Process a single snippet
  node dist/index.js --dir src/custom-snippets # Use a custom snippets directory
  `)
}

// Display help if requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp()
  process.exit(0)
}

// Run the main function
main().catch((err: any) => {
  console.error('Unhandled error:', err)
  console.error('Error message:', err?.message || 'Unknown error')
  process.exit(1)
})
