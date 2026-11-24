/* ==========================================================================
   App core: presets, persisted state, and the computed model.
   ========================================================================== */

const TAU = Math.PI * 2;
const K1 = KNOWN[0], R1 = KNOWN[1];
const K1_GX = hex(K1.G.x, 32);
const P256_G = ((R1.G.y & 1n) ? '03' : '02') + hex(R1.G.x, 32);
const SUB = (n) => String(n).replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[d]);

const PRESETS = [
  { id: 'k1-neg', group: 'Bitcoin and standards', name: 'secp256k1: G and −G (mirror pair)',
    a: '0', b: '7', p: '2^256 - 2^32 - 977', g: '02' + K1_GX, p1: '02' + K1_GX, p2: '03' + K1_GX, op: 'add', show: { beta: false } },
  { id: 'k1-chord', group: 'Bitcoin and standards', name: 'secp256k1: G + 2G = 3G',
    a: '0', b: '7', p: '2^256 - 2^32 - 977', g: '02' + K1_GX, p1: 'G', p2: '2G', op: 'add', show: { beta: false, chord: true } },
  { id: 'k1-glv', group: 'Bitcoin and standards', name: 'secp256k1: G and λG (GLV, same y)',
    a: '0', b: '7', p: '2^256 - 2^32 - 977', g: '02' + K1_GX, p1: 'G', p2: 'λG', op: 'add', show: { beta: true } },
  { id: 'p256', group: 'Bitcoin and standards', name: 'P-256: G and 2G',
    a: '-3', b: '0x' + hex(R1.b, 32), p: '2^256 - 2^224 + 2^192 + 2^96 - 1', g: P256_G, p1: 'G', p2: '2G', op: 'add', show: { beta: false } },
  { id: 'pb223', group: 'Toy curves (every point visible)', name: `y² = x³ + 7 over F${SUB(223)}, Programming Bitcoin`,
    a: '0', b: '7', p: '223', g: '(47, 71)', p1: '(47, 71)', p2: '(116, 55)', op: 'add', show: { cloud: true, chord: true, beta: false } },
  { id: 't211', group: 'Toy curves (every point visible)', name: `y² = x³ + 7 over F${SUB(211)}, three points share y = 33`,
    a: '0', b: '7', p: '211', g: '(3, 33)', p1: '(3, 33)', p2: '(166, 33)', op: 'add', show: { cloud: true, chord: true, beta: true } },
  { id: 'c97', group: 'Toy curves (every point visible)', name: `y² = x³ + 2x + 3 over F${SUB(97)}, a point of order 5`,
    a: '2', b: '3', p: '97', g: '(3, 6)', p1: '(3, 6)', p2: '(80, 10)', op: 'add', show: { cloud: true, chord: true, beta: false } },
  { id: 'pp17', group: 'Toy curves (every point visible)', name: `y² = x³ + 2x + 2 over F${SUB(17)}, Paar & Pelzl`,
    a: '2', b: '2', p: '17', g: '(5, 1)', p1: '(5, 1)', p2: '(6, 3)', op: 'add', show: { cloud: true, chord: true, beta: false } },
  { id: 't10009', group: 'Toy curves (every point visible)', name: `y² = x³ + 7 over F${SUB(10009)}, dense and 6-fold symmetric`,
    a: '0', b: '7', p: '10009', g: '(1, 1171)', p1: 'G', p2: '3G', op: 'add', show: { cloud: true, beta: true } },
];

const DEFAULT_STATE = {
  v: 3, preset: 'k1-neg', basePreset: 'k1-neg',
  a: '0', b: '7', p: '2^256 - 2^32 - 977', g: '02' + K1_GX, p1: '02' + K1_GX, p2: '03' + K1_GX,
  op: 'add', showG: true, force: false, shape: 'torus',
  map: 'scale', bits: 24, su: 24, sv: 16, R: 1.2, r: 0.46, glass: 0.55, back: 0.4,
  show: { grid: true, rings: true, labels: true, cloud: true, chord: true, beta: false, map: true, spin: false },
  rings: { p1: true, p2: true, sum: true, g: false },
  theme: 'dark', panel: true, miniBig: false, legendMin: false,
  // open panel sections (data-sec), remembered like everything else
  secs: { curve: true, points: true, shape: true, view: true, inspector: true, relations: true, test: false },
};

