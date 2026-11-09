/**
 * Leaving the globe for a location's world. Kept in one place so tests can observe it
 * without actually navigating, and so every exit goes through the same checks.
 */
export const navigation = {
  /** Replace the globe with the world, in this tab. */
  go(url: string) {
    window.location.assign(url)
  },
  /** Open the world in a new tab, keeping the globe open. */
  open(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer')
  },
}
