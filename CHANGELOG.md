# Changelog

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
