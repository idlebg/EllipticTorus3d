/* ==========================================================================
   UI: panel wiring, overlay (labels, sticky hover card, pinned cards),
   inspector, flat map, keyboard, exports, boot.
   ========================================================================== */

function $(s, el = document) { return el.querySelector(s); }
function $$(s, el = document) { return [...el.querySelectorAll(s)]; }

let S = loadState();
if (/[#&]s=/.test(location.hash)) { try { history.replaceState(null, '', location.href.replace(/#.*$/, '')); } catch { /* ignore */ } }
let M = null;
let hoverT = null, inspectT = null;
const pins = new Map();
const F = {};
const TEXT_FIELDS = ['a', 'b', 'p', 'p1', 'p2', 'g'];
const MAP_SMALL = 100000n;

/* ------------------------------ helpers ------------------------------ */

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
let toastTimer = 0;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } finally { ta.remove(); }
  }
  toast('Copied');
}
function autosize(ta) { if (!ta.offsetParent) return; ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 2 + 'px'; }
/**
 * Write markup / text only when it changed. Every update re-renders the panel; unchanged writes used to
 * force a relayout each time, drop text selections, and make aria-live / role=alert regions re-announce.
 */
function setHTML(el, html) { if (el._html !== html) { el.innerHTML = html; el._html = html; } }
function setText(el, text) { if (el.textContent !== text) el.textContent = text; }
const stamp = () => new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
const debounce = (fn, ms) => { let t = 0; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const saveSoon = debounce(() => saveState(S), 400);

/* ------------------------------ formatting ------------------------------ */

function coordStr(v, full) {
  const p = M.curve.p;
  if (p < MAP_SMALL) return String(v);
  const h = hex(v, M.curve.fb);
  return full ? h : `${h.slice(0, 10)}…${h.slice(-6)}`;
}
const turnStr = (t) => `${(t * 360).toFixed(3)}°`;
function sectorOf(t) { return [Math.min(S.su - 1, Math.floor(t.tu * S.su)), Math.min(S.sv - 1, Math.floor(t.tv * S.sv))]; }
function kOf(t) {
  const k = t.k ?? t.kTyped;
  if (k === undefined || k === null) return null;
  const n = M.ordG;
  const kk = n ? mod(k, n) : k;
  return kk < 10000000n ? String(kk) : shortHex(kk);
}
function orderStr(t) {
  if (!t.order) return null;
  if (M.known && t.order === M.known.n) return 'n (prime)';
  return String(t.order) + (M.small && t.order === M.small.count ? ' = #E, generates the group' : '');
}
function kindStr(r) {
  return ({ compressed: 'compressed SEC', uncompressed: 'uncompressed SEC', hybrid: 'hybrid SEC', 'x-only': 'x-only (BIP340, even y)', affine: '(x, y) pair', scalar: 'scalar multiple of G', infinity: 'point at infinity' })[r.kind] || r.kind;
}
function swatch(t) {
  const cls = t.key === 'g' ? 'sw ring' : t.key === 'r' || (t.input && !t.onCurve) ? 'sw dash' : t.sibling ? 'sw ring' : 'sw';
  return `<i class="${cls}" style="--c:${t.cloud ? 'var(--text)' : `var(${t.colorVar})`}"></i>`;
}
function targetTitle(t) {
  const same = M.targets.filter((o) => o !== t && !o.sibling && !t.sibling && o.P && t.P && o.P.x === t.P.x && o.P.y === t.P.y).map((o) => o.label);
  return [t.label, ...same].join(' = ');
}
function siblingNote(t) {
  if (!t.sibling) return null;
  const base = M.pts[t.of];
  return base ? `same y as ${base.label}, x multiplied by β${t.key.endsWith('2') ? '²' : ''}` : null;
}

/** Compact rows for the floating cards. */
function cardRows(t) {
  const rows = [];
  const yPar = (t.P.y & 1n) ? 'odd' : 'even';
  rows.push(['x', coordStr(t.P.x, false)]);
  rows.push(['y', `${coordStr(t.P.y, false)} (${yPar})`]);
  rows.push(['u, v', `${turnStr(t.tu)}, ${turnStr(t.tv)}`]);
  const [iu, iv] = sectorOf(t);
  rows.push(['sector', `u ${iu} of ${S.su}, v ${iv} of ${S.sv}`]);
  const k = kOf(t); if (k) rows.push(['k', `${k} (P = k·G)`]);
  const o = orderStr(t); if (o) rows.push(['order', o]);
  if (!t.onCurve) rows.push(['curve', '<span class="badc">not on this curve</span>']);
  const sn = siblingNote(t); if (sn) rows.push(['β', sn]);
  if (t.key === 'r') rows.push(['role', 'third point on the chord; mirror it to get the result']);
  return rows;
}

function cardHTML(t, pinned) {
  const rows = cardRows(t).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  const acts = pinned ? `<div class="acts">
      <button data-act="focus" data-key="${t.key}">Fly to</button>
      <button data-act="copy" data-key="${t.key}">Copy SEC</button>
      ${t.key !== 'p1' ? `<button data-act="p1" data-key="${t.key}">Use as P₁</button>` : ''}
      ${t.key !== 'p2' ? `<button data-act="p2" data-key="${t.key}">Use as P₂</button>` : ''}
    </div>` : '<div class="foot-hint">Click to pin. Esc dismisses.</div>';
  return `<div class="ch">${swatch(t)}<b>${escapeHtml(targetTitle(t))}</b><span class="sp"></span>${pinned ? `<button class="x" data-act="unpin" data-key="${t.key}" aria-label="Unpin">✕</button>` : ''}</div>
    <dl class="ck">${rows}</dl>${acts}`;
}

/* ------------------------------ panel render ------------------------------ */

function inputMsg(key) {
  const el = $(`#${key}Msg`), r = M && M.inputs[key];
  let cls = 'msg', text = '', bad = false;
  if (!r || r.empty) text = key === 'g' ? 'No generator: kG input is unavailable.' : '';
  else if (!r.ok) { text = r.error; cls += ' bad'; bad = true; }
  else {
    const bits = [kindStr(r)];
    if (r.kind === 'scalar') bits[0] = `${r.k < 1000000n && r.k > -1000000n ? r.k : shortHex(r.k)}·G`;
    if (r.P === null) bits.push(key === 'g' ? 'G cannot be 𝒪' : 'nothing to draw');
    else if (r.onCurve) bits.push('on the curve');
    else { bits.push(`NOT on the curve: b′ = ${shortHex(M.curve.bPrime(r.P), M.curve.p)}`); cls += ' bad'; }
    for (const w of r.warnings || []) { bits.push(w); if (!cls.includes('warn')) cls += ' warn'; }
    text = bits.join(', ');
  }
  if (el.className !== cls) el.className = cls;
  F[key].classList.toggle('bad-input', bad);
  setText(el, text);
}

function renderPanel() {
  setText($('#curveErr'), M.curveErr);
  for (const k of ['a', 'b', 'p']) F[k].classList.toggle('bad-input', M.curveErr.startsWith(k + ':'));
  setHTML($('#facts'), M.curve ? M.facts.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('') : '');
  setText($('#curveAside'), M.curve ? (M.known ? M.known.name : `${bitLen(M.curve.p)}-bit p`) : '');
  for (const k of ['p1', 'p2', 'g']) if (M.curve) inputMsg(k); else setText($(`#${k}Msg`), '');
  setHTML($('#relations'), M.rel.length
    ? M.rel.map(([k, v]) => `<div class="r"><span>${k}</span><span>${v}</span></div>`).join('')
    : '<p class="empty">Enter two valid points to compare them.</p>');
  renderLegend();
  renderInspector();
  $$('#opSeg button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.op === S.op)));
  const betaChip = $('[data-show="beta"]');
  betaChip.disabled = !(M.curve && M.beta);
  $('[data-show="cloud"]').disabled = !(M.curve && M.cloudOK);
  $('#bitsFld').style.opacity = S.map === 'scale' ? 0.45 : 1;
  F.bits.disabled = S.map === 'scale';
}

function renderLegend() {
  const rows = [];
  const val = (t) => (t ? (M.curve.p < MAP_SMALL ? `(${t.P.x}, ${t.P.y})` : `x ${coordStr(t.P.x, false)}`) : 'not set');
  const li = (cls, cvar, label, v, off) => `<div class="li${off ? ' off' : ''}"><i class="${cls}" style="--c:var(${cvar})"></i><span>${label}</span><span class="v">${v}</span></div>`;
  if (M.curve) {
    const A = M.inputs.p1, B = M.inputs.p2;
    rows.push(li('sw', '--c-p1', 'P₁', A && A.ok && A.P === null ? '𝒪' : val(M.pts.p1), !M.pts.p1));
    rows.push(li('sw', '--c-p2', 'P₂', B && B.ok && B.P === null ? '𝒪' : val(M.pts.p2), !M.pts.p2));
    const opv = M.op.status === 'ok' ? (M.op.P ? val(M.pts.sum) : '𝒪, not on the surface') : M.op.status === 'offcurve' ? 'skipped (off-curve input)' : 'needs both points';
    rows.push(li('sw', '--c-sum', M.op.label, opv, M.op.status !== 'ok'));
    if (M.pts.r && S.show.chord) rows.push(li('sw dash', '--c-r', 'R', 'third chord point, mirror of the result', false));
    const ch = M.op.chord;
    if (S.show.chord && ch && M.op.status === 'ok') {
      let txt = '';
      if (ch.type === 'vertical') txt = 'vertical: the meridian ring through P₁';
      else if (S.map !== 'scale') txt = 'not drawn in a bit-window mapping';
      else if (M.curve.p > 1000000n) txt = 'λ is huge: only R and the mirror step are drawn';
      else {
        const w = absBig(centered(ch.lambda, M.curve.p));
        txt = w === 0n ? 'horizontal: the parallel ring through P₁' : `winds ${w}× ${SHAPE().around}` + (w > BigInt(CHORD_MAX_WIND) ? (M.curve.p <= 4000n ? ', shown as its points on the flat map' : ', too dense to draw') : '');
      }
      rows.push(`<div class="li"><i class="ln" style="--c:var(--c-r)"></i><span>chord</span><span class="v">${txt}</span></div>`);
    }
    if (S.showG) rows.push(li('sw ring', '--c-g', 'G', M.G ? val(M.pts.g) : 'not set', !M.G));
    const mapTxt = S.map === 'scale' ? `${SHAPE().name}: ${SHAPE().legend}`
      : `${SHAPE().name}: u, v from the ${S.map === 'low' ? 'lowest' : 'highest'} ${S.bits} bits of x and y`;
    rows.push(`<div class="map">${mapTxt}</div>`);
  } else rows.push('<div class="map">Fix the curve parameters to draw.</div>');
  setHTML($('#legendRows'), rows.join(''));
}

function renderInspector() {
  const el = $('#inspector');
  const t = inspectT;
  if (!M || !M.curve || !t) {
    setHTML(el, '<p class="empty">Hover a point on the torus or the flat map. Its details stay here until you hover another one.</p>');
    setText($('#inspAside'), '');
    return;
  }
  setText($('#inspAside'), t.label.length < 16 ? t.label : '');
  const c = M.curve, P = t.P, fb = c.fb;
  const tags = [];
  tags.push(t.onCurve ? '<span class="tag ok">on curve</span>' : '<span class="tag bad">off curve</span>');
  if (t.input) tags.push(`<span class="tag">${kindStr(t.input)}</span>`);
  if (t.derived) tags.push('<span class="tag">computed</span>');
  if (t.cloud) tags.push('<span class="tag">curve point</span>');
  const rows = [];
  const cp = (v) => `<button class="copy" data-copy="${v}">copy</button>`;
  const small = c.p < MAP_SMALL;
  rows.push(['x', `<span class="hexv">${small ? `${P.x} <span class="empty">(0x${P.x.toString(16)})</span>` : '0x' + hex(P.x, fb)}</span>${cp(small ? String(P.x) : hex(P.x, fb))}`]);
  rows.push(['y', `<span class="hexv">${small ? `${P.y} <span class="empty">(0x${P.y.toString(16)})</span>` : '0x' + hex(P.y, fb)}</span>${cp(small ? String(P.y) : hex(P.y, fb))}`]);
  rows.push(['y parity', (P.y & 1n) ? 'odd, prefix 03 / 07' : 'even, prefix 02 / 06']);
  rows.push(['u (from x)', `${turnStr(t.tu)}, ${(t.tu * TAU).toFixed(6)} rad, ${t.tu.toFixed(6)} turn`]);
  rows.push(['v (from y)', `${turnStr(t.tv)}, ${(t.tv * TAU).toFixed(6)} rad, ${t.tv.toFixed(6)} turn`]);
  const [iu, iv] = sectorOf(t);
  rows.push(['sector', `u ${iu} of ${S.su}, v ${iv} of ${S.sv}`]);
  const k = kOf(t); if (k) rows.push(['k', `${k}, so P = k·G`]);
  const o = orderStr(t); if (o) rows.push(['order', o]);
  const sn = siblingNote(t); if (sn) rows.push(['β-orbit', sn]);
  for (const kind of ['compressed', 'uncompressed', 'hybrid']) {
    const enc = encodeSEC(P, c, kind);
    rows.push([kind === 'compressed' ? 'SEC 02/03' : kind === 'uncompressed' ? 'SEC 04' : 'SEC 06/07', `<span class="hexv">${enc}</span>${cp(enc)}`]);
  }
  const nP = c.neg(P);
  rows.push(['−P (mirror)', `<span class="hexv">${small ? `(${nP.x}, ${nP.y})` : encodeSECExact(nP, c, M.prime)}</span>`]);
  if (!t.onCurve) rows.push(['b′', `<span class="hexv">${shortHex(c.bPrime(P), c.p)}</span> <span class="empty">: this point lives on y² = x³ + ax + b′</span>`]);
  setHTML(el, `<div class="insp-head">${swatch(t)}<b>${escapeHtml(targetTitle(t))}</b>${tags.join('')}</div>
    <dl class="kv">${rows.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl>`);
}

/* ------------------------------ overlay ------------------------------ */

const overlay = { labels: [], hover: null, svg: document.getElementById('leaders') };

function rebuildOverlay() {
  const host = $('#overlay');
  for (const l of overlay.labels) l.el.remove();
  overlay.labels = [];
  if (!view.ok || !M || !M.curve) return;
  if (S.show.labels) {
    const p = M.curve.p, small = p < MAP_SMALL && S.map === 'scale';
    const txt = (axis, t) => {
      if (t === 0) return `${axis} = 0`;
      if (S.map !== 'scale') return `${axis === 'x' ? 'u' : 'v'} = ${Math.round(t * 360)}°`;
      return small ? `${axis} = ${Math.round(t * Number(p))}` : `${axis} ≈ ${({ 0.25: 'p/4', 0.5: 'p/2', 0.75: '3p/4' })[t]}`;
    };
    for (const t of [0, 0.25, 0.5, 0.75]) {
      addLabel('axis', txt('x', t), surfPoint(t, 0, 0.2), [t, 0, 0.2]);
      addLabel('axis', txt('y', t), surfPoint(0.125, t, 0.14), [0.125, t, 0.14]);
    }
    // one tag per distinct position (P₁ = G and friends share a tag)
    const groups = new Map();
    for (const t of M.targets) {
      if (t.sibling) continue;
      const k = `${t.P.x}:${t.P.y}`;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(t);
    }
    for (const g of groups.values()) {
      const t = g[0];
      const short = g.map((x) => (x.key === 'r' ? 'R' : x.label)).join(' = ');
      const l = addLabel('tag', short, t.pos);
      l.el.style.setProperty('--c', `var(${t.colorVar})`);
    }
  }
  function addLabel(kind, text, pos, turn = null) {
    const el = document.createElement('div');
    el.className = kind === 'tag' ? 'lab tag-pt' : 'lab axis';
    el.textContent = text;
    host.appendChild(el);
    const rec = { el, pos, kind, turn };
    overlay.labels.push(rec);
    return rec;
  }
  requestRender();
}

/**
 * Lay out pinned cards and the hover card beside their points without overlapping each other
 * (tries the four quadrants around the point, then stacks), and draw a leader line to each point.
 */
function layoutCards() {
  const items = [...pins.values()].map((p) => ({ el: p.el, pos: p.t.pos }));
  if (overlay.hover && hoverT && hoverT.pos) items.push({ el: overlay.hover, pos: hoverT.pos });
  const W = view.viewW, H = view.viewH, leaders = [];
  // the legend, the toolbar and the flat map are fixed furniture: cards steer around them
  const st = $('#stage').getBoundingClientRect();
  const placed = ['#legend', '#miniWrap', '#toolbar'].map((sel) => $(sel)).filter((el) => el && !el.hidden && el.offsetParent)
    .map((el) => { const r = el.getBoundingClientRect(); return { x: r.left - st.left - 6, y: r.top - st.top - 6, w: r.width + 12, h: r.height + 12 }; });
  const clampR = (r) => ({ ...r, x: Math.max(8, Math.min(W - r.w - 8, r.x)), y: Math.max(8, Math.min(H - r.h - 8, r.y)) });
  const overlap = (r) => placed.reduce((s, q) => s + Math.max(0, Math.min(r.x + r.w, q.x + q.w) - Math.max(r.x, q.x)) * Math.max(0, Math.min(r.y + r.h, q.y + q.h) - Math.max(r.y, q.y)), 0);
  for (const it of items) {
    const s = project(it.pos);
    if (!s.inFront) { it.el.style.display = 'none'; continue; }
    it.el.style.display = '';
    const w = it.el.offsetWidth, h = it.el.offsetHeight;
    const cands = [[s.x + 20, s.y - h - 16], [s.x + 20, s.y + 16], [s.x - w - 20, s.y - h - 16], [s.x - w - 20, s.y + 16]]
      .map(([x, y]) => clampR({ x, y, w, h }));
    // a rect that hides its own point is a bad spot
    const coversPoint = (r) => s.x > r.x - 6 && s.x < r.x + r.w + 6 && s.y > r.y - 6 && s.y < r.y + r.h + 6;
    let best = null, bestScore = Infinity;
    for (const r of cands) {
      const score = overlap(r) + (coversPoint(r) ? 1e6 : 0);
      if (score < bestScore) { bestScore = score; best = r; }
      if (score === 0) break;
    }
    for (let i = 0; i < 12 && overlap(best) > 0; i++) {
      const hit = placed.find((q) => Math.min(best.x + best.w, q.x + q.w) > Math.max(best.x, q.x) && Math.min(best.y + best.h, q.y + q.h) > Math.max(best.y, q.y));
      best = clampR({ ...best, y: hit.y + hit.h + 8 });
      if (best.y + h > H - 8) { best = clampR({ ...best, x: best.x + (best.x > W / 2 ? -(w + 8) : w + 8), y: 8 }); }
    }
    placed.push(best);
    it.el.style.transform = `translate(${Math.round(best.x)}px, ${Math.round(best.y)}px)`;
    it.el.classList.toggle('behind', occluded(it.pos));
    const ax = Math.max(best.x, Math.min(best.x + w, s.x)), ay = Math.max(best.y, Math.min(best.y + h, s.y));
    leaders.push(`<line x1="${s.x.toFixed(1)}" y1="${s.y.toFixed(1)}" x2="${ax.toFixed(1)}" y2="${ay.toFixed(1)}" style="stroke:${getComputedStyle(it.el).getPropertyValue('--c')}"/>`);
  }
  setHTML(overlay.svg, leaders.join(''));
}

/** Called after every 3D frame: keeps labels and cards glued to their points. */
function afterRender() {
  for (const l of overlay.labels) {
    const s = project(l.pos);
    if (!s.inFront) { l.el.style.display = 'none'; continue; }
    l.el.style.display = '';
    l.el.style.transform = l.kind === 'tag'
      ? `translate(${Math.round(s.x + 9)}px, ${Math.round(s.y - 8)}px) translate(0, -100%)`
      : `translate(${Math.round(s.x)}px, ${Math.round(s.y)}px) translate(-50%, -50%)`;
    l.el.classList.toggle('hidden-behind', occluded(l.pos));
  }
  layoutCards();
}

function showHoverCard() {
  const host = $('#overlay');
  if (!hoverT || pins.has(hoverT.key) || !view.ok) { if (overlay.hover) { overlay.hover.remove(); overlay.hover = null; requestRender(); } return; }
  if (!overlay.hover) { overlay.hover = document.createElement('div'); overlay.hover.className = 'card hover'; host.appendChild(overlay.hover); }
  overlay.hover.style.setProperty('--c', hoverT.cloud ? 'var(--text)' : `var(${hoverT.colorVar})`);
  setHTML(overlay.hover, cardHTML(hoverT, false));
  layoutCards();
}

function updateSelection() {
  if (!view.ok) return;
  disposeGroup(view.selG);
  const sel = [...pins.values()].map((p) => p.t);
  if (hoverT && !pins.has(hoverT.key)) sel.push(hoverT);
  for (const t of sel) {
    if (!t.pos) continue;
    const sp = makeSprite('sel', view.pal.sel, Math.max(26, (t.px || 12) + 13), { order: 40, depthTest: false });
    sp.position.copy(t.pos);
    view.selG.add(sp);
  }
  requestRender();
}

function setHover(t) {
  if (t && hoverT && t.key === hoverT.key) return;
  hoverT = t;
  if (t) inspectT = t;
  showHoverCard();
  updateSelection();
  renderInspector();
  drawMini();
}

function pin(t) {
  if (!t || pins.has(t.key)) return;
  // cards are anchored to the 3D view; without it the inspector alone carries the details
  if (!view.ok) { inspectT = t; renderInspector(); drawMini(); return; }
  const el = document.createElement('div');
  el.className = 'card pinned';
  el.style.setProperty('--c', t.cloud ? 'var(--text)' : `var(${t.colorVar})`);
  el.innerHTML = cardHTML(t, true);
  $('#overlay').appendChild(el);
  pins.set(t.key, { t, el });
  inspectT = t;
  showHoverCard(); updateSelection(); renderInspector(); requestRender(); drawMini();
}
function unpin(key) {
  const p = pins.get(key);
  if (!p) return;
  p.el.remove(); pins.delete(key);
  showHoverCard(); updateSelection(); drawMini();
}
function clearPins() { for (const k of [...pins.keys()]) unpin(k); }

/** After the model changes, point hover / pins / inspector at the new target objects. */
function resolveTargets() {
  const find = (key) => {
    if (!key || !M || !M.curve) return null;
    const t = M.targets.find((x) => x.key === key);
    if (t) return t;
    if (key.startsWith('c:') && M.cloudOK && S.show.cloud) {
      const [, x, y] = key.split(':').map(Number), { xs, ys } = M.small;
      for (let i = 0; i < xs.length; i++) if (xs[i] === x && ys[i] === y) return cloudTarget(M, i);
    }
    return null;
  };
  hoverT = hoverT ? find(hoverT.key) : null;
  inspectT = inspectT ? find(inspectT.key) : null;
  for (const [key, p] of [...pins]) {
    const t = find(key);
    if (!t) { p.el.remove(); pins.delete(key); continue; }
    p.t = t;
    p.el.style.setProperty('--c', t.cloud ? 'var(--text)' : `var(${t.colorVar})`);
    setHTML(p.el, cardHTML(t, true));
  }
  showHoverCard(); updateSelection();
}

/* ------------------------------ flat map ------------------------------ */

const mini = { base: null, baseKey: '', geom: null };
function miniGeom() {
  const c = $('#mini'), dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = c.clientWidth || 220;
  if (c.width !== Math.round(W * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(W * dpr); }
  const padL = 24, padB = 16, padT = 6, padR = 6;
  return { c, dpr, W, x0: padL, y0: padT, w: W - padL - padR, h: W - padT - padB };
}
const miniXY = (g, tu, tv) => [g.x0 + tu * g.w, g.y0 + (1 - tv) * g.h];

function drawMini() {
  const wrap = $('#miniWrap');
  wrap.hidden = !S.show.map;
  wrap.classList.toggle('big', S.miniBig);
  if (!S.show.map) return;
  const g = miniGeom(), ctx = g.c.getContext('2d'), css = (n) => cssColor(n);
  ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
  ctx.clearRect(0, 0, g.W, g.W);
  ctx.fillStyle = css('--field'); ctx.fillRect(g.x0, g.y0, g.w, g.h);
  ctx.strokeStyle = css('--line-2'); ctx.lineWidth = 1; ctx.strokeRect(g.x0 + 0.5, g.y0 + 0.5, g.w - 1, g.h - 1);
  if (!M || !M.curve) return;
  // sector grid
  ctx.lineWidth = 1;
  const line = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
  for (let i = 1; i < S.su; i++) { const q = (i / S.su) % 0.25 === 0; ctx.strokeStyle = css(q ? '--line-2' : '--line'); const x = Math.round(g.x0 + g.w * i / S.su) + 0.5; line(x, g.y0, x, g.y0 + g.h); }
  for (let j = 1; j < S.sv; j++) { const q = (j / S.sv) % 0.25 === 0; ctx.strokeStyle = css(q ? '--line-2' : '--line'); const y = Math.round(g.y0 + g.h * j / S.sv) + 0.5; line(g.x0, y, g.x0 + g.w, y); }
  // mirror axis y = p/2 (negation flips y about it)
  ctx.save(); ctx.setLineDash([4, 3]); ctx.strokeStyle = css('--accent'); ctx.globalAlpha = 0.55;
  const ym = Math.round(g.y0 + g.h / 2) + 0.5; line(g.x0, ym, g.x0 + g.w, ym); ctx.restore();
  // curve points (cached layer)
  if (S.show.cloud && M.cloudOK) {
    const key = [M.curve.a, M.curve.b, M.curve.p, S.map, S.bits, g.w, g.dpr, view.theme].join('|');
    if (mini.baseKey !== key) {
      const off = document.createElement('canvas');
      off.width = Math.round(g.w * g.dpr); off.height = Math.round(g.h * g.dpr);
      const o = off.getContext('2d'), { tus, tvs } = cloudTurns(M), n = tus.length;
      o.fillStyle = css('--muted');
      const sz = (n < 400 ? 3 : n < 5000 ? 2 : 1) * g.dpr;
      for (let i = 0; i < n; i++) o.fillRect(tus[i] * off.width - sz / 2, (1 - tvs[i]) * off.height - sz / 2, sz, sz);
      mini.base = off; mini.baseKey = key;
    }
    ctx.drawImage(mini.base, g.x0, g.y0, g.w, g.h);
  }
  // chord as a wrapped line
  const ch = M.op && M.op.chord;
  if (S.show.chord && ch && M.op.status === 'ok') {
    ctx.save(); ctx.strokeStyle = css('--c-r'); ctx.globalAlpha = 0.7; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.rect(g.x0, g.y0, g.w, g.h); ctx.clip();
    if (ch.type === 'vertical' && M.pts.p1) { const [x] = miniXY(g, M.pts.p1.tu, 0); line(x, g.y0, x, g.y0 + g.h); }
    else if (S.map === 'scale' && M.curve.p <= 1000000n) {
      const p = M.curve.p, lam = Number(centered(ch.lambda, p)), c0 = Number(ch.c) / Number(p);
      if (Math.abs(lam) <= CHORD_MAX_WIND) {
        if (lam === 0) { const [, y] = miniXY(g, 0, c0); line(g.x0, y, g.x0 + g.w, y); }
        else {
          const v0 = c0, v1 = lam + c0, lo = Math.floor(Math.min(v0, v1)), hi = Math.ceil(Math.max(v0, v1));
          for (let k = lo; k < hi; k++) {
            let ta = (k - c0) / lam, tb = (k + 1 - c0) / lam;
            if (ta > tb) [ta, tb] = [tb, ta];
            ta = Math.max(0, ta); tb = Math.min(1, tb);
            if (tb <= ta) continue;
            const [xa, ya] = miniXY(g, ta, lam * ta + c0 - k), [xb, yb] = miniXY(g, tb, lam * tb + c0 - k);
            line(xa, ya, xb, yb);
          }
        }
      } else if (p <= 4000n) {
        // too many wraps to draw as a line: show its p lattice points (x, λx + c mod p)
        ctx.fillStyle = css('--c-r');
        const P = Number(p), L = Number(ch.lambda), C = Number(ch.c), d = g.dpr > 1 ? 1.5 : 2;
        for (let x = 0; x < P; x++) {
          const y = (L * x + C) % P;
          const [px, py] = miniXY(g, x / P, y / P);
          ctx.fillRect(px - d / 2, py - d / 2, d, d);
        }
      }
    }
    ctx.restore();
  }
  // mirror step R → result
  if (S.show.chord && M.pts.r && M.pts.sum) {
    const [x1, y1] = miniXY(g, M.pts.r.tu, M.pts.r.tv), [x2, y2] = miniXY(g, M.pts.sum.tu, M.pts.sum.tv);
    ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = css('--c-sum'); ctx.globalAlpha = 0.8; line(x1, y1, x2, y2); ctx.restore();
  }
  // markers
  const order = ['r', 'g', 'p2', 'p1', 'sum'];
  const ts = [...M.targets].sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  for (const t of ts) {
    const [x, y] = miniXY(g, t.tu, t.tv), col = css(t.colorVar);
    ctx.save();
    if (t.key === 'g' || t.sibling) { ctx.strokeStyle = col; ctx.lineWidth = t.sibling ? 1.5 : 2; ctx.beginPath(); ctx.arc(x, y, t.sibling ? 3.5 : 6, 0, TAU); ctx.stroke(); }
    else if (t.key === 'r' || !t.onCurve) { ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.setLineDash([2.5, 2]); ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.stroke(); }
    else { ctx.fillStyle = css('--field'); ctx.beginPath(); ctx.arc(x, y, 5.2, 0, TAU); ctx.fill(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, 3.8, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  // highlight hover + pins
  const hl = [...pins.values()].map((p) => p.t);
  if (hoverT) hl.push(hoverT);
  for (const t of hl) {
    const [x, y] = miniXY(g, t.tu, t.tv);
    ctx.save(); ctx.strokeStyle = css('--text'); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 8.5, 0, TAU); ctx.stroke(); ctx.restore();
  }
  // axes
  ctx.fillStyle = css('--muted'); ctx.font = `10.5px ${getComputedStyle(document.body).fontFamily}`;
  ctx.textBaseline = 'top'; ctx.textAlign = 'left'; ctx.fillText('0', g.x0, g.y0 + g.h + 3);
  ctx.textAlign = 'right'; ctx.fillText(S.map === 'scale' ? 'p' : '2ᵏ', g.x0 + g.w, g.y0 + g.h + 3);
  ctx.textAlign = 'center'; ctx.fillText('x', g.x0 + g.w / 2, g.y0 + g.h + 3);
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.fillText('y', g.x0 - 6, g.y0 + g.h * 0.25); ctx.fillText(S.map === 'scale' ? 'p' : '2ᵏ', g.x0 - 5, g.y0 + 5);
  ctx.fillStyle = css('--accent'); ctx.fillText('½', g.x0 - 5, g.y0 + g.h / 2);
}

function miniPick(e) {
  if (!M || !M.curve) return null;
  const g = miniGeom(), r = g.c.getBoundingClientRect();
  const mx = (e.clientX - r.left) * (g.W / r.width), my = (e.clientY - r.top) * (g.W / r.height);
  let best = null, bd = 64;
  for (const t of M.targets) {
    const [x, y] = miniXY(g, t.tu, t.tv), d = (x - mx) ** 2 + (y - my) ** 2;
    if (d < bd) { bd = d; best = t; }
  }
  if (best || !S.show.cloud || !M.cloudOK) return best;
  const { tus, tvs } = cloudTurns(M); let bi = -1; bd = 30;
  for (let i = 0; i < tus.length; i++) {
    const [x, y] = miniXY(g, tus[i], tvs[i]), d = (x - mx) ** 2 + (y - my) ** 2;
    if (d < bd) { bd = d; bi = i; }
  }
  return bi >= 0 ? cloudTarget(M, bi) : null;
}

/* ------------------------------ update cycle ------------------------------ */

function update() {
  if (view.morph) endMorph(); // any other change lands at once on the shape picked last
  M = computeModel(S);
  renderPanel();
  if (view.ok) {
    if (view.keys.torus !== torusKey()) buildTorus();
    if (view.keys.cloud !== cloudKey(M)) buildCloud(M);
    buildMarks(M);
    view.controls.autoRotate = S.show.spin;
  }
  syncToolbar();
  rebuildOverlay();
  resolveTargets();
  renderInspector();
  drawMini();
  saveSoon();
}
const updateSoon = debounce(update, 280);

/* ------------------------------ fields ------------------------------ */

/**
 * Pictogram of a shape, drawn from its own pos / nrm: a few lines of constant s and t, projected from the oblique
 * view (orthographic), the side facing away faint, like the hidden lines of the 3D view. The icosahedron draws its
 * 30 edges instead (an edge faces the viewer when one of its two faces does).
 */
function shapeIcon(sh, W = 56, H = 38) {
  const pol = 57 * DEG, az = -62 * DEG, d = [Math.sin(pol) * Math.cos(az), Math.sin(pol) * Math.sin(az), Math.cos(pol)];
  const rl = Math.hypot(d[0], d[1]), rt = [-d[1] / rl, d[0] / rl, 0];
  const up = [d[1] * rt[2] - d[2] * rt[1], d[2] * rt[0] - d[0] * rt[2], d[0] * rt[1] - d[1] * rt[0]]; // d × right
  const R = 1.2, r = 0.46, p = {}, n = {}, polys = [];
  const proj = (q) => [q.x * rt[0] + q.y * rt[1] + q.z * rt[2], -(q.x * up[0] + q.y * up[1] + q.z * up[2])];
  const facing = (q) => q.x * d[0] + q.y * d[1] + q.z * d[2] > 0;
  if (sh.id === 'icosahedron') {
    const k = 1.3 * R, V = ICOSA.vertices.map((v) => ({ x: v[0] * k, y: v[1] * k, z: v[2] * k }));
    const faceUp = ICOSA.planes.map((f) => facing({ x: f.n[0], y: f.n[1], z: f.n[2] })), seen = new Set();
    ICOSA.faces.forEach((f) => { for (const [i, j] of [[f[0], f[1]], [f[1], f[2]], [f[2], f[0]]]) {
      const key = Math.min(i, j) + ':' + Math.max(i, j);
      if (seen.has(key)) continue;
      seen.add(key);
      const front = ICOSA.faces.some((g, gi) => g.includes(i) && g.includes(j) && faceUp[gi]);
      polys.push([[proj(V[i]), proj(V[j])], [front]]);
    } });
  } else {
    const [nm, np] = sh.icon || [8, 6];
    const trace = (fn, steps) => {
      const pts = [], fr = [];
      for (let i = 0; i <= steps; i++) {
        const [s, t] = fn(i / steps);
        pts.push(proj(sh.pos(s, t, R, r, p)));
        if (i) { const [sm, tm] = fn((i - 0.5) / steps); fr.push(facing(sh.nrm(sm, tm, R, r, n))); }
      }
      polys.push([pts, fr]);
    };
    for (let i = 0; i < nm; i++) { const s = sh.cutU ? i / (nm - 1) : i / nm; trace((k) => [s, k], 40); }
    for (let j = 0; j < np; j++) { const t = sh.cutV ? j / (np - 1) : j / np; trace((k) => [k, t], sh.lineS ? 160 : 72); }
  }
  // drop degenerate lines (a pole is a point), then fit everything into the box
  const live = polys.filter(([pts]) => pts.some((q) => Math.abs(q[0] - pts[0][0]) + Math.abs(q[1] - pts[0][1]) > 1e-6));
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [pts] of live) for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const k = Math.min((W - 3) / (x1 - x0), (H - 3) / (y1 - y0)), ox = (W - k * (x1 - x0)) / 2 - k * x0, oy = (H - k * (y1 - y0)) / 2 - k * y0;
  const f = (q) => `${(ox + k * q[0]).toFixed(1)} ${(oy + k * q[1]).toFixed(1)}`;
  let front = '', back = '';
  for (const [pts, fr] of live) {
    let cur = null, path = '';
    for (let i = 1; i < pts.length; i++) {
      if (fr[i - 1] !== cur) { if (path) { if (cur) front += path; else back += path; } cur = fr[i - 1]; path = `M${f(pts[i - 1])}`; }
      path += `L${f(pts[i])}`;
    }
    if (path) { if (cur) front += path; else back += path; }
  }
  return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true"><path class="bk" d="${back}"/><path d="${front}"/></svg>`;
}

function buildShapeTiles() {
  F.shape.innerHTML = SHAPES.map((sh) => `<label class="tile" title="${escapeHtml(sh.name)}"><input type="radio" name="shape" value="${sh.id}" aria-label="${escapeHtml(sh.name)}">${shapeIcon(sh)}<span>${escapeHtml(sh.short || sh.name)}</span></label>`).join('');
}

/** The picked tile, the R and r sliders (they mean different things per shape; r is greyed out where unused). */
function writeShape() {
  for (const i of $$('#shape input')) i.checked = i.value === S.shape;
  const sh = SHAPE(), [a, b] = sh.sliders;
  setText($('#Rlbl'), a); setText($('#rlbl'), b || 'unused');
  $('#rFld').style.opacity = b ? 1 : 0.45; F.r.disabled = !b;
  setText($('#shapeAside'), sh.name); setText($('#shapeNote'), sh.legend);
}

/** Switch shape: the surface morphs into the new one, the camera keeps its direction and steps back or in with the size. */
function setShape(id) {
  if (id === S.shape || !SHAPES.some((q) => q.id === id)) return;
  const from = S.shape, before = view.boundR;
  S.shape = id; writeShape();
  if (view.ok && !view.lost && !reducedMotion && M) { startMorph(from); renderPanel(); saveSoon(); }
  else update();
  if (view.ok && before > 0 && view.boundR > 0) {
    const c = view.camera.position.clone().sub(view.controls.target).multiplyScalar(view.boundR / before);
    flyTo(c, new THREE.Vector3(), view.morph ? MORPH.ms : 500);
  }
}

/** Toolbar toggles and the active camera view (until the camera is moved by hand). */
function syncToolbar() {
  const set = (el, on) => { const v = String(!!on); if (el.getAttribute('aria-pressed') !== v) el.setAttribute('aria-pressed', v); };
  set($('#spinBtn'), S.show.spin);
  set($('#fsBtn'), document.fullscreenElement);
  const active = view.ok && !view.userMoved ? view.lastView : null;
  for (const b of $$('[data-view]')) set(b, b.dataset.view === active);
}

function applyLegend() {
  $('#legend').classList.toggle('min', S.legendMin);
  const tog = $('#legendTog');
  tog.setAttribute('aria-pressed', String(S.legendMin));
  tog.title = S.legendMin ? 'Full legend' : 'Compact legend';
  requestRender(); // cards steer around the legend
}

/** Open or close the panel sections as remembered. */
function applySections() { for (const d of $$('details.sec[data-sec]')) if (d.dataset.sec in S.secs) d.open = S.secs[d.dataset.sec]; }

/** Sliders paint their filled part from --fill. */
function rangeFill(el) { const lo = +el.min, hi = +el.max; el.style.setProperty('--fill', `${((+el.value - lo) / (hi - lo)) * 100}%`); }

/** Step: P₁ ← the result, so the operation runs again from there. A known scalar stays readable (kG). */
function stepResult() {
  if (!M || !M.curve || M.op.status !== 'ok') { toast('Step needs a result: set the points first'); return; }
  const t = M.pts.sum, k = t && t.k !== undefined && t.k !== null ? t.k : null, label = M.op.label;
  S.p1 = M.op.P === null ? 'O' : k !== null && k >= 0n && k < 10n ** 12n ? `${k}G` : pointText(M.op.P);
  markCustomIfEdited(); writeFields(); update();
  toast(`P₁ ← ${label}`);
}

function buildPresetOptions() {
  const sel = F.preset;
  sel.innerHTML = '';
  const groups = new Map();
  for (const p of PRESETS) {
    if (!groups.has(p.group)) { const og = document.createElement('optgroup'); og.label = p.group; groups.set(p.group, og); sel.appendChild(og); }
    const o = document.createElement('option'); o.value = p.id; o.textContent = p.name; groups.get(p.group).appendChild(o);
  }
  const o = document.createElement('option'); o.value = 'custom'; o.textContent = 'Custom (your own values)'; sel.appendChild(o);
}

function writeFields() {
  const grown = ['p1', 'p2', 'g'].filter((k) => F[k].value !== S[k]); // autosize forces a layout: only where the text changed
  for (const k of TEXT_FIELDS) if (F[k].value !== S[k]) F[k].value = S[k];
  F.preset.value = PRESETS.some((p) => p.id === S.preset) ? S.preset : 'custom';
  F.map.value = S.map; F.bits.value = S.bits; F.su.value = S.su; F.sv.value = S.sv; writeShape();
  for (const k of ['R', 'r', 'glass', 'back']) { F[k].value = S[k]; $(`#${k}out`).textContent = Number(S[k]).toFixed(2); rangeFill(F[k]); }
  F.showG.checked = S.showG; F.force.checked = S.force;
  $$('[data-show]').forEach((i) => { i.checked = !!S.show[i.dataset.show]; });
  $$('[data-ring]').forEach((i) => { i.checked = !!S.rings[i.dataset.ring]; });
  for (const k of grown) autosize(F[k]);
  syncToolbar();
}

function markCustomIfEdited() {
  const pr = PRESETS.find((p) => p.id === S.preset);
  if (pr && TEXT_FIELDS.some((k) => pr[k] !== S[k])) { S.preset = 'custom'; F.preset.value = 'custom'; }
}

function applyPreset(id) {
  const pr = PRESETS.find((p) => p.id === id);
  S.preset = id;
  if (!pr) return;
  S.basePreset = id;
  for (const k of TEXT_FIELDS) S[k] = pr[k];
  S.op = pr.op || 'add';
  Object.assign(S.show, pr.show || {});
  S.showG = true;
  clearPins(); hoverT = null; inspectT = null;
  writeFields();
  update();
}

/**
 * A point as field text that reads back as exactly this point (Step, Use as P₁ / P₂, −P₁, random): (x, y) below
 * MAP_SMALL, else SEC, compressed only where that is exact, so a forced walk keeps its off-curve points.
 */
function pointText(P) {
  if (!P) return 'O';
  return M.curve.p < MAP_SMALL ? `(${P.x}, ${P.y})` : encodeSECExact(P, M.curve, M.prime);
}

function applyTheme(theme) {
  S.theme = theme;
  document.documentElement.dataset.theme = theme;
  applyThemeToView(theme);
  mini.baseKey = '';
  if (view.ok) { view.keys.torus = ''; view.keys.cloud = ''; }
}

function applyPanel() {
  $('#app').classList.toggle('panel-hidden', !S.panel);
  $('#showPanelBtn').hidden = S.panel;
}

function exportJSON() {
  const enc = (v) => (typeof v === 'bigint' ? '0x' + v.toString(16) : v);
  const pt = (t) => t && {
    label: t.label, x: enc(t.P.x), y: enc(t.P.y), yParity: (t.P.y & 1n) ? 'odd' : 'even', onCurve: t.onCurve,
    sec: { compressed: encodeSEC(t.P, M.curve), uncompressed: encodeSEC(t.P, M.curve, 'uncompressed'), hybrid: encodeSEC(t.P, M.curve, 'hybrid') },
    torus: { uTurns: t.tu, vTurns: t.tv, uDeg: t.tu * 360, vDeg: t.tv * 360, uRad: t.tu * TAU, vRad: t.tv * TAU, sector: sectorOf(t) },
    k: t.k !== undefined ? enc(t.k) : t.kTyped !== undefined ? enc(t.kTyped) : undefined, order: t.order !== undefined ? enc(t.order) : undefined,
  };
  // the comparison block of the v0.2 stats export, plus doubles
  const pa = M.pts.p1, pb = M.pts.p2, c = M.curve;
  const sec = (P) => (P === null ? 'O' : encodeSEC(P, c));
  const vsG = (r) => (!r || !M.G ? undefined : c.eq(r.P, M.G) ? 'G' : c.eq(r.P, c.neg(M.G)) ? '-G' : 'other');
  let relations = null;
  try {
    relations = c && {
      P1vsP2: pa && pb ? { sameX: pa.P.x === pb.P.x, sameY: pa.P.y === pb.P.y, equal: c.eq(pa.P, pb.P), negation: c.eq(pb.P, c.neg(pa.P)),
        deltaUDeg: angDiff(pa.tu, pb.tu), deltaVDeg: angDiff(pa.tv, pb.tv), deltaURad: angDiff(pa.tu, pb.tu) * DEG, deltaVRad: angDiff(pa.tv, pb.tv) * DEG } : null,
      P1vsG: vsG(pa), P2vsG: vsG(pb),
      doubles: { P1: pa && pa.onCurve ? sec(c.dbl(pa.P)) : undefined, P2: pb && pb.onCurve ? sec(c.dbl(pb.P)) : undefined },
    };
  } catch (e) { relations = { error: e.message }; }
  const report = {
    tool: 'Elliptic curve → torus v3 (idlebg.com)', source: 'https://github.com/idlebg/EllipticTorus3d', exported: new Date().toISOString(),
    input: { a: S.a, b: S.b, p: S.p, P1: S.p1, P2: S.p2, G: S.g, op: S.op, shape: S.shape, mapping: S.map, bits: S.bits, sectors: [S.su, S.sv] },
    curve: M.curve && {
      a: enc(M.curve.a), b: enc(M.curve.b), p: enc(M.curve.p), bits: bitLen(M.curve.p), prime: M.prime, singular: M.singular,
      j: M.j !== null && M.j !== undefined ? enc(M.j) : null, name: M.known?.name ?? null, n: M.known ? enc(M.known.n) : null,
      pointCount: M.small ? enc(M.small.count) : null, beta: M.beta ? enc(M.beta) : null,
    },
    error: M.curveErr || undefined,
    inputs: Object.fromEntries(['p1', 'p2', 'g'].map((k) => [k, M.inputs[k] && (M.inputs[k].ok ? { kind: M.inputs[k].kind, onCurve: M.inputs[k].onCurve, warnings: M.inputs[k].warnings } : { error: M.inputs[k].error })])),
    points: Object.fromEntries(Object.entries(M.pts).map(([k, t]) => [k, pt(t)])),
    operation: M.op && { label: M.op.label, status: M.op.status, result: M.op.P === null ? 'O' : M.op.P ? pt(M.pts.sum) : null,
      chord: M.op.chord && M.op.chord.type !== 'none' ? { type: M.op.chord.type, lambda: M.op.chord.lambda !== undefined ? enc(M.op.chord.lambda) : undefined, c: M.op.chord.c !== undefined ? enc(M.op.chord.c) : undefined } : null },
    relations,
  };
  download(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }), `ec-torus-${S.preset}-${stamp()}.json`);
  toast('JSON exported');
}

/* ------------------------------ events ------------------------------ */

function wire() {
  for (const k of TEXT_FIELDS) {
    F[k].addEventListener('input', () => {
      S[k] = F[k].value;
      if (F[k].tagName === 'TEXTAREA') autosize(F[k]);
      markCustomIfEdited();
      updateSoon();
    });
    F[k].addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); update(); } });
  }
  F.preset.addEventListener('change', () => { if (F.preset.value === 'custom') { S.preset = 'custom'; saveSoon(); } else applyPreset(F.preset.value); });
  $('#opSeg').addEventListener('click', (e) => { const b = e.target.closest('[data-op]'); if (b) { S.op = b.dataset.op; update(); } });
  F.showG.addEventListener('change', () => { S.showG = F.showG.checked; update(); });
  F.force.addEventListener('change', () => { S.force = F.force.checked; update(); });
  $('#resetG').addEventListener('click', () => {
    const base = PRESETS.find((p) => p.id === S.preset) || PRESETS.find((p) => p.id === S.basePreset);
    const sameCurve = (pr) => { try { return evalExpr(pr.p) === M.curve.p && mod(evalExpr(pr.a), M.curve.p) === M.curve.a && mod(evalExpr(pr.b), M.curve.p) === M.curve.b; } catch { return false; } };
    if (M && M.curve && base && sameCurve(base)) S.g = base.g;
    else if (M && M.known) S.g = encodeSEC(M.known.G, M.curve);
    else if (M && M.curve) { const pr = PRESETS.find(sameCurve); if (!pr) { toast('No known G for this curve'); return; } S.g = pr.g; }
    else return;
    markCustomIfEdited(); writeFields(); update(); toast('G restored');
  });
  $$('[data-rand]').forEach((b) => b.addEventListener('click', () => {
    if (!M || !M.curve || !M.prime) { toast('Needs a valid prime curve'); return; }
    const P = randomPoint(M.curve);
    if (!P) { toast('No point found'); return; }
    S[b.dataset.rand] = pointText(P); markCustomIfEdited(); writeFields(); update();
  }));
  $('#plotBtn').addEventListener('click', () => { for (const k of TEXT_FIELDS) S[k] = F[k].value; markCustomIfEdited(); update(); toast('Plotted'); });
  $('#swapBtn').addEventListener('click', () => { [S.p1, S.p2] = [S.p2, S.p1]; markCustomIfEdited(); writeFields(); update(); });
  $('#clearBtn').addEventListener('click', () => { S.p1 = ''; S.p2 = ''; markCustomIfEdited(); clearPins(); hoverT = null; inspectT = null; writeFields(); update(); });

  $$('[data-show]').forEach((i) => i.addEventListener('change', () => { S.show[i.dataset.show] = i.checked; update(); }));
  $$('[data-ring]').forEach((i) => i.addEventListener('change', () => { S.rings[i.dataset.ring] = i.checked; update(); }));
  F.map.addEventListener('change', () => { S.map = F.map.value; update(); });
  F.shape.addEventListener('change', (e) => { if (e.target.name === 'shape') setShape(e.target.value); });
  for (const k of ['bits', 'su', 'sv']) F[k].addEventListener('change', () => {
    const lo = +F[k].min, hi = +F[k].max, v = Math.round(Number(F[k].value));
    S[k] = Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : DEFAULT_STATE[k];
    F[k].value = S[k]; update();
  });
  let rafPending = false;
  for (const k of ['R', 'r', 'glass', 'back']) F[k].addEventListener('input', () => {
    S[k] = Number(F[k].value); $(`#${k}out`).textContent = S[k].toFixed(2); rangeFill(F[k]);
    if (!rafPending) { rafPending = true; requestAnimationFrame(() => { rafPending = false; update(); }); }
  });
  $$('[data-view]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
  $('#resetCam').addEventListener('click', () => setView('iso'));
  $('#spinBtn').addEventListener('click', () => { S.show.spin = !S.show.spin; update(); });
  $('#fsBtn').addEventListener('click', () => {
    if (document.fullscreenElement) { document.exitFullscreen().catch(() => {}); return; }
    const el = document.documentElement;
    if (!el.requestFullscreen) { toast('Full screen is not available here'); return; }
    el.requestFullscreen().catch(() => toast('Full screen is not available here'));
  });
  document.addEventListener('fullscreenchange', syncToolbar);
  $('#legendTog').addEventListener('click', () => { S.legendMin = !S.legendMin; applyLegend(); saveSoon(); });
  $('#stepBtn').addEventListener('click', stepResult);
  $('#negBtn').addEventListener('click', () => {
    const t = M && M.curve && M.pts.p1;
    if (!t) { toast('Set P₁ first'); return; }
    S.p2 = pointText(M.curve.neg(t.P)); markCustomIfEdited(); writeFields(); update(); toast('P₂ = −P₁');
  });
  $('#pngBtn').addEventListener('click', () => { if (!view.ok) { toast('3D view unavailable'); return; } snapshotPNG(`ec-torus-${S.preset}-${stamp()}.png`); toast('PNG saved'); });
  $('#jsonBtn').addEventListener('click', exportJSON);
  $('#linkBtn').addEventListener('click', () => copyText(stateLink(S)));
  $('#themeBtn').addEventListener('click', () => { applyTheme(S.theme === 'dark' ? 'paper' : 'dark'); update(); });
  $('#helpBtn').addEventListener('click', () => $('#help').showModal());
  $('#helpClose').addEventListener('click', () => $('#help').close());
  $('#help').addEventListener('click', (e) => { if (e.target === $('#help')) $('#help').close(); });
  $('#collapseBtn').addEventListener('click', () => { S.panel = false; applyPanel(); saveSoon(); });
  $('#showPanelBtn').addEventListener('click', () => { S.panel = true; applyPanel(); saveSoon(); });
  $('#miniSize').addEventListener('click', () => { S.miniBig = !S.miniBig; mini.baseKey = ''; drawMini(); saveSoon(); });
  $('#testBtn').addEventListener('click', () => renderSelfTest(runSelfTest()));
  $('#resetAllBtn').addEventListener('click', () => {
    try { localStorage.removeItem(STORE_KEY); } catch { /* ignore */ }
    try { history.replaceState(null, '', location.href.replace(/#.*$/, '')); } catch { /* ignore */ }
    S = clone(DEFAULT_STATE); clearPins(); hoverT = null; inspectT = null;
    applyTheme(S.theme); applyPanel(); applySections(); applyLegend(); writeFields(); update(); setView('iso'); toast('Back to defaults');
  });
  $$('details.sec').forEach((d) => d.addEventListener('toggle', () => {
    const k = d.dataset.sec;
    if (k in S.secs && S.secs[k] !== d.open) { S.secs[k] = d.open; saveSoon(); }
    for (const f of ['p1', 'p2', 'g']) autosize(F[f]);
  }));

  // copy buttons + card actions (delegated)
  document.addEventListener('click', (e) => {
    const c = e.target.closest('[data-copy]');
    if (c) { copyText(c.dataset.copy); return; }
    const a = e.target.closest('[data-act]');
    if (!a) return;
    const key = a.dataset.key, pinRec = pins.get(key), t = pinRec ? pinRec.t : null;
    if (a.dataset.act === 'unpin') unpin(key);
    else if (!t) return;
    else if (a.dataset.act === 'focus') focusOn(t.pos);
    else if (a.dataset.act === 'copy') copyText(encodeSECExact(t.P, M.curve, M.prime));
    else if (a.dataset.act === 'p1' || a.dataset.act === 'p2') { S[a.dataset.act] = pointText(t.P); markCustomIfEdited(); writeFields(); update(); toast(`Set as ${a.dataset.act === 'p1' ? 'P₁' : 'P₂'}`); }
  });

  // 3D canvas: sticky hover, click to pin, double-click to fly
  const canvas = $('#gl');
  let down = null, hoverQueued = null;
  const local = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, b: e.button }; });
  canvas.addEventListener('pointermove', (e) => {
    if (e.buttons) return; // dragging: leave the camera alone
    if (hoverQueued) { hoverQueued = e; return; }
    hoverQueued = e;
    requestAnimationFrame(() => {
      const ev = hoverQueued; hoverQueued = null;
      const [x, y] = local(ev), t = pickAt(x, y, M);
      canvas.classList.toggle('over-target', !!t);
      if (t) setHover(t); // sticky: nothing under the cursor keeps the last card
    });
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!down || e.button !== 0) { down = null; return; }
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved > 5) return;
    const [x, y] = local(e), t = pickAt(x, y, M);
    if (t) { if (pins.has(t.key)) unpin(t.key); else pin(t); }
    else setHover(null);
  });
  canvas.addEventListener('dblclick', (e) => { const [x, y] = local(e), t = pickAt(x, y, M); if (t) focusOn(t.pos); });

  const mc = $('#mini');
  mc.addEventListener('pointermove', (e) => { const t = miniPick(e); if (t) setHover(t); });
  mc.addEventListener('click', (e) => { const t = miniPick(e); if (t) { if (pins.has(t.key)) unpin(t.key); else pin(t); } });
  mc.addEventListener('dblclick', (e) => { const t = miniPick(e); if (t) focusOn(t.pos); });
  new ResizeObserver(() => { mini.baseKey = ''; drawMini(); }).observe($('#miniWrap'));

  window.addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('input, textarea, select, dialog')) {
      if (e.key === 'Escape' && !e.target.closest('dialog')) e.target.blur();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    // Space presses a focused button and opens a focused section header; auto-rotate must not take it
    if (e.key === ' ' && e.target.closest && e.target.closest('button, a, summary, [role="button"], [role="radio"]')) return;
    const toggle = (k) => { S.show[k] = !S.show[k]; writeFields(); update(); };
    switch (e.key) {
      case '?': case 'h': case 'H': $('#help').showModal(); break;
      case '1': setView('iso'); break;
      case '2': setView('top'); break;
      case '3': setView('side'); break;
      case 'r': case 'R': setView('iso'); break;
      case 'f': case 'F': if (inspectT && inspectT.pos) focusOn(inspectT.pos); break;
      case ' ': e.preventDefault(); toggle('spin'); break;
      case 'n': case 'N': stepResult(); break;
      case 'g': case 'G': toggle('grid'); break;
      case 'l': case 'L': toggle('labels'); break;
      case 'c': case 'C': toggle('cloud'); break;
      case 'k': case 'K': toggle('chord'); break;
      case 'b': case 'B': if (M && M.beta) toggle('beta'); break;
      case 'm': case 'M': toggle('map'); break;
      case 't': case 'T': applyTheme(S.theme === 'dark' ? 'paper' : 'dark'); update(); break;
      case 's': case 'S': { const i = SHAPES.findIndex((q) => q.id === S.shape), n = SHAPES.length; setShape(SHAPES[(i + (e.shiftKey ? n - 1 : 1)) % n].id); break; }
      case '\\': S.panel = !S.panel; applyPanel(); saveSoon(); break;
      case 'Escape':
        if (hoverT) setHover(null); else if (pins.size) clearPins();
        break;
      default: return;
    }
  });
}

