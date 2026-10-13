import { describe, expect, it, vi } from 'vitest'

vi.mock('plotly.js-cartesian-dist-min', () => ({ default: { toImage: vi.fn().mockResolvedValue('data:image/png;base64,test'), Icons: { camera: {} } } }))
vi.mock('./ui', () => ({ cv: () => 'rgba(23, 23, 23, 0.28)' }))
import Plotly from 'plotly.js-cartesian-dist-min'
import { downloadWatermarkedPlot } from './plot-watermark'

describe('watermarked plot exports', () => {
  it('preserves live annotations and appends a watermark only to the exported layout', async () => {
    const annotations = [{ text: 'PCE' }]
    const element = Object.assign(document.createElement('div'), { data: [], layout: { annotations } })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    await downloadWatermarkedPlot(element, { filename: 'pce_sample', width: 1400, scale: 2 })
    expect(Plotly.toImage).toHaveBeenCalledWith(expect.objectContaining({ layout: expect.objectContaining({ annotations: [annotations[0], expect.objectContaining({ text: 'JV Analyzer', xref: 'paper', yref: 'paper' })] }) }), expect.objectContaining({ format: 'png', width: 1400, scale: 2 }))
    expect(element.layout.annotations).toEqual([{ text: 'PCE' }])
    expect(click.mock.instances[0].download).toBe('pce_sample.png')
    click.mockRestore()
  })
})