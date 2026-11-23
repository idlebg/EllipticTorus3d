// Geometry of the shapes in src/app-shapes.js, checked from their definitions (no reference values needed):
// finite points, unit normals perpendicular to the surface, negation = the mirror reflection (on the chiral trefoil:
// the reflection inside each ring), seams that close where the shape is periodic, the Klein bottle's twisted seam,
// the icosahedron's faces, and the trefoil's knot type and embedded tube.
import * as Sh from '../src/app-shapes.js';

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log('FAIL', msg); } };
const P = (sh, s, t, R, r) => sh.pos(s, t, R, r, { x: 0, y: 0, z: 0 });
const N = (sh, s, t, R, r) => sh.nrm(s, t, R, r, { x: 0, y: 0, z: 0 });
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const len = (a) => Math.sqrt(dot(a, a));
const dist = (a, b) => len(sub(a, b));
const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const scale = (a, k) => ({ x: a.x * k, y: a.y * k, z: a.z * k });
const reflect = (a, m) => { const k = 2 * dot(a, m); return { x: a.x - k * m.x, y: a.y - k * m.y, z: a.z - k * m.z }; };
/** The plane of the ring at s: through the midpoint of t = 0 and t = ½, normal along (t = ¼) − (t = ¾). */
const ringPlane = (sh, s, R, r) => {
  const w = sub(P(sh, s, 0.25, R, r), P(sh, s, 0.75, R, r));
  return [scale(add(P(sh, s, 0, R, r), P(sh, s, 0.5, R, r)), 0.5), scale(w, 1 / len(w))];
};

const ids = Sh.SHAPES.map((s) => s.id);
ok(ids.join() === 'torus,cylinder,sphere,ellipsoid,icosahedron,lemniscate,trefoil,wavy,klein', 'shape list ' + ids.join());
ok(Sh.shapeById('nope') === Sh.SHAPES[0] && Sh.shapeById('klein').id === 'klein', 'shapeById falls back to the torus');

for (const [R, r] of [[1.2, 0.46], [1.7, 0.3]]) {
  for (const sh of Sh.SHAPES) {
    const tag = `${sh.id} R=${R} r=${r}`;
    let finite = true, unit = true, perp = true, mirror = true, mirrorN = true, maxR = 0;
    const m = sh.mirror && { x: sh.mirror[0], y: sh.mirror[1], z: sh.mirror[2] };
    for (let i = 0; i <= 40; i++) for (let j = 0; j <= 40; j++) {
      const s = i / 40, t = j / 40, p = P(sh, s, t, R, r), n = N(sh, s, t, R, r);
      if (![p.x, p.y, p.z, n.x, n.y, n.z].every(Number.isFinite)) finite = false;
      if (Math.abs(len(n) - 1) > 1e-9) unit = false;
      maxR = Math.max(maxR, len(p));
      // normal ⟂ surface: skip the sphere family's poles (∂P/∂s vanishes) and the icosahedron (checked below)
      if (sh.id !== 'icosahedron' && t > 0.02 && t < 0.98) {
        const h = 1e-6, ps = sub(P(sh, s + h, t, R, r), P(sh, s - h, t, R, r)), pt = sub(P(sh, s, t + h, R, r), P(sh, s, t - h, R, r));
        if (Math.abs(dot(n, ps)) > 1e-6 * len(ps) + 1e-12 || Math.abs(dot(n, pt)) > 1e-6 * len(pt) + 1e-12) perp = false;
      }
      // negation is t ↦ 1 − t in patch coordinates and must be the reflection through the mirror plane; a shape
      // without one (the trefoil) must still reflect each ring onto itself, through the plane at the ring's centre
      const q = P(sh, s, 1 - t, R, r), [o, w] = m ? [{ x: 0, y: 0, z: 0 }, m] : ringPlane(sh, s, R, r);
      if (dist(add(reflect(sub(p, o), w), o), q) > 1e-9) mirror = false;
      if (dist(reflect(n, w), N(sh, s, 1 - t, R, r)) > 1e-6) mirrorN = false;
    }
    ok(finite, `${tag}: finite points and normals`);
    ok(unit, `${tag}: unit normals`);
    ok(perp, `${tag}: normal perpendicular to the surface`);
    ok(maxR > 0.5 && maxR < 4, `${tag}: size ${maxR.toFixed(2)}`);
    ok(mirror, `${tag}: negation is the reflection through ${m ? 'the mirror plane' : 'the plane of its ring'}`);
    ok(mirrorN, `${tag}: normals mirror too (lifted points stay mirror images)`);
    // seams: periodic directions close up; the Klein bottle's u seam glues (1, t) to (0, ½ − t)
    let closeS = true, closeT = true;
    for (let k = 0; k <= 40; k++) {
      const q = k / 40;
      if (!sh.cutU && dist(P(sh, 0, q, R, r), P(sh, 1, q, R, r)) > 1e-9) closeS = false;
      if (!sh.cutV && dist(P(sh, q, 0, R, r), P(sh, q, 1, R, r)) > 1e-9) closeT = false;
      if (sh.id === 'klein' && dist(P(sh, 1, q, R, r), P(sh, 0, ((0.5 - q) % 1 + 1) % 1, R, r)) > 1e-9) closeS = false;
    }
    ok(closeS && closeT, `${tag}: seams close where the shape is periodic`);
  }
}

