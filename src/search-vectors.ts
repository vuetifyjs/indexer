import { embed } from './utils/openai.js'
import { querySimilar } from './utils/pinecone.js'

/**
 * Main entry point for the vector search tool
 */
async function main (): Promise<void> {
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

    // Help flag
    if (args.includes('--help') || args.includes('-h') || args.length === 0) {
      showHelp()
      process.exit(0)
    }

    // Get query text and options
    let queryText = ''
    let topK = 5
    let filterComponent = ''

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--top' || args[i] === '-k') {
        if (i + 1 < args.length) {
          topK = parseInt(args[i + 1], 10)
          i++ // Skip the next argument as it's the value
        }
      } else if (args[i] === '--component' || args[i] === '-c') {
        if (i + 1 < args.length) {
          filterComponent = args[i + 1]
          i++ // Skip the next argument as it's the value
        }
      } else if (!queryText) {
        // First non-option argument is the query text
        queryText = args[i]
      } else {
        // Append to the query text if already started
        queryText += ' ' + args[i]
      }
    }

    if (!queryText) {
      console.error('Error: No search query provided')
      showHelp()
      process.exit(1)
    }

    console.log(`Searching for: "${queryText}"`)
    if (filterComponent) {
      console.log(`Filtering by component: ${filterComponent}`)
    }
    console.log(`Returning top ${topK} results`)

    // Generate embedding for the query (dense vector only)
    console.log('Generating embedding...')
    const embedResult = await embed(queryText)

    // Search for similar vectors
    console.log('Searching for similar vectors...')
    const filter = filterComponent ? { component: filterComponent } : undefined

    const results = await querySimilar(
      embedResult,
      topK,
      filter,
    )

    // Display results
    console.log('\nSearch Results:')
    console.log('---------------')

    if (results.matches.length === 0) {
      console.log('No results found.')
    } else {
      results.matches.forEach((match, index) => {
        // Safer property access with optional chaining
        const id = match.id || 'unknown'

        // Format score
        let scoreDisplay = 'N/A'
        if (match.score !== undefined) {
          scoreDisplay = match.score.toFixed(4)
        }

        console.log(`${index + 1}. ${id} (Score: ${scoreDisplay})`)

        // Handle metadata with optional chaining and type narrowing
        if (match.metadata) {
          const metadata = match.metadata

          const component = metadata.component || 'N/A'
          const title = metadata.title || 'N/A'
          const description = metadata.description || 'N/A'
          const category = metadata.category || 'N/A'
          const path = metadata.path || 'N/A'

          // Handle tags array
          let tagsString = 'N/A'
          if (metadata.tags && Array.isArray(metadata.tags)) {
            tagsString = metadata.tags.join(', ')
          }

          console.log(`   Component: ${component}`)
          console.log(`   Title: ${title}`)
          console.log(`   Description: ${description}`)
          console.log(`   Tags: ${tagsString}`)
          console.log(`   Category: ${category}`)
          console.log(`   Path: ${path}`)
        } else {
          console.log('   No metadata available')
        }

        console.log('---')
      })
    }
  } catch (error: unknown) {
    console.error('Error in search process:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error message:', errorMessage)
    process.exit(1)
  }
}

/**
 * Displays usage information
 */
function showHelp (): void {
  console.log(`
Vue Snippets Vector Search Tool

Description:
  Searches for Vue snippets using vector embeddings for semantic understanding.
  This tool uses dense vectors to find the most relevant Vue component snippets.

Usage:
  node dist/search-vectors.js [options] <search query>

Options:
  --top, -k <number>        Number of results to return (default: 5)
  --component, -c <name>    Filter results by component name
  --help, -h                Show this help message

Examples:
  node dist/search-vectors.js card with image          # Search for card components with images
  node dist/search-vectors.js "button with icon" -k 10  # Search with 10 results
  node dist/search-vectors.js layout -c v-card         # Search only v-card components
  `)
}

// Run the main function
if (require.main === module) {
  main().catch((error: unknown) => {
    console.error('Unhandled error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error message:', errorMessage)
    process.exit(1)
  })
}
