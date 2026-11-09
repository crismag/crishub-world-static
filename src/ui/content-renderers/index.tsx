import { useId, useState, type ReactNode } from 'react'
import type { CompiledSection } from '@/runtime/configuration/registry-types.ts'
import { useText } from '@/runtime/localization/index.tsx'

/**
 * How each content display type looks. Sections arrive already compiled: their HTML came
 * from Markdown with raw HTML escaped and unsafe links removed at build time, so it is safe
 * to insert. Display types are chosen per section in a location's items.json.
 */

function Prose({ html }: { html: string }) {
  return <div className="crisworld-prose" dangerouslySetInnerHTML={{ __html: html }} />
}

function useTitle(section: CompiledSection): string | null {
  const { t } = useText()
  return section.titleKey ? t(section.titleKey) : section.title
}

function Article({ section }: { section: CompiledSection }) {
  const title = useTitle(section)
  return (
    <article className="flex flex-col gap-2">
      {title && <h3 className="font-heading text-base font-semibold">{title}</h3>}
      <Prose html={section.html} />
    </article>
  )
}

function Card({ section }: { section: CompiledSection }) {
  const title = useTitle(section)
  return (
    <section className="flex flex-col gap-2 rounded-xl bg-muted/40 p-3 ring-1 ring-border">
      {section.coverPath && <img src={section.coverPath} alt="" className="aspect-video w-full rounded-lg object-cover" />}
      {title && <h3 className="font-heading text-sm font-semibold">{title}</h3>}
      {section.summary && <p className="text-xs text-muted-foreground">{section.summary}</p>}
      <Prose html={section.html} />
    </section>
  )
}

function Accordion({ section, open }: { section: CompiledSection; open: boolean }) {
  const title = useTitle(section)
  return (
    <details open={open} className="group rounded-lg ring-1 ring-border">
      <summary className="cursor-pointer list-none px-3 py-2 font-heading text-sm font-semibold marker:hidden">
        <span className="mr-2 inline-block transition-transform group-open:rotate-90">›</span>
        {title}
      </summary>
      <div className="px-3 pb-3">
        <Prose html={section.html} />
      </div>
    </details>
  )
}

function Tabs({ sections }: { sections: CompiledSection[] }) {
  const { t } = useText()
  const [active, setActive] = useState(0)
  const id = useId()
  const current = sections[active] ?? sections[0]
  return (
    <div className="flex flex-col gap-2">
      <div role="tablist" className="flex flex-wrap gap-1">
        {sections.map((section, index) => (
          <button
            key={section.id}
            type="button"
            role="tab"
            id={`${id}-tab-${index}`}
            aria-selected={index === active}
            aria-controls={`${id}-panel`}
            onClick={() => setActive(index)}
            className="rounded-full px-3 py-1 text-xs ring-1 ring-border aria-selected:bg-foreground aria-selected:text-background"
          >
            {section.titleKey ? t(section.titleKey) : section.title}
          </button>
        ))}
      </div>
      {current && (
        <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${active}`}>
          <Prose html={current.html} />
        </div>
      )}
    </div>
  )
}

function Gallery({ section }: { section: CompiledSection }) {
  const title = useTitle(section)
  return (
    <section className="flex flex-col gap-2">
      {title && <h3 className="font-heading text-base font-semibold">{title}</h3>}
      <div className="grid grid-cols-2 gap-2">
        {section.images.map((image) => (
          <figure key={image.src} className="flex flex-col gap-1">
            <img src={image.src} alt={image.alt} loading="lazy" className="aspect-square w-full rounded-lg object-cover" />
            {image.alt && <figcaption className="text-[11px] text-muted-foreground">{image.alt}</figcaption>}
          </figure>
        ))}
      </div>
    </section>
  )
}

function Picture({ section }: { section: CompiledSection }) {
  const image = section.images[0]
  if (!image) return <Article section={section} />
  return (
    <figure className="flex flex-col gap-1">
      <img src={image.src} alt={image.alt} loading="lazy" className="w-full rounded-lg" />
      {image.alt && <figcaption className="text-xs text-muted-foreground">{image.alt}</figcaption>}
    </figure>
  )
}

function Links({ section }: { section: CompiledSection }) {
  const title = useTitle(section)
  return (
    <section className="flex flex-col gap-2">
      {title && <h3 className="font-heading text-base font-semibold">{title}</h3>}
      <ul className="flex flex-col gap-1">
        {section.links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              className="text-sm underline underline-offset-4"
              {...(/^https?:/.test(link.href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              {link.text || link.href}
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Info({ section }: { section: CompiledSection }) {
  const title = useTitle(section)
  return (
    <section className="flex flex-col gap-1 rounded-lg border-l-2 border-border pl-3">
      {title && <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>}
      <div className="text-sm">
        <Prose html={section.html} />
      </div>
    </section>
  )
}

/**
 * Renders a location's sections in order. Neighboring `tab` sections are grouped into one
 * tab set; every other display type stands alone.
 */
export function ContentSections({ sections, expandAccordions }: { sections: CompiledSection[]; expandAccordions: boolean }) {
  const blocks: ReactNode[] = []
  for (let index = 0; index < sections.length; index++) {
    const section = sections[index]
    if (!section) continue
    if (section.display === 'tab') {
      const group = [section]
      while (sections[index + 1]?.display === 'tab') group.push(sections[++index]!)
      blocks.push(<Tabs key={section.id} sections={group} />)
      continue
    }
    const render: Record<Exclude<CompiledSection['display'], 'tab'>, () => ReactNode> = {
      article: () => <Article section={section} />,
      card: () => <Card section={section} />,
      accordion: () => <Accordion section={section} open={expandAccordions} />,
      gallery: () => <Gallery section={section} />,
      image: () => <Picture section={section} />,
      links: () => <Links section={section} />,
      info: () => <Info section={section} />,
    }
    blocks.push(<div key={section.id}>{render[section.display]()}</div>)
  }
  return <div className="flex flex-col gap-4">{blocks}</div>
}
