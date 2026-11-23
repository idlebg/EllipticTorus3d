// Node cross-check of src/engine.js against ref_out.json (OpenSSL + sympy reference).
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as E from '../src/engine.js';

const ref = JSON.parse(readFileSync(new URL('../ref_out.json', import.meta.url)));
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log('FAIL', msg); } };
const eqP = (P, xy) => P && P.x === BigInt(xy[0]) && P.y === BigInt(xy[1]);

// expressions
const k1 = E.KNOWN[0], r1 = E.KNOWN[1];
ok(E.evalExpr('2**256 - 2**32 - 977') === k1.p, 'expr secp p');
ok(E.evalExpr('2^256 − 2^32 − 977') === k1.p, 'expr caret + unicode minus');
ok(E.evalExpr('0xff + 1') === 256n, 'hex + dec');
ok(E.evalExpr('(1+2)*3') === 9n, 'parens');
ok(E.evalExpr('-2**2') === -4n, 'unary vs power');
ok(E.evalExpr('2**3**2') === 512n, 'right assoc');
ok(E.evalExpr('7 % 3') === 1n && E.evalExpr('-5 % 7') === 2n, 'mod');
ok(E.evalExpr('0b101 + 0o17 + 1_000') === 5n + 15n + 1000n, 'bin/oct/sep');
ok(E.evalExpr('n - 1', { n: 10n }) === 9n, 'env');
for (const bad of ['2**', 'alert(1)', '1/0', '()', '2 3', '0x', 'constructor', '__proto__', '1;2', '2**-1', '9**99999999'])
  { let threw = false; try { E.evalExpr(bad); } catch { threw = true; } ok(threw, 'reject ' + bad); }

// primality
ok(E.isProbablePrime(k1.p) && E.isProbablePrime(k1.n) && E.isProbablePrime(r1.p) && E.isProbablePrime(r1.n), 'named primes');
ok(!E.isProbablePrime(561n) && !E.isProbablePrime(2n ** 128n + 1n) && E.isProbablePrime(2n ** 127n - 1n), 'MR edge');

// sqrt on all residue classes
for (const p of [17n, 97n, 223n, 10009n, 1009n, 10007n, k1.p, r1.p, 2n ** 127n - 1n, 65537n, 40961n /* 1 mod 2^13 */]) {
  let good = true;
  for (let i = 1n; i < 60n; i++) {
    const r = (i * 7919n + 13n) % p; const s = E.sqrtMod(r, p);
    if (s === null) { if (E.legendre(r, p) !== -1) good = false; } else if (s * s % p !== r) good = false;
  }
  ok(good, 'sqrt p=' + p);
}

// secp256k1
const C1 = new E.Curve(k1.a, k1.b, k1.p);
ok(C1.isOn(k1.G), 'G on secp');
for (const k of [2, 3, 5, 7]) ok(eqP(C1.mul(BigInt(k), k1.G), ref.secp256k1[k + 'G']), `secp ${k}G`);
ok(eqP(C1.add(C1.dbl(k1.G), k1.G), ref.secp256k1['3G']), 'affine 2G+G');
ok(eqP(C1.mul(k1.n - 1n, k1.G), ref.secp256k1['n-1G']), '(n-1)G');
ok(C1.mul(k1.n, k1.G) === null, 'nG = O');
ok(eqP(C1.mul(k1.lambda, k1.G), ref.secp256k1.lamG), 'λG');
ok(eqP(C1.mul(k1.lambda * k1.lambda % k1.n, k1.G), ref.secp256k1.lam2G), 'λ²G');
ok(E.powMod(k1.beta, 3n, k1.p) === 1n, 'β³');
ok(C1.jInvariant() === 0n, 'j=0');
const G = k1.G;
for (const kind of ['compressed', 'uncompressed', 'hybrid']) {
  const enc = E.encodeSEC(C1.mul(3n, G), C1, kind);
  const back = E.parsePoint(enc, { curve: C1, G });
  ok(back.ok && C1.eq(back.P, C1.mul(3n, G)) && back.kind === kind, 'roundtrip ' + kind);
}
const negG = E.parsePoint('0379be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798', { curve: C1, G });
ok(C1.eq(negG.P, C1.neg(G)), '03… is −G');
ok(C1.eq(E.parsePoint('79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798', { curve: C1, G }).P, G), 'x-only lifts to even y (G)');
const env = { p: k1.p, n: k1.n, lambda: k1.lambda, λ: k1.lambda };
ok(C1.eq(E.parsePoint('(n-1)G', { curve: C1, G, env }).P, C1.neg(G)), '(n-1)G parse');
ok(C1.eq(E.parsePoint('λG', { curve: C1, G, env }).P, { x: k1.beta * G.x % k1.p, y: G.y }), 'λG parse = (βx, y)');
ok(E.parsePoint('-G', { curve: C1, G }).P.y === k1.p - G.y, '-G');
ok(E.parsePoint('O', { curve: C1, G }).P === null, 'O');
const hyb = E.parsePoint('07' + E.encodeSEC(G, C1, 'uncompressed').slice(2), { curve: C1, G });
ok(hyb.ok && hyb.warnings.length === 1, 'hybrid parity mismatch flagged (G has even y)');
for (const bad of ['02' + '00'.repeat(31) + '05', '05' + 'aa'.repeat(32), '02abcd', 'zz', '(1,2,3)'])
  { let threw = false; try { E.parsePoint(bad, { curve: C1, G }); } catch { threw = true; } ok(threw, 'reject point ' + bad); }