// turns → patch coordinates: y = 0 lands on the mirror plane of a cut shape, and y ↦ p − y is t ↦ 1 − t
{
  const sph = Sh.shapeById('sphere'), tor = Sh.shapeById('torus');
  ok(Sh.patchST(sph, 0.3, 0)[1] === 0.5 && Sh.patchST(tor, 0.3, 0)[1] === 0, 'y = 0: middle of a cut shape, v = 0 on the torus');
  let neg = true;
  for (const tv of [0.01, 0.2, 0.4999, 0.5001, 0.75, 0.99]) if (Math.abs(Sh.patchST(sph, 0.1, 1 - tv)[1] - (1 - Sh.patchST(sph, 0.1, tv)[1])) > 1e-12) neg = false;
  ok(neg, 'negation in turns is t ↦ 1 − t in patch coordinates');
}

// icosahedron: the 12 cyclic permutations of (0, ±1, ±φ), faces from the edge length; points land on faces
{
  const I = Sh.ICOSA;
  ok(I.vertices.length === 12 && I.faces.length === 20 && I.edges === 30 && I.vertices.length - I.edges + I.faces.length === 2, 'icosahedron: V 12, E 30, F 20, V − E + F = 2');
  ok(I.planes.every((f) => Math.abs(f.d - I.planes[0].d) < 1e-12), 'icosahedron: every face at the same distance (inradius)');
  const sh = Sh.shapeById('icosahedron');
  let onFace = true, inside = true;
  for (let i = 0; i <= 30; i++) for (let j = 1; j < 30; j++) {
    const R = 1.2, p = P(sh, i / 30, j / 30, R, 0.46), n = N(sh, i / 30, j / 30, R, 0.46), k = 1.3 * R;
    // the faces whose planes hold p: one inside a face, two on an edge, five at a vertex; n is their normalised sum
    const on = I.planes.filter((q) => Math.abs(q.n[0] * p.x + q.n[1] * p.y + q.n[2] * p.z - q.d * k) < 1e-9);
    const sx = on.reduce((a, q) => a + q.n[0], 0), sy = on.reduce((a, q) => a + q.n[1], 0), sz = on.reduce((a, q) => a + q.n[2], 0), sl = Math.hypot(sx, sy, sz);
    if (!on.length || Math.abs(sx / sl - n.x) + Math.abs(sy / sl - n.y) + Math.abs(sz / sl - n.z) > 1e-9) onFace = false;
    if (I.planes.some((q) => q.n[0] * p.x + q.n[1] * p.y + q.n[2] * p.z > q.d * k + 1e-9)) inside = false;
  }
  ok(onFace && inside, 'icosahedron: projected points lie on the face whose normal they carry, inside every other face');
}

// trefoil: the tube's centre line is the (2, 3) torus knot, and the tube never runs into itself
{
  const sh = Sh.shapeById('trefoil');
  ok(sh.mirror === null, 'trefoil: chiral, no mirror plane');
  for (const [R, r] of [[1.2, 0.46], [0.8, 0.75], [2, 0.75]]) {
    const { A, B, rho } = sh.knot(R, r), n = 2400, spine = [];
    // centre line from the shape itself: the midpoint of opposite points of each ring
    for (let i = 0; i < n; i++) spine.push(scale(add(P(sh, i / n, 0, R, r), P(sh, i / n, 0.5, R, r)), 0.5));
    const ang = (c) => [Math.atan2(c.y, c.x), Math.atan2(c.z, Math.hypot(c.x, c.y) - A)];
    const wrap = (d) => d - 2 * Math.PI * Math.round(d / (2 * Math.PI));
    let onTorus = 0, phi = 0, psi = 0;
    for (let i = 0; i < n; i++) {
      const c = spine[i], [f0, s0] = ang(c), [f1, s1] = ang(spine[(i + 1) % n]);
      onTorus = Math.max(onTorus, Math.abs(Math.hypot(Math.hypot(c.x, c.y) - A, c.z) - B));
      phi += wrap(f1 - f0); psi += wrap(s1 - s0);
    }
    const [tA, tB] = [phi, psi].map((x) => x / (2 * Math.PI));
    ok(onTorus < 1e-9 && Math.abs(tA - 2) < 1e-9 && Math.abs(tB - 3) < 1e-9,
      `trefoil R=${R} r=${r}: centre line on the torus (${A}, ${B.toFixed(3)}), ${tA.toFixed(6)} turns around the axis and ${tB.toFixed(6)} around the tube: the (2, 3) torus knot`);
    // embedded: no point of the tube is closer than rho to any point of the centre line (a crossing or a fold would be)
    let closest = Infinity;
    for (let i = 0; i < n; i += 10) for (let j = 0; j < 16; j++) {
      const p = P(sh, i / n, j / 16, R, r);
      for (const c of spine) closest = Math.min(closest, dist(p, c));
    }
    ok(closest > rho * (1 - 1e-9), `trefoil R=${R} r=${r}: the tube (radius ${rho.toFixed(3)}) is embedded, closest centre-line point ${closest.toFixed(6)}`);
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
