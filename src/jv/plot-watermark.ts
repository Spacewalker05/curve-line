import Plotly from 'plotly.js-cartesian-dist-min'
import { cv } from './ui'

type ImageOptions = { filename?: string; width?: number; height?: number; scale?: number }
type PlotElement = HTMLElement & { data?: unknown[]; layout?: Record<string, any>; _context?: { toImageButtonOptions?: ImageOptions } }

/** Export a separate layout so the live chart never gains the watermark. */
export async function downloadWatermarkedPlot(element: HTMLElement | null, options: ImageOptions = {}) {
  if (!element) return
  const plot = element as PlotElement
  const layout = plot.layout ?? {}
  const imageOptions = { ...plot._context?.toImageButtonOptions, ...options }
  const image = await Plotly.toImage({
    data: plot.data ?? [],
    layout: {
      ...layout,
      annotations: [...(layout.annotations ?? []), {
        text: 'JV Analyzer', xref: 'paper', yref: 'paper', x: 0.99, y: 0.02,
        xanchor: 'right', yanchor: 'bottom', showarrow: false,
        font: { family: 'Arial, sans-serif', size: 18, color: cv('--c-plot-watermark') },
      }],
    },
  }, { format: 'png', ...imageOptions })
  const link = document.createElement('a')
  link.href = image
  link.download = `${imageOptions.filename || element.dataset.imageName || element.dataset.plot || 'plot'}.png`
  document.body.appendChild(link)
  link.click()
  link.remove()
}

export const watermarkDownloadButton = {
  name: 'Download plot as a png',
  icon: Plotly.Icons.camera,
  click: (element: HTMLElement) => downloadWatermarkedPlot(element),
}