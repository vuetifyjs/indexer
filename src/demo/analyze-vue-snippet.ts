import { OpenAI } from 'openai'
import fs from 'fs/promises'
import path from 'path'

// Initialize the OpenAI client with API key from environment
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

/**
 * Analyzes a Vue snippet using OpenAI's GPT-4o model
 * 
 * @param snippetPath Path to the Vue snippet file
 * @returns Analysis of the snippet including component details, usage suggestions, and potential improvements
 */
async function analyzeVueSnippet(snippetPath: string) {
  try {
    // Read the snippet file
    const content = await fs.readFile(snippetPath, 'utf8')
    
    // Get the associated metadata file
    const metaPath = snippetPath.replace('.vue', '.meta.json')
    const metadataRaw = await fs.readFile(metaPath, 'utf8')
    const metadata = JSON.parse(metadataRaw)
    
    // Create the prompt for GPT-4o
    const prompt = `
Analyze this Vue component snippet and its metadata:

COMPONENT CONTENT:
\`\`\`vue
${content}
\`\`\`

METADATA:
\`\`\`json
${JSON.stringify(metadata, null, 2)}
\`\`\`

Please provide the following analysis in JSON format:
1. Component overview: Brief description of what this component does
2. Props used: List all props being used and explain their purpose
3. Events emitted: Any events this component might emit
4. Usage examples: 2-3 examples of how to use this component in different contexts
5. Improvement suggestions: Ideas to enhance this component's functionality or design
`

    // Call OpenAI API for analysis
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: 'system', content: 'You are a Vue.js expert specialized in analyzing component structure and providing helpful insights.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    })

    // Parse and return the analysis
    const messageContent = response.choices[0].message.content || ''
    if (!messageContent) {
      throw new Error('No content received from OpenAI API')
    }
    const analysis = JSON.parse(messageContent)
    return {
      id: metadata.id,
      analysis
    }
  } catch (error: any) {
    console.error('Error analyzing snippet:', error)
    throw new Error(`Failed to analyze snippet: ${error?.message || 'Unknown error'}`)
  }
}

/**
 * Main function to run the analysis
 */
async function main() {
  // Check for required environment variables
  if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY environment variable is required')
    process.exit(1)
  }

  try {
    // Get the snippet path from command line arguments
    const args = process.argv.slice(2)
    
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
      console.log(`
Vue Snippet Analyzer - Analyze Vue components using OpenAI

Usage:
  node dist/demo/analyze-vue-snippet.js <path-to-vue-file>

Examples:
  node dist/demo/analyze-vue-snippet.js src/snippets/v-card/basic.vue
      `)
      process.exit(0)
    }
    
    const snippetPath = args[0]
    
    // Make sure the file exists and is a .vue file
    if (!snippetPath.endsWith('.vue')) {
      console.error('Error: File must be a .vue component')
      process.exit(1)
    }
    
    console.log(`Analyzing Vue snippet: ${snippetPath}`)
    const result = await analyzeVueSnippet(snippetPath)
    
    console.log('\nAnalysis Result:')
    console.log(JSON.stringify(result, null, 2))
  } catch (error: any) {
    console.error('Error:', error)
    console.error('Error message:', error?.message || 'Unknown error')
    process.exit(1)
  }
}

// Run the main function
main().catch(err => {
  console.error('Unhandled error:', err)
  process.exit(1)
})