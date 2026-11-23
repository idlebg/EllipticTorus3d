/* ==========================================================================
   EC engine — BigInt, no eval, no dependencies.
   Short Weierstrass  y² = x³ + a·x + b  over F_p.
   ========================================================================== */

export class EcError extends Error {}

export const mod = (a, m) => { const r = a % m; return r < 0n ? r + m : r; };
export const bitLen = (n) => (n < 0n ? -n : n).toString(2).length - (n === 0n ? 1 : 0);
export const fieldBytes = (p) => Math.max(1, Math.ceil(bitLen(p) / 8));

export function powMod(b, e, m) {
  if (m === 1n) return 0n;
  if (e < 0n) throw new EcError('negative exponent');
  let r = 1n; b = mod(b, m);
  while (e > 0n) { if (e & 1n) r = r * b % m; b = b * b % m; e >>= 1n; }
  return r;
}

export function invMod(a, m) {
  a = mod(a, m);
  if (a === 0n) throw new EcError('division by zero mod p');
  let r0 = m, r1 = a, t0 = 0n, t1 = 1n;
  while (r1 !== 0n) {
    const q = r0 / r1;
    let t = r0 - q * r1; r0 = r1; r1 = t;
    t = t0 - q * t1; t0 = t1; t1 = t;
  }
  if (r0 !== 1n) throw new EcError(`no inverse: gcd(${a}, p) = ${r0} — p is not prime`);
  return mod(t0, m);
}

const SMALL_PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];
const MR_BASES = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n, 41n];
/** Miller–Rabin; deterministic below 3.3·10²⁴, probabilistic (13 bases) above. */
export function isProbablePrime(n) {
  if (n < 2n) return false;
  for (const sp of SMALL_PRIMES) { const s = BigInt(sp); if (n === s) return true; if (n % s === 0n) return false; }
  let d = n - 1n, s = 0;
  while ((d & 1n) === 0n) { d >>= 1n; s++; }
  outer: for (const a of MR_BASES) {
    let x = powMod(a, d, n);
    if (x === 1n || x === n - 1n) continue;
    for (let i = 1; i < s; i++) { x = x * x % n; if (x === n - 1n) continue outer; }
    return false;
  }
  return true;
}

/** Euler criterion: 1 residue, -1 non-residue, 0 zero. */
export function legendre(a, p) {
  a = mod(a, p);
  if (a === 0n) return 0;
  const l = powMod(a, (p - 1n) >> 1n, p);
  return l === 1n ? 1 : (l === p - 1n ? -1 : NaN);
}

const notPrime = () => new EcError('p is not prime, so x cannot be lifted to a point (no square roots mod p); use (x, y) or 04…');

/**
 * Square root mod prime p (Tonelli–Shanks, with the p ≡ 3 mod 4 shortcut). null if n is a non-residue.
 * For a prime p, Euler's criterion is 0 or ±1, every root verifies, and a non-residue turns up within a few z.
 * Anything else proves p composite and throws at once: searching a 1024-bit composite for a non-residue
 * used to block the tab for half a minute or more.
 */
export function sqrtMod(n, p) {
  n = mod(n, p);
  if (n === 0n) return 0n;
  if (p === 2n) return n;
  const ln = legendre(n, p);
  if (Number.isNaN(ln)) throw notPrime();
  if (ln !== 1) {
    // −1 is the twist answer only for a prime p; this is the error path, so one Miller–Rabin is cheap
    if (!isProbablePrime(p)) throw notPrime();
    return null;
  }
  const root = (r) => { if (r * r % p !== n) throw notPrime(); return r; };
  if ((p & 3n) === 3n) return root(powMod(n, (p + 1n) >> 2n, p));
  let q = p - 1n, s = 0n;
  while ((q & 1n) === 0n) { q >>= 1n; s++; }
  let z = 2n;
  for (let tries = 1; ; z++, tries++) {
    const l = legendre(z, p);
    if (l === -1) break;
    if (l !== 1) throw notPrime();                              // 0 or not ±1: z shares a factor with p, or Euler fails
    if (tries === 64 && !isProbablePrime(p)) throw notPrime();  // absolute Euler pseudoprimes answer 1 for every unit
    if (tries > 100000) throw new EcError('no quadratic non-residue found (is p prime?)');
  }
  // m strictly decreases each round, so this runs at most s times
  let m = s, c = powMod(z, q, p), t = powMod(n, q, p), r = powMod(n, (q + 1n) >> 1n, p);
  while (t !== 1n) {
    let i = 0n, t2 = t;
    while (t2 !== 1n) { t2 = t2 * t2 % p; i++; if (i === m) throw notPrime(); }
    const b = powMod(c, 1n << (m - i - 1n), p);
    r = r * b % p; c = b * b % p; t = t * c % p; m = i;
  }
  return root(r);
}

