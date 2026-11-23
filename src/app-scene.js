/* ==========================================================================
   3D view (three.js r187, vendored below as VENDOR_THREE).
   Points land on the shape picked in the View section (src/app-shapes.js; the torus by default).
   Drawing order does the "technical drawing" look:
     depth mask (invisible, a hair inside the surface)  → hidden lines pass (GreaterDepth, dashed, faint)
     → glass shell (fresnel) → markers → visible lines → rings → chord
   ========================================================================== */

const THREE = globalThis.VENDOR_THREE || null; // set by the inlined vendor script at the end of the file
const DEG = Math.PI / 180;
const CHORD_MAX_WIND = 24; // beyond this the line is a solid coil; the flat map shows its p points instead
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const PAL = {
  dark: {
    bg: 0x070b10, grid: 0x203241, gridQ: 0x31485b, gridZ: 0x4f687c, back: 0x2a4256,
    shell: 0x2de2e6, shellBase: 0.022, shellRim: 0.34, shellSpec: 0.2, cloud: 0x8ea6b9, chord: 0xe6eef5, plane: 0x2de2e6, halo: '#070b10', sel: '#ffffff',
    lw: { grid: 1, gridQ: 1.35, gridZ: 1.7, mer: 2.6, par: 1.9, chord: 1.5 }, gridAlpha: 1, backAlpha: 0.75,
  },
  paper: {
    bg: 0xffffff, grid: 0xc6c6c6, gridQ: 0xafafaf, gridZ: 0x98a1aa, back: 0xbababa,
    shell: 0x24303c, shellBase: 0.0, shellRim: 0.085, shellSpec: 0, cloud: 0x6b7682, chord: 0x1c232b, plane: 0x0b6bcb, halo: '#ffffff', sel: '#15191e',
    lw: { grid: 1.25, gridQ: 1.45, gridZ: 1.6, mer: 3.1, par: 2.3, chord: 1.6 }, gridAlpha: 1, backAlpha: 0.7,
  },
};

const view = {
  ok: false, renderer: null, scene: null, camera: null, controls: null,
  root: null, torusG: null, cloudG: null, markG: null, ringG: null, chordG: null, selG: null,
  collide: null, cloud: null, dirty: true, tween: null, viewH: 1, viewW: 1, sprites: [],
  pal: PAL.dark, theme: 'dark', texCache: new Map(), keys: {}, retired: [], lost: false, stencilId: 0, boundR: 1.66,
  morph: null, morphG: null, shown: false,
};

/** three r187 needs WebGL 2. Probing first keeps three's "could not create a WebGL context" errors out of the console. */
function webgl2Available() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return false;
    const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
    return true;
  } catch { return false; }
}

/** The stage notice: 'none' (no WebGL at all), 'lost' (context lost, waiting for the browser), or null (hidden). */
function glNotice(kind) {
  const el = $('#glfail');
  el.hidden = !kind;
  $('#hints').hidden = !!kind;
  $('#overlay').hidden = kind === 'lost'; // labels and cards would float over an empty stage
  if (kind) el.querySelector('p').textContent = kind === 'lost'
    ? 'The 3D view lost its WebGL context (GPU reset, driver update or the browser reclaimed it). It comes back by itself when the browser restores the context; the maths, inspector and flat map keep working.'
    : 'WebGL is unavailable in this browser, so the 3D view cannot start. The curve maths, inspector and flat map still work.';
}

function cssColor(name) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || '#ffffff';
}

function initView() {
  if (!THREE || !webgl2Available()) return false;
  const canvas = $('#gl');
  let renderer;
  try {
    // stencil: fat lines are drawn once per pixel (see strokeOnce)
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, stencil: true, powerPreference: 'high-performance' });
  } catch (e) {
    console.warn('WebGL init failed:', e);
    return false;
  }
  // three calls preventDefault() on loss, so the browser may restore the context; its caches restart empty
  // and everything re-uploads on the next render, which nothing would trigger while the view is idle
  canvas.addEventListener('webglcontextlost', () => { view.lost = true; glNotice('lost'); });
  canvas.addEventListener('webglcontextrestored', () => { view.lost = false; glNotice(null); view.dirty = true; });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 200);
  camera.up.set(0, 0, 1);
  const controls = new THREE.OrbitControls(camera, canvas);
  Object.assign(controls, {
    enableDamping: true, dampingFactor: 0.085, rotateSpeed: 0.8, zoomSpeed: 1.15, panSpeed: 0.9,
    zoomToCursor: true, screenSpacePanning: true, minDistance: 0.25, maxDistance: 40, autoRotateSpeed: 0.9,
  });
  controls.addEventListener('start', () => { view.tween = null; view.userMoved = true; canvas.classList.add('dragging'); syncToolbar(); });
  controls.addEventListener('end', () => canvas.classList.remove('dragging'));

  // ?lines=thin / ?lines=fat override the automatic choice
  const force = /[?&]lines=(thin|fat)\b/.exec(location.search);
  Object.assign(view, { ok: true, renderer, scene, camera, controls, softGL: force ? force[1] === 'thin' : isSoftwareGL(renderer) });
  if (view.softGL) console.info('[ec-torus] software WebGL detected: drawing the sector grid with hairlines to stay responsive');
  view.root = new THREE.Group(); scene.add(view.root);
  for (const k of ['torusG', 'cloudG', 'ringG', 'chordG', 'markG', 'selG', 'morphG']) { view[k] = new THREE.Group(); view.root.add(view[k]); }

  const ro = new ResizeObserver(() => resizeView());
  ro.observe($('#stage'));
  watchPixelRatio();
  resizeView();
  requestAnimationFrame(loop);
  return true;
}

