# Rebuild JV Analyzer (curveline) here + add "Inspect"

Source: GitHub `Spacewalker05/curveline` (Vite React + Plotly front end, Python/Streamlit back end). Lovable can't import a repo directly, so this project gets a fresh copy of the app, with the new Inspect menu added.

## What you'll get
1. **Home screen as it is now** with the same look (splash screen, light/dark toggle, cards), plus a third card: **Inspect**.
2. **Bigger "JV Analyzer" name** in the header (15px → about 20px) and on the splash (about 48px instead of 36px).
3. **Inspect workspace**
   - Drop one or more .txt / .csv / .dat scan files.
   - Choose a file, then a pixel when the file has several voltage/current column pairs.
   - Settings: active area (cm²), whether to flip the current sign.
   - **Chart 1: Current vs Voltage** — forward and reverse scans as two coloured lines.
   - **Chart 2: J vs Voltage** — current ÷ area in mA/cm², forward and reverse lines.
   - Both are interactive line charts: zoom, pan, hover read-outs, legend toggles, reset, PNG export. They have minor tick marks, axis lines at zero, and frame-style axes like a paper figure.
4. **Parameter Calculation and Plotting** are ported from the repo. Their number crunching currently runs on Python, so:
   - Analysis math (Voc, Jsc, FF, PCE, Rs, Rsh) gets rewritten in TypeScript so it runs in the browser. No server is needed.

## Technical details
- TanStack routes: `/` (home), `/inspect`, `/analysis`, `/plotting`; port `ui.tsx`, `BoxChart`, `Expand`, and the CSS tokens from `index.css` into `src/styles.css`.
- Add `plotly.js-dist-min` + `react-plotly.js`, loaded only on the client (lazy import behind ClientOnly) so server rendering works.
- Shared `parseScanFile()` copies the Python logic: find the header row, split on tab/comma/semicolon/space, match V/I/J columns, and split forward from reverse at the voltage turning point. Inspect and Analysis both use it.
- Plotly axes: `ticks:'outside'`, `minor:{ticks:'outside', ticklen:3, nticks:5}`, `showline`, `mirror:true`, `zeroline`.
- A Vitest test checks the parser and the forward/reverse split using a sample file.
