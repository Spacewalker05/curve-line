import { useEffect, useMemo, useRef, useState } from 'react'
import Plotly from 'plotly.js-basic-dist-min'
import { devicePairs, loadFile, splitScans, type Scan, type Table } from './core'
import { ExpandButton } from './Expand'
import { card, cv, DropZone, Field, FileChips, minorTicks, paperAxis, Section, sectionLabel, Shell, Toggle, tr } from './ui'

type Loaded = { name: string; table?: Table; error?: string }

function LineChart({ title, yLabel, scans, yOf, dark }: { title: string; yLabel: string; scans: { name: string; s: Scan; color: string }[]; yOf: (i: number) => number; dark: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ink = cv('--c-plot-ink'), paper = cv('--c-plot-paper')
    const font = { family: 'Arial, sans-serif', size: 14, color: ink }
    const axis = (t: string) => ({
      ...paperAxis(ink, ink), mirror: 'allticks', ticks: 'inside', ticklen: 8, tickwidth: 1.5, linewidth: 1.5, showgrid: false,
      minor: { ...minorTicks(ink), nticks: 5 }, zeroline: true, zerolinecolor: cv('--c-dim'), zerolinewidth: 1,
      tickfont: font, title: { text: t, font: { ...font, size: 16 }, standoff: 10 },
    })
    Plotly.react(
      el,
      scans.map(({ name, s, color }) => ({
        type: 'scatter', mode: 'lines', name, x: s.V, y: s.I.map(yOf), line: { color, width: 2 },
        hovertemplate: `${name}<br>V = %{x:.4f} V<br>${yLabel.split(' (')[0]} = %{y:.4f}<extra></extra>`,
      })),
      {
        paper_bgcolor: paper, plot_bgcolor: paper, font, height: 420, margin: { l: 72, r: 24, t: 20, b: 60 },
        xaxis: axis('Voltage (V)'), yaxis: axis(yLabel), hovermode: 'closest', dragmode: 'zoom',
        legend: { x: 0.02, y: 0.98, bgcolor: 'rgba(0,0,0,0)', font },
      },
      { displaylogo: false, responsive: true, scrollZoom: true, modeBarButtonsToRemove: ['lasso2d', 'select2d'], toImageButtonOptions: { filename: title.replace(/\W+/g, '_'), scale: 3 } },
    )
  }, [scans, yOf, yLabel, title, dark])
  useEffect(() => () => { if (ref.current) Plotly.purge(ref.current) }, [])
  return (
    <div className={`${card} p-5`}>
      <div className="flex items-center justify-between mb-3">
        <div className={sectionLabel}>{title}</div>
        <ExpandButton getEl={() => ref.current} title={title} />
      </div>
      <div ref={ref} className="rounded-lg overflow-hidden" />
    </div>
  )
}

export default function Inspect({ onBack, dark, setDark }: { onBack: () => void; dark: boolean; setDark: (v: boolean) => void }) {
  const [files, setFiles] = useState<File[]>([])
  const [loaded, setLoaded] = useState<Loaded[]>([])
  const [fi, setFi] = useState(0)
  const [pi, setPi] = useState(0)
  const [area, setArea] = useState('0.1')
  const [invert, setInvert] = useState(false)

  useEffect(() => {
    let live = true
    Promise.all(files.map(async (f) => {
      try { return { name: f.name, table: await loadFile(f) } } catch (e: any) { return { name: f.name, error: e?.message ?? 'Could not read file' } }
    })).then((r) => live && setLoaded(r))
    return () => { live = false }
  }, [files])

  const cur = loaded[Math.min(fi, loaded.length - 1)]
  const pairs = useMemo(() => {
    if (!cur?.table) return []
    try { return devicePairs(cur.table) } catch { return [] }
  }, [cur])
  const pair = pairs[Math.min(pi, pairs.length - 1)]
  const err = cur?.error ?? (cur?.table && !pairs.length ? 'No voltage / current columns found in this file.' : '')

  const scans = useMemo(() => {
    if (!cur?.table || !pair) return []
    const s = splitScans(cur.table, pair.v, pair.i, invert, 10)
    const out: { name: string; s: Scan; color: string }[] = []
    if (s.forward) out.push({ name: 'Forward', s: s.forward, color: cv('--c-plot-forward') })
    if (s.reverse) out.push({ name: 'Reverse', s: s.reverse, color: cv('--c-plot-reverse') })
    if (s.single) out.push({ name: 'Scan', s: s.single, color: cv('--c-plot-forward') })
    return out
  }, [cur, pair, invert, dark])

  const a = parseFloat(area)
  const toMa = useMemo(() => (i: number) => i * 1000, [])
  const toJ = useMemo(() => (i: number) => (i / a) * 1000, [a])
  const label = cur ? `${cur.name.replace(/\.[^.]+$/, '')}${pair?.label ? ` · ${pair.label}` : ''}` : ''

  const pill = (on: boolean) => `h-8 px-3 rounded-lg border text-xs font-medium cursor-pointer ${tr} ${on ? 'bg-accent border-accent text-on-accent' : 'border-line text-fg hover:border-accent'}`

  const sidebar = (
    <>
      <div className={sectionLabel}>Scan Files</div>
      <div className="mt-3">
        <DropZone accept=".txt,.csv,.dat,.xlsx,.xls" label="Drop J–V text files" onFiles={(f) => setFiles((x) => [...x, ...f.filter((n) => !x.some((o) => o.name === n.name))])} />
        <FileChips names={files.map((f) => f.name)} onRemove={(i) => { setFiles((x) => x.filter((_, k) => k !== i)); setFi(0); setPi(0) }} />
      </div>
      <Section title="Device" />
      <Field label="Active area" unit="cm²" value={area} onChange={setArea} />
      <div className="mt-3">
        <Toggle on={invert} onChange={setInvert} label="Invert current sign" sub="Flip if Jsc appears negative" />
      </div>
    </>
  )

  return (
    <Shell crumb="Inspect" dark={dark} setDark={setDark} onBack={onBack} sidebar={sidebar}
      action={<div className="text-xs text-dim text-center">Charts update as you change files and settings.</div>}
      status={<>{loaded.length ? `${loaded.length} file(s) loaded` : 'No files'}</>}>
      <div className="p-6 lg:p-8 space-y-5 max-w-[1100px] w-full mx-auto">
        {!loaded.length ? (
          <div className="min-h-[420px] grid place-items-center text-center">
            <div>
              <div className="text-lg font-semibold">Inspect J–V scans</div>
              <p className="text-sm text-muted mt-2 max-w-[420px]">Add a scan file to see forward and reverse sweeps as current–voltage and Jsc–voltage line plots.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {loaded.map((l, i) => <button key={l.name} onClick={() => { setFi(i); setPi(0) }} className={pill(i === fi)}>{l.name}</button>)}
            </div>
            {pairs.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {pairs.map((p, i) => <button key={p.label} onClick={() => setPi(i)} className={pill(i === pi)}>{p.label}</button>)}
              </div>
            )}
            {err ? (
              <div className={`${card} p-5 text-sm text-bad`}>{err}</div>
            ) : (
              <>
                <LineChart title={`Current vs Voltage — ${label}`} yLabel="Current (mA)" scans={scans} yOf={toMa} dark={dark} />
                {a > 0 ? (
                  <LineChart title={`Jsc vs Voltage — ${label}`} yLabel="J (mA/cm²)" scans={scans} yOf={toJ} dark={dark} />
                ) : (
                  <div className={`${card} p-5 text-sm text-muted`}>Enter an active area to show the J–V plot.</div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </Shell>
  )
}
