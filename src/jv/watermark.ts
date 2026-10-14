import { cv } from './ui'

/** Faint diagonal "JV Analyzer" mark drawn behind every chart, so it rides along into every image export. */
export const watermark = () => ({
  text: 'JV Analyzer', xref: 'paper', yref: 'paper', x: 0.5, y: 0.5, xanchor: 'center', yanchor: 'middle',
  showarrow: false, textangle: -24, captureevents: false,
  font: { family: 'Arial, sans-serif', size: 44, color: cv('--c-plot-watermark') },
})