/* ----------------------------- expressions ------------------------------ */
/* Integer expressions without eval: + - * / % ** ^ ( ), hex/bin/oct/dec,
   digit separators, and named constants (p, n, λ …) supplied by the caller. */

const OPS = new Set(['+', '-', '*', '/', '%', '**', '(', ')']);
function tokenize(src) {
  const s = String(src).replace(/[−–]/g, '-').replace(/[×·⋅]/g, '*').replace(/\^/g, '**');
  const out = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) { i++; continue; }
    const num = /^(0x[0-9a-f_]+|0b[01_]+|0o[0-7_]+|\d[\d_]*)/i.exec(s.slice(i));
    if (num) {
      const raw = num[1].replace(/_/g, '');
      if (/^0[xbo]$/i.test(raw)) throw new EcError(`bad number "${num[1]}"`);
      out.push({ t: 'num', v: BigInt(raw) }); i += num[1].length; continue;
    }
    const id = /^([a-zλβ][a-z0-9_λβ]*)/i.exec(s.slice(i));
    if (id) { out.push({ t: 'id', v: id[1] }); i += id[1].length; continue; }
    const op = s.startsWith('**', i) ? '**' : ch;
    if (OPS.has(op)) { out.push({ t: 'op', v: op }); i += op.length; continue; }
    throw new EcError(`unexpected "${ch}"`);
  }
  return out;
}

const MAX_BITS = 1 << 15, MAX_DEPTH = 256;
export function evalExpr(src, env = {}) {
  if (String(src).length > 4000) throw new EcError('expression too long');
  const toks = tokenize(src);
  if (!toks.length) throw new EcError('empty value');
  let k = 0, depth = 0;
  const peek = () => toks[k], take = () => toks[k++];
  const isOp = (v) => peek() && peek().t === 'op' && peek().v === v;
  const guard = (v) => { if (bitLen(v) > MAX_BITS) throw new EcError('number too large'); return v; };
  const nest = (fn) => {
    if (++depth > MAX_DEPTH) throw new EcError('expression nested too deeply');
    try { return fn(); } finally { depth--; }
  };
  function sum() {
    let v = term();
    while (isOp('+') || isOp('-')) { const o = take().v; const r = term(); v = guard(o === '+' ? v + r : v - r); }
    return v;
  }
  function term() {
    let v = unary();
    while (isOp('*') || isOp('/') || isOp('%')) {
      const o = take().v; const r = unary();
      if (o !== '*' && r === 0n) throw new EcError('division by zero');
      v = guard(o === '*' ? v * r : o === '/' ? v / r : mod(v, r < 0n ? -r : r));
    }
    return v;
  }
  function unary() {
    let neg = false;
    while (isOp('-') || isOp('+')) if (take().v === '-') neg = !neg;
    const v = power();
    return neg ? -v : v;
  }
  function power() {
    const base = atom();
    if (!isOp('**')) return base;
    take();
    const e = nest(unary);
    if (e < 0n) throw new EcError('negative exponent');
    if (base > 1n || base < -1n) {
      if (e > BigInt(MAX_BITS)) throw new EcError('exponent too large');
      // |base|^e has at least (bitLen(base) − 1)·e + 1 bits: refuse before computing, since BigInt
      // would otherwise build a result of up to 10⁹ bits for seconds before the size guard sees it
      if (BigInt(bitLen(base) - 1) * e + 1n > BigInt(MAX_BITS)) throw new EcError('number too large');
    }
    return guard(base ** e);
  }
  function atom() {
    const t = take();
    if (!t) throw new EcError('unexpected end');
    if (t.t === 'num') return t.v;
    if (t.t === 'id') {
      const key = Object.keys(env).find((n) => n.toLowerCase() === t.v.toLowerCase());
      if (key === undefined || env[key] === undefined || env[key] === null) throw new EcError(`unknown name "${t.v}"`);
      return env[key];
    }
    if (t.v === '(') { const v = nest(sum); if (!isOp(')')) throw new EcError('missing ")"'); take(); return v; }
    throw new EcError(`unexpected "${t.v}"`);
  }
  const v = sum();
  if (k !== toks.length) throw new EcError(`unexpected "${toks[k].v}"`);
  return v;
}

