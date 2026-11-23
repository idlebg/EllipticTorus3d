/* ==========================================================================
   Shapes: where a point of F_p × F_p lands in 3D.

   A shape is a patch P(s, t), (s, t) ∈ [0, 1]², fed by the torus turns (u, v) = (x/p, y/p). A periodic
   direction takes its turn as it is. A cut direction (the surface does not close up there) is centred,
   t = v + ½ (mod 1): y = 0 lies in the middle of the patch and the cut falls at y ≈ p/2. Every shape is
   placed so that negation, y ↦ p − y (t ↦ 1 − t), is the reflection through its mirror plane, exactly as
   on the torus, and the normals mirror with it, so lifted rings and markers stay mirror images.
   Pure maths, no three.js: pos / nrm write x, y, z into `out` (test/shapes.test.mjs checks them).
   ========================================================================== */

export const TURN = Math.PI * 2;

/**
 * Regular icosahedron: the 12 cyclic permutations of (0, ±1, ±φ). Its faces are the vertex triples at mutual
 * distance 2, the edge length. The vertex set is closed under z ↦ −z, so that plane is a mirror of the solid.
 * Face planes are stored for unit circumradius: n · P = d on face (n, d).
 */
export const ICOSA = (() => {
  const f = (1 + Math.sqrt(5)) / 2, V = [];
  for (const a of [-1, 1]) for (const b of [-f, f]) V.push([0, a, b], [a, b, 0], [b, 0, a]);
  const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  const adj = (i, j) => Math.abs(d2(V[i], V[j]) - 4) < 1e-9;
  let edges = 0;
  for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) if (adj(i, j)) edges++;
  const faces = [], planes = [], R0 = Math.hypot(1, f);
  for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) for (let k = j + 1; k < 12; k++) {
    if (!(adj(i, j) && adj(j, k) && adj(i, k))) continue;
    const [a, b, c] = [V[i], V[j], V[k]];
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const ln = Math.hypot(...n); n = n.map((q) => q / ln);
    let tri = [i, j, k];
    if (n[0] * a[0] + n[1] * a[1] + n[2] * a[2] < 0) { n = n.map((q) => -q); tri = [i, k, j]; } // outward, counter-clockwise
    faces.push(tri);
    planes.push({ n, d: (n[0] * a[0] + n[1] * a[1] + n[2] * a[2]) / R0 });
  }
  return { vertices: V.map((v) => v.map((q) => q / R0)), faces, planes, edges };
})();

/** Sphere direction for patch (s, t): longitude 2πs, latitude π(t − ½). */
function sphereDir(s, t, o) {
  const u = s * TURN, l = Math.PI * (t - 0.5), c = Math.cos(l);
  o.x = c * Math.cos(u); o.y = c * Math.sin(u); o.z = Math.sin(l);
  return o;
}

/** Ray from the centre along d leaves the icosahedron (circumradius k) at t·d; ties (edges) average the normals. */
function icosaHit(d, k, o, wantNormal) {
  let best = Infinity, nx = 0, ny = 0, nz = 0;
  for (const { n, d: h } of ICOSA.planes) {
    const c = n[0] * d.x + n[1] * d.y + n[2] * d.z;
    if (c <= 1e-12) continue;
    const tt = h * k / c;
    if (best === Infinity || tt < best * (1 - 1e-12)) { best = tt; nx = n[0]; ny = n[1]; nz = n[2]; }
    else if (tt <= best * (1 + 1e-12)) { nx += n[0]; ny += n[1]; nz += n[2]; }
  }
  if (wantNormal) { const l = Math.hypot(nx, ny, nz); o.x = nx / l; o.y = ny / l; o.z = nz / l; }
  else { o.x = d.x * best; o.y = d.y * best; o.z = d.z * best; }
  return o;
}

/** Lemniscate of Bernoulli (unit size) at angle θ and its unit tangent. */
function lemniscate(th) {
  const sn = Math.sin(th), cs = Math.cos(th), D = 1 + sn * sn, s2 = 2 * sn * cs, c2 = cs * cs - sn * sn;
  const x = cs / D, y = sn * cs / D;
  const dx = (-sn * D - cs * s2) / (D * D), dy = (c2 * D - (s2 / 2) * s2) / (D * D), l = Math.hypot(dx, dy);
  return { x, y, tx: dx / l, ty: dy / l };
}

