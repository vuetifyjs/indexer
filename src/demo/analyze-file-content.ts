import fs from 'fs/promises'
import path from 'path'

/**
 * A simple utility to read and analyze file contents
 * 
 * This is useful for understanding the structure of files in the project
 * and can help diagnose issues with file processing
 */
async function analyzeFile(filePath: string) {
  try {
    console.log(`Analyzing file: ${filePath}`)
    
    // Check if file exists
    try {
      await fs.access(filePath)
    } catch (error) {
      console.error(`File does not exist: ${filePath}`)
      return
    }
    
    // Read file
    const content = await fs.readFile(filePath, 'utf-8')
    
    // Basic info
    console.log(`File size: ${content.length} bytes`)
    console.log(`Line count: ${content.split('\n').length}`)
    
    // Content preview (first 200 chars)
    console.log('\nContent preview:')
    console.log('-'.repeat(40))
    console.log(content.substring(0, 200) + (content.length > 200 ? '...' : ''))
    console.log('-'.repeat(40))
    
    // For Vue files, try to extract template
    if (filePath.endsWith('.vue')) {
      const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/i)
      if (templateMatch) {
        console.log('\nTemplate content:')
        console.log('-'.repeat(40))
        console.log(templateMatch[1].trim())
        console.log('-'.repeat(40))
      } else {
        console.log('No template section found in Vue file')
      }
    }
    
    // For JSON files, try to parse and display structure
    if (filePath.endsWith('.json')) {
      try {
        const jsonData = JSON.parse(content)
        console.log('\nJSON structure:')
        console.log('-'.repeat(40))
        console.log(JSON.stringify(jsonData, null, 2))
        console.log('-'.repeat(40))
      } catch (error) {
        console.error('Failed to parse JSON content:', error)
      }
    }
    
    // Check for special patterns in TS files
    if (filePath.endsWith('.ts')) {
      // Look for functions
      const functionMatches = content.matchAll(/function\s+(\w+)/g)
      const functions = Array.from(functionMatches).map(match => match[1])
      
      if (functions.length > 0) {
        console.log('\nFunctions found:')
        console.log('-'.repeat(40))
        functions.forEach(func => console.log(func))
        console.log('-'.repeat(40))
      }
      
      // Look for imports
      const importMatches = content.matchAll(/import\s+.*from\s+['"](.+)['"]/g)
      const imports = Array.from(importMatches).map(match => match[1])
      
      if (imports.length > 0) {
        console.log('\nImports:')
        console.log('-'.repeat(40))
        imports.forEach(imp => console.log(imp))
        console.log('-'.repeat(40))
      }
    }
    
  } catch (error) {
    console.error('Error analyzing file:', error)
  }
}

async function main() {
  // Get file path from command line args
  const args = process.argv.slice(2)
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
File Content Analyzer

Usage:
  npx ts-node src/demo/analyze-file-content.ts <path-to-file>

Examples:
  npx ts-node src/demo/analyze-file-content.ts src/search-vectors.ts
  npx ts-node src/demo/analyze-file-content.ts src/snippets/v-card/basic.vue
  npx ts-node src/demo/analyze-file-content.ts src/snippets/v-card/basic.meta.json
    `)
    process.exit(0)
  }
  
  const filePath = args[0]
  await analyzeFile(filePath)
}

main().catch(error => {
  console.error('Unhandled error:', error)
  process.exit(1)
})