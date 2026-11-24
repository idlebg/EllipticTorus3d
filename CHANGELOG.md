# Changelog

Notable changes to the visualizer and this repository, newest first. The version is the one in `package.json`.
From 3.2.2 on, each version lists what was **Fixed**, **Changed**, **Added** or **Removed** since the version before
it. Changes made after the latest version are collected under **Unreleased** until the next version takes them in.

## Unreleased

### Fixed

- The tour video ran fast. `test/tour.py` installed Playwright's virtual clock without pausing it, so real time leaked
  into every frame and the app's own animations (the 0.7 s shape morph, the camera moves of keys 1 to 3, auto-rotate)
  ran several times faster than the frames said; the clock's own animation frames also fell on a 16 ms grid, 62.5 a
  second. The clock is now paused and the app's animation frames run at exactly 60 a second of video time, two per
  video frame, so a morph lasts its 0.7 s in the video. `samples/tour.mp4` and its poster are recorded again.
- The video box of the gallery (`samples/index.html`): the `<video>` kept its `height="1080"` while the CSS set only
  its width, so the player stood 1080 px tall (960 × 1080 in a 1440 px window, 342 × 1080 on a 390 px phone) with the
  picture letterboxed inside. It keeps the video's 16:9 shape now.

### Added

- A 78-second video on YouTube, https://youtu.be/t3U8uDbOmzI: the points of a curve becoming a torus, the group law,
  Bitcoin's curve and the nine shapes, with an original score; every 3D shot is the visualizer itself, rendered frame
  by frame. The README links to it, and so does the online gallery.

## 3.2.2 — 2026-11-24

### Fixed

- With *Force group law*, Step on a curve with p ≥ 100 000 wrote an off-curve result as compressed SEC, which reads
  back as the curve point with that x (or as an error for a twist x), so P₁ silently became another point. Step,
  P₂ = −P₁, *Use as P₁ / P₂*, *Copy SEC*, the Relations rows and the inspector's −P now write compressed SEC only where
  it reads back as the same point (on the curve, p prime) and uncompressed SEC (`04` ‖ x ‖ y) otherwise, so a forced
  walk on secp256k1 keeps its exact points. On a composite p ≥ 100 000 these paths now write uncompressed SEC, which
  the parser accepts there. Checked by 4 new engine checks and 7 new end-to-end checks.

### Changed

- The tour video is now `samples/tour.mp4`: 1920×1080, 30 fps, H.264, 40 s, 9 MB (it was a 1280×800 WebM).
  `test/tour.py` makes it frame by frame on a virtual clock, rendered at 2× and scaled down, so motion is even and
  lines are smooth, with a drawn pointer; the file is checked by decoding it against the captured frames (40–43 dB
  PSNR). The gallery shows a 16:9 poster frame taken from the video itself.
- `package-lock.json` carries the package version again (it still said 3.0.0).

### Added

- Tutorials, in `tutorials/` and online at https://idlebg.com/idleGevrek/tutorials/: 40 pages, in four levels
  (Explorer, Learner, Bitcoiner, Researcher) and six reference pages, from no maths at all to Bitcoin keys and
  research on elliptic curves. Their 132 worked examples each have a screenshot and a link that opens the visualizer
  in exactly that state, and every number in the text is checked against the visualizer and an independent
  computation. In this repository they come as an HTML reader that opens the visualizer at the top of the
  repository, as Markdown chapters that read on GitHub, and with a README.
- The tutorials' single-file edition, `tutorials/elliptic_curve_torus_tutorials.html` (14.2 MiB): every page, every
  screenshot and the visualizer in one HTML file that works offline. It is in this repository only.
- The gallery, online and in `samples/index.html`, has an entry for the tutorials at the top; `samples/README.md` and
  the README link to them.

## 3.2.1 — 2026-11-23

