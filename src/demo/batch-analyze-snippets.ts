import { OpenAI } from 'openai'
import { getSnippetFiles, readSnippet, type VueSnippet } from '../utils/file-processor.js'

// Initialize the OpenAI client with API key from environment
const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) {
  throw new Error('OPENAI_API_KEY environment variable is not set')
}
const openai = new OpenAI({ apiKey })

// Maximum number of snippets to process in a single batch request
const MAX_SNIPPETS_PER_BATCH = 5

interface Snippet {
  id: string
  content: VueSnippet
}

/**
 * Summarize multiple Vue snippets into a concise report
 *
 * @param snippets Array of Vue snippets to analyze
 * @returns A summary analysis of all snippets
 */
async function batchAnalyzeSnippets (snippetPaths: string[]) {
  try {
    console.log(`Analyzing ${snippetPaths.length} Vue snippets...`)

    // Read all snippets
    const snippets = await Promise.all(
      snippetPaths.map(async (path: string) => {
        const content = await readSnippet(path)
        return {
          id: path,
          content,
        }
      }),
    )

    // Prepare snippets for analysis
    const snippetData = snippets.map(snippet => ({
      id: snippet.id,
      component: snippet.content.metadata.component,
      title: snippet.content.metadata.title,
      content: snippet.content.content,
      tags: snippet.content.metadata.tags,
    }))

    // Create the prompt for GPT-4o
    const prompt = `
Analyze these Vue component snippets:

${snippetData.map((snippet, index) => `
SNIPPET ${index + 1}: ${snippet.id}
Component: ${snippet.component}
Title: ${snippet.title}
Tags: ${snippet.tags.join(', ')}
\`\`\`vue
${snippet.content}
\`\`\`
`).join('\n')}

Based on these snippets, provide a comprehensive analysis in JSON format with the following sections:
1. Component relationships: How these components might relate to each other
2. Common patterns: Design or implementation patterns observed across the snippets
3. Component category overview: Group the components by functional category
4. Development recommendations: Suggestions for improving or extending the component library
`

    // Call OpenAI API for analysis
    console.log('Sending request to OpenAI...')
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: 'system',
          content: 'You are a Vue.js expert specialized in analyzing component libraries and providing architectural insights.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
    })

    // Parse and return the analysis
    console.log('Processing response...')
    const messageContent = response.choices[0].message.content || ''
    if (!messageContent) {
      throw new Error('No content received from OpenAI API')
    }
    const analysis = JSON.parse(messageContent)

    return {
      snippetCount: snippets.length,
      snippetIds: snippets.map((s: Snippet) => s.id),
      analysis,
    }
  } catch (error: unknown) {
    console.error('Error analyzing snippets in batch:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to analyze snippets in batch: ${errorMessage}`)
  }
}

/**
 * Processes snippets in batches to respect API limits
 *
 * @param snippetPaths Array of paths to Vue snippet files
 * @returns An array of analyses, one for each batch
 */
async function processInBatches (snippetPaths: string[]) {
  const results = []

  for (let i = 0; i < snippetPaths.length; i += MAX_SNIPPETS_PER_BATCH) {
    const batchPaths = snippetPaths.slice(i, i + MAX_SNIPPETS_PER_BATCH)
    console.log(`Processing batch ${Math.floor(i / MAX_SNIPPETS_PER_BATCH) + 1}/${Math.ceil(snippetPaths.length / MAX_SNIPPETS_PER_BATCH)} (${batchPaths.length} snippets)`)

    const batchResult = await batchAnalyzeSnippets(batchPaths)
    results.push(batchResult)
  }

  return results
}

/**
 * Main function to run the batch analysis
 */
async function main () {
  // Check for required environment variables
  if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY environment variable is required')
    process.exit(1)
  }

  try {
    // Parse command line arguments
    const args = process.argv.slice(2)

    if (args.includes('--help') || args.includes('-h')) {
      console.log(`
Vue Snippets Batch Analyzer - Analyze multiple Vue components using OpenAI

Usage:
  npx ts-node src/demo/batch-analyze-snippets.ts [options]

Options:
  --dir, -d <path>       Specify snippets directory (default: src/snippets)
  --component, -c <name> Filter by component name
  --help, -h             Show this help message

Examples:
  npx ts-node src/demo/batch-analyze-snippets.ts                  # Analyze all snippets
  npx ts-node src/demo/batch-analyze-snippets.ts -c v-card        # Analyze only v-card components
  npx ts-node src/demo/batch-analyze-snippets.ts -d custom/path   # Use custom snippets directory
      `)
      process.exit(0)
    }

    // Parse options
    let snippetsDir = 'src/snippets'
    let componentFilter = ''

    for (let i = 0; i < args.length; i++) {
      if ((args[i] === '--dir' || args[i] === '-d') && i + 1 < args.length) {
        snippetsDir = args[i + 1]
        i++ // Skip the next arg
      } else if ((args[i] === '--component' || args[i] === '-c') && i + 1 < args.length) {
        componentFilter = args[i + 1]
        i++ // Skip the next arg
      }
    }

    // Get all snippet files
    console.log(`Getting snippet files from ${snippetsDir}${componentFilter ? ` for component: ${componentFilter}` : ''}...`)
    let snippetFiles = await getSnippetFiles(snippetsDir)

    // Apply component filter if specified
    if (componentFilter) {
      const filteredFiles = []
      for (const file of snippetFiles) {
        const snippet = await readSnippet(file)
        if (snippet.metadata.component === componentFilter) {
          filteredFiles.push(file)
        }
      }

      snippetFiles = filteredFiles
      console.log(`Filtered to ${snippetFiles.length} snippet files for component: ${componentFilter}`)
    }

    if (snippetFiles.length === 0) {
      console.log('No snippet files found.')
      process.exit(0)
    }

    // Process the snippets in batches
    const results = await processInBatches(snippetFiles)

    // Output the results
    console.log('\nAnalysis Results:')
    results.forEach((result, index) => {
      console.log(`\n--- Batch ${index + 1} Results ---`)
      console.log(`Analyzed ${result.snippetCount} snippets: ${result.snippetIds.join(', ')}`)
      console.log(JSON.stringify(result.analysis, null, 2))
    })

    console.log('\nBatch analysis complete!')
  } catch (error: unknown) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error message:', errorMessage)
    process.exit(1)
  }
}

// Run the main function
main().catch(err => {
  console.error('Unhandled error:', err)
  process.exit(1)
})