/* --------------------------------- curve -------------------------------- */

export class Curve {
  constructor(a, b, p) {
    if (p < 5n) throw new EcError('p must be ≥ 5');
    this.p = p; this.a = mod(a, p); this.b = mod(b, p);
    this.fb = fieldBytes(p);
  }
  rhs(x) { const p = this.p; return mod((x * x % p) * x + this.a * x + this.b, p); }
  isOn(P) { return P === null || mod(P.y * P.y, this.p) === this.rhs(P.x); }
  /** b′ such that P lies on y² = x³ + ax + b′ (the curve the formulas actually use). */
  bPrime(P) { const p = this.p; return mod(P.y * P.y - (P.x * P.x % p) * P.x - this.a * P.x, p); }
  neg(P) { return P && { x: P.x, y: mod(-P.y, this.p) }; }
  eq(P, Q) { return (!P || !Q) ? P === Q : P.x === Q.x && P.y === Q.y; }
  add(P, Q) {
    if (!P) return Q; if (!Q) return P;
    const p = this.p;
    let m;
    if (P.x === Q.x) {
      if (P.y !== Q.y || P.y === 0n) return null; // vertical chord / vertical tangent
      m = mod((3n * P.x * P.x + this.a) * invMod(2n * P.y, p), p);
    } else {
      m = mod((Q.y - P.y) * invMod(Q.x - P.x, p), p);
    }
    const x = mod(m * m - P.x - Q.x, p);
    return { x, y: mod(m * (P.x - x) - P.y, p) };
  }
  dbl(P) { return this.add(P, P); }
  /** k·P with Jacobian coordinates (one inversion). Negative k allowed. */
  mul(k, P) {
    if (!P || k === 0n) return null;
    if (k < 0n) return this.mul(-k, this.neg(P));
    const p = this.p, a = this.a;
    const M = (u, v) => u * v % p;
    let X = 0n, Y = 1n, Z = 0n; // infinity
    const dblJ = () => {
      if (Z === 0n || Y === 0n) { Z = 0n; return; }
      const YY = M(Y, Y), S = M(4n * X, YY), ZZ = M(Z, Z);
      const Mx = mod(3n * M(X, X) + M(a, M(ZZ, ZZ)), p);
      const X3 = mod(M(Mx, Mx) - 2n * S, p);
      const Y3 = mod(M(Mx, S - X3) - 8n * M(YY, YY), p);
      Z = M(2n * Y, Z); X = X3; Y = Y3;
    };
    const addJ = (x2, y2) => { // mixed add with affine (x2, y2)
      if (Z === 0n) { X = x2; Y = y2; Z = 1n; return; }
      const ZZ = M(Z, Z), U2 = M(x2, ZZ), S2 = M(y2, M(ZZ, Z));
      const H = mod(U2 - X, p), R = mod(S2 - Y, p);
      if (H === 0n) { if (R === 0n) dblJ(); else Z = 0n; return; }
      const HH = M(H, H), HHH = M(HH, H), V = M(X, HH);
      const X3 = mod(M(R, R) - HHH - 2n * V, p);
      const Y3 = mod(M(R, V - X3) - M(Y, HHH), p);
      Z = M(Z, H); X = X3; Y = Y3;
    };
    for (let i = bitLen(k) - 1; i >= 0; i--) {
      dblJ();
      if ((k >> BigInt(i)) & 1n) addJ(P.x, P.y);
    }
    if (Z === 0n) return null;
    const zi = invMod(Z, p), zi2 = M(zi, zi);
    return { x: M(X, zi2), y: M(Y, M(zi2, zi)) };
  }
  /** 4a³ + 27b² (zero ⇒ singular). */
  disc() { const p = this.p; return mod(4n * powMod(this.a, 3n, p) + 27n * this.b * this.b, p); }
  jInvariant() {
    const d = this.disc(); if (d === 0n) return null;
    const p = this.p;
    return mod(1728n * 4n * powMod(this.a, 3n, p) % p * invMod(d, p), p);
  }
}