/* ------------------------------ boot ------------------------------ */

/** Console API for poking at the engine: ecTorus.model, ecTorus.engine.Curve, … */
function exposeApi() {
  const api = {
    get state() { return clone(S); }, get model() { return M; },
    engine: { Curve, parsePoint, evalExpr, encodeSEC, sqrtMod, isProbablePrime, chord, turns, smallCurve, pointOrder, dlog, KNOWN },
    screenOf(key) {
      const t = M && M.targets.find((x) => x.key === key);
      if (!t || !t.pos || !view.ok) return null;
      const s = project(t.pos), r = $('#gl').getBoundingClientRect();
      return { x: r.left + s.x, y: r.top + s.y };
    },
    set(patch) { Object.assign(S, patch); writeFields(); update(); },
    selfTest: runSelfTest,
    debug: { view, pick: (x, y) => pickAt(x, y, M), afterRender, drawMini, shape: SHAPE },
  };
  Object.defineProperty(window, 'ecTorus', { value: api, configurable: true });
}

function applyHashState() {
  if (!/[#&]s=/.test(location.hash)) return false;
  S = loadState();
  try { history.replaceState(null, '', location.href.replace(/#.*$/, '')); } catch { /* file:// in some browsers */ }
  return true;
}

function boot() {
  for (const id of ['preset', 'a', 'b', 'p', 'p1', 'p2', 'g', 'map', 'shape', 'bits', 'su', 'sv', 'R', 'r', 'glass', 'back', 'showG', 'force']) F[id] = $('#' + id);
  buildPresetOptions();
  buildShapeTiles();
  document.documentElement.dataset.theme = S.theme;
  applySections();
  writeFields();
  applyPanel();
  applyLegend();
  const glOK = initView();
  if (!glOK) glNotice('none');
  applyTheme(S.theme);
  wire();
  exposeApi();
  window.addEventListener('hashchange', () => {
    if (!applyHashState()) return;
    clearPins(); hoverT = null; inspectT = null;
    applyTheme(S.theme); applyPanel(); applySections(); applyLegend(); writeFields(); update();
  });
  update();
  if (glOK) setView('iso', false);
  setTimeout(() => {
    const r = runSelfTest();
    $('#testAside').textContent = r.fail ? `${r.fail} failing` : `${r.pass} checks pass`;
    $('#testAside').className = 'aside ' + (r.fail ? 'badc' : '');
    if (r.fail) { renderSelfTest(r); console.warn('[ec-torus] self-test failures', r.items.filter((i) => !i.ok)); }
    else console.info(`[ec-torus] self-test: ${r.pass}/${r.pass} passed`);
  }, 400);
}