- Links to the source (https://github.com/idlebg/EllipticTorus3d) and the demo gallery
  (https://idlebg.com/idleGevrek/) in the page footer, the help dialog, the JSON export, the gallery and the docs.
- A favicon (inline SVG, still no network).
- Showcase: the flat map keeps its normal size in every sample and in the tour video, so it no longer covers the
  surface; the gallery grid loads WebP thumbnails (about a tenth of the PNG bytes) and keeps the PNGs for the
  lightbox; `samples/README.md` links open the hosted visualizer; the gallery has an online variant with social
  preview tags.
- Repository files: `LICENSE` (MIT), `THIRD_PARTY_NOTICES.md` (three.js), `docs/ARCHITECTURE.md`, this changelog,
  `.gitattributes` (LF, so the build stays byte-for-byte reproducible on Windows checkouts).

## 3.2.0 — 2026-11-23

- **Trefoil knot**, the ninth shape: a tube around the (2, 3) torus knot on the torus (R, 0.45·R), where the knot is
  thickest, framed by the torus normal. Still a torus, so nothing is cut; a knot is chiral, so negation is the
  reflection inside each ring instead of through one plane. Tests check the knot type (2 turns around the axis,
  3 around the tube) and that the tube never touches itself over the whole slider range.
- **Morph between shapes**: surface, grid, rings, markers, curve points and labels blend into the new shape over
  0.7 s while the camera steps with its size (skipped with reduced motion).
- **Stage toolbar**: oblique / top / side views (the active one lit), reset, auto-rotate, full screen, PNG, JSON,
  copy link.
- **Shape tiles** with pictograms drawn from each shape's own maths, instead of a dropdown.
- **Step** (`N`): P₁ ← the result, so P₁ = P₂ = G walks G, 2G, 3G, …; known scalars stay readable as `kG`.
  A button sets P₂ = −P₁.
- A soft glint on the glass (dark theme); panel regrouped (Curve, Points, Shape, Display, Inspector, Relations,
  Self-test) with icons; open sections remembered and carried in links; compact legend; filled slider tracks;
  frosted-glass overlays.
- Gallery: trefoil and Step samples (18 in all), tag filter, lightbox; the tour shows Step and every morph.

## 3.1.0 — 2026-11-22

- Seven more shapes: cylinder, sphere, ellipsoid, icosahedron, lemniscate tube, wavy plane, Klein bottle. y is
  centred where a shape is cut, so negation stays an exact reflection; rings and the chord break at cuts; the
  icosahedron's points sit on its faces; the Klein bottle's twisted seam is checked.
- Shape geometry tests (`test/shapes.test.mjs`).

## 3.0.2 — 2026-11-22

- Fat lines blend once per pixel (a stencil id per line object): no more beading at polyline joints; ring widths
  now equal the spec at every DPR.
- The showcase: ready-made states as `#s=` links with checked captions, screenshots, an offline gallery and a
  recorded tour.

## 3.0.1 — 2026-11-22

- Review pass on a real GPU, WebKit and without WebGL.
- Freezes fixed: a composite p with a compressed or x-only point, and huge powers such as `(2**32767)**32768`.
- Per-update cost on an RTX 4090 down from about 13 ms to about 3 ms (no shader relinks, no rewrites of an
  unchanged panel, per-curve analysis cached).
- WebGL context loss handled; DPR changes tracked; the flat map works without WebGL.
- Read-outs from v0.2 restored: evaluated p, a, b; P₁ / P₂ vs G; radians; the comparison block in the JSON export.
- 54 more engine checks against the independent reference.

## 3.0.0 — 2026-11-22

- Rebuilt from scratch: three.js r187 tree-shaken and inlined (no CDN), the official orbit controls, camera
  presets and fly-to.
- Glass shell, sector grid and a hidden-line pass; a dark theme and a paper theme after the reference plate.
- Sticky hover cards, pinned cards with leader lines, the inspector.
- Engine: a safe expression parser instead of `Function()`, strict SEC parsing (including 06/07 hybrid parity and
  x-only), `(x, y)`, `kG` / `(n-1)G` / `λG`, off-curve points shown with the curve b′ they lie on.
- Chord construction, mirror plane, β-orbit, flat map, point counts / orders / discrete logs on toy curves,
  presets, state in `localStorage` and shareable links, PNG / JSON export, console API, in-page self-test.

## Earlier

- 0.2 (September 2025): the first version, three.js r128 from a CDN, hand-written orbit controls and a
  `Function()`-based expression parser. A v2 that loaded three r160 from unpkg broke when that release stopped
  shipping `examples/js/controls/OrbitControls.js`; 3.0.0 replaced it.
