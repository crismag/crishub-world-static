import { useEffect } from 'react'
import { applyTheme } from '@/runtime/configuration/theme.ts'
import { TextProvider } from '@/runtime/localization/index.tsx'
import { createTranslator, resolveLocale } from '@/runtime/localization/translate.ts'
import { settings, world } from '@/runtime/world-registry/index.ts'
import { useReducedMotion } from '@/hooks/use-reduced-motion.ts'
import { ExplorerProvider } from '@/state/explorer.tsx'
import { Explorer } from '@/ui/Explorer.tsx'

const locale = resolveLocale()

export default function App() {
  const prefersReduced = useReducedMotion()
  const reduced = settings.controls.respectReducedMotion && prefersReduced

  useEffect(() => {
    applyTheme()
    const t = createTranslator(locale)
    document.documentElement.lang = locale
    document.title = t(world.world.nameKey)
    document.querySelector('meta[name="description"]')?.setAttribute('content', t(world.world.descriptionKey))
  }, [])

  return (
    <TextProvider locale={locale}>
      <ExplorerProvider reduced={reduced}>
        <Explorer />
      </ExplorerProvider>
    </TextProvider>
  )
}