// x=5 on secp256k1: 125+7=132 — check non-residue path explicitly
{ let msg = ''; try { E.parsePoint('02' + E.hex(5n, 32), { curve: C1, G }); } catch (e) { msg = e.message; } ok(E.legendre(132n, k1.p) === -1 ? /twist/.test(msg) : msg === '', 'twist message for x=5'); }

// associativity / inverse on random-ish points
const P = C1.mul(123456789n, G), Q = C1.mul(987654321n, G), R = C1.mul(55555n, G);
ok(C1.eq(C1.add(C1.add(P, Q), R), C1.add(P, C1.add(Q, R))), 'assoc');
ok(C1.add(P, C1.neg(P)) === null && C1.eq(C1.add(P, null), P), 'inverse/identity');
ok(C1.eq(C1.mul(123456789n + 987654321n, G), C1.add(P, Q)), 'distributive');
const ch = E.chord(C1, P, Q);
ok(ch.type === 'secant' && C1.isOn(ch.R) && C1.eq(ch.R, C1.neg(C1.add(P, Q))), 'chord third point');
ok(E.mod(ch.R.y - (ch.lambda * ch.R.x + ch.c), k1.p) === 0n, 'R on line');
const tg = E.chord(C1, P, P);
ok(tg.type === 'tangent' && C1.eq(tg.R, C1.neg(C1.dbl(P))), 'tangent third point');
ok(E.chord(C1, P, C1.neg(P)).type === 'vertical', 'vertical chord');

// P-256
const C2 = new E.Curve(r1.a, r1.b, r1.p);
ok(C2.isOn(r1.G) && C2.mul(r1.n, r1.G) === null, 'P-256 G, nG=O');
ok(eqP(C2.mul(2n, r1.G), ref.p256['2G']) && eqP(C2.mul(3n, r1.G), ref.p256['3G']), 'P-256 2G 3G');
ok(E.knownCurve(C2)?.id === 'p256' && E.knownCurve(C1)?.id === 'secp256k1', 'knownCurve');

