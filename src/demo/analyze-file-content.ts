import fs from 'fs/promises'

interface FileAnalysis {
  size: number
  lineCount: number
  preview: string
  template?: string
  jsonStructure?: unknown
  functions?: string[]
  imports?: string[]
}

/**
 * A simple utility to read and analyze file contents
 *
 * This is useful for understanding the structure of files in the project
 * and can help diagnose issues with file processing
 */
async function analyzeFile (filePath: string): Promise<FileAnalysis | null> {
  try {
    // Check if file exists
    try {
      await fs.access(filePath)
    } catch (error: unknown) {
      console.error(`File does not exist: ${filePath}`, error)
      return null
    }

    // Read file
    const content = await fs.readFile(filePath, 'utf-8')

    const analysis: FileAnalysis = {
      size: content.length,
      lineCount: content.split('\n').length,
      preview: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
    }

    // For Vue files, try to extract template
    if (filePath.endsWith('.vue')) {
      const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/i)
      if (templateMatch) {
        analysis.template = templateMatch[1].trim()
      }
    }

    // For JSON files, try to parse and display structure
    if (filePath.endsWith('.json')) {
      try {
        analysis.jsonStructure = JSON.parse(content)
      } catch (error: unknown) {
        console.error('Failed to parse JSON content:', error)
      }
    }

    // Check for special patterns in TS files
    if (filePath.endsWith('.ts')) {
      // Look for functions
      const functionMatches = content.matchAll(/function\s+(\w+)/g)
      analysis.functions = Array.from(functionMatches).map(match => match[1])

      // Look for imports
      const importMatches = content.matchAll(/import\s+.*from\s+['"](.+)['"]/g)
      analysis.imports = Array.from(importMatches).map(match => match[1])
    }

    return analysis
  } catch (error: unknown) {
    console.error('Error analyzing file:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error details:', errorMessage)
    return null
  }
}

/**
 * Displays the analysis results in a formatted way
 */
function displayAnalysis (filePath: string, analysis: FileAnalysis): void {
  console.log(`\nAnalysis of ${filePath}:`)
  console.log('-'.repeat(40))
  console.log(`File size: ${analysis.size} bytes`)
  console.log(`Line count: ${analysis.lineCount}`)

  console.log('\nContent preview:')
  console.log('-'.repeat(40))
  console.log(analysis.preview)
  console.log('-'.repeat(40))

  if (analysis.template) {
    console.log('\nTemplate content:')
    console.log('-'.repeat(40))
    console.log(analysis.template)
    console.log('-'.repeat(40))
  }

  if (analysis.jsonStructure) {
    console.log('\nJSON structure:')
    console.log('-'.repeat(40))
    console.log(JSON.stringify(analysis.jsonStructure, null, 2))
    console.log('-'.repeat(40))
  }

  if (analysis.functions?.length) {
    console.log('\nFunctions found:')
    console.log('-'.repeat(40))
    analysis.functions.forEach(func => console.log(func))
    console.log('-'.repeat(40))
  }

  if (analysis.imports?.length) {
    console.log('\nImports:')
    console.log('-'.repeat(40))
    analysis.imports.forEach(imp => console.log(imp))
    console.log('-'.repeat(40))
  }
}

/**
 * Main function to execute the analysis
 */
async function main (): Promise<void> {
  // Get file path from command line args
  const args = process.argv.slice(2)

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
File Content Analyzer

Usage:
  npx ts-node src/demo/analyze-file-content.ts <path-to-file>

Options:
  --help, -h  Show this help message

Example:
  npx ts-node src/demo/analyze-file-content.ts src/index.ts
    `)
    process.exit(0)
  }

  const filePath = args[0]
  const analysis = await analyzeFile(filePath)

  if (analysis) {
    displayAnalysis(filePath, analysis)
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error('Unhandled error in file analysis:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error details:', errorMessage)
    process.exit(1)
  })
}
