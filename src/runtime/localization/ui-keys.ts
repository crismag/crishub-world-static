/**
 * Every text key the interface code uses directly. Validation checks each exists in the
 * default locale, and counts them as used when looking for unused keys.
 */
export const UI = {
  globeLabel: 'ui.globe.label',
  webglTitle: 'ui.error.webgl-title',
  webglBody: 'ui.error.webgl-body',
  shoresNav: 'ui.nav.shores',
  legendLabel: 'ui.legend.label',
  speedLabel: 'ui.controls.speed',
  pause: 'ui.controls.pause',
  speedOption: 'ui.controls.speed-option',
  zoomIn: 'ui.controls.zoom-in',
  zoomOut: 'ui.controls.zoom-out',
  reset: 'ui.controls.reset',
  closeShore: 'ui.chip.close',
  readMore: 'ui.chip.read',
  readMoreLabel: 'ui.chip.read-label',
  closePanel: 'ui.panel.close',
  directoryTitle: 'ui.directory.title',
  dismiss: 'ui.announcement.dismiss',
} as const

export const UI_KEYS: readonly string[] = Object.values(UI)
