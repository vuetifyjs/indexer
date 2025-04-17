import fs from 'fs'
import path from 'path'

const API_DIR = path.join(__dirname, '..', '..', 'vuetify-api')

/**
 * Types for Vuetify API data
 */
export interface VuetifyComponent {
  name: string;
  props: ComponentProp[];
  slots: ComponentSlot[];
  events: ComponentEvent[];
  exposed: ComponentExposed[];
}

export interface ComponentProp {
  name: string;
  type: string[];
  default: string;
  source: string;
  description: string;
}

export interface ComponentSlot {
  name: string;
  description: string;
  props: Record<string, string>;
}

export interface ComponentEvent {
  name: string;
  description: string;
  value: string;
}

export interface ComponentExposed {
  name: string;
  type: string[];
  description: string;
}

/**
 * Loads all component API data from the vuetify-api directory
 * @returns A map of component names to their API data
 */
export function loadVuetifyApiData(): Record<string, VuetifyComponent> {
  if (!fs.existsSync(API_DIR)) {
    throw new Error(`Vuetify API directory not found at ${API_DIR}. Run 'npm run build-vuetify-api' first.`)
  }

  const apiFiles = fs.readdirSync(API_DIR)
    .filter(file => file.endsWith('.json'))

  if (apiFiles.length === 0) {
    throw new Error('No API files found. Make sure to run the build-vuetify-api script first.')
  }

  const componentData: Record<string, VuetifyComponent> = {}

  for (const file of apiFiles) {
    const filePath = path.join(API_DIR, file)
    const content = fs.readFileSync(filePath, 'utf-8')

    try {
      const data = JSON.parse(content)

      // Skip non-component files
      if (!data.name) continue

      componentData[data.name] = data
    } catch (error) {
      console.warn(`Failed to parse ${file}: ${error}`)
    }
  }

  return componentData
}

/**
 * Gets API data for a specific component
 * @param componentName The name of the component (e.g., 'VCard')
 * @returns The component's API data or null if not found
 */
export function getComponentApiData(componentName: string): VuetifyComponent | null {
  const allComponents = loadVuetifyApiData()
  return allComponents[componentName] || null
}

/**
 * Find components by tag name or partial name match
 * @param search Search term to match against component names or tags
 * @returns Array of matching components
 */
export function findComponentsByName(search: string): VuetifyComponent[] {
  const allComponents = loadVuetifyApiData()
  const searchLower = search.toLowerCase()

  return Object.values(allComponents).filter(component => {
    const componentName = component.name.toLowerCase()
    return componentName.includes(searchLower)
  })
}

/**
 * Summarize a component's API for quick reference
 * @param component The component to summarize
 * @returns A summary of the component's API
 */
export function summarizeComponent(component: VuetifyComponent): string {
  let summary = `# ${component.name}\n\n`

  // Props
  summary += `## Props (${component.props.length})\n`
  if (component.props.length > 0) {
    summary += '| Prop | Type | Default | Description |\n'
    summary += '|------|------|---------|-------------|\n'
    for (const prop of component.props) {
      const types = prop.type.join(' | ')
      summary += `| ${prop.name} | ${types} | ${prop.default || '-'} | ${prop.description || '-'} |\n`
    }
  }

  // Slots
  summary += `\n## Slots (${component.slots.length})\n`
  if (component.slots.length > 0) {
    summary += '| Name | Description | Props |\n'
    summary += '|------|-------------|-------|\n'
    for (const slot of component.slots) {
      const propsText = slot.props ? Object.keys(slot.props).join(', ') : '-'
      summary += `| ${slot.name} | ${slot.description || '-'} | ${propsText} |\n`
    }
  }

  // Events
  summary += `\n## Events (${component.events.length})\n`
  if (component.events.length > 0) {
    summary += '| Name | Description | Value |\n'
    summary += '|------|-------------|-------|\n'
    for (const event of component.events) {
      summary += `| ${event.name} | ${event.description || '-'} | ${event.value || '-'} |\n`
    }
  }

  return summary
}
