import path from 'node:path'
import fs from 'fs'
import {
  loadVuetifyApiData,
  findComponentsByName,
  getComponentApiData,
  summarizeComponent,
  type VuetifyComponent,
  type ComponentProp,
} from '../utils/vuetify-api-processor.ts'

/**
 * Simple demo script to explore the Vuetify API data
 */
async function exploreVuetifyApi (): Promise<void> {
  try {
    // Ensure the API directory exists
    const apiDir = path.join(__dirname, '..', '..', 'vuetify-api')
    if (!fs.existsSync(apiDir)) {
      console.error('API directory not found. Please run "npm run build-vuetify-api" first.')
      process.exit(1)
    }

    // Load all component data
    console.log('Loading Vuetify API data...')
    const allComponents = loadVuetifyApiData()
    console.log(`Loaded data for ${Object.keys(allComponents).length} components.`)

    // Example 1: Find all components containing "card" in their name
    const cardComponents = findComponentsByName('card')
    console.log(`\nFound ${cardComponents.length} components matching "card":`)
    cardComponents.forEach((component: VuetifyComponent) => {
      console.log(`- ${component.name}`)
    })

    // Example 2: Get detailed info about VCard component
    const vCardComponent = getComponentApiData('VCard')
    if (vCardComponent) {
      console.log('\nVCard component details:')
      console.log(`Props: ${vCardComponent.props.length}`)
      console.log(`Slots: ${vCardComponent.slots.length}`)
      console.log(`Events: ${vCardComponent.events.length}`)

      // Print all prop names
      console.log('\nVCard props:')
      vCardComponent.props.forEach((prop: ComponentProp) => {
        console.log(`- ${prop.name}: ${prop.type.join(' | ')}`)
      })
    }

    // Example 3: Generate markdown summary for a component
    if (vCardComponent) {
      const summary = summarizeComponent(vCardComponent)
      const outputPath = path.join(__dirname, '..', '..', 'v-card-summary.md')
      fs.writeFileSync(outputPath, summary, 'utf-8')
      console.log(`\nGenerated markdown summary for VCard at: ${outputPath}`)
    }

    // Example 4: List all available components
    console.log('\nAll available components:')
    const componentNames = Object.keys(allComponents).sort()
    console.log(componentNames.join(', '))

  } catch (error) {
    console.error('Error exploring Vuetify API:', error)
  }
}

if (require.main === module) {
  exploreVuetifyApi()
}

export { exploreVuetifyApi }
