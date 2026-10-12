import { describe, expect, it } from 'vitest'
import { plotImageName } from './plot-export'

describe('plot image names', () => {
  it('uses the parameter followed by the workbook stem', () => {
    expect(plotImageName('PCE (%)', 'filename.xlsx')).toBe('pce_filename')
    expect(plotImageName('FF (%)', 'sample run.xlsx')).toBe('ff_sample_run')
    expect(plotImageName('Jsc (mA/cm²)', 'cell.xls')).toBe('jsc_cell')
  })
  it('distinguishes scan variants without changing the prefix', () => {
    expect(plotImageName('Voc (V)', 'cell.xlsx', 'Forward')).toBe('voc_cell_forward')
    expect(plotImageName('current', 'scan.txt', 'Pixel 2')).toBe('current_scan_pixel_2')
  })
  it('handles empty input safely', () => {
    expect(plotImageName('', '')).toBe('plot_results')
  })
})