/** Moving the window to a monitor with another scale changes devicePixelRatio without resizing the stage. */
function watchPixelRatio() {
  matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`).addEventListener('change', () => {
    resizeView(); mini.baseKey = ''; drawMini(); watchPixelRatio();
  }, { once: true });
}

/** SwiftShader / llvmpipe and friends rasterise on the CPU, where thousands of fat-line quads get slow. */
function isSoftwareGL(renderer) {
  try {
    const gl = renderer.getContext();
    let name = String(gl.getParameter(gl.RENDERER) || '');
    if (!/swiftshader|llvmpipe|softpipe|software|basic render/i.test(name) && /webkit|mozilla/i.test(name)) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      if (ext) name = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '');
    }
    return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(name);
  } catch { return false; }
}

function resizeView() {
  if (!view.ok) return;
  const st = $('#stage');
  const w = Math.max(1, st.clientWidth), h = Math.max(1, st.clientHeight);
  view.viewW = w; view.viewH = h;
  const pr = Math.min(window.devicePixelRatio || 1, 2);
  if (view.renderer.getPixelRatio() !== pr) view.renderer.setPixelRatio(pr);
  view.renderer.setSize(w, h, false);
  view.camera.aspect = w / h;
  view.camera.updateProjectionMatrix();
  updateSpriteScales();
  // until someone grabs the camera, keep the torus framed when the stage changes size
  if (!view.userMoved && !view.tween && view.lastView) setView(view.lastView, false);
  view.dirty = true;
}

function loop(now) {
  requestAnimationFrame(loop);
  if (!view.ok) return;
  if (view.tween) {
    const t = view.tween, k = Math.min(1, (now - t.start) / t.ms), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    view.camera.position.lerpVectors(t.p0, t.p1, e);
    view.controls.target.lerpVectors(t.t0, t.t1, e);
    if (k >= 1) view.tween = null;
    view.dirty = true;
  }
  if (view.morph) {
    const k = Math.min(1, (now - view.morph.t0) / view.morph.ms);
    if (k >= 1) { endMorph(); update(); } else stepMorph(k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  }
  const moved = view.controls.update();
  if (moved || view.dirty) {
    view.renderer.render(view.scene, view.camera);
    view.dirty = false;
    if (view.retired.length) flushRetired();
    afterRender();
    if (!view.shown) { view.shown = true; $('#stage').classList.add('ready'); } // fade the canvas in on its first frame
  }
}
const requestRender = () => { view.dirty = true; };

/* ------------------------------ geometry helpers ------------------------------ */

/** The shape points land on (src/app-shapes.js); the torus unless the user picked another. */
const SHAPE = () => shapeById(S.shape);
/** Length scale for dashes, the depth-mask inset and fly-to: the tube radius on the torus, else ∝ R. */
const shapeUnit = () => (S.shape === 'torus' || !S.shape ? S.r : 0.46 * S.R / 1.2);
const _nrm = THREE ? new THREE.Vector3() : null;

/** Patch point P(s, t) of a shape (the current one by default), lifted `lift` along the surface normal. */
function patchPoint(s, t, lift = 0, out = new THREE.Vector3(), sh = SHAPE()) {
  sh.pos(s, t, S.R, S.r, out);
  if (lift) { sh.nrm(s, t, S.R, S.r, _nrm); out.x += lift * _nrm.x; out.y += lift * _nrm.y; out.z += lift * _nrm.z; }
  return out;
}
/** Where torus turns (u, v) = (x/p, y/p) land on the current shape (on the torus: the classic map). */
function surfPoint(tu, tv, lift = 0, out = new THREE.Vector3(), sh = SHAPE()) {
  const [s, t] = patchST(sh, tu, tv);
  return patchPoint(s, t, lift, out, sh);
}
/**
 * Line segments along a curve given in turns, fn(k) → [u, v] for k ∈ [0, 1] (or patch coordinates with
 * `patch`). A segment that would jump across a cut of the shape is dropped, so rings and the chord break at
 * the cut instead of slicing through the inside; zero-length segments (at a pole) are dropped too.
 */
function curveSegs(fn, n, lift, out = [], patch = false) {
  const sh = SHAPE(), a = new THREE.Vector3(), b = new THREE.Vector3();
  let ps = 0, pt = 0;
  for (let i = 0; i <= n; i++) {
    let [s, t] = fn(i / n);
    if (!patch) [s, t] = patchST(sh, ((s % 1) + 1) % 1, ((t % 1) + 1) % 1);
    patchPoint(s, t, lift, b);
    if (i > 0 && !(sh.cutU && Math.abs(s - ps) > 0.5) && !(sh.cutV && Math.abs(t - pt) > 0.5) && a.distanceToSquared(b) > 1e-18)
      out.push(a.x, a.y, a.z, b.x, b.y, b.z);
    a.copy(b); ps = s; pt = t;
  }
  return out;
}
/** Meridian ring (fixed x, all y) and parallel ring (fixed y, all x). */
const meridianSegs = (tu, lift, n = 128, out) => curveSegs((k) => [tu, k], n, lift, out);
const parallelSegs = (tv, lift, n = SHAPE().lineS || 256, out) => curveSegs((k) => [k, tv], n, lift, out);

function lineMat(color, width, opacity, back = false, dashed = false) {
  const m = new THREE.LineMaterial({
    color, linewidth: width, transparent: true, opacity, depthWrite: false, worldUnits: false,
    dashed, dashSize: 0.035 * shapeUnit() / 0.46, gapSize: 0.03 * shapeUnit() / 0.46,
  });
  if (back) m.depthFunc = THREE.GreaterDepth;
  return m;
}
/**
 * Blend a fat line at most once per pixel. Each segment of a Line2 is a quad with round caps, so neighbouring
 * segments overlap at every joint (and a line can cross itself); with opacity < 1 those pixels were blended
 * twice and the line looked beaded. Every line object takes its own stencil id when it is drawn: a pixel it
 * already covered fails NOTEQUAL, while other lines (other ids) still blend over it as before. The stencil is
 * cleared every frame and ids cycle through 1…255, so ids stay unique within a frame (about 30 lines are drawn).
 */
function strokeOnce(obj) {
  const m = obj.material, prev = obj.onBeforeRender;
  m.stencilWrite = true;
  m.stencilFunc = THREE.NotEqualStencilFunc;
  m.stencilZPass = THREE.ReplaceStencilOp;
  obj.onBeforeRender = function (...args) {
    prev.apply(this, args);
    view.stencilId = view.stencilId % 255 + 1;
    m.stencilRef = view.stencilId;
  };
  return obj;
}

/** One polyline drawn twice: visible part solid, hidden part dashed and faint. */
function addLinePair(group, positions, color, width, alpha, order, { segments = false, backAlpha = null, frontDashed = false } = {}) {
  const geo = segments ? new THREE.LineSegmentsGeometry() : new THREE.LineGeometry();
  geo.setPositions(positions);
  const Ctor = segments ? THREE.LineSegments2 : THREE.Line2;
  const front = strokeOnce(new Ctor(geo, lineMat(color, width, alpha, false, frontDashed)));
  front.renderOrder = order;
  if (frontDashed) front.computeLineDistances();
  group.add(front);
  const ba = backAlpha ?? alpha * view.pal.backAlpha * S.back;
  if (ba > 0.004) {
    const back = strokeOnce(new Ctor(geo, lineMat(color, Math.max(1, width * 0.8), ba, true, true)));
    back.renderOrder = 2;
    back.computeLineDistances();
    group.add(back);
  }
  return front;
}

/**
 * Grid helper: fat lines on real GPUs, 1-device-pixel GL lines on software renderers. Returns the live segment array
 * (both passes share it) and how to flag it changed, so the shape morph can blend it in place.
 */
function addGridPair(group, segs, color, width, alpha, backAlpha) {
  if (!view.softGL) {
    const buf = addLinePair(group, segs, color, width, alpha, 8, { segments: true, backAlpha }).geometry.attributes.instanceStart.data;
    return { arr: buf.array, touch: () => { buf.needsUpdate = true; } };
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(segs, 3));
  const front = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: alpha, depthWrite: false }));
  front.renderOrder = 8; group.add(front);
  if (backAlpha > 0.004) {
    const m = new THREE.LineDashedMaterial({ color, transparent: true, opacity: backAlpha, depthWrite: false, dashSize: 0.035, gapSize: 0.03 });
    m.depthFunc = THREE.GreaterDepth;
    const back = new THREE.LineSegments(geo, m);
    back.computeLineDistances(); back.renderOrder = 2; group.add(back);
  }
  const attr = geo.attributes.position;
  return { arr: attr.array, touch: () => { attr.needsUpdate = true; } };
}

/**
 * Empty a group. Materials are retired and disposed after the next render, once their replacements hold
 * the same shader programs: three.js deletes a program when its last material is disposed, so disposing
 * first made every update relink the same programs (≈5 ms per update on an RTX 4090, ≈16 ms on SwiftShader).
 * Sprites share one geometry inside three.js, so theirs is left alone.
 */
function disposeGroup(g) {
  g.traverse((o) => {
    if (o.geometry && !o.isSprite) o.geometry.dispose();
    if (o.material && !o.userData.keepMat) for (const m of Array.isArray(o.material) ? o.material : [o.material]) view.retired.push(m);
  });
  g.clear();
  if (view.retired.length > 4000) flushRetired(); // no frames for a long time (hidden tab): don't hoard
}
function flushRetired() { for (const m of view.retired) m.dispose(); view.retired.length = 0; }

/* ------------------------------ sprite textures ------------------------------ */

function spriteTex(shape, color) {
  const key = `${view.theme}|${shape}|${color}`;
  let tex = view.texCache.get(key);
  if (tex) return tex;
  const N = 128, c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d'), m = N / 2, halo = view.pal.halo;
  g.lineCap = 'round';
  if (shape === 'dot') {
    g.beginPath(); g.arc(m, m, 50, 0, TAU); g.fillStyle = halo; g.fill();
    g.beginPath(); g.arc(m, m, 40, 0, TAU); g.fillStyle = color; g.fill();
    const grd = g.createRadialGradient(m - 12, m - 14, 2, m, m, 40);
    grd.addColorStop(0, 'rgba(255,255,255,.55)'); grd.addColorStop(0.55, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.beginPath(); g.arc(m, m, 40, 0, TAU); g.fill();
  } else if (shape === 'ring' || shape === 'dash') {
    g.beginPath(); g.arc(m, m, 46, 0, TAU); g.lineWidth = 22; g.strokeStyle = halo; g.stroke();
    if (shape === 'dash') g.setLineDash([17, 11]);
    g.beginPath(); g.arc(m, m, 46, 0, TAU); g.lineWidth = 10; g.strokeStyle = color; g.stroke();
  } else if (shape === 'sel') {
    g.beginPath(); g.arc(m, m, 56, 0, TAU); g.lineWidth = 9; g.strokeStyle = halo; g.stroke();
    g.beginPath(); g.arc(m, m, 56, 0, TAU); g.lineWidth = 4.5; g.strokeStyle = color; g.stroke();
  } else if (shape === 'cloud') {
    const grd = g.createRadialGradient(m, m, 0, m, m, m);
    grd.addColorStop(0, '#fff'); grd.addColorStop(0.62, '#fff'); grd.addColorStop(0.8, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, N, N);
  }
  tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  view.texCache.set(key, tex);
  return tex;
}

function spriteScaleFor(px) { return (2 * px) / (view.camera.projectionMatrix.elements[5] * view.viewH); }
function makeSprite(shape, color, px, { ghost = false, order = 30, depthTest = true } = {}) {
  const mat = new THREE.SpriteMaterial({ map: spriteTex(shape, color), sizeAttenuation: false, transparent: true, depthWrite: false, depthTest });
  if (ghost) { mat.depthFunc = THREE.GreaterDepth; mat.opacity = Math.min(1, 0.65 * S.back + 0.05); }
  const sp = new THREE.Sprite(mat);
  sp.renderOrder = ghost ? 3 : order;
  sp.userData.px = px;
  sp.scale.setScalar(spriteScaleFor(px));
  view.sprites.push(sp);
  return sp;
}
function updateSpriteScales() {
  if (!view.ok) return;
  view.sprites = view.sprites.filter((s) => s.parent);
  for (const s of view.sprites) s.scale.setScalar(spriteScaleFor(s.userData.px * (s.userData.boost || 1)));
}

/* ------------------------------ builders ------------------------------ */

/** The surface as a triangle grid over the patch, offset along the normal; triangles face along the normal. */
function patchGeometry(segS, segT, offset) {
  const sh = SHAPE(), nS = segS + 1, nT = segT + 1, pos = new Float32Array(nS * nT * 3), nor = new Float32Array(nS * nT * 3);
  const p = {}, n = {};
  for (let j = 0; j < nT; j++) for (let i = 0; i < nS; i++) {
    const k = (j * nS + i) * 3;
    sh.pos(i / segS, j / segT, S.R, S.r, p); sh.nrm(i / segS, j / segT, S.R, S.r, n);
    pos[k] = p.x + offset * n.x; pos[k + 1] = p.y + offset * n.y; pos[k + 2] = p.z + offset * n.z;
    nor[k] = n.x; nor[k + 1] = n.y; nor[k + 2] = n.z;
  }
  // winding from a cell away from poles and seams: flip if the triangle normal disagrees with nrm
  const at = (q) => [pos[q * 3], pos[q * 3 + 1], pos[q * 3 + 2]], c0 = (segT >> 1) * nS + (segS >> 1);
  const [A, B, D] = [at(c0), at(c0 + 1), at(c0 + nS + 1)], e1 = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], e2 = [D[0] - A[0], D[1] - A[1], D[2] - A[2]];
  const flip = (e1[1] * e2[2] - e1[2] * e2[1]) * nor[c0 * 3] + (e1[2] * e2[0] - e1[0] * e2[2]) * nor[c0 * 3 + 1] + (e1[0] * e2[1] - e1[1] * e2[0]) * nor[c0 * 3 + 2] < 0;
  const idx = [];
  for (let j = 0; j < segT; j++) for (let i = 0; i < segS; i++) {
    const a = j * nS + i, b = a + 1, c = a + nS, d = c + 1;
    if (flip) idx.push(a, d, b, a, c, d); else idx.push(a, b, d, a, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}
/** The icosahedron with flat faces (circumradius k). */
function icosaGeometry(k) {
  const pos = [], nor = [];
  ICOSA.faces.forEach((f, i) => { for (const vi of f) { const v = ICOSA.vertices[vi]; pos.push(v[0] * k, v[1] * k, v[2] * k); nor.push(...ICOSA.planes[i].n); } });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return g;
}

/**
 * The glass shell: a fresnel rim (edge-on surface is denser) plus, on the dark theme, a soft glint from a key light
 * above and to the left of the camera, which shows which way the surface turns. The paper theme keeps the flat
 * technical-drawing look (no glint). Double-sided surfaces flip the normal on their back faces.
 */
function shellMaterial(side) {
  const pal = view.pal, k = S.glass * 2;
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(pal.shell) }, uBase: { value: pal.shellBase * k }, uRim: { value: pal.shellRim * k }, uSpec: { value: pal.shellSpec * k } },
    vertexShader: [
      'varying vec3 vN; varying vec3 vV;',
      'void main() {',
      '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
      '  vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);',
      '  gl_Position = projectionMatrix * mv;',
      '}'].join('\n'),
    fragmentShader: [
      'uniform vec3 uColor; uniform float uBase; uniform float uRim; uniform float uSpec;',
      'varying vec3 vN; varying vec3 vV;',
      'void main() {',
      '  vec3 n = normalize(vN), v = normalize(vV);',
      '  if (!gl_FrontFacing) n = -n;',
      '  float f = 1.0 - abs(dot(n, v));',
      '  vec3 h = normalize(vec3(-0.42, 0.58, 0.7) + v);',
      '  float g = uSpec * pow(max(dot(n, h), 0.0), 56.0);',
      '  gl_FragColor = vec4(mix(uColor, vec3(1.0), clamp(g * 2.2, 0.0, 0.85)), clamp(uBase + uRim * pow(f, 2.4) + g, 0.0, 1.0));',
      '  #include <colorspace_fragment>',
      '}'].join('\n'),
    transparent: true, depthWrite: false, side,
  });
}

/** The surface: depth mask, collision copy, glass shell, sector grid (and the icosahedron's edges). */
function buildTorus() {
  disposeGroup(view.torusG);
  const pal = view.pal, { R, r, su, sv } = S, sh = SHAPE();
  const side = sh.closed ? THREE.FrontSide : THREE.DoubleSide; // open or one-sided surfaces are seen from both sides
  let maskGeo, collideGeo, shellGeo;
  if (sh.id === 'torus') {
    maskGeo = new THREE.TorusGeometry(R, r * 0.982, 56, 160);
    collideGeo = new THREE.TorusGeometry(R, r * 0.982, 20, 60);
    shellGeo = new THREE.TorusGeometry(R, r, 56, 160);
  } else if (sh.id === 'icosahedron') {
    shellGeo = icosaGeometry(1.3 * R); maskGeo = icosaGeometry(1.3 * R * 0.99); collideGeo = icosaGeometry(1.3 * R * 0.99);
  } else {
    const [a, b] = sh.seg, inset = -0.018 * shapeUnit();
    maskGeo = patchGeometry(a, b, inset); collideGeo = patchGeometry(Math.ceil(a / 3), Math.ceil(b / 3), inset); shellGeo = patchGeometry(a, b, 0);
  }
  // camera framing and the mirror plane follow the size of the shape
  // (exactly R + r on the torus: the float32 mesh would move the camera by a hair and flip edge pixels)
  const sp = shellGeo.attributes.position;
  let br = 0;
  if (sh.id === 'torus') br = R + r;
  else for (let i = 0; i < sp.count; i++) br = Math.max(br, Math.hypot(sp.getX(i), sp.getY(i), sp.getZ(i)));
  view.boundR = br;
  // invisible depth mask, a hair inside the drawn surface
  const mask = new THREE.Mesh(maskGeo, new THREE.MeshBasicMaterial({ colorWrite: false, side }));
  mask.renderOrder = 0;
  view.torusG.add(mask);
  // collision copy for occlusion tests of labels and cards (both sides count)
  view.collide = new THREE.Mesh(collideGeo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  view.collide.updateMatrixWorld();

  const shell = new THREE.Mesh(shellGeo, shellMaterial(side));
  shell.renderOrder = 4;
  view.torusG.add(shell);

  if (S.show.grid) {
    const isQ = (t) => [0, 0.25, 0.5, 0.75].some((q) => Math.abs(t - q) < 1e-9);
    const reg = [], qs = [], zs = [], nP = sh.lineS || 200;
    for (let i = 0; i < su; i++) { const t = i / su; if (!isQ(t)) meridianSegs(t, 0, 96, reg); }
    for (let j = 0; j < sv; j++) { const t = j / sv; if (!isQ(t)) parallelSegs(t, 0, nP, reg); }
    for (const t of [0.25, 0.5, 0.75]) { meridianSegs(t, 0, 96, qs); parallelSegs(t, 0, nP, qs); }
    meridianSegs(0, 0, 96, zs); parallelSegs(0, 0, nP, zs);
    // where a shape is cut, the far edge of the patch is drawn too (t = 1 / s = 1; a pole draws nothing)
    if (sh.cutV) curveSegs((k) => [k, 1], nP, 0, qs, true);
    if (sh.cutU) curveSegs((k) => [1, k], 96, 0, qs, true);
    if (sh.id === 'icosahedron') {
      const k = 1.3 * R, seen = new Set();
      for (const f of ICOSA.faces) for (const [i, j] of [[f[0], f[1]], [f[1], f[2]], [f[2], f[0]]]) {
        const key = Math.min(i, j) + ':' + Math.max(i, j);
        if (seen.has(key)) continue;
        seen.add(key);
        qs.push(...ICOSA.vertices[i].map((q) => q * k), ...ICOSA.vertices[j].map((q) => q * k));
      }
    }
    const ga = pal.gridAlpha;
    if (reg.length) addGridPair(view.torusG, reg, pal.grid, pal.lw.grid, ga, pal.backAlpha * S.back * 0.8);
    addGridPair(view.torusG, qs, pal.gridQ, pal.lw.gridQ, ga, pal.backAlpha * S.back * 0.9);
    addGridPair(view.torusG, zs, pal.gridZ, pal.lw.gridZ, ga, pal.backAlpha * S.back);
  }
  view.keys.torus = torusKey();
  requestRender();
}
const torusKey = () => [S.shape, S.R, S.r, S.su, S.sv, S.glass, S.back, S.show.grid, view.theme].join('|');

/**
 * Turn coordinates of every curve point, cached per curve and mapping. Shared by the 3D cloud, the flat map
 * and picking, so the flat map also works without WebGL and the BigInt mapping runs once instead of twice.
 */
const cloudCache = { key: '', tus: null, tvs: null };
function cloudTurns(m) {
  if (!m || !m.curve || !m.cloudOK) return null;
  const key = `${m.curve.a}|${m.curve.b}|${m.curve.p}|${S.map}|${S.bits}`;
  if (cloudCache.key !== key) {
    const { xs, ys } = m.small, n = xs.length, p = m.curve.p;
    const tus = new Float64Array(n), tvs = new Float64Array(n);
    for (let i = 0; i < n; i++) { tus[i] = turns(BigInt(xs[i]), p, S.map, S.bits); tvs[i] = turns(BigInt(ys[i]), p, S.map, S.bits); }
    Object.assign(cloudCache, { key, tus, tvs });
  }
  return cloudCache;
}

function buildCloud(m) {
  disposeGroup(view.cloudG);
  view.cloud = null;
  if (!S.show.cloud || !m.cloudOK || !m.curve) { view.keys.cloud = ''; return; }
  const { tus, tvs } = cloudTurns(m), n = tus.length, sh = SHAPE();
  const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), v = new THREE.Vector3(), q = {};
  for (let i = 0; i < n; i++) {
    surfPoint(tus[i], tvs[i], 0.004, v); pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
    const [s, t] = patchST(sh, tus[i], tvs[i]); sh.nrm(s, t, S.R, S.r, q); nrm[i * 3] = q.x; nrm[i * 3 + 1] = q.y; nrm[i * 3 + 2] = q.z;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  // dense clouds get smaller, fainter dots so rings and markers stay readable
  const size = n < 400 ? 7 : n < 3000 ? 4.5 : n < 30000 ? 2.3 : 1.7;
  const alpha = n < 3000 ? 0.95 : n < 30000 ? 0.62 : 0.48;
  const mk = (back) => {
    const mat = new THREE.PointsMaterial({ color: view.pal.cloud, size: back ? size * 0.85 : size, sizeAttenuation: false, map: spriteTex('cloud', '#fff'),
      transparent: true, alphaTest: 0.01, depthWrite: false, opacity: back ? Math.min(1, alpha * view.pal.backAlpha * S.back * 0.8) : alpha });
    if (back) mat.depthFunc = THREE.GreaterDepth;
    const pts = new THREE.Points(geo, mat);
    pts.renderOrder = back ? 2 : 9;
    return pts;
  };
  view.cloudG.add(mk(false));
  if (S.back > 0.01) view.cloudG.add(mk(true));
  view.cloud = { pos, nrm, n };
  view.keys.cloud = cloudKey(m);
  requestRender();
}
const cloudKey = (m) => [m.curve ? `${m.curve.a}|${m.curve.b}|${m.curve.p}` : '', S.show.cloud, S.map, S.bits, S.shape, S.R, S.r, S.back, view.theme].join('|');

const MARKER = {
  p1: { shape: 'dot', px: 15 }, p2: { shape: 'dot', px: 15 }, sum: { shape: 'dot', px: 15 },
  g: { shape: 'ring', px: 25 }, r: { shape: 'dash', px: 20 },
};

/** Markers, guide rings, chord, mirror plane. Cheap enough to rebuild on every change. */
function buildMarks(m) {
  for (const g of [view.markG, view.ringG, view.chordG]) disposeGroup(g);
  view.sprites = view.sprites.filter((s) => s.parent);
  if (!m.curve) { requestRender(); return; }
  const pal = view.pal;
  for (const t of m.targets) {
    t.color = cssColor(t.colorVar);
    t.pos = surfPoint(t.tu, t.tv, 0.006);
    const spec = t.sibling ? { shape: 'ring', px: 13 } : MARKER[t.key] || { shape: 'dot', px: 13 };
    t.px = spec.px;
    const shape = t.onCurve || t.key === 'r' || t.sibling ? spec.shape : 'dash';
    const front = makeSprite(shape, t.color, spec.px, { order: t.key === 'g' ? 31 : t.sibling ? 29 : 30 });
    front.position.copy(t.pos);
    front.userData.target = t.key;
    view.markG.add(front);
    t.sprite = front;
    t.ghost = null;
    if (S.back > 0.01) {
      const ghost = makeSprite(shape, t.color, spec.px * 0.9, { ghost: true });
      ghost.position.copy(t.pos);
      view.markG.add(ghost);
      t.ghost = ghost;
    }
  }

  // guide rings: meridian (fixed x, through every y: around the tube on the torus) and parallel (fixed y, every x)
  if (S.show.rings) {
    // a ring that lands on one already drawn (P and −P share a meridian, β-siblings a parallel)
    // is dashed so both colours stay visible
    const seenU = [], seenV = [], near = (arr, t) => arr.some((q) => Math.abs(q - t) < 1e-9);
    let order = 11;
    for (const key of ['p1', 'p2', 'sum', 'g']) {
      const t = m.pts[key];
      if (!t || !S.rings[key]) continue;
      const col = new THREE.Color(t.color);
      addLinePair(view.ringG, meridianSegs(t.tu, 0.002), col, pal.lw.mer, 0.95, ++order, { segments: true, frontDashed: near(seenU, t.tu) });
      addLinePair(view.ringG, parallelSegs(t.tv, 0.002), col, pal.lw.par, 0.8, ++order, { segments: true, frontDashed: near(seenV, t.tv) });
      seenU.push(t.tu); seenV.push(t.tv);
    }
  }

  // chord construction
  const ch = m.op && m.op.chord;
  if (S.show.chord && ch && m.op.status === 'ok') {
    const p = m.curve.p;
    const chordCol = new THREE.Color(pal.chord);
    if (ch.type === 'vertical') {
      const t = m.pts.p1;
      if (t) addLinePair(view.chordG, meridianSegs(t.tu, 0.008), chordCol, pal.lw.chord, 0.9, 22, { segments: true, frontDashed: true });
    } else if (S.map === 'scale' && p <= 1000000n) {
      const wind = Number(centered(ch.lambda, p));
      if (Math.abs(wind) <= CHORD_MAX_WIND) {
        // y ≡ λx + c with λ centred: once along x, λ times through y (broken where a shape is cut)
        const c0 = Number(ch.c) / Number(p), n = Math.max(400, Math.min(60000, Math.abs(wind) * 40));
        addLinePair(view.chordG, curveSegs((k) => [k, wind * k + c0], n, 0.003), chordCol, pal.lw.chord, 0.85, 22, { segments: true });
      }
    }
    // mirror step R → result: the reflection through the shape's mirror plane
    const R = m.pts.r, sum = m.pts.sum;
    if (R && sum) {
      const seg = new Float32Array([R.pos.x, R.pos.y, R.pos.z, sum.pos.x, sum.pos.y, sum.pos.z]);
      const geo = new THREE.LineGeometry(); geo.setPositions(seg);
      const mat = lineMat(new THREE.Color(sum.color), 1.6, 0.75, false, true);
      mat.depthTest = false;
      const l = new THREE.Line2(geo, mat); l.computeLineDistances(); l.renderOrder = 23;
      view.chordG.add(l);
    }
    // y ↦ p − y is the reflection through the mirror plane only under the proportional mapping
    const sh = SHAPE();
    if (S.map === 'scale' && sh.mirror && ((R && sum) || ch.type === 'vertical')) {
      const rad = view.boundR + 0.16;
      const disc = new THREE.Mesh(new THREE.CircleGeometry(rad, 128), new THREE.MeshBasicMaterial({ color: pal.plane, transparent: true, opacity: view.theme === 'dark' ? 0.04 : 0.03, depthWrite: false, side: THREE.DoubleSide }));
      const q = disc.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...sh.mirror)); // circle in the mirror plane
      disc.renderOrder = 5;
      view.chordG.add(disc);
      const rim = new Float32Array(129 * 3), w = new THREE.Vector3();
      for (let i = 0; i <= 128; i++) { w.set(rad * Math.cos(i / 128 * TAU), rad * Math.sin(i / 128 * TAU), 0).applyQuaternion(q); rim.set([w.x, w.y, w.z], i * 3); }
      addLinePair(view.chordG, rim, new THREE.Color(pal.plane), 1, view.theme === 'dark' ? 0.28 : 0.3, 5, { backAlpha: 0, frontDashed: true });
    }
  }
  requestRender();
}

function applyThemeToView(theme) {
  view.theme = theme;
  view.pal = PAL[theme];
  if (!view.ok) return;
  // transparent canvas: the page background (and its gradient) shows through
  view.scene.background = null;
  view.renderer.setClearColor(0x000000, 0);
  for (const t of view.texCache.values()) t.dispose();
  view.texCache.clear();
}

/* ------------------------------ shape morph ------------------------------ */

/**
 * A new shape grows out of the old one instead of replacing it in one frame. Both shapes are sampled at the same
 * turn coordinates on one grid (s′, t′) whose t′ edge is where every cut lies: t′ = (v + ½) mod 1 is the patch t of
 * a cut shape, and a periodic shape does not care where its grid starts. So no sampled line crosses a cut, and each
 * sample of one shape has a partner on the other. Every frame blends the partners: surface, depth mask, grid, guide
 * rings, markers (their cards and tags follow), curve points and axis labels. The chord, the mirror disc and the
 * selection rings wait for the end, when the normal build for the new shape replaces the morph. A shape change
 * during a morph starts from wherever the surface is. Any other change ends the morph at once (update()).
 */
const MORPH = { ms: 700, segS: 360, segT: 64, merN: 96, parN: 400, ringN: 128 };
const morphST = (sh, s, t) => [s, sh.cutV ? t : (t + 0.5) % 1];

/** Everything the morph blends, for one shape; the layout depends only on the model and S, never on the shape. */
function morphSample(sh, m) {
  const o = new THREE.Vector3(), q = {}, { segS, segT } = MORPH, nS = segS + 1, nT = segT + 1;
  const P = new Float32Array(nS * nT * 3), N = new Float32Array(nS * nT * 3);
  let bound = 0;
  for (let j = 0; j < nT; j++) for (let i = 0; i < nS; i++) {
    const k = (j * nS + i) * 3, [s, t] = morphST(sh, i / segS, j / segT);
    sh.pos(s, t, S.R, S.r, o); sh.nrm(s, t, S.R, S.r, q);
    P[k] = o.x; P[k + 1] = o.y; P[k + 2] = o.z; N[k] = q.x; N[k + 1] = q.y; N[k + 2] = q.z;
    bound = Math.max(bound, o.length());
  }
  if (sh.id === 'torus') bound = S.R + S.r;
  const line = (fn, n, lift, out) => { // a polyline in morph coordinates, as segment pairs
    let x = 0, y = 0, z = 0;
    for (let i = 0; i <= n; i++) {
      const [s0, t0] = fn(i / n), [s, t] = morphST(sh, s0, t0);
      patchPoint(s, t, lift, o, sh);
      if (i) out.push(x, y, z, o.x, o.y, o.z);
      x = o.x; y = o.y; z = o.z;
    }
    return out;
  };
  const mer = (u, lift, n, out = []) => line((k) => [u, k], n, lift, out);             // fixed x, every y
  const par = (v, lift, n, out = []) => line((k) => [k, (v + 0.5) % 1], n, lift, out); // fixed y, every x
  const lines = [[], [], []]; // regular, quarter and zero lines, as in buildTorus
  if (S.show.grid) {
    const isQ = (t) => [0, 0.25, 0.5, 0.75].some((w) => Math.abs(t - w) < 1e-9);
    for (let i = 0; i < S.su; i++) if (!isQ(i / S.su)) mer(i / S.su, 0, MORPH.merN, lines[0]);
    for (let j = 0; j < S.sv; j++) if (!isQ(j / S.sv)) par(j / S.sv, 0, MORPH.parN, lines[0]);
    for (const w of [0.25, 0.5, 0.75]) { mer(w, 0, MORPH.merN, lines[1]); par(w, 0, MORPH.parN, lines[1]); }
    mer(0, 0, MORPH.merN, lines[2]); par(0, 0, MORPH.parN, lines[2]);
  }
  const rings = [];
  if (S.show.rings && m.curve) for (const key of ['p1', 'p2', 'sum', 'g']) {
    const t = m.pts[key];
    if (t && S.rings[key]) rings.push(mer(t.tu, 0.002, MORPH.ringN), par(t.tv, 0.002, MORPH.parN));
  }
  const marks = new Float32Array(m.targets.length * 3);
  m.targets.forEach((t, i) => { surfPoint(t.tu, t.tv, 0.006, o, sh); marks[i * 3] = o.x; marks[i * 3 + 1] = o.y; marks[i * 3 + 2] = o.z; });
  let cloud = null;
  if (view.cloud && S.show.cloud && m.cloudOK) {
    const { tus, tvs } = cloudTurns(m);
    cloud = new Float32Array(tus.length * 3);
    for (let i = 0; i < tus.length; i++) { surfPoint(tus[i], tvs[i], 0.004, o, sh); cloud[i * 3] = o.x; cloud[i * 3 + 1] = o.y; cloud[i * 3 + 2] = o.z; }
  }
  const labs = overlay.labels.filter((l) => l.turn), labels = new Float32Array(labs.length * 3);
  labs.forEach((l, i) => { surfPoint(l.turn[0], l.turn[1], l.turn[2], o, sh); labels[i * 3] = o.x; labels[i * 3 + 1] = o.y; labels[i * 3 + 2] = o.z; });
  return { P, N, lines: lines.map((l) => Float32Array.from(l)), rings: rings.map((l) => Float32Array.from(l)), marks, cloud, labels, bound };
}

/** Start blending from shape `fromId` (or from the running morph) into the current S.shape. */
function startMorph(fromId) {
  const m = M, b = morphSample(SHAPE(), m), mo = view.morph;
  if (mo) { // retarget: the blend so far becomes the start
    for (const c of mo.chans) { c.a = c.cur.slice(); c.b = c.pick(b); }
    mo.t0 = performance.now(); view.boundR = b.bound; view.dirty = true;
    return;
  }
  const a = morphSample(shapeById(fromId), m), g = view.morphG, pal = view.pal, chans = [];
  const chan = (pick, cur, after) => chans.push({ a: pick(a), b: pick(b), cur, pick, after });
  // surface and depth mask: one grid, double-sided (a surface may turn inside out half way)
  const { segS, segT } = MORPH, nS = segS + 1, idx = [];
  for (let j = 0; j < segT; j++) for (let i = 0; i < segS; i++) { const c = j * nS + i; idx.push(c, c + 1, c + nS + 1, c, c + nS + 1, c + nS); }
  const shellGeo = new THREE.BufferGeometry(), maskGeo = new THREE.BufferGeometry();
  shellGeo.setAttribute('position', new THREE.Float32BufferAttribute(a.P, 3));
  shellGeo.setAttribute('normal', new THREE.Float32BufferAttribute(a.N, 3));
  shellGeo.setIndex(idx);
  maskGeo.setAttribute('position', new THREE.Float32BufferAttribute(a.P, 3));
  maskGeo.setIndex(idx);
  const mask = new THREE.Mesh(maskGeo, new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide }));
  const shell = new THREE.Mesh(shellGeo, shellMaterial(THREE.DoubleSide));
  mask.renderOrder = 0; shell.renderOrder = 4;
  g.add(mask, shell);
  const sp = shellGeo.attributes.position, sn = shellGeo.attributes.normal, mp = maskGeo.attributes.position, inset = 0.018 * shapeUnit();
  chan((x) => x.P, sp.array, () => { sp.needsUpdate = true; });
  chan((x) => x.N, sn.array, () => { // renormalise, then the mask sits a hair inside along the normal
    const n = sn.array, P = sp.array, w = mp.array;
    for (let i = 0; i < n.length; i += 3) {
      const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1;
      n[i] /= l; n[i + 1] /= l; n[i + 2] /= l;
      w[i] = P[i] - inset * n[i]; w[i + 1] = P[i + 1] - inset * n[i + 1]; w[i + 2] = P[i + 2] - inset * n[i + 2];
    }
    sn.needsUpdate = true; mp.needsUpdate = true;
  });
  // grid and guide rings, blended in their own (shared) segment buffers
  const GRID = [[pal.grid, pal.lw.grid, 0.8], [pal.gridQ, pal.lw.gridQ, 0.9], [pal.gridZ, pal.lw.gridZ, 1]];
  a.lines.forEach((arr, i) => {
    if (!arr.length) return;
    const [col, w, bk] = GRID[i], l = addGridPair(g, arr.slice(), col, w, pal.gridAlpha, pal.backAlpha * S.back * bk);
    chan((x) => x.lines[i], l.arr, l.touch);
  });
  let order = 11, ri = 0;
  if (S.show.rings && m.curve) for (const key of ['p1', 'p2', 'sum', 'g']) {
    const t = m.pts[key];
    if (!t || !S.rings[key]) continue;
    for (const [w, al] of [[pal.lw.mer, 0.95], [pal.lw.par, 0.8]]) {
      const i = ri++, buf = addLinePair(g, a.rings[i].slice(), new THREE.Color(t.color), w, al, ++order, { segments: true }).geometry.attributes.instanceStart.data;
      chan((x) => x.rings[i], buf.array, () => { buf.needsUpdate = true; });
    }
  }
  // markers (cards, tags and leader lines follow t.pos), curve points, axis labels
  const ts = m.targets, cm = a.marks.slice();
  chan((x) => x.marks, cm, () => ts.forEach((t, i) => {
    if (!t.pos) return;
    t.pos.set(cm[i * 3], cm[i * 3 + 1], cm[i * 3 + 2]);
    if (t.sprite) t.sprite.position.copy(t.pos);
    if (t.ghost) t.ghost.position.copy(t.pos);
  }));
  const pts = view.cloudG.children[0];
  if (a.cloud && pts) {
    const attr = pts.geometry.attributes.position;
    for (const c of view.cloudG.children) c.frustumCulled = false;
    chan((x) => x.cloud, attr.array, () => { attr.needsUpdate = true; });
  }
  const labs = overlay.labels.filter((l) => l.turn), cl = a.labels.slice();
  chan((x) => x.labels, cl, () => labs.forEach((l, i) => l.pos.set(cl[i * 3], cl[i * 3 + 1], cl[i * 3 + 2])));

  g.traverse((o) => { o.frustumCulled = false; }); // bounding spheres go stale while the buffers move
  for (const grp of [view.torusG, view.ringG, view.chordG, view.selG]) grp.visible = false;
  view.morph = { t0: performance.now(), ms: MORPH.ms, chans };
  view.boundR = b.bound;
  view.dirty = true;
}

function stepMorph(e) {
  for (const c of view.morph.chans) {
    const { a, b, cur } = c;
    for (let i = 0; i < cur.length; i++) cur[i] = a[i] + (b[i] - a[i]) * e;
    c.after();
  }
  view.dirty = true;
}

/** Drop the morph objects; the caller's update() then builds the current shape for real. */
function endMorph() {
  if (!view.morph) return;
  view.morph = null;
  disposeGroup(view.morphG);
  for (const g of [view.torusG, view.ringG, view.chordG, view.selG]) g.visible = true;
  view.keys.torus = ''; view.keys.cloud = '';
}

/* ------------------------------ camera ------------------------------ */

function fitDistance() {
  const ext = (view.boundR || S.R + S.r) + 0.12, cam = view.camera;
  const fv = cam.fov * DEG, fh = 2 * Math.atan(Math.tan(fv / 2) * cam.aspect);
  return Math.max(ext / Math.sin(fv / 2), ext / Math.sin(fh / 2)) * 1.16;
}
const VIEWS = { iso: [57, -62], top: [0.6, -90], side: [90, -90] };
function flyTo(pos, target, ms = 750) {
  if (!view.ok) return;
  if (reducedMotion) { view.camera.position.copy(pos); view.controls.target.copy(target); view.dirty = true; return; }
  view.tween = { p0: view.camera.position.clone(), t0: view.controls.target.clone(), p1: pos.clone(), t1: target.clone(), start: performance.now(), ms };
}
function setView(name, animate = true) {
  if (!view.ok) return;
  view.lastView = name; view.userMoved = false; // framed again: resizes keep it framed until the next drag
  syncToolbar();
  const [pol, az] = VIEWS[name] || VIEWS.iso, d = fitDistance();
  const ph = pol * DEG, th = az * DEG;
  const pos = new THREE.Vector3(Math.sin(ph) * Math.cos(th), Math.sin(ph) * Math.sin(th), Math.cos(ph)).multiplyScalar(d);
  if (animate) flyTo(pos, new THREE.Vector3());
  else { view.camera.position.copy(pos); view.controls.target.set(0, 0, 0); view.controls.update(); view.dirty = true; }
}
function focusOn(pos) {
  if (!view.ok || !pos) return;
  view.userMoved = true; syncToolbar();
  const cam = view.camera, dir = cam.position.clone().sub(view.controls.target).normalize();
  const dist = Math.min(cam.position.distanceTo(view.controls.target), 1.7 * (shapeUnit() / 0.46));
  flyTo(pos.clone().add(dir.multiplyScalar(dist)), pos.clone(), 650);
}

/* ------------------------------ projection / picking ------------------------------ */

const _v = THREE ? new THREE.Vector3() : null;
function project(pos) {
  _v.copy(pos).project(view.camera);
  return { x: (_v.x + 1) / 2 * view.viewW, y: (1 - _v.y) / 2 * view.viewH, inFront: _v.z < 1 && _v.z > -1 };
}
const _ray = THREE ? new THREE.Raycaster() : null;
function occluded(pos) {
  if (!view.collide || view.morph) return false; // the collision copy is the old shape until the morph ends
  const cam = view.camera.position, dir = pos.clone().sub(cam), dist = dir.length();
  _ray.set(cam, dir.normalize());
  _ray.far = dist - 0.012;
  return _ray.intersectObject(view.collide, false).length > 0;
}

/** Nearest marker within its radius, else nearest curve point within 9 px. */
function pickAt(mx, my, model) {
  if (!view.ok || !model || !model.curve) return null;
  let best = null, bd = Infinity;
  for (const t of model.targets) {
    if (!t.pos) continue;
    const s = project(t.pos);
    if (!s.inFront) continue;
    const d = Math.hypot(s.x - mx, s.y - my), lim = Math.max(10, t.px * 0.75);
    if (d <= lim) {
      const score = d + (occluded(t.pos) ? 6 : 0) - (t.sibling ? 0 : 0.5);
      if (score < bd) { bd = score; best = t; }
    }
  }
  if (best) return best;
  const c = view.cloud;
  if (!c || !S.show.cloud) return null;
  const e = new THREE.Matrix4().multiplyMatrices(view.camera.projectionMatrix, view.camera.matrixWorldInverse).elements;
  const W = view.viewW, H = view.viewH, cp = view.camera.position;
  let bi = -1; bd = 81;
  for (let i = 0; i < c.n; i++) {
    const x = c.pos[i * 3], y = c.pos[i * 3 + 1], z = c.pos[i * 3 + 2];
    const w = e[3] * x + e[7] * y + e[11] * z + e[15];
    if (w <= 0) continue;
    const sx = ((e[0] * x + e[4] * y + e[8] * z + e[12]) / w + 1) / 2 * W;
    const sy = (1 - (e[1] * x + e[5] * y + e[9] * z + e[13]) / w) / 2 * H;
    let d = (sx - mx) ** 2 + (sy - my) ** 2;
    if (d > 81) continue;
    // prefer points on the side of the surface that faces the camera
    if (c.nrm[i * 3] * (cp.x - x) + c.nrm[i * 3 + 1] * (cp.y - y) + c.nrm[i * 3 + 2] * (cp.z - z) < 0) d += 40;
    if (d < bd) { bd = d; bi = i; }
  }
  if (bi < 0) return null;
  return cloudTarget(model, bi);
}
function cloudTarget(model, i) {
  const { xs, ys } = model.small, { tus, tvs } = cloudTurns(model);
  return {
    key: `c:${xs[i]}:${ys[i]}`, label: `(${xs[i]}, ${ys[i]})`, colorVar: '--muted', color: cssColor('--text'),
    P: { x: BigInt(xs[i]), y: BigInt(ys[i]) }, onCurve: true,
    tu: tus[i], tv: tvs[i], pos: surfPoint(tus[i], tvs[i], 0.004), px: 8, cloud: true,
  };
}

/** Save the current frame as PNG (rendered on demand, so no preserveDrawingBuffer needed). */
function snapshotPNG(name) {
  if (!view.ok) return;
  const prevBg = view.scene.background;
  view.scene.background = new THREE.Color(view.pal.bg);
  view.renderer.render(view.scene, view.camera);
  view.renderer.domElement.toBlob((blob) => {
    if (blob) download(blob, name);
  }, 'image/png');
  view.scene.background = prevBg;
  view.dirty = true;
}