const clone = (o) => JSON.parse(JSON.stringify(o));
const STORE_KEY = 'ec-torus-v3';

function sanitizeState(raw) {
  const s = clone(DEFAULT_STATE);
  if (!raw || typeof raw !== 'object') return s;
  for (const k of ['preset', 'basePreset', 'a', 'b', 'p', 'g', 'p1', 'p2', 'op', 'map', 'theme', 'shape'])
    if (typeof raw[k] === 'string' && raw[k].length < 5000) s[k] = raw[k];
  for (const k of ['showG', 'force', 'panel', 'miniBig', 'legendMin']) if (typeof raw[k] === 'boolean') s[k] = raw[k];
  const num = (k, lo, hi) => { const v = Number(raw[k]); if (Number.isFinite(v)) s[k] = Math.min(hi, Math.max(lo, v)); };
  num('bits', 4, 52); num('su', 4, 96); num('sv', 4, 64); num('R', 0.8, 2); num('r', 0.15, 0.75); num('glass', 0, 1); num('back', 0, 1);
  s.bits = Math.round(s.bits); s.su = Math.round(s.su); s.sv = Math.round(s.sv);
  if (raw.show && typeof raw.show === 'object') for (const k in s.show) if (typeof raw.show[k] === 'boolean') s.show[k] = raw.show[k];
  if (raw.rings && typeof raw.rings === 'object') for (const k in s.rings) if (typeof raw.rings[k] === 'boolean') s.rings[k] = raw.rings[k];
  if (raw.secs && typeof raw.secs === 'object') for (const k in s.secs) if (typeof raw.secs[k] === 'boolean') s.secs[k] = raw.secs[k];
  if (!['add', 'sub', 'dbl'].includes(s.op)) s.op = 'add';
  if (!['scale', 'low', 'high'].includes(s.map)) s.map = 'scale';
  if (!['dark', 'paper'].includes(s.theme)) s.theme = 'dark';
  if (!SHAPES.some((q) => q.id === s.shape)) s.shape = 'torus';
  // preset ids name the PNG / JSON downloads: only known ids pass (the fields themselves are kept)
  if (!PRESETS.some((p) => p.id === s.preset)) s.preset = 'custom';
  if (!PRESETS.some((p) => p.id === s.basePreset)) s.basePreset = DEFAULT_STATE.basePreset;
  return s;
}

