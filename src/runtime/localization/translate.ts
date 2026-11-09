import { settings, world } from '../world-registry/index.ts'

/**
 * Text lookup with fallback: the visitor's locale, then the default locale, then the key
 * itself (validation makes sure the default locale has every key the world uses).
 * `{name}`-style parameters are filled in from the second argument.
 */
export type Translate = (key: string, params?: Record<string, string | number>) => string

export function createTranslator(locale: string, tables: Record<string, Record<string, string>> = world.locales): Translate {
  const own = tables[locale] ?? {}
  const fallback = tables[world.world.defaultLocale] ?? {}
  return (key, params) => {
    const template = own[key] ?? fallback[key] ?? key
    if (!params) return template
    return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match))
  }
}

/** The locale to show: `?lang=` when that is enabled and supported, otherwise the default. */
export function resolveLocale(search: string = typeof window === 'undefined' ? '' : window.location.search): string {
  if (settings.features.localeFromUrl) {
    const requested = new URLSearchParams(search).get('lang')?.toLowerCase()
    if (requested && world.world.locales.includes(requested)) return requested
  }
  return world.world.defaultLocale
}
