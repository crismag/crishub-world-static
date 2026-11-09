import { world } from '../world-registry/index.ts'

/**
 * Applies the theme's interface tokens (CSS variables) to the page. Only the documented
 * tokens are accepted by the schema, so a theme cannot inject arbitrary styles.
 */
export function applyTheme(root: HTMLElement = document.documentElement) {
  for (const [name, value] of Object.entries(world.theme.ui)) {
    if (value) root.style.setProperty(name, value)
  }
}