const b64urlEncode = (str) => btoa(String.fromCharCode(...new TextEncoder().encode(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64urlDecode = (b) => new TextDecoder().decode(Uint8Array.from(atob(b.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)));

function loadState() {
  try {
    const m = /[#&]s=([A-Za-z0-9_-]+)/.exec(location.hash);
    if (m) return sanitizeState(JSON.parse(b64urlDecode(m[1])));
  } catch { /* fall through */ }
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return sanitizeState(JSON.parse(raw));
  } catch { /* storage blocked */ }
  return clone(DEFAULT_STATE);
}
function saveState(s) { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch { /* ignore */ } }
function stateLink(s) { return location.href.replace(/#.*$/, '') + '#s=' + b64urlEncode(JSON.stringify(s)); }

/* ------------------------------ model ------------------------------ */

const smallCache = new Map();
function smallInfo(curve) {
  if (curve.p > BigInt(SMALL_COUNT_LIMIT)) return null;
  const key = `${curve.a}|${curve.b}|${curve.p}`;
  let info = smallCache.get(key);
  if (!info) {
    const sc = smallCurve(curve.a, curve.b, curve.p, curve.p <= BigInt(CLOUD_LIMIT));
    info = { count: sc.count, xs: sc.xs, ys: sc.ys, factors: factorSmall(sc.count) };
    if (smallCache.size > 6) smallCache.clear();
    smallCache.set(key, info);
  }
  return info;
}

/**
 * Per-curve analysis, cached by (a, b, p): every slider tick runs computeModel, and Miller–Rabin alone
 * took 5.7 of the 9 ms an update cost on a 1024-bit curve.
 */
const curveCache = new Map();
function curveInfo(curve) {
  const key = `${curve.a}|${curve.b}|${curve.p}`;
  let c = curveCache.get(key);
  if (!c) {
    const known = knownCurve(curve), prime = isProbablePrime(curve.p), singular = curve.disc() === 0n;
    c = { known, prime, singular, j: prime && !singular ? curve.jInvariant() : null,
      beta: curve.a === 0n && prime ? (known?.beta ?? cubeRootOfUnity(curve.p)) : null };
    if (curveCache.size > 16) curveCache.clear();
    curveCache.set(key, c);
  }
  return c;
}

function tryParse(text, ctx) {
  try { return parsePoint(text, ctx); }
  catch (e) { return { ok: false, error: e instanceof EcError ? e.message : 'could not read this point (' + e.message + ')' }; }
}

const fmtFactors = (f) => [...f].map(([q, e]) => (e > 1 ? `${q}${String(e).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d])}` : `${q}`)).join(' · ');

/**
 * Everything the views need, derived from the editable state.
 * Never throws: problems end up in m.curveErr / m.inputs[key].error.
 */
function computeModel(s) {
  const m = { curve: null, curveErr: '', inputs: {}, pts: {}, targets: [], facts: [], rel: [], notes: [] };
  let p, a, b;
  try { p = evalExpr(s.p); } catch (e) { m.curveErr = 'p: ' + e.message; return m; }
  if (p < 5n) { m.curveErr = 'p must be a prime ≥ 5.'; return m; }
  if (bitLen(p) > 1024) { m.curveErr = 'p is wider than 1024 bits; this tool stops there.'; return m; }
  try { a = evalExpr(s.a, { p }); } catch (e) { m.curveErr = 'a: ' + e.message; return m; }
  try { b = evalExpr(s.b, { p }); } catch (e) { m.curveErr = 'b: ' + e.message; return m; }

  const curve = new Curve(a, b, p);
  m.curve = curve;
  Object.assign(m, curveInfo(curve));
  m.small = m.prime && !m.singular ? smallInfo(curve) : null;
  m.cloudOK = !!(m.small && m.small.xs);

  // --- facts
  const bits = bitLen(p);
  m.facts.push(['p', `${numCopy(p)}<br>${bits}-bit ${m.prime ? (p < 3317044064679887385961981n ? 'prime' : 'prime (Miller–Rabin)') : '<span class="badc">composite: F_p is not a field</span>'}`]);
  // the evaluated parameters (v0.2 listed them); a small negative representative is named, e.g. P-256's a ≡ −3
  const par = (v) => { const c = centered(v, p); return numCopy(v) + (c < 0n && c > -100000n ? ` <span class="empty">≡ −${-c}</span>` : ''); };
  if (curve.a < 100000n && curve.b < 100000n) m.facts.push(['a, b', `${par(curve.a)}, ${par(curve.b)}`]);
  else { m.facts.push(['a', par(curve.a)]); m.facts.push(['b', par(curve.b)]); }
  m.facts.push(['p mod', `p ≡ ${p % 4n} (mod 4), p ≡ ${p % 3n} (mod 3)`]);
  if (m.known) m.facts.push(['named', `<span class="good">${m.known.name}</span>`]);
  m.facts.push(['Δ', m.singular ? '<span class="badc">4a³ + 27b² ≡ 0: singular, not an elliptic curve</span>' : '4a³ + 27b² ≢ 0, non-singular']);
  if (m.j !== null) m.facts.push(['j', m.j === 0n ? '0 (a = 0)' : m.j === mod(1728n, p) ? '1728 (b = 0)' : `<span class="num">${shortHex(m.j, p)}</span>`]);
  if (m.known) {
    m.facts.push(['n', `<span class="num" title="0x${hex(m.known.n)}">${shortHex(m.known.n)}</span>, prime`]);
    m.facts.push(['h', `${m.known.h}, so every point ≠ 𝒪 has order n`]);
  } else if (m.small) {
    const N = m.small.count, t = p + 1n - N;
    m.facts.push(['#E', `${N} = ${fmtFactors(m.small.factors)}${m.small.factors.size === 1 && [...m.small.factors.values()][0] === 1 ? ', prime' : ''}`]);
    m.facts.push(['trace', `t = p + 1 − #E = ${t}; |t| ≤ 2√p ${t * t <= 4n * p ? '<span class="good">holds</span>' : '<span class="badc">fails</span>'}`]);
  } else if (m.prime && !m.singular) {
    m.facts.push(['#E', 'not counted (p above 2²²)']);
  }
  if (curve.a === 0n && m.prime) {
    if (m.beta) m.facts.push(['β', `<span class="num" title="0x${hex(m.beta)}">${shortHex(m.beta, p)}</span>, β³ = 1: (x, y) ↦ (βx, y) is an automorphism`]);
    else if (p % 3n === 2n && curve.b !== 0n) m.facts.push(['β', 'none (p ≡ 2 mod 3): x ↦ x³ is a bijection, so this curve is supersingular with #E = p + 1']);
  }

  // --- G
  const gIn = tryParse(s.g, { curve, G: null, env: { p } });
  m.inputs.g = gIn;
  if (gIn.ok && gIn.P && gIn.onCurve) m.G = gIn.P;
  if (m.G) {
    if (m.known) m.ordG = m.known.n;
    else if (m.small) m.ordG = pointOrder(curve, m.G, m.small.count, m.small.factors);
  }
  const env = { p, n: m.ordG ?? undefined };
  if (m.known?.lambda) Object.assign(env, { lambda: m.known.lambda, 'λ': m.known.lambda });
  if (m.beta) Object.assign(env, { beta: m.beta, 'β': m.beta });
  m.env = env;

  // --- P1, P2
  const ctx = { curve, G: m.G ?? null, env };
  m.inputs.p1 = tryParse(s.p1, ctx);
  m.inputs.p2 = tryParse(s.p2, ctx);

  const usable = (r) => r && r.ok && (r.onCurve || s.force);
  const A = m.inputs.p1, B = m.inputs.p2;

  // --- operation
  const opLabel = { add: 'P₁ + P₂', sub: 'P₁ − P₂', dbl: '2·P₁' }[s.op];
  m.op = { label: opLabel, status: 'missing', P: undefined, chord: null };
  try {
    if (s.op === 'dbl') {
      if (usable(A)) { m.op.P = curve.dbl(A.P); m.op.chord = A.P ? chord(curve, A.P, A.P) : null; m.op.status = 'ok'; }
    } else if (usable(A) && usable(B)) {
      const Q = s.op === 'sub' ? curve.neg(B.P) : B.P;
      m.op.P = curve.add(A.P, Q);
      m.op.chord = A.P && Q ? chord(curve, A.P, Q) : null;
      m.op.Q = Q;
      m.op.status = 'ok';
    }
    if (m.op.status !== 'ok') {
      const off = [A, B].some((r) => r && r.ok && !r.onCurve);
      m.op.status = off ? 'offcurve' : 'missing';
    }
  } catch (e) { m.op.status = 'error'; m.op.error = e.message; }

  // --- per-point records (guarded: on a composite p an inverse can fail anywhere below)
  try {
    const add = (key, label, colorVar, P, extra = {}) => {
      if (!P) return null;
      const rec = { key, label, colorVar, P, onCurve: curve.isOn(P), ...extra };
      rec.tu = turns(P.x, p, s.map, s.bits);
      rec.tv = turns(P.y, p, s.map, s.bits);
      m.pts[key] = rec;
      m.targets.push(rec);
      return rec;
    };
    const scalarInfo = (P) => {
      const out = {};
      if (!P || !curve.isOn(P)) return out;
      if (m.known) out.order = m.known.n;
      else if (m.small) out.order = pointOrder(curve, P, m.small.count, m.small.factors);
      if (m.G && m.ordG && m.small && out.order && m.ordG % out.order === 0n) {
        const k = dlog(curve, m.G, P, m.ordG);
        if (k !== null) out.k = k;
      } else if (m.G) {
        if (curve.eq(P, m.G)) out.k = 1n;
        else if (curve.eq(P, curve.neg(m.G)) && m.ordG) out.k = m.ordG - 1n;
      }
      return out;
    };
    if (A.ok && A.P) add('p1', 'P₁', '--c-p1', A.P, { input: A, ...scalarInfo(A.P), kTyped: A.k });
    if (B.ok && B.P) add('p2', 'P₂', '--c-p2', B.P, { input: B, ...scalarInfo(B.P), kTyped: B.k });
    // scalars propagate through the operation when both inputs have one (typed as kG or solved by dlog)
    const kIn = (r) => (r ? r.k ?? r.kTyped ?? null : null);
    let kSum = null;
    { const k1 = kIn(m.pts.p1), k2 = kIn(m.pts.p2);
      if (s.op === 'dbl' && k1 !== null) kSum = 2n * k1;
      else if (k1 !== null && k2 !== null) kSum = s.op === 'sub' ? k1 - k2 : k1 + k2;
      if (kSum !== null && m.ordG) kSum = mod(kSum, m.ordG); }
    if (m.op.status === 'ok' && m.op.P) {
      const info = scalarInfo(m.op.P);
      add('sum', opLabel, '--c-sum', m.op.P, { derived: true, ...info, k: info.k ?? kSum ?? undefined });
    }
    if (s.showG && m.G) add('g', 'G', '--c-g', m.G, { k: 1n, order: m.ordG });
    if (m.op.chord && m.op.chord.R) {
      const kR = kSum !== null && m.ordG ? mod(-kSum, m.ordG) : undefined;
      add('r', 'R = −(' + opLabel + ')', '--c-r', m.op.chord.R, { derived: true, ghost: true, ...scalarInfo(m.op.chord.R), ...(kR !== undefined ? { k: kR } : {}) });
    }

    // β-orbit siblings for P1 / P2
    if (m.beta && s.show.beta) {
      const b2 = m.beta * m.beta % p;
      for (const key of ['p1', 'p2']) {
        const r = m.pts[key];
        if (!r || !r.onCurve) continue;
        const names = m.known?.lambda ? ['λ·', 'λ²·'] : ['(βx, y) of ', '(β²x, y) of '];
        const kP = kIn(r), lam = m.known?.lambda;
        [m.beta, b2].forEach((bb, i) => add(`${key}b${i + 1}`, names[i] + r.label, r.colorVar, { x: r.P.x * bb % p, y: r.P.y },
          { derived: true, sibling: true, of: key, ...(lam && kP !== null ? { k: mod(kP * (i ? lam * lam : lam), m.known.n), order: m.known.n } : {}) }));
      }
    }

    // --- relations
    const pa = m.pts.p1, pb = m.pts.p2;
    if (pa && pb) {
      const same = curve.eq(pa.P, pb.P), neg = curve.eq(pb.P, curve.neg(pa.P)) && pa.P.y !== 0n;
      m.rel.push(['P₂ = −P₁', neg ? '<span class="good">yes: same x, y ↦ p − y, mirror images</span>' : 'no']);
      m.rel.push(['P₂ = P₁', same ? 'yes' : 'no']);
      m.rel.push(['same x', pa.P.x === pb.P.x ? 'yes, same meridian ring' : 'no']);
      m.rel.push(['same y', pa.P.y === pb.P.y ? 'yes, same parallel ring' : 'no']);
      if (m.beta && pa.P.y === pb.P.y && pa.P.x !== pb.P.x) {
        const i = mod(m.beta * pa.P.x, p) === pb.P.x ? 1 : mod(m.beta * m.beta * pa.P.x, p) === pb.P.x ? 2 : 0;
        if (i) m.rel.push(['β link', m.known?.lambda ? `<span class="good">P₂ = λ${i === 2 ? '²' : ''}·P₁</span> (x₂ = β${i === 2 ? '²' : ''}·x₁)` : `x₂ = β${i === 2 ? '²' : ''}·x₁, same y`]);
      }
      const du = angDiff(pa.tu, pb.tu), dv = angDiff(pa.tv, pb.tv);
      m.rel.push(['Δu, Δv', `${du.toFixed(3)}°, ${dv.toFixed(3)}° (${(du * Math.PI / 180).toFixed(4)}, ${(dv * Math.PI / 180).toFixed(4)} rad)`]);
    }
    if (m.G) for (const r of [pa, pb]) {
      if (!r) continue;
      const g = curve.eq(r.P, m.G) ? `<span class="good">${r.label} = G</span>` : curve.eq(r.P, curve.neg(m.G)) ? `${r.label} = −G, the mirror of G` : 'neither G nor −G';
      m.rel.push([`${r.label} vs G`, g]);
    }
    const ptStr = (P) => (P === null ? '𝒪' : p < 100000n ? `(${P.x}, ${P.y})` : `<span class="num">${encodeSECExact(P, curve, m.prime)}</span>`);
    if (m.op.status === 'ok') {
      m.rel.push([m.op.label, m.op.P ? ptStr(m.op.P) : '<span class="good">𝒪, the point at infinity</span>']);
      const ch = m.op.chord;
      if (ch && ch.type === 'vertical') m.rel.push(['chord', 'vertical line x = x₁: it meets the curve only at P, −P and 𝒪']);
      if (ch && (ch.type === 'secant' || ch.type === 'tangent')) {
        m.rel.push([ch.type === 'tangent' ? 'tangent λ' : 'slope λ', `<span class="num">${shortHex(ch.lambda, p)}</span>`]);
        if (p <= 100000n) m.rel.push(['winding', `λ ≡ ${centered(ch.lambda, p)} (mod p): the line wraps ${absBig(centered(ch.lambda, p))} times around the tube`]);
        m.rel.push(['third point', `R = −(${m.op.label}) = ${ptStr(ch.R)}`]);
      }
    } else if (m.op.status === 'offcurve') {
      const offs = [A, B].filter((r) => r && r.ok && r.P && !r.onCurve).map((r) => `b′ = ${shortHex(curve.bPrime(r.P), p)}`);
      m.rel.push([m.op.label, `<span class="warnc">skipped: off-curve input (${offs.join(', ')}). Tick “force group law” to apply the formulas anyway.</span>`]);
    } else if (m.op.status === 'error') {
      m.rel.push([m.op.label, `<span class="badc">${escapeHtml(m.op.error)}</span>`]);
    }
    for (const key of ['p1', 'p2']) {
      const r = m.pts[key];
      if (r && r.onCurve) {
        const d = curve.dbl(r.P);
        m.rel.push([`2·${r.label}`, ptStr(d)]);
      }
      if (r && !r.onCurve) m.rel.push([r.label, `<span class="badc">not on this curve</span>; it satisfies y² = x³ + ax + b′ with b′ = <span class="num">${shortHex(curve.bPrime(r.P), p)}</span> (invalid-curve point)`]);
    }
    if (m.small && m.G) m.rel.push(['ord(G)', m.ordG ? String(m.ordG) : 'G is not on the curve']);
  } catch (e) {
    m.rel.push(['error', `<span class="badc">${escapeHtml(e.message)}</span>`]);
  }
  return m;
}

function angDiff(t1, t2) { let d = Math.abs(t1 - t2) % 1; if (d > 0.5) d = 1 - d; return d * 360; }
const absBig = (v) => (v < 0n ? -v : v);
function shortHex(n, p) {
  if (p !== undefined && p < 100000n) return String(n);
  const h = n.toString(16);
  return h.length > 18 ? `0x${h.slice(0, 8)}…${h.slice(-6)}` : `0x${h}`;
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
/** A curve parameter: decimal below 100000, else hex; shortened values carry the full one in a tooltip and a copy button. */
function numCopy(v) {
  const small = v < 100000n, s = small ? String(v) : shortHex(v), full = small ? s : '0x' + v.toString(16);
  return s === full ? `<span class="num">${s}</span>` : `<span class="num" title="${full}">${s}</span><button class="copy" data-copy="${full}" aria-label="Copy the full value">copy</button>`;
}

/** Uniformly random point on the curve (rejection sampling on x). */
function randomPoint(curve) {
  const fb = curve.fb;
  for (let tries = 0; tries < 400; tries++) {
    const bytes = crypto.getRandomValues(new Uint8Array(fb + 8));
    let x = 0n; for (const v of bytes) x = (x << 8n) | BigInt(v);
    x %= curve.p;
    const P = liftX(curve, x, (bytes[0] & 1) === 1);
    if (P) return P;
  }
  return null;
}
