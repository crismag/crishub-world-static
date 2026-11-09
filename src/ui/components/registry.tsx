import type { ReactNode } from 'react'
import type { LayoutSectionT } from '@/runtime/configuration/schema.ts'
import { Announcements } from '@/ui/components/Announcements.tsx'
import { DestinationDetails } from '@/ui/components/DestinationDetails.tsx'
import { DestinationDirectory } from '@/ui/components/DestinationDirectory.tsx'
import { GlobeControls } from '@/ui/components/GlobeControls.tsx'
import { SelectionChip } from '@/ui/components/SelectionChip.tsx'
import { ShoreLegend } from '@/ui/components/ShoreLegend.tsx'

/**
 * The only components a layout file may place, by name. The compiler checks each section's
 * props against that component's documented options (landmark-params.ts, ComponentProps),
 * so configuration selects and arranges approved components and never supplies code.
 */
type Props = LayoutSectionT['props']

export const components: Record<LayoutSectionT['component'], (props: Props) => ReactNode> = {
  SelectionChip: (props) => <SelectionChip readMore={props.readMore === true} />,
  ShoreLegend: () => <ShoreLegend />,
  GlobeControls: (props) => (
    <GlobeControls
      showSpeed={props.showSpeed !== false}
      showZoom={props.showZoom !== false}
      showReset={props.showReset !== false}
    />
  ),
  DestinationDetails: () => <DestinationDetails />,
  DestinationDirectory: () => <DestinationDirectory />,
  Announcements: (props) => <Announcements placement={props.placement === 'bottom' ? 'bottom' : 'top'} />,
}

/** A layout region's sections, visible ones only, in their configured order. */
export function Sections({ sections }: { sections: readonly LayoutSectionT[] }) {
  return (
    <>
      {[...sections]
        .filter((section) => section.visible)
        .sort((a, b) => a.order - b.order)
        .map((section) => (
          <div key={section.id} data-section={section.id} className="contents">
            {components[section.component](section.props)}
          </div>
        ))}
    </>
  )
}
