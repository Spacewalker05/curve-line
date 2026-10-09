# Restore curveline as a Streamlit app, with the latest features

## Goal

Put your `curveline` repo back into its original Streamlit shape (Python host + React UI built into `streamlit_frontend`), then carry over everything we added here: the Inspect menu, the bigger "JV Analyzer" name, box-plot parameter charts, pixel strip, same-colour solid lines, positive J–V plot, and the grid lines switch.

## What the repo will look like (same as your previous commit)

```text
streamlit_app.py          Streamlit host, loads the UI as a custom component
backend/analyze.py        request handler
backend/jv_analysis_core.py   your Python analysis (stays the source of truth)
requirements.txt
src/                      React UI source (App, Home, Analysis, Plotting, Inspect, ...)
streamlit_frontend/       built UI that Streamlit serves
AGENTS.md
```

## Steps

1. Push a new commit that restores the repo to exactly the previous commit (246039a). Nothing is lost; the Lovable version stays in history.
2. Update `src/` with the latest screens: new `Inspect.tsx`, updated `Home.tsx` (third card), `App.tsx` (inspect mode, bigger name), `ui.tsx` (pixel colours, grid helper), `BoxChart.tsx` / `Expand.tsx` (box plots with points and means), and the new chart colour tokens in `index.css`.
3. Keep Python doing the analysis. Parameter Calculation keeps going through the existing Streamlit message channel to `backend/analyze.py`. Add an `inspect` request type in `backend/analyze.py` that returns each pixel's forward/reverse V and I arrays using the same parsing and forward/reverse split from `jv_analysis_core.py`, so Inspect reads files exactly like the analysis does.
4. Rebuild the UI into `streamlit_frontend/` (old stale asset files removed) so `streamlit run streamlit_app.py` works straight away.
5. Clean up: remove the committed `__pycache__` folders and add a `.gitignore`.
6. Check: run the Python handler on a sample scan file for both analysis and inspect, and open the built UI to confirm it loads.

## Technical notes

- The repo had no build config at the root, so I'll add a small `package.json` + `vite.config.ts` (with a `build:streamlit` script, output `streamlit_frontend`, relative base path) matching the docstring in `streamlit_app.py`.
- The browser-side TypeScript analysis port is not included in the repo; Python stays the single engine.
- This Lovable preview stays unchanged. make sure that you are reverting back to the previous commit on github and then update the code in loveable to compatible with the streamlit app especially the new feaatures like inspecting and plotting directly without chqnging or altering