/* -------------------------------- encodings ------------------------------- */

export const hex = (n, bytes = 0) => {
  let h = n.toString(16);
  if (bytes) h = h.padStart(bytes * 2, '0'); else if (h.length & 1) h = '0' + h;
  return h;
};
export function encodeSEC(P, curve, kind = 'compressed') {
  if (!P) return '00';
  const fb = curve.fb, odd = (P.y & 1n) === 1n;
  if (kind === 'compressed') return (odd ? '03' : '02') + hex(P.x, fb);
  if (kind === 'hybrid') return (odd ? '07' : '06') + hex(P.x, fb) + hex(P.y, fb);
  return '04' + hex(P.x, fb) + hex(P.y, fb);
}

/** Lift x to a point with the requested y parity (null if x is off the curve). */
export function liftX(curve, x, wantOdd) {
  const y0 = sqrtMod(curve.rhs(x), curve.p);
  if (y0 === null) return null;
  const y = ((y0 & 1n) === 1n) === wantOdd ? y0 : mod(-y0, curve.p);
  return { x, y };
}

/**
 * Parse a point the way a person would type it:
 *   SEC 02/03 (compressed) · 04 (uncompressed) · 06/07 (hybrid) · bare x (BIP340 x-only, even y)
 *   (x, y) affine pair (numbers or expressions) · kG scalar multiple · O / ∞ for the point at infinity
 */
export function parsePoint(input, ctx) {
  const { curve, G = null, env = {} } = ctx;
  const s = String(input ?? '').trim();
  if (!s) return { empty: true };
  if (/^(o|∞|𝒪|inf|infinity|point at infinity)$/i.test(s)) return { ok: true, P: null, kind: 'infinity', onCurve: true };
  const p = curve.p, fb = curve.fb;

  // scalar multiple: "G", "-G", "5G", "5*G", "(n-1)·G", "λG", "0x…G"
  const sm = /^(.*?)[\s*·×]*g$/is.exec(s);
  if (sm && !/^(0x)?[0-9a-f\s:]*$/i.test(s)) {
    if (!G) throw new EcError('kG needs a generator G (set G below)');
    let body = sm[1].trim();
    if (body === '' || body === '+') body = '1';
    if (body === '-') body = '-1';
    const k = evalExpr(body, env);
    return { ok: true, P: curve.mul(k, G), kind: 'scalar', k, onCurve: true };
  }

  // affine pair
  if (s.includes(',')) {
    const inner = s.replace(/^[([{]\s*/, '').replace(/\s*[)\]}]$/, '');
    const parts = inner.split(',');
    if (parts.length !== 2) throw new EcError('affine point needs exactly two coordinates: (x, y)');
    const xr = evalExpr(parts[0], env), yr = evalExpr(parts[1], env);
    const P = { x: mod(xr, p), y: mod(yr, p) };
    const warnings = [];
    if (xr !== P.x || yr !== P.y) warnings.push('coordinates reduced mod p');
    return { ok: true, P, kind: 'affine', onCurve: curve.isOn(P), warnings };
  }

  // hex encodings
  const h = s.replace(/^0x/i, '').replace(/[\s:_]/g, '').toLowerCase();
  if (!/^[0-9a-f]+$/.test(h)) throw new EcError('not a point: use SEC hex (02/03/04/06/07…), (x, y), kG or O');
  if (h.length & 1) throw new EcError(`odd number of hex digits (${h.length})`);
  const nbytes = h.length / 2;
  const pre = h.slice(0, 2);
  const big = (str) => BigInt('0x' + str);
  if (nbytes === fb) { // BIP340 x-only
    const x = big(h);
    if (x >= p) throw new EcError('x ≥ p');
    const P = liftX(curve, x, false);
    if (!P) throw new EcError('x-only: x³+ax+b is a non-residue — this x lies on the quadratic twist, not the curve');
    return { ok: true, P, kind: 'x-only', onCurve: true };
  }
  if (pre === '02' || pre === '03') {
    if (nbytes !== 1 + fb) throw new EcError(`compressed SEC is ${1 + fb} bytes for this p (got ${nbytes})`);
    const x = big(h.slice(2));
    if (x >= p) throw new EcError('x ≥ p');
    const P = liftX(curve, x, pre === '03');
    if (!P) throw new EcError('x³+ax+b is a non-residue — this x lies on the quadratic twist, not the curve');
    return { ok: true, P, kind: 'compressed', onCurve: true };
  }
  if (pre === '04' || pre === '06' || pre === '07') {
    if (nbytes !== 1 + 2 * fb) throw new EcError(`${pre}-prefixed SEC is ${1 + 2 * fb} bytes for this p (got ${nbytes})`);
    const x = big(h.slice(2, 2 + 2 * fb)), y = big(h.slice(2 + 2 * fb));
    if (x >= p || y >= p) throw new EcError('coordinate ≥ p');
    const P = { x, y }, warnings = [];
    const kind = pre === '04' ? 'uncompressed' : 'hybrid';
    if (kind === 'hybrid' && ((y & 1n) === 1n) !== (pre === '07')) warnings.push(`hybrid prefix ${pre} claims ${pre === '07' ? 'odd' : 'even'} y, but y is ${(y & 1n) ? 'odd' : 'even'}`);
    return { ok: true, P, kind, onCurve: curve.isOn(P), warnings };
  }
  throw new EcError(`unknown prefix ${pre} (expected 02/03/04/06/07, or ${fb}-byte x-only)`);
}

