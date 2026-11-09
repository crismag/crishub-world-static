import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { world } from '../world-registry/index.ts'
import { createTranslator, type Translate } from './translate.ts'

type Text = { locale: string; t: Translate }

const TextContext = createContext<Text>({ locale: world.world.defaultLocale, t: createTranslator(world.world.defaultLocale) })

/** Makes the visitor's locale available to every component through `useText()`. */
export function TextProvider({ locale, children }: { locale: string; children: ReactNode }) {
  const value = useMemo(() => ({ locale, t: createTranslator(locale) }), [locale])
  return <TextContext.Provider value={value}>{children}</TextContext.Provider>
}

// oxlint-disable-next-line react/only-export-components -- a hook belongs with its provider
export function useText(): Text {
  return useContext(TextContext)
}
