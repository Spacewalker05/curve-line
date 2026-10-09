# Slim curveline repo + smooth Home scrolling

## 1. Keep only the essentials in curveline
From now on, each sync replaces the repo contents with just these, as one commit, with nothing extra:

```text
src/                  UI source
backend/              Python analysis
streamlit_frontend/   built UI that Streamlit serves
streamlit_app.py
requirements.txt
```

These files get removed: `AGENTS.md`, `.gitignore`, `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, and any `__pycache__` folders. I still build the UI here before each sync, so `streamlit_frontend/` stays up to date.

I'll save this rule to project memory so future syncs follow it automatically.

## 2. Smooth scrolling on the Home screen
- Make the Home page scroll smoothly. Momentum scrolling on touch screens will feel softer, and the page won't drag the browser window around at the top or bottom edge.
- Apply the same change in this preview and in the Streamlit build. Then rebuild and sync.

## Technical notes
- Home scroll container: add `scroll-smooth`, `overscroll-contain` and `-webkit-overflow-scrolling: touch` (via a small `.smooth-scroll` class in the stylesheet, in both `src/styles.css` and the repo's `src/index.css`).
- Sync = full tree replacement through the GitHub connection, built from a staging folder that holds only the five allowed entries.