/* ------------------------------ torus mapping ----------------------------- */

/** Fraction of a full turn in [0,1) for coordinate c ∈ [0,p). */
export function turns(c, p, mode = 'scale', bits = 24) {
  if (mode === 'low') { const w = BigInt(bits); return Number(c & ((1n << w) - 1n)) / 2 ** bits; }
  if (mode === 'high') {
    const bl = bitLen(p), sh = Math.max(0, bl - bits);
    return Number(c >> BigInt(sh)) / 2 ** (bl - sh);
  }
  return Number((c << 52n) / p) / 2 ** 52;
}

/* --------------------------- small-curve tooling -------------------------- */

export const SMALL_COUNT_LIMIT = 1 << 22;
export const CLOUD_LIMIT = 1 << 18;

/** Enumerate (or just count) affine points for p < 2²² using a table of square roots. */
export function smallCurve(a, b, p, wantPoints) {
  const P = Number(p), A = Number(mod(a, p)), B = Number(mod(b, p));
  const root = new Int32Array(P).fill(-1);
  for (let y = 0; y <= (P >> 1); y++) root[(y * y) % P] = y;
  let affine = 0;
  const xs = wantPoints ? [] : null, ys = wantPoints ? [] : null;
  for (let x = 0; x < P; x++) {
    const rhs = (((x * x) % P) * x + A * x + B) % P;
    const y = root[rhs];
    if (y < 0) continue;
    if (y === 0) { affine += 1; if (xs) { xs.push(x); ys.push(0); } }
    else { affine += 2; if (xs) { xs.push(x, x); ys.push(y, P - y); } }
  }
  return { count: BigInt(affine + 1), xs: xs && Uint32Array.from(xs), ys: ys && Uint32Array.from(ys) };
}

export function factorSmall(N) {
  const f = new Map(); let n = N;
  for (let d = 2n; d * d <= n; d += (d === 2n ? 1n : 2n)) while (n % d === 0n) { f.set(d, (f.get(d) || 0) + 1); n /= d; }
  if (n > 1n) f.set(n, (f.get(n) || 0) + 1);
  return f;
}

/** Order of P given a multiple N of it (group order), factored. */
export function pointOrder(curve, P, N, factors) {
  if (!P) return 1n;
  let ord = N;
  for (const q of factors.keys()) while (ord % q === 0n && curve.mul(ord / q, P) === null) ord /= q;
  return curve.mul(ord, P) === null ? ord : null;
}

