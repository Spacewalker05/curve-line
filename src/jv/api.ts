// Contract between this UI and the Python backend.
//
//   (Streamlit: handled by streamlit_app.py via the component protocol; HTTP below is for standalone use)
//   POST {API_URL}/analyze        multipart/form-data
//     files[]  : the uploaded data files (one part per file, repeated)
//     params   : JSON string, see AnalysisParams
//   -> 200 application/json, see AnalysisResponse
//
// Set VITE_API_URL (e.g. http://localhost:8000) or proxy /api to the backend.


export type MetricKey = 'pce' | 'voc' | 'isc' | 'jsc' | 'ff' | 'imp' | 'pmax' | 'vmpp' | 'jmpp' | 'rs' | 'rsh' | 'ff0' | 'dff'
export type Metrics = Partial<Record<MetricKey, number | null>>

export type Pixel = {
  id: string
  label: string
  reverse?: Metrics
  forward?: Metrics
  hysteresis_index?: number | null
}

export type AnalysisParams = {
  area_cm2: number
  irradiance_mw_cm2: number
  v_min: number
  v_max: number
  min_points: number
  invert_current: boolean
  advanced: boolean
  output_name: string
}

export type AnalysisResponse = {
  files: { name: string; pixels: Pixel[] }[]
  summary?: Partial<Record<MetricKey, { mean: number; std?: number | null }>>
  statistics?: { key: MetricKey; mean: number; std: number; min: number; max: number }[]
  log?: { level: 'info' | 'warn' | 'error'; message: string }[]
  exports?: { xlsx?: string; csv?: string }
}

import { analyzeFiles } from './core'

// Analysis runs fully in the browser (port of the Python backend).
export async function runAnalysis(files: File[], params: AnalysisParams): Promise<AnalysisResponse> {
  return analyzeFiles(files, params)
}
