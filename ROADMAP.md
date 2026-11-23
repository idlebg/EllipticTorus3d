# ROADMAP — ellipticTorus3d

Candidates, not commitments.

## Phase 0 — confirm on real hardware

- [x] Chrome on a real GPU: hover smoothness on the F₁₀₀₀₉ preset, fat-line widths at the monitor's DPR, PNG
      export. Done 2026-11-22 on an RTX 4090 (`test/hw.py --gpu`):
      hover median 8.3 ms at 120 Hz, widths constant in CSS px at DPR 1 / 1.5 / 2, PNG at DPR 2 correct.
- [x] WebKit (Playwright 27.2): 8 / 8, zero console errors.
- [ ] Quick pass in Firefox. Playwright's Firefox 159 build did not start on the Windows 11 test machine
      (SideBySide error, mozglue); `py -3 test/browsers.py firefox` is ready.
- [x] Chrome with WebGL disabled: panel, flat map and maths work (`test/nowebgl.py`, 10 / 10).

## Phase 1 — exploration tools

- [ ] **Scalar-multiplication trail**: animate double-and-add for k·G as a path of points on the torus and the
      flat map (step slider, binary of k shown alongside). Step (`N`: P₁ ← the result) is the manual version; a
      trail would keep the visited points drawn.
- [ ] **Subgroup colouring** on toy curves: colour the cloud by point order or by coset of ⟨G⟩. `ref_out.json`
      has every toy's order histogram to test it against (four toys are not cyclic, e.g. F₂₂₃ ≅ Z/6 × Z/42).
- [ ] **Twist view**: mark the x values whose x³ + ax + b is a non-residue (the quadratic twist) as ticks on
      the flat map's x axis, with the twist order when p is small.
- [ ] **Saved curves**: import/export custom curve + points as JSON so research curves drop in as presets.

## Shapes

- [x] Cylinder, sphere, ellipsoid, icosahedron, lemniscate, wavy plane, Klein bottle, with negation kept a reflection on every one. Done in 3.1.0.
- [x] Trefoil knot tube, the (2, 3) torus knot: still a torus, so nothing is cut; chiral, so negation is the
      reflection inside each ring. Done in 3.2.0, with a morph between shapes.
- [ ] General (p, q) torus knots as a choice (p, q coprime): the frame and the tests already work for any (p, q);
      the open question is the thickness (B/A and the tube) per pair, which `test/shapes.test.mjs` would check.
- [ ] Remember the camera per shape in `#s=` links (with the camera-preset item below).

## Phase 2 — output and polish

- [ ] Store the camera preset (oblique / top / side) in `#s=` links, so a shared state, such as the gallery's
      top- and side-view cards, opens in its view without pressing 2 or 3.
- [ ] SVG export of the flat map; PNG export with the HTML labels burned in.
- [ ] Keyboard focus ring for pinned cards (tab through pins, Delete to unpin).
- [x] Polish pass (3.2.0): stage toolbar, shape tiles with pictograms, morph, glass glint, regrouped panel with
      remembered sections, compact legend, slider fills, gallery tag filter and lightbox.
- [ ] Optional sector heat-map: count curve points per (u, v) sector for small p.

## From the 3.0.1 review

- [ ] View-only fast path: R, r, glass, hidden-line sliders and the grid chip skip `computeModel`.
- [x] Transparent fat lines bead at polyline joints (round caps blended twice). Done in 3.0.2 with a stencil id
      per line object (each line blends once per pixel; other lines still blend over it).
- [ ] Firefox re-test once a Playwright build starts on Windows again, or with a stock Firefox over BiDi.
- [x] `.gitattributes` with LF line endings, so Git for Windows does not check out CRLF and change the build hash.
      Done in 3.2.1.

## Maintenance

- [ ] When three.js moves on: bump `package.json`, `npm i`, `node build.mjs`, run the test suites, compare the
      showcase screenshots (`py -3 test/showcase.py`).
