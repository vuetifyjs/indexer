import { defineBuildConfig } from 'unbuild'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineBuildConfig({
  // Main entry points
  entries: [
    'src/index',
    'src/tasks/build-vuetify-api',
    'src/utils/logger',
    'src/utils/path-utils',
    'src/utils/vuetify-repo',
  ],

  // Clean dist before build
  clean: true,

  // Generate declaration files
  declaration: true,

  // Source maps for better debugging
  sourcemap: true,

  // Rollup configuration
  rollup: {
    // Generate both ESM and CJS
    emitCJS: true,
    // Bundle dependencies
    inlineDependencies: true,
    // Better logging
    output: {
      compact: true,
      generatedCode: {
        preset: 'es2015'
      }
    }
  },

  // External dependencies
  externals: [
    'consola',
    'fs',
    'path',
    'url',
    'child_process',
  ],

  // Build hooks
  hooks: {
    'build:before': () => {
      console.log('\n🚀 Starting build process...\n')
    },
    'build:done': () => {
      console.log('\n✨ Build completed successfully!\n')
    },
  },

  // Don't fail on warnings
  failOnWarn: false,

  // Path aliases with absolute paths
  alias: {
    '#': path.resolve(__dirname, 'src'),
    '#utils': path.resolve(__dirname, 'src/utils'),
    '#tasks': path.resolve(__dirname, 'src/tasks'),
    '#demo': path.resolve(__dirname, 'src/demo')
  }
})
