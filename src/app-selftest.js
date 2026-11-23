/* ==========================================================================
   Self-test. Expected values come from OpenSSL (pyca/cryptography) for the
   256-bit curves and from an independent brute-force count for the toys.
   ========================================================================== */

function runSelfTest() {
  const items = [];
  const t = (name, fn) => {
    try { const ok = fn(); items.push({ name, ok: !!ok }); }
    catch (e) { items.push({ name: `${name}: ${e.message}`, ok: false }); }
  };
  const P = (x, y) => ({ x: BigInt(x), y: BigInt(y) });
  const k1 = new Curve(K1.a, K1.b, K1.p), r1 = new Curve(R1.a, R1.b, R1.p);
  const V = {
    '2G': P('0xc6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5', '0x1ae168fea63dc339a3c58419466ceaeef7f632653266d0e1236431a950cfe52a'),
    '3G': P('0xf9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9', '0x388f7b0f632de8140fe337e62a37f3566500a99934c2231b6cb9fd7584b8e672'),
    '5G': P('0x2f8bde4d1a07209355b4a7250a5c5128e88b84bddc619ab7cba8d569b240efe4', '0xd8ac222636e5e3d6d4dba9dda6c9c426f788271bab0d6840dca87d3aa6ac62d6'),
    '7G': P('0x5cbdf0646e5db4eaa398f365f2ea7a0e3d419b7e0330e39ce92bddedcac4f9bc', '0x6aebca40ba255960a3178d6d861a54dba813d0b813fde7b5a5082628087264da'),
    'λG': P('0xbcace2e99da01887ab0102b696902325872844067f15e98da7bba04400b88fcb', '0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8'),
    'r2G': P('0x7cf27b188d034f7e8a52380304b51ac3c08969e277f21b35a60b48fc47669978', '0x07775510db8ed040293d9ac69f7430dbba7dade63ce982299e04b79d227873d1'),
    'r3G': P('0x5ecbe4d1a6330a44c8f7ef951d4bf165e6c6b721efada985fb41661bc6e7fd6c', '0x8734640c4998ff7e374b06ce1a64a2ecd82ab036384fb83d9a79b127a27d5032'),
  };
  // arithmetic and parsing
  t('expression 2^256 − 2^32 − 977 = p(secp256k1)', () => evalExpr('2^256 - 2^32 - 977') === K1.p);
  t('expression precedence and right-assoc power', () => evalExpr('-2**2') === -4n && evalExpr('2**3**2') === 512n && evalExpr('(1+2)*3 % 5') === 4n);
  t('expression rejects code', () => ['alert(1)', 'constructor', '1;2', 'this'].every((s) => { try { evalExpr(s); return false; } catch { return true; } }));
  t('Miller–Rabin: named primes prime, 561 composite', () => isProbablePrime(K1.p) && isProbablePrime(K1.n) && isProbablePrime(R1.p) && isProbablePrime(R1.n) && !isProbablePrime(561n));
  t('Tonelli–Shanks on p ≡ 1 (mod 8)', () => [97n, 1009n, 10009n, 40961n].every((p) => { for (let i = 2n; i < 40n; i++) { const s = sqrtMod(i, p); if (s !== null && s * s % p !== i) return false; if (s === null && legendre(i, p) !== -1) return false; } return true; }));
  // secp256k1
  t('secp256k1 G on curve', () => k1.isOn(K1.G));
  for (const k of [2, 3, 5, 7]) t(`secp256k1 ${k}G (OpenSSL)`, () => k1.eq(k1.mul(BigInt(k), K1.G), V[k + 'G']));
  t('secp256k1 G + 2G = 3G (affine)', () => k1.eq(k1.add(K1.G, k1.dbl(K1.G)), V['3G']));
  t('secp256k1 n·G = 𝒪, (n−1)·G = −G', () => k1.mul(K1.n, K1.G) === null && k1.eq(k1.mul(K1.n - 1n, K1.G), k1.neg(K1.G)));
  t('secp256k1 λG = (βx, y) (OpenSSL)', () => k1.eq(k1.mul(K1.lambda, K1.G), V['λG']) && V['λG'].x === K1.beta * K1.G.x % K1.p);
  t('secp256k1 β³ = 1, λ³ = 1 (mod n)', () => powMod(K1.beta, 3n, K1.p) === 1n && powMod(K1.lambda, 3n, K1.n) === 1n);
  t('secp256k1 j-invariant 0', () => k1.jInvariant() === 0n);
  t('SEC round-trips (02/03, 04, 06/07)', () => ['compressed', 'uncompressed', 'hybrid'].every((kind) => { const Q = V['7G'], r = parsePoint(encodeSEC(Q, k1, kind), { curve: k1, G: K1.G }); return r.ok && k1.eq(r.P, Q) && r.kind === kind; }));
  t('03‖x(G) decodes to −G', () => k1.eq(parsePoint('03' + K1_GX, { curve: k1 }).P, k1.neg(K1.G)));
  t('x-only lifts to the even-y point', () => k1.eq(parsePoint(K1_GX, { curve: k1 }).P, K1.G));
  t('hybrid parity mismatch is flagged', () => parsePoint('07' + hex(K1.G.x, 32) + hex(K1.G.y, 32), { curve: k1 }).warnings.length === 1);
  t('twist x rejected (x = 5 has no y)', () => { try { parsePoint('02' + hex(5n, 32), { curve: k1 }); return legendre(132n, K1.p) === 1; } catch (e) { return /twist/.test(e.message); } });
  t('kG parser: (n-1)G, λG, -G, O', () => {
    const env = { n: K1.n, 'λ': K1.lambda };
    return k1.eq(parsePoint('(n-1)G', { curve: k1, G: K1.G, env }).P, k1.neg(K1.G)) && k1.eq(parsePoint('λG', { curve: k1, G: K1.G, env }).P, V['λG'])
      && k1.eq(parsePoint('-G', { curve: k1, G: K1.G }).P, k1.neg(K1.G)) && parsePoint('O', { curve: k1 }).P === null;
  });
  t('group law: associativity and inverse', () => {
    const A = k1.mul(0xdeadbeefn, K1.G), B = k1.mul(0xc0ffeen, K1.G), C = k1.mul(12345n, K1.G);
    return k1.eq(k1.add(k1.add(A, B), C), k1.add(A, k1.add(B, C))) && k1.add(A, k1.neg(A)) === null && k1.eq(k1.mul(0xdeadbeefn + 0xc0ffeen, K1.G), k1.add(A, B));
  });
  t('chord: R on line and curve, R = −(P+Q)', () => {
    const A = V['2G'], B = V['5G'], ch = chord(k1, A, B);
    return k1.isOn(ch.R) && mod(ch.R.y - ch.lambda * ch.R.x - ch.c, K1.p) === 0n && k1.eq(ch.R, k1.neg(V['7G']));
  });
  // P-256
  t('P-256 G on curve, n·G = 𝒪', () => r1.isOn(R1.G) && r1.mul(R1.n, R1.G) === null);
  t('P-256 2G, 3G (OpenSSL)', () => r1.eq(r1.mul(2n, R1.G), V.r2G) && r1.eq(r1.mul(3n, R1.G), V.r3G));
  // toy curves: brute-force counts
  for (const [a, b, p, N] of [[0, 7, 223, 252], [0, 7, 211, 199], [2, 3, 97, 100], [2, 2, 17, 19], [0, 7, 10009, 10192], [0, 7, 10007, 10008], [0, 7, 1009, 1029]])
    t(`#E(y² = x³ + ${a}x + ${b} over F${SUB(p)}) = ${N}`, () => smallCurve(BigInt(a), BigInt(b), BigInt(p), false).count === BigInt(N));
  t('F₂₂₃: ord(47, 71) = 21; 2G, 3G, 6G', () => {
    const c = new Curve(0n, 7n, 223n), G = P(47, 71), info = smallCurve(0n, 7n, 223n, false);
    return pointOrder(c, G, info.count, factorSmall(info.count)) === 21n && c.eq(c.mul(2n, G), P(36, 111)) && c.eq(c.mul(3n, G), P(15, 137)) && c.eq(c.mul(6n, G), P(139, 137));
  });
  t('F₉₇: (3, 6) has order 5', () => { const c = new Curve(2n, 3n, 97n); return c.mul(5n, P(3, 6)) === null && c.eq(c.mul(2n, P(3, 6)), P(80, 10)); });
  t('F₁₇: (5, 1) has order 19, dlog(13G) = 13', () => { const c = new Curve(2n, 2n, 17n), G = P(5, 1); return c.mul(19n, G) === null && dlog(c, G, c.mul(13n, G), 19n) === 13n; });
  t('torus map: x = 0 → 0 turn, x = p−1 → just under 1', () => turns(0n, K1.p) === 0 && turns(K1.p - 1n, K1.p) < 1 && turns(K1.p - 1n, K1.p) > 0.999999);
  t('secp256k1 153G: x starts with a 00 byte, SEC keeps it (OpenSSL)', () => {
    const Q = k1.mul(153n, K1.G), enc = '0200e3ae1974566ca06cc516d47e0fb165a674a3dabcfca15e722f0e3450f45889';
    return k1.eq(Q, P('0xe3ae1974566ca06cc516d47e0fb165a674a3dabcfca15e722f0e3450f45889', '0x2aeabe7e4531510116217f07bf4d07300de97e4874f81f533420a72eeb0bd6a4'))
      && encodeSEC(Q, k1) === enc && k1.eq(parsePoint(enc, { curve: k1 }).P, Q);
  });
  t('F₂₂₃ is not cyclic (max order 42): 42 of the 62 points with order | 21 lie outside ⟨G⟩', () => {
    const c = new Curve(0n, 7n, 223n), G = P(47, 71), sc = smallCurve(0n, 7n, 223n, true), f = factorSmall(sc.count);
    let rows = 0, outside = 0, max = 0n;
    for (let i = 0; i < sc.xs.length; i++) {
      const Q = P(sc.xs[i], sc.ys[i]), o = pointOrder(c, Q, sc.count, f);
      if (o > max) max = o;
      if (21n % o) continue;
      rows++;
      const k = dlog(c, G, Q, 21n);
      if (k === null) outside++; else if (!c.eq(c.mul(k, G), Q)) return false;
    }
    return max === 42n && rows === 62 && outside === 42;
  });
  t('every shape: y ↦ p − y is a reflection (its mirror plane; on the chiral trefoil, the plane of each ring)', () => SHAPES.every((sh) => {
    const a = {}, b = {}, at = (s, tt) => { const q = sh.pos(s, tt, 1.2, 0.46, {}); return [q.x, q.y, q.z]; };
    for (let i = 0; i < 24; i++) {
      const s = (i * 0.618034) % 1, tt = 0.03 + (i * 0.381966) % 0.94; // spread over the patch
      sh.pos(s, tt, 1.2, 0.46, a); sh.pos(s, 1 - tt, 1.2, 0.46, b);
      let o = [0, 0, 0], m = sh.mirror;
      if (!m) { // through the ring's centre, normal along (t = ¼) − (t = ¾)
        const c0 = at(s, 0), c1 = at(s, 0.5), q0 = at(s, 0.25), q1 = at(s, 0.75), w = q0.map((v, k) => v - q1[k]), l = Math.hypot(...w);
        o = c0.map((v, k) => (v + c1[k]) / 2); m = w.map((v) => v / l);
      }
      const d = 2 * ((a.x - o[0]) * m[0] + (a.y - o[1]) * m[1] + (a.z - o[2]) * m[2]);
      if (Math.hypot(a.x - d * m[0] - b.x, a.y - d * m[1] - b.y, a.z - d * m[2] - b.z) > 1e-9) return false;
    }
    return true;
  }));
  t('trefoil: its centre line winds 2 times around the axis and 3 around the tube, the (2, 3) torus knot', () => {
    const sh = shapeById('trefoil'), { A } = sh.knot(1.2, 0.46), n = 720;
    let phi = 0, psi = 0, prev = null;
    const wrap = (d) => d - TAU * Math.round(d / TAU);
    for (let i = 0; i <= n; i++) {
      const a = sh.pos(i / n, 0, 1.2, 0.46, {}), b = sh.pos(i / n, 0.5, 1.2, 0.46, {}), x = (a.x + b.x) / 2, y = (a.y + b.y) / 2, z = (a.z + b.z) / 2;
      const cur = [Math.atan2(y, x), Math.atan2(z, Math.hypot(x, y) - A)];
      if (prev) { phi += wrap(cur[0] - prev[0]); psi += wrap(cur[1] - prev[1]); }
      prev = cur;
    }
    return Math.abs(phi / TAU - 2) < 1e-9 && Math.abs(psi / TAU - 3) < 1e-9;
  });
  t('icosahedron: 12 vertices, 30 edges, 20 faces (V − E + F = 2)', () => ICOSA.vertices.length === 12 && ICOSA.edges === 30 && ICOSA.faces.length === 20);
  t('composite p is reported at once, not searched for a non-residue', () => {
    const t0 = performance.now();
    try { sqrtMod(1n, 3n * (2n ** 1022n + 3n)); return false; } catch (e) { return /not prime/.test(e.message) && performance.now() - t0 < 1000; }
  });
  const pass = items.filter((i) => i.ok).length;
  return { pass, fail: items.length - pass, items };
}

function renderSelfTest(r) {
  $('#testOut').innerHTML = `<div class="sum ${r.fail ? 'badc' : 'good'}">${r.pass} of ${r.items.length} checks pass</div>
    <ol>${r.items.map((i) => `<li class="${i.ok ? '' : 'f'}">${i.ok ? '✓' : '✗'} ${escapeHtml(i.name)}</li>`).join('')}</ol>`;
  $('#testAside').textContent = r.fail ? `${r.fail} failing` : `${r.pass} checks pass`;
}

boot();