/** Baby-step giant-step: k with k·G = Q, 0 ≤ k < ordG; null if Q ∉ ⟨G⟩. For small groups only. */
export function dlog(curve, G, Q, ordG) {
  if (!Q) return 0n;
  if (ordG > 1n << 44n) return null;
  const m = BigInt(Math.ceil(Math.sqrt(Number(ordG))));
  const key = (P) => (P ? P.x + ':' + P.y : 'O');
  const baby = new Map();
  let R = null;
  for (let j = 0n; j < m; j++) { if (!baby.has(key(R))) baby.set(key(R), j); R = curve.add(R, G); }
  const step = curve.neg(curve.mul(m, G));
  let Y = Q;
  for (let i = 0n; i <= m; i++) {
    const j = baby.get(key(Y));
    if (j !== undefined) return mod(i * m + j, ordG);
    Y = curve.add(Y, step);
  }
  return null;
}

/** A nontrivial cube root of unity mod p (p ≡ 1 mod 3), or null. */
export function cubeRootOfUnity(p) {
  if (p % 3n !== 1n) return null;
  for (let g = 2n; g < 1000n; g++) { const b = powMod(g, (p - 1n) / 3n, p); if (b !== 1n) return b; }
  return null;
}

/**
 * Chord / tangent through P and Q (Q = P for doubling).
 * Returns { type, lambda, c, R } where R = −(P+Q) is the third intersection with the curve.
 */
export function chord(curve, P, Q) {
  if (!P || !Q) return { type: 'none' };
  const p = curve.p;
  if (P.x === Q.x && (P.y !== Q.y || P.y === 0n)) return { type: 'vertical', x: P.x, R: null };
  let lambda;
  if (P.x === Q.x) lambda = mod((3n * P.x * P.x + curve.a) * invMod(2n * P.y, p), p);
  else lambda = mod((Q.y - P.y) * invMod(Q.x - P.x, p), p);
  const c = mod(P.y - lambda * P.x, p);
  const x3 = mod(lambda * lambda - P.x - Q.x, p);
  const R = { x: x3, y: mod(lambda * x3 + c, p) };
  return { type: P.x === Q.x ? 'tangent' : 'secant', lambda, c, R };
}

/** Representative of v mod p in (−p/2, p/2]. */
export const centered = (v, p) => { v = mod(v, p); return v > p / 2n ? v - p : v; };

/* ------------------------------- named curves ----------------------------- */

const H = (s) => BigInt('0x' + s.replace(/\s/g, ''));
export const KNOWN = [
  {
    id: 'secp256k1', name: 'secp256k1',
    p: H('ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe fffffc2f'), a: 0n, b: 7n,
    G: { x: H('79be667e f9dcbbac 55a06295 ce870b07 029bfcdb 2dce28d9 59f2815b 16f81798'),
         y: H('483ada77 26a3c465 5da4fbfc 0e1108a8 fd17b448 a6855419 9c47d08f fb10d4b8') },
    n: H('ffffffff ffffffff ffffffff fffffffe baaedce6 af48a03b bfd25e8c d0364141'), h: 1n,
    beta: H('7ae96a2b 657c0710 6e64479e ac3434e9 9cf04975 12f58995 c1396c28 719501ee'),
    lambda: H('5363ad4c c05c30e0 a5261c02 8812645a 122e22ea 20816678 df02967c 1b23bd72'),
  },
  {
    id: 'p256', name: 'P-256 (secp256r1)',
    p: H('ffffffff 00000001 00000000 00000000 00000000 ffffffff ffffffff ffffffff'),
    a: H('ffffffff 00000001 00000000 00000000 00000000 ffffffff ffffffff fffffffc'),
    b: H('5ac635d8 aa3a93e7 b3ebbd55 769886bc 651d06b0 cc53b0f6 3bce3c3e 27d2604b'),
    G: { x: H('6b17d1f2 e12c4247 f8bce6e5 63a440f2 77037d81 2deb33a0 f4a13945 d898c296'),
         y: H('4fe342e2 fe1a7f9b 8ee7eb4a 7c0f9e16 2bce3357 6b315ece cbb64068 37bf51f5') },
    n: H('ffffffff 00000000 ffffffff ffffffff bce6faad a7179e84 f3b9cac2 fc632551'), h: 1n,
  },
];
export const knownCurve = (curve) => KNOWN.find((k) => k.p === curve.p && mod(k.a, k.p) === curve.a && k.b === curve.b) || null;