// toys
for (const t of ref.toys) {
  const C = new E.Curve(BigInt(t.a), BigInt(t.b), BigInt(t.p));
  const sc = E.smallCurve(C.a, C.b, C.p, true);
  ok(sc.count === BigInt(t.count), `#E ${t.name} = ${t.count} (got ${sc.count})`);
  ok(sc.xs.length === t.count - 1, `points listed ${t.name}`);
  let allOn = true; for (let i = 0; i < sc.xs.length; i++) if (!C.isOn({ x: BigInt(sc.xs[i]), y: BigInt(sc.ys[i]) })) { allOn = false; break; }
  ok(allOn, `cloud on curve ${t.name}`);
  const N = sc.count, f = E.factorSmall(N);
  const mp = { x: BigInt(t.max_order_point[0]), y: BigInt(t.max_order_point[1]) };
  ok(E.pointOrder(C, mp, N, f) === BigInt(t.max_order), `max order ${t.name}`);
  if (t.G) {
    const g = { x: BigInt(t.G[0]), y: BigInt(t.G[1]) };
    ok(E.pointOrder(C, g, N, f) === BigInt(t.ordG), `ordG ${t.name}`);
    t.multiples.forEach((m, i) => ok(m === null ? C.mul(BigInt(i + 1), g) === null : eqP(C.mul(BigInt(i + 1), g), m), `${t.name} ${i + 1}G`));
    const k = BigInt(Math.min(4, t.ordG - 1));
    ok(E.dlog(C, g, C.mul(k, g), BigInt(t.ordG)) === k, `dlog ${t.name}`);
  }
}
// whole point sets, orders, 2-torsion and membership in <G> (ref.py: sympy roots + brute-force group law)
const setHash = (pairs) => createHash('sha256').update(pairs.sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(([x, y]) => `${x},${y}\n`).join('')).digest('hex');
for (const t of ref.toys) {
  const C = new E.Curve(BigInt(t.a), BigInt(t.b), BigInt(t.p)), N = BigInt(t.count), f = E.factorSmall(N);
  const sc = E.smallCurve(C.a, C.b, C.p, true);
  ok(setHash([...sc.xs].map((x, i) => [x, sc.ys[i]])) === t.points_sha256, `point set (enumeration) ${t.name}`);
  // the same set from liftX: Tonelli–Shanks / p ≡ 3 (mod 4) square roots for every x, both parities
  const lifted = [];
  let parityOK = true;
  for (let x = 0; x < t.p; x++) {
    const P = E.liftX(C, BigInt(x), false);
    if (!P) continue;
    const Q = E.liftX(C, BigInt(x), true);
    if ((P.y & 1n) !== 0n || (Q.y !== 0n && (Q.y & 1n) !== 1n) || E.mod(P.y + Q.y, C.p) !== 0n) parityOK = false;
    lifted.push([x, Number(P.y)]);
    if (P.y !== 0n) lifted.push([x, Number(Q.y)]);
  }
  ok(setHash(lifted) === t.points_sha256 && parityOK, `point set (liftX, p ≡ ${t.p_mod_8} mod 8) ${t.name}`);
  const hist = {};
  for (let i = 0; i < sc.xs.length; i++) { const o = String(E.pointOrder(C, { x: BigInt(sc.xs[i]), y: BigInt(sc.ys[i]) }, N, f)); hist[o] = (hist[o] || 0) + 1; }
  ok(JSON.stringify(hist) === JSON.stringify(t.order_hist), `order histogram ${t.name}`);
  for (const [x, y] of t.two_torsion) {
    const P = { x: BigInt(x), y: BigInt(y) };
    ok(C.dbl(P) === null && C.mul(2n, P) === null && C.eq(C.mul(3n, P), P) && E.chord(C, P, P).type === 'vertical' && E.pointOrder(C, P, N, f) === 2n, `2-torsion (${x}, 0) ${t.name}`);
  }
  if (t.dlog_table) {
    const g = { x: BigInt(t.G[0]), y: BigInt(t.G[1]) };
    const wrong = t.dlog_table.filter(([x, y, k]) => E.dlog(C, g, { x: BigInt(x), y: BigInt(y) }, BigInt(t.ordG)) !== (k === null ? null : BigInt(k)));
    ok(!wrong.length, `dlog / membership in <G> for ${t.dlog_table.length} points (${t.dlog_table.filter((r) => r[2] === null).length} outside) ${t.name}`);
  }
}

// SEC encodings keep leading zero bytes; x-only and hybrid on P-256 (OpenSSL points)
for (const [C, k1x, name] of [[C1, ref.secp256k1, 'secp256k1'], [C2, ref.p256, 'P-256']]) {
  const lz = k1x.leading_zero_x, Gk = C === C1 ? k1.G : r1.G, P = C.mul(BigInt(lz.k), Gk);
  ok(eqP(P, lz.xy), `${name} ${lz.k}G (x has a leading zero byte)`);
  ok(E.encodeSEC(P, C) === lz.compressed && C.eq(E.parsePoint(lz.compressed, { curve: C }).P, P), `${name} compressed SEC keeps the 00 byte`);
  const xo = E.parsePoint(lz.compressed.slice(2), { curve: C });
  ok(xo.kind === 'x-only' && xo.P.x === P.x && (xo.P.y & 1n) === 0n, `${name} x-only with a leading zero byte`);
}
ok(eqP(E.parsePoint(ref.p256['2G'][0].slice(2).padStart(64, '0'), { curve: C2 }).P, ref.p256.x2G_even), 'P-256 x-only lifts to the even-y point');
{ const Q = C2.mul(3n, r1.G), h = E.parsePoint(E.encodeSEC(Q, C2, 'hybrid'), { curve: C2 }); ok(h.kind === 'hybrid' && C2.eq(h.P, Q) && !h.warnings.length, 'P-256 hybrid round trip'); }

