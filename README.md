# Expectance — Website

A clean, responsive black-and-white site for **Expectance**, a systems building
company. Built as a self-contained static site with an interactive **Three.js**
neural-network particle field in the hero.

## Run it

It's plain HTML/CSS/JS — no build step.

- **Quickest:** double-click `index.html` to open it in your browser. (Three.js is
  vendored locally in `vendor/`, so it works offline and over `file://`.)
- **Local server** (recommended, avoids any browser file restrictions):

  ```bash
  python3 -m http.server 8000
  # then open http://localhost:8000
  ```

## Files

| File | Purpose |
|------|---------|
| `index.html` | Page structure & all copy |
| `styles.css` | Design system, layout, responsive rules, hero text glitch |
| `particles.js` | Three.js hero — flow-field particles; lines grow among dots near the cursor |
| `footer.js` | Three.js footer — undulating particle wave; cursor spreads particles |
| `main.js` | Nav, mobile menu, scroll reveals, portfolio filter, stat count-up |
| `vendor/three.min.js` | Three.js r128 (vendored — no CDN needed) |

## Editing content

- **Company copy / hero:** edit the `.hero` block in `index.html`.
- **Capabilities:** the six `<article class="cap">` cards under `#capabilities`.
- **Portfolio:** the `<article class="case">` rows under `#work`. Each row's
  `data-domain` attribute (e.g. `data-domain="autonomy robotics"`) controls which
  filter chips show it.
- **Stats:** `data-count` (target number) and `data-suffix` on each `.stat__num`.
- **Contact:** replace `hello@expectance.com` and the phone/social links.

## Customizing the look

- **Colors & fonts:** the `:root` variables at the top of `styles.css`.
- **Hero flow-field:** `FLOW` / `FLOW_SPEED` (drift speed), particle count
  (`countFor`), `CURSOR_R` (cursor reach), `CURSOR_GROW` (how much dots enlarge
  near the cursor), `LINK` (max gap for a line), and the colour knobs
  `COLOR_SAT` / `COLOR_LIGHT` / `COLOR_FREQ` (cluster size) / `COLOR_DRIFT`
  (how fast colours shift) in `particles.js`.
- **Footer wave:** speed (`t += …`), `SPREAD_R` / `SPREAD` / `RISE` (cursor
  spread), grid size (`GX`/`GY`), and `MOTES` in `footer.js`.
- **Hero intro glitch:** the `glitch-in-a` / `glitch-in-b` keyframes and the two
  channel colors in `styles.css`.

## Deploying

This is a static site with no build step, so it runs on any static host
(Vercel, Netlify, GitHub Pages, S3, Cloudflare Pages).

### Vercel (recommended)

Zero-config — there's no framework and no build command. A `vercel.json` is
included (clean URLs + long-cache headers for the vendored Three.js).

- **Dashboard:** import the GitHub repo at <https://vercel.com/new>. Leave
  *Framework Preset* as **Other**, *Build Command* empty, and *Output Directory*
  as the repo root. Deploy.
- **CLI:** `npm i -g vercel`, then run `vercel` (preview) or `vercel --prod`
  from this folder.

Respects `prefers-reduced-motion` and degrades gracefully if WebGL is unavailable.