/**
 * Sizes of the trefoil: the (2, 3) torus knot lies on the torus of radii A, B and carries a tube of radius rho.
 * B = 0.45·A is where the knot is thickest: half its closest strand distance is 0.447·A (the minimum radius of
 * curvature is 0.738·A), so the tube stays embedded over the whole slider range, R ≥ 0.8 and r ≤ 0.75
 * (test/shapes.test.mjs checks the worst corner).
 */
const trefoilSize = (R, r) => ({ A: R, B: 0.45 * R, rho: 0.42 * r });
/**
 * The (2, 3) torus knot C(θ) = ((A + B cos 3θ) cos 2θ, (A + B cos 3θ) sin 2θ, B sin 3θ) with its frame: N is the
 * torus normal at C (perpendicular to the knot, which lies on the torus), T the unit tangent, W = T × N.
 */
function trefoil(th, A, B) {
  const c2 = Math.cos(2 * th), s2 = Math.sin(2 * th), c3 = Math.cos(3 * th), s3 = Math.sin(3 * th), w = A + B * c3;
  let tx = -3 * B * s3 * c2 - 2 * w * s2, ty = -3 * B * s3 * s2 + 2 * w * c2, tz = 3 * B * c3;
  const l = Math.hypot(tx, ty, tz); tx /= l; ty /= l; tz /= l;
  const nx = c3 * c2, ny = c3 * s2, nz = s3;
  return { x: w * c2, y: w * s2, z: B * s3, nx, ny, nz, wx: ty * nz - tz * ny, wy: tz * nx - tx * nz, wz: tx * ny - ty * nx };
}

/** The classic Klein bottle immersion (u along, v around), raw units; y is odd in v, x and z even. */
function kleinRaw(u, v) {
  const cu = Math.cos(u), su = Math.sin(u), w = 2 * (1 - cu / 2);
  let x, z;
  if (u < Math.PI) { x = 3 * cu * (1 + su) + w * cu * Math.cos(v); z = -8 * su - w * su * Math.cos(v); }
  else { x = 3 * cu * (1 + su) + w * Math.cos(v + Math.PI); z = -8 * su; }
  return [x, -w * Math.sin(v), z];
}
const KLEIN_C = (() => { // centre of the bounding box in x and z (y is symmetric), so the bottle sits on the origin
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (let i = 0; i <= 400; i++) for (let j = 0; j < 64; j++) {
    const [x, , z] = kleinRaw(i / 400 * TURN, j / 64 * TURN);
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z);
  }
  return [(x0 + x1) / 2, (z0 + z1) / 2];
})();
function kleinPos(s, t, k, o) { // bottle lying along y, its mirror plane horizontal
  const [x, y, z] = kleinRaw(s * TURN, t * TURN);
  o.x = k * (x - KLEIN_C[0]); o.y = k * (z - KLEIN_C[1]); o.z = k * y;
  return o;
}

/** Unit normal from the patch derivatives (central differences), for shapes without a closed form. */
function numericNormal(pos, s, t, R, r, o) {
  const h = 1e-6, a = pos(s + h, t, R, r, {}), b = pos(s - h, t, R, r, {}), c = pos(s, t + h, R, r, {}), d = pos(s, t - h, R, r, {});
  const ps = [a.x - b.x, a.y - b.y, a.z - b.z], pt = [c.x - d.x, c.y - d.y, c.z - d.z];
  const n = [ps[1] * pt[2] - ps[2] * pt[1], ps[2] * pt[0] - ps[0] * pt[2], ps[0] * pt[1] - ps[1] * pt[0]], l = Math.hypot(...n);
  o.x = n[0] / l; o.y = n[1] / l; o.z = n[2] / l;
  return o;
}

/*
 * id, name; cutU / cutV: the direction does not close up (centred if it is t); mirror: unit normal of the plane
 * that negation reflects through (null: no such plane, see the trefoil); closed: a solid with an outside (draw one
 * face side); seg: mesh resolution; lineS: samples along a full line of constant t (long shapes need more);
 * icon: lines of constant s and of constant t in the picker's pictogram; sliders: what the R and r sliders mean
 * here (null = unused); around: how the chord's winding is worded.
 */