// inputs that must fail fast instead of freezing the tab
const fast = (name, fn, re, ms = 300) => {
  const t0 = performance.now(); let err = null;
  try { fn(); } catch (e) { err = e; }
  const dt = performance.now() - t0;
  ok(err instanceof E.EcError && re.test(err.message) && dt < ms, `${name}: EcError ${re} in < ${ms} ms (got ${err ? err.constructor.name + ': ' + err.message : 'no error'}, ${dt.toFixed(0)} ms)`);
};
fast('(2**32767)**32768', () => E.evalExpr('(2**32767)**32768'), /too large/);
fast('(2**4095)**4096', () => E.evalExpr('(2**4095)**4096'), /too large/, 50);
fast('1999 nested parentheses', () => E.evalExpr('('.repeat(1999) + '1' + ')'.repeat(1999)), /nested/);
ok(E.bitLen(E.evalExpr('2**32767')) === 32768 && E.evalExpr('(2**16383)**2') === 2n ** 32766n && E.evalExpr('(-2)**3') === -8n
  && E.evalExpr('0**0') === 1n && E.evalExpr('1**99999999') === 1n && E.evalExpr('(-1)**99999999') === -1n, 'power guard keeps legal powers');
for (const bad of ['2**32768', '3**20675', '(2**200)**200']) { let threw = false; try { E.evalExpr(bad); } catch (e) { threw = e instanceof E.EcError; } ok(threw, 'power guard rejects ' + bad); }
{
  const pc = 3n * (2n ** 1022n + 3n), Cc = new E.Curve(0n, 1n, pc); // 1024-bit, composite, ≡ 1 (mod 4)
  fast('composite p ≡ 1 (mod 4): sqrt of a square', () => E.sqrtMod(1n, pc), /prime/);
  fast('composite p: compressed point', () => E.parsePoint('02' + '00'.repeat(Cc.fb), { curve: Cc }), /prime/);
  fast('composite p: x-only point', () => E.parsePoint('00'.repeat(Cc.fb), { curve: Cc }), /prime/);
  const p3 = 3n * (2n ** 1022n + 1n); // composite, ≡ 3 (mod 4)
  fast('composite p ≡ 3 (mod 4)', () => E.sqrtMod(4n, p3), /prime/);
  // 14 ≡ −1 (mod 15) and 7 = (15 − 1)/2 is odd, so Euler's criterion gives −1 although 15 = 3·5: not a "twist" x
  fast('composite p, Euler symbol −1 (14 mod 15)', () => E.sqrtMod(14n, 15n), /prime/);
}

const pb = new E.Curve(0n, 7n, 223n);
ok(E.parsePoint('(47, 71)', { curve: pb }).onCurve && !E.parsePoint('(47, 72)', { curve: pb }).onCurve, 'affine on/off curve');
ok(E.parsePoint('0x022f', { curve: pb }).P.x === 0x2fn, 'toy compressed 1-byte x');
ok(E.cubeRootOfUnity(223n) !== null && E.powMod(E.cubeRootOfUnity(223n), 3n, 223n) === 1n && E.cubeRootOfUnity(10007n) === null, 'β small');
ok(Math.abs(E.turns(k1.p - 1n, k1.p) - 1) < 1e-12 && E.turns(0n, k1.p) === 0, 'turns scale');
ok(E.turns(0xabcdn, 1n << 16n, 'low', 8) === 0xcd / 256, 'turns low');

let t0 = performance.now(); for (let i = 0; i < 20; i++) C1.mul(k1.n - 12345n, G); const ms = (performance.now() - t0) / 20;
console.log(`secp256k1 scalar mult: ${ms.toFixed(2)} ms`);
t0 = performance.now(); E.smallCurve(0n, 7n, 262139n, true); console.log(`cloud p≈2^18: ${(performance.now() - t0).toFixed(1)} ms`);
t0 = performance.now(); E.smallCurve(0n, 7n, 4194301n, false); console.log(`count p≈2^22: ${(performance.now() - t0).toFixed(1)} ms`);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