export const SHAPES = [
  {
    id: 'torus', name: 'Torus', cutU: false, cutV: false, mirror: [0, 0, 1], closed: true, seg: [160, 56],
    sliders: ['Major R', 'Minor r'], around: 'around the tube',
    legend: 'u = 2π·x/p around the hole, v = 2π·y/p around the tube',
    pos(s, t, R, r, o) { const u = s * TURN, v = t * TURN, w = R + r * Math.cos(v); o.x = w * Math.cos(u); o.y = w * Math.sin(u); o.z = r * Math.sin(v); return o; },
    nrm(s, t, R, r, o) { const u = s * TURN, v = t * TURN; o.x = Math.cos(v) * Math.cos(u); o.y = Math.cos(v) * Math.sin(u); o.z = Math.sin(v); return o; },
  },
  {
    id: 'cylinder', name: 'Cylinder', cutU: false, cutV: true, mirror: [0, 0, 1], closed: false, seg: [128, 24], icon: [10, 4],
    sliders: ['Radius', 'Height'], around: 'through the height',
    legend: 'u = 2π·x/p around the axis; height from y, centred: y = 0 at mid-height, the cut at y ≈ p/2',
    pos(s, t, R, r, o) { const u = s * TURN; o.x = R * Math.cos(u); o.y = R * Math.sin(u); o.z = 4 * r * (t - 0.5); return o; },
    nrm(s, t, R, r, o) { const u = s * TURN; o.x = Math.cos(u); o.y = Math.sin(u); o.z = 0; return o; },
  },
  {
    id: 'sphere', name: 'Sphere', cutU: false, cutV: true, mirror: [0, 0, 1], closed: true, seg: [128, 64], icon: [8, 7],
    sliders: ['Radius', null], around: 'from pole to pole',
    legend: 'longitude 2π·x/p; latitude from y, centred: y = 0 on the equator, the poles at y ≈ p/2',
    pos(s, t, R, r, o) { const k = 1.25 * R; sphereDir(s, t, o); o.x *= k; o.y *= k; o.z *= k; return o; },
    nrm(s, t, R, r, o) { return sphereDir(s, t, o); },
  },
  {
    id: 'ellipsoid', name: 'Ellipsoid', cutU: false, cutV: true, mirror: [0, 0, 1], closed: true, seg: [128, 64], icon: [8, 7],
    sliders: ['Width', 'Height'], around: 'from pole to pole',
    legend: 'the sphere map with semi-axes 1.4R, 0.95R, 1.5r; y = 0 on the equator, the poles at y ≈ p/2',
    pos(s, t, R, r, o) { sphereDir(s, t, o); o.x *= 1.4 * R; o.y *= 0.95 * R; o.z *= 1.5 * r; return o; },
    nrm(s, t, R, r, o) {
      sphereDir(s, t, o);
      const x = o.x / (1.4 * R), y = o.y / (0.95 * R), z = o.z / (1.5 * r), l = Math.hypot(x, y, z);
      o.x = x / l; o.y = y / l; o.z = z / l; return o;
    },
  },
  {
    id: 'icosahedron', name: 'Icosahedron', cutU: false, cutV: true, mirror: [0, 0, 1], closed: true, seg: null,
    sliders: ['Radius', null], around: 'from pole to pole',
    legend: 'the sphere map pushed out radially onto the 20 faces; y = 0 on the equator, the poles at y ≈ p/2',
    pos(s, t, R, r, o) { return icosaHit(sphereDir(s, t, {}), 1.3 * R, o, false); },
    nrm(s, t, R, r, o) { return icosaHit(sphereDir(s, t, {}), 1.3 * R, o, true); },
  },
  {
    id: 'lemniscate', name: 'Lemniscate (infinity)', short: 'Lemniscate ∞', cutU: false, cutV: false, mirror: [0, 0, 1], closed: true, seg: [360, 24], icon: [18, 4],
    sliders: ['Size', 'Tube'], around: 'around the tube',
    legend: 'u = 2π·x/p along the figure-eight, v = 2π·y/p around the tube: still a torus, so nothing is cut',
    pos(s, t, R, r, o) {
      const a = 1.5 * R, rho = 0.45 * r, c = lemniscate(s * TURN), v = t * TURN;
      o.x = a * c.x - rho * Math.cos(v) * c.ty; o.y = a * c.y + rho * Math.cos(v) * c.tx; o.z = rho * Math.sin(v); return o;
    },
    nrm(s, t, R, r, o) { const c = lemniscate(s * TURN), v = t * TURN; o.x = -Math.cos(v) * c.ty; o.y = Math.cos(v) * c.tx; o.z = Math.sin(v); return o; },
  },
  {
    // a knot is chiral: no reflection of space maps it onto itself, so there is no mirror plane. t ↦ 1 − t still is
    // a reflection, through the plane of T and N at the ring's centre: −P sits on P's ring, mirrored inside it.
    id: 'trefoil', name: 'Trefoil knot', cutU: false, cutV: false, mirror: null, closed: true, seg: [360, 28], lineS: 400, icon: [20, 4],
    sliders: ['Size', 'Tube'], around: 'around the tube', knot: trefoilSize,
    legend: 'u = 2π·x/p along the (2, 3) knot, v = 2π·y/p around the tube: still a torus, so nothing is cut; the knot is chiral, so −P is P mirrored inside its own ring',
    pos(s, t, R, r, o) {
      const { A, B, rho } = trefoilSize(R, r), k = trefoil(s * TURN, A, B), c = Math.cos(t * TURN), n = Math.sin(t * TURN);
      o.x = k.x + rho * (c * k.nx + n * k.wx); o.y = k.y + rho * (c * k.ny + n * k.wy); o.z = k.z + rho * (c * k.nz + n * k.wz); return o;
    },
    nrm(s, t, R, r, o) {
      const { A, B } = trefoilSize(R, r), k = trefoil(s * TURN, A, B), c = Math.cos(t * TURN), n = Math.sin(t * TURN);
      o.x = c * k.nx + n * k.wx; o.y = c * k.ny + n * k.wy; o.z = c * k.nz + n * k.wz; return o;
    },
  },
  {
    id: 'wavy', name: 'Wavy plane', cutU: true, cutV: true, mirror: [0, 1, 0], closed: false, seg: [120, 120], icon: [7, 7],
    sliders: ['Width', 'Waves'], around: 'across the y range',
    legend: 'x across, y along, centred: y = 0 on the middle line, so −P is P mirrored in the upright plane through it',
    pos(s, t, R, r, o) {
      const W = 2.4 * R, A = 0.5 * r, X = s - 0.5, Y = t - 0.5;
      o.x = W * X; o.y = W * Y; o.z = A * Math.sin(3 * Math.PI * X) * Math.cos(3 * Math.PI * Y); return o;
    },
    nrm(s, t, R, r, o) {
      const W = 2.4 * R, A = 0.5 * r, X = s - 0.5, Y = t - 0.5, k = A * 3 * Math.PI / W;
      const zx = k * Math.cos(3 * Math.PI * X) * Math.cos(3 * Math.PI * Y), zy = -k * Math.sin(3 * Math.PI * X) * Math.sin(3 * Math.PI * Y), l = Math.hypot(zx, zy, 1);
      o.x = -zx / l; o.y = -zy / l; o.z = 1 / l; return o;
    },
  },
  {
    id: 'klein', name: 'Klein bottle', cutU: true, cutV: false, mirror: [0, 0, 1], closed: false, seg: [192, 48], icon: [12, 6],
    sliders: ['Size', null], around: 'around the bottle',
    legend: 'u = 2π·x/p along the bottle, v = 2π·y/p around it; the x seam glues with a twist, y ↦ p/2 − y',
    pos(s, t, R, r, o) { return kleinPos(s, t, 0.16 * R, o); },
    nrm(s, t, R, r, o) { return numericNormal(this.pos, s, t, R, r, o); },
  },
];

export const shapeById = (id) => SHAPES.find((s) => s.id === id) || SHAPES[0];

/** Torus turns (u, v) → patch coordinates (s, t): a cut t is centred, so y = 0 sits on the mirror plane. */
export const patchST = (sh, tu, tv) => [tu, sh.cutV ? (tv + 0.5) % 1 : tv];
