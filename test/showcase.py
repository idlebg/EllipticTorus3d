"""Build the showcase: samples/index.html (offline gallery), samples/README.md, samples/img/*.png, and (through test/tour.py) samples/tour.mp4.

Every sample is a `#s=` state link into the visualizer. Before its screenshot is taken, the claims in its caption
are checked against the live model (the engine is checked against ref.py by test/engine.test.mjs), and the
reference values used below come from ref_out.json.

    py -3 test/showcase.py --gpu        # screenshots on the real GPU (recommended)
    py -3 test/showcase.py              # SwiftShader, with ?lines=fat
    py -3 test/showcase.py --no-video   # skip the tour video (test/tour.py, about three minutes)
    py -3 test/showcase.py --html-only  # rebuild index.html / README.md from samples/samples.json (no browser)
    ... --site-out=DIR                  # also write DIR/index.html, the gallery as served at https://idlebg.com/idleGevrek/

Three outputs share the samples: samples/index.html opens the visualizer next to the repository (../), the site
variant opens the copy next to it on idlebg.com, and samples/README.md (read on GitHub) opens the hosted one.
"""
import sys, json, base64, html, pathlib
from playwright.sync_api import sync_playwright
from _launch import ROOT, HTML, GPU, launch, ready

OUT = ROOT / 'samples'; IMG = OUT / 'img'; THUMB = IMG / 'thumb'
IMG.mkdir(parents=True, exist_ok=True)
REF = json.loads((ROOT / 'ref_out.json').read_text())
TOYS = {t['name']: t for t in REF['toys']}
APP_FILE = 'elliptic_curve_torus_visualizer_v3.html'
APP = '../' + APP_FILE
REPO_URL = 'https://github.com/idlebg/EllipticTorus3d'
SITE_URL = 'https://idlebg.com/idleGevrek/'
SITE_OUT = next((pathlib.Path(a.split('=', 1)[1]) for a in sys.argv if a.startswith('--site-out=')), None)
QUERY = '' if GPU else '?lines=fat'
K1 = REF['secp256k1']; R1 = REF['p256']
assert TOYS['pb223']['multiples'][7] == [116, 55] and TOYS['pb223']['multiples'][8] == [69, 86]   # 8G, 9G
assert TOYS['corbellini97']['multiples'][1] == [80, 10] and TOYS['corbellini97']['ordG'] == 5
assert TOYS['t17']['multiples'][12] == [16, 4] and TOYS['t17']['multiples'][1] == [6, 3] and TOYS['t17']['multiples'][14] == [3, 16]
assert [92, 47, 7] in TOYS['pb223']['dlog_table'] and [20, 47, None] in TOYS['pb223']['dlog_table'] and [111, 47, None] in TOYS['pb223']['dlog_table']
sys.path.insert(0, str(ROOT))
import ref  # independent group law (brute force), for the sums the captions state
assert ref.add(dict(p=223, a=0, b=7), (92, 47), (20, 47)) == (111, 176) and ref.order(dict(p=223, a=0, b=7), (20, 47), 252) == 3
assert ref.add(dict(p=17, a=2, b=2), (16, 4), (6, 3)) == (3, 16)
assert ref.add(dict(p=97, a=2, b=3), (59, 32), (59, 32)) == (80, 10) and ref.order(dict(p=97, a=2, b=3), (59, 32), 100) == 10

TOY = dict(a='0', b='7', p='223', g='(47, 71)')
M5, M6 = TOYS['pb223']['multiples'][4], TOYS['pb223']['multiples'][5]   # 5G, 6G
assert TOYS['pb223']['ordG'] == 21 and M5 == [126, 96] and M6 == [139, 137]
# −P on the chiral trefoil: the reflection of R through the plane of its ring (through the ring's centre, normal
# along (t = ¼) − (t = ¾)) must land on the result; lifted markers reflect too, because the normals do
RING_MIRROR = ('(() => { const sh = ecTorus.debug.shape(), S = ecTorus.state, s = m.pts.r.tu, q = (t) => sh.pos(s, t, S.R, S.r, {}); '
               'const c0 = q(0), c1 = q(0.5), w0 = q(0.25), w1 = q(0.75), w = [w0.x - w1.x, w0.y - w1.y, w0.z - w1.z], l = Math.hypot(...w); '
               'const n = w.map((x) => x / l), o = [(c0.x + c1.x) / 2, (c0.y + c1.y) / 2, (c0.z + c1.z) / 2], a = m.pts.r.pos, b = m.pts.sum.pos; '
               'const d = 2 * ((a.x - o[0]) * n[0] + (a.y - o[1]) * n[1] + (a.z - o[2]) * n[2]); '
               'return Math.hypot(a.x - d * n[0] - b.x, a.y - d * n[1] - b.y, a.z - d * n[2] - b.z) < 1e-6; })()')
SAMPLES = [
    dict(id='01-secp256k1-mirror', theme='dark', view='3', preset='k1-neg', patch={},
         title='secp256k1: G and −G are mirror images',
         tags=['secp256k1', 'negation', 'side view'],
         text='P₁ = 02‖x(G) is G and P₂ = 03‖x(G) is −G: the same x, and y ↦ p − y. On the torus that is a reflection '
              'through the equatorial plane, seen edge-on in the side view (key 3), so both points share one meridian ring. '
              'Their chord is vertical and P₁ + P₂ = 𝒪.',
         checks=['m.op.status === "ok" && m.op.P === null', 'm.pts.p2.P.y === m.curve.p - m.pts.p1.P.y', 'm.curve.eq(m.pts.p1.P, m.G)']),
    dict(id='02-secp256k1-chord', theme='dark', view='1', preset='k1-chord', patch={}, pins=['sum'], hover=['r'],
         title='secp256k1: G + 2G = 3G',
         tags=['secp256k1', 'chord construction', 'scalar tracking'],
         text='On a 256-bit curve the chord y ≡ λx + c winds around the tube a {wind_bits}-bit number of times, so only its '
              'third point R = −3G (dashed ring) and the mirror step to the result are drawn. The result’s card shows k = 3, '
              'carried through from the scalars typed as G and 2G; its x is OpenSSL’s 3G.',
         checks=[f'm.op.P.x === {K1["3G"][0]}n', 'm.pts.sum.k === 3n', 'm.pts.r && m.pts.r.k === m.ordG - 3n']),
    dict(id='03-secp256k1-glv', theme='dark', view='2', preset='k1-glv', patch={}, hover=['p2'],
         title='secp256k1 GLV: G, λG and λ²G share a y',
         tags=['secp256k1', 'GLV endomorphism', 'β-orbit', 'top view'],
         text='With a = 0 and p ≡ 1 (mod 3) a cube root of unity β gives the automorphism (x, y) ↦ (βx, y); on secp256k1 it '
              'is multiplication by λ. G, λG and λ²G therefore lie on one parallel ring. Relations reports P₂ = λ·P₁, and the '
              'β-orbit rings mark the third point, λ²G.',
         checks=['m.pts.p2.P.y === m.pts.p1.P.y', f'm.pts.p2.P.x === {K1["lamG"][0]}n', 'm.rel.some(([k, v]) => k === "β link" && v.includes("λ·P₁"))',
                 f'Object.values(m.pts).some((t) => t.sibling && t.P.x === {K1["lam2G"][0]}n)']),
    dict(id='04-secp256k1-subtract', theme='paper', view='1', preset='custom', base='k1-chord', patch=dict(p1='7G', p2='2G', op='sub'),
         hover=['sum'],
         title='secp256k1: 7G − 2G = 5G',
         tags=['secp256k1', 'subtraction', 'scalar tracking', 'paper theme'],
         text='Subtraction adds −P₂, the mirror image of P₂. The scalars typed as 7G and 2G are carried through the operation, '
              'so the result’s card shows k = 5, and its x is OpenSSL’s 5G.',
         checks=[f'm.op.P.x === {K1["5G"][0]}n && m.op.P.y === {K1["5G"][1]}n', 'm.pts.sum.k === 5n']),
    dict(id='05-p256', theme='paper', view='1', preset='p256', patch={}, hover=['sum'],
         title='P-256: G + 2G = 3G',
         tags=['P-256 (secp256r1)', 'a ≡ −3', 'paper theme'],
         text='NIST P-256: p = 2²⁵⁶ − 2²²⁴ + 2¹⁹² + 2⁹⁶ − 1 and a ≡ −3, both shown evaluated in the Curve facts. The same '
              'construction as on secp256k1: R, the mirror step, and the result 3G, whose card and inspector carry every SEC '
              'encoding. Its x and y are OpenSSL’s 3G.',
         checks=[f'm.op.P.x === {R1["3G"][0]}n && m.op.P.y === {R1["3G"][1]}n', 'm.facts.some(([k, v]) => k === "a" && v.includes("≡ −3"))']),
    dict(id='06-f223-chord', theme='dark', view='1', preset='pb223', patch={}, pins=['sum'], hover=['r'],
         title='F₂₂₃: the chord winds three times — G + 8G = 9G',
         tags=['toy curve', 'chord on the torus', 'flat map', 'Programming Bitcoin'],
         text='y² = x³ + 7 over F₂₂₃ (the curve of Programming Bitcoin). The chord through G = (47, 71) and 8G = (116, 55) has '
              'slope λ ≡ 3 (centred), so it winds three times around the tube while going once around the hole. It meets the '
              'curve again at R = −9G = (69, 137); the mirror step gives 9G = (69, 86). The flat map in the corner shows the '
              'same line wrapped on the square.',
         checks=['m.op.P.x === 69n && m.op.P.y === 86n', 'm.pts.sum.k === 9n', 'm.pts.r.P.x === 69n && m.pts.r.P.y === 137n',
                 'cen(m.op.chord.lambda, m.curve.p) === 3n']),
    dict(id='07-f223-beta-noncyclic', theme='paper', view='2', preset='custom', patch=dict(**TOY, p1='(92, 47)', p2='(20, 47)', op='add'),
         show=dict(beta=True, chord=True, cloud=True), pins=['sum'], hover=['p2'],
         title='F₂₂₃ is not cyclic: a β-orbit outside ⟨G⟩',
         tags=['toy curve', 'group structure', 'β-orbit', 'discrete log'],
         text='E(F₂₂₃) ≅ Z/6 × Z/42 (252 points, largest order 42). 7G = (92, 47) has order 3; its β-images (20, 47) and '
              '(111, 47) have order 3 too but are not multiples of G, so their cards show the order and no k. All three share '
              'y = 47, so the chord through two of them is the parallel ring y = 47 itself (λ = 0), and '
              '(92, 47) + (20, 47) = −(111, 47) = (111, 176).',
         checks=['m.pts.p1.k === 7n && m.pts.p1.order === 3n', 'm.pts.p2.order === 3n && m.pts.p2.k === undefined',
                 'm.op.P.x === 111n && m.op.P.y === 176n && m.pts.sum.k === undefined', 'm.op.chord.lambda === 0n',
                 'm.small.count === 252n']),
    dict(id='08-f97-tangent', theme='dark', view='1', preset='custom', base='c97', patch=dict(p1='(59, 32)', op='dbl'),
         pins=['sum'], hover=['r'],
         title='F₉₇: doubling uses the tangent — 2·(59, 32) = (80, 10)',
         tags=['toy curve', 'doubling', 'tangent', 'flat map'],
         text='With the 2·P₁ operation the chord becomes the tangent at P₁. On y² = x³ + 2x + 3 over F₉₇ the tangent at '
              '(59, 32), a point of order 10, has slope λ ≡ −2 (centred), so it winds twice around the tube; it touches the '
              'curve at P₁ and meets it again at R = (80, 87). The mirror step gives 2·(59, 32) = (80, 10), which is P₂.',
         checks=['m.op.chord.type === "tangent" && cen(m.op.chord.lambda, m.curve.p) === -2n', 'm.op.P.x === 80n && m.op.P.y === 10n',
                 'm.pts.r.P.x === 80n && m.pts.r.P.y === 87n', 'm.pts.p1.order === 10n', 'm.curve.eq(m.op.P, m.pts.p2.P)']),
    dict(id='09-f10009-cloud', theme='paper', view='2', preset='t10009', patch={}, hover=['p1'],
         title='F₁₀₀₀₉: all 10 191 points',
         tags=['toy curve', 'every point', 'automorphisms', 'top view'],
         text='y² = x³ + 7 over F₁₀₀₀₉ has #E = 10 192, so 10 191 affine points cover the torus. Every point with x ≠ 0 and '
              'y ≠ 0 comes with five siblings under (x, y) ↦ (βⁱx, ±y); the ± half is the mirror about y = p/2 on the flat '
              'map. Hover any dot for its card.',
         checks=['m.small.count === 10192n && m.small.xs.length === 10191', 'm.beta !== null']),
    dict(id='10-edge-cases', theme='dark', view='1', preset='custom', base='k1-neg', patch=dict(p1='HYBRID_G', p2='(1, 1)'), hover=['p2'], thumb='full',
         title='Edge cases: a hybrid key that lies about its parity, and an invalid-curve point',
         tags=['secp256k1', 'SEC 06/07', 'invalid curve', 'input checks'],
         text='P₁ is G written as a 07 hybrid key, but G’s y is even, so the parity bit is wrong: the point is read, drawn and '
              'flagged in amber. P₂ = (1, 1) is not on secp256k1; it satisfies y² = x³ + ax + b′ with b′ = 0, the singular '
              'cusp y² = x³. The group law is skipped until “Force group law” is ticked, which is the check an implementation '
              'needs against invalid-curve attacks.',
         checks=['m.inputs.p1.ok && m.inputs.p1.warnings.length === 1', 'm.pts.p2.onCurve === false && m.curve.bPrime(m.pts.p2.P) === 0n',
                 'm.op.status === "offcurve"']),
    dict(id='11-f17-dlog', theme='paper', view='1', preset='custom', patch=dict(a='2', b='2', p='17', g='(5, 1)', p1='(16, 4)', p2='(6, 3)', op='add'),
         pins=['sum', 'p1'], hover=['p2'],
         title='F₁₇: discrete logs on a curve of prime order',
         tags=['toy curve', 'discrete log', 'Paar & Pelzl'],
         text='y² = x³ + 2x + 2 over F₁₇ (Paar & Pelzl) has 19 points, a prime, so G = (5, 1) generates the whole group. Type any '
              'point as (x, y) and baby-step giant-step finds its k: (16, 4) = 13G, (6, 3) = 2G, and their sum (3, 16) = 15G.',
         checks=['m.pts.p1.k === 13n && m.pts.p2.k === 2n', 'm.op.P.x === 3n && m.op.P.y === 16n && m.pts.sum.k === 15n', 'm.small.count === 19n']),
    dict(id='12-sphere-glv', theme='paper', view='2', preset='k1-glv', patch={}, state=dict(shape='sphere'), hover=['p2'],
         title='Shapes: secp256k1 GLV on a sphere',
         tags=['shapes', 'sphere', 'GLV endomorphism', 'top view'],
         text='On the sphere x is the longitude and y the latitude, centred so that y = 0 is the equator and the mirror '
              'plane. G, λG and λ²G share a y, so they share a latitude: from the top (key 2) all three sit on one ring '
              'around the pole, as they share a parallel ring on the torus.',
         checks=['ecTorus.state.shape === "sphere"', 'm.pts.p2.P.y === m.pts.p1.P.y',
                 'Math.abs(m.pts.p1.pos.z - m.pts.p2.pos.z) < 1e-9',
                 'Object.values(m.pts).filter((t) => t.sibling).every((t) => Math.abs(t.pos.z - m.pts.p1.pos.z) < 1e-9)']),
    dict(id='13-lemniscate-chord', theme='dark', view='1', preset='pb223', patch={}, state=dict(shape='lemniscate'), pins=['sum'], hover=['r'],
         title='Shapes: the F₂₂₃ chord on a lemniscate tube',
         tags=['shapes', 'lemniscate', 'chord construction'],
         text='A tube bent into a figure-eight is still a torus, so nothing is cut and every construction carries over: the '
              'chord through G and 8G runs once along the figure-eight while it winds three times around the tube, meets the '
              'curve at R = −9G and mirrors to 9G = (69, 86).',
         checks=['ecTorus.state.shape === "lemniscate"', 'm.op.P.x === 69n && m.op.P.y === 86n', 'cen(m.op.chord.lambda, m.curve.p) === 3n']),
    dict(id='14-icosahedron-mirror', theme='dark', view='3', preset='k1-neg', patch={}, state=dict(shape='icosahedron'),
         title='Shapes: G and −G on an icosahedron',
         tags=['shapes', 'icosahedron', 'negation', 'side view'],
         text='The icosahedron carries the sphere map pushed out radially onto its 20 faces. The plane z = 0 is a mirror of '
              'the solid, so P and −P still land as mirror images; in the side view (key 3) the plane is edge-on and G sits '
              'straight above −G.',
         checks=['ecTorus.state.shape === "icosahedron"', 'Math.abs(m.pts.p1.pos.x - m.pts.p2.pos.x) + Math.abs(m.pts.p1.pos.y - m.pts.p2.pos.y) + Math.abs(m.pts.p1.pos.z + m.pts.p2.pos.z) < 1e-6']),
    dict(id='15-klein-cloud', theme='dark', view='1', preset='t10009', patch={}, state=dict(shape='klein'), hover=['p1'],
         title='Shapes: all 10 191 points of F₁₀₀₀₉ on a Klein bottle',
         tags=['shapes', 'Klein bottle', 'every point'],
         text='The Klein bottle closes up in y, but its x seam is glued with a twist: the end at x → p meets the start at '
              'y ↦ p/2 − y, so rings and the chord break there. It has no outside, so the glass is drawn from both sides. '
              'Negation is still the mirror through its horizontal plane.',
         checks=['ecTorus.state.shape === "klein"', 'm.small.count === 10192n',
                 '(() => { const sh = ecTorus.debug.shape(), R = ecTorus.state.R, r = ecTorus.state.r, a = sh.pos(1, 0.3, R, r, {}), b = sh.pos(0, 0.2, R, r, {}); return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < 1e-9; })()']),
    dict(id='16-wavy-chord', theme='paper', view='1', preset='pb223', patch={}, state=dict(shape='wavy'), pins=['sum'],
         title='Shapes: the F₂₂₃ chord on a wavy plane',
         tags=['shapes', 'wavy plane', 'chord construction', 'paper theme'],
         text='The wavy plane is the flat map lifted into 3D, with y centred on its middle line. The chord crosses the y range '
              'three times and breaks at the cut each time; negation mirrors through the upright plane along the middle, '
              'drawn here as the dashed circle.',
         checks=['ecTorus.state.shape === "wavy"', 'm.op.P.x === 69n && m.op.P.y === 86n',
                 'Math.abs(m.pts.r.pos.x - m.pts.sum.pos.x) + Math.abs(m.pts.r.pos.y + m.pts.sum.pos.y) + Math.abs(m.pts.r.pos.z - m.pts.sum.pos.z) < 1e-6']),
    dict(id='17-trefoil-chord', theme='dark', view='1', preset='pb223', patch={}, state=dict(shape='trefoil'), pins=['sum'], hover=['r'],
         title='Shapes: the F₂₂₃ chord on a trefoil knot',
         tags=['shapes', 'trefoil knot', 'chirality', 'chord construction'],
         text='A tube tied into the (2, 3) torus knot is still a torus, so nothing is cut: the chord through G and 8G runs once '
              'along the knot while it winds three times around the tube, and meets the curve again at R = −9G. A knot is '
              'chiral, so no plane mirrors it onto itself; R and 9G = (69, 86) share a ring, and the mirror step is the '
              'reflection inside that ring.',
         checks=['ecTorus.state.shape === "trefoil" && ecTorus.debug.shape().mirror === null', 'm.op.P.x === 69n && m.op.P.y === 86n',
                 'cen(m.op.chord.lambda, m.curve.p) === 3n', 'm.pts.r.tu === m.pts.sum.tu', RING_MIRROR]),
    dict(id='18-f223-step', theme='paper', view='2', preset='custom', patch=dict(**TOY, p1='5G', p2='G', op='add'),
         pins=['sum'], hover=['p1'],
         title='F₂₂₃: walking the multiples of G with Step',
         tags=['toy curve', 'scalar multiplication', 'Step (key N)', 'flat map', 'top view'],
         text='With P₂ = G, Step (key N) puts the result into P₁, so every press adds one more G: here P₁ = 5G = (%d, %d) and the '
              'result is 6G = (%d, %d). G has order 21, so 21 presses bring the walk back to where it started, through 𝒪 on '
              'the way. With 2·P₁ selected, Step walks the doublings instead.' % (*M5, *M6),
         checks=[f'm.pts.p1.P.x === {M5[0]}n && m.pts.p1.P.y === {M5[1]}n && m.pts.p1.k === 5n',
                 f'm.op.P.x === {M6[0]}n && m.op.P.y === {M6[1]}n && m.pts.sum.k === 6n', 'm.ordG === 21n']),
]

b64 = lambda st: base64.urlsafe_b64encode(json.dumps(st, ensure_ascii=False, separators=(',', ':')).encode()).decode().rstrip('=')


CEN = 'const cen = (v, p) => { v = ((v % p) + p) % p; return v > p / 2n ? v - p : v; };'  # representative in (−p/2, p/2]


def check_all(page, s):
    bad = []
    for expr in s['checks']:
        ok = page.evaluate('(() => { const m = ecTorus.model, E = ecTorus.engine; ' + CEN + ' return !!(' + expr + '); })()')
        if not ok: bad.append(expr)
    if bad: raise AssertionError(s['id'] + ': claims do not hold: ' + repr(bad))


HTML_ONLY = '--html-only' in sys.argv
if HTML_ONLY:
    saved = {d['id']: d for d in json.loads((OUT / 'samples.json').read_text(encoding='utf-8'))}
    for s in SAMPLES: s.update(link=saved[s['id']]['link'], text=saved[s['id']]['text'])

if not HTML_ONLY:
    with sync_playwright() as pw:
        b = launch(pw)
        ctx = b.new_context(viewport={'width': 1440, 'height': 900}, device_scale_factor=1)
        page = ctx.new_page(); errors = []
        page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
        page.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
        page.goto(HTML.as_uri()); ready(page)
        hybrid = page.evaluate("(() => { const E = ecTorus.engine, k = E.KNOWN[0], c = new E.Curve(k.a, k.b, k.p); return '07' + E.encodeSEC(k.G, c, 'uncompressed').slice(2); })()")
        for s in SAMPLES:
            # build the state the same way a user would: preset, then edits; the link is what "Copy link" makes
            page.evaluate('localStorage.clear()'); page.goto('about:blank'); page.goto(HTML.as_uri()); ready(page)
            page.select_option('#preset', s.get('base', s['preset'])); page.wait_for_timeout(300)
            patch = {k: (hybrid if v == 'HYBRID_G' else v) for k, v in s['patch'].items()}
            page.evaluate('(p) => ecTorus.set(p)', patch)
            st = page.evaluate('ecTorus.state')
            st.update({'preset': s['preset'], 'theme': s['theme'], 'panel': True, 'miniBig': False})
            st.update(s.get('state', {}))
            st['show'].update(s.get('show', {}))
            s['link'] = b64(st)
            # open the link fresh, check every claim of the caption, then frame and screenshot it
            page.goto('about:blank'); page.goto(HTML.as_uri() + QUERY + '#s=' + s['link']); ready(page, 900)
            check_all(page, s)
            if s['id'] == '02-secp256k1-chord':
                s['text'] = s['text'].format(wind_bits=page.evaluate('(() => { const m = ecTorus.model; ' + CEN + ' const w = cen(m.op.chord.lambda, m.curve.p); return (w < 0n ? -w : w).toString(2).length; })()'))
            if s['view'] != '1': page.keyboard.press(s['view']); page.wait_for_timeout(1100)
            for key in s.get('pins', []):
                p = page.evaluate(f"ecTorus.screenOf('{key}')"); page.mouse.move(p['x'], p['y']); page.wait_for_timeout(120)
                page.mouse.click(p['x'], p['y']); page.wait_for_timeout(200)
            for key in s.get('hover', []):
                p = page.evaluate(f"ecTorus.screenOf('{key}')"); page.mouse.move(p['x'], p['y']); page.wait_for_timeout(250)
            page.mouse.move(2, 450); page.wait_for_timeout(500)
            page.screenshot(path=str(IMG / f"{s['id']}.png"))
            print('ok', s['id'], len(s['link']), 'chars')
        if errors: raise AssertionError('console errors: ' + ' | '.join(errors[:4]))
        (OUT / 'samples.json').write_text(json.dumps([{k: s[k] for k in ('id', 'title', 'text', 'tags', 'theme', 'view', 'link')} for s in SAMPLES], ensure_ascii=False, indent=1), encoding='utf-8', newline='\n')
        page.evaluate('localStorage.clear()')
        ctx.close()

        # WebP thumbnails for the gallery grid (the PNGs stay for the lightbox and the README): the 3D view only,
        # cropped as the grid shows it, 760 px wide; a 'full' sample keeps the whole frame. About a tenth of the bytes.
        THUMB.mkdir(exist_ok=True)
        tp = b.new_page(); tp.set_content('<canvas id="c"></canvas>')
        for s in SAMPLES:
            data = base64.b64encode((IMG / f"{s['id']}.png").read_bytes()).decode()
            webp = tp.evaluate("""async ([d, full]) => {
              const im = new Image(); im.src = 'data:image/png;base64,' + d; await im.decode();
              const sx = full ? 0 : Math.round(im.width * 372 / 1440), sw = im.width - sx, w = 760, h = Math.round(im.height * w / sw);
              const c = document.getElementById('c'); c.width = w; c.height = h;
              const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(im, sx, 0, sw, im.height, 0, 0, w, h);
              return c.toDataURL('image/webp', 0.84).split(',')[1]; }""", [data, s.get('thumb') == 'full'])
            (THUMB / f"{s['id']}.webp").write_bytes(base64.b64decode(webp))
        tp.close()
        print('ok thumbnails', sum(f.stat().st_size for f in THUMB.glob('*.webp')) // 1024, 'KiB')

        b.close()

    # the tour video: 1920×1080 H.264 MP4 and its poster, made frame by frame by test/tour.py (about three minutes)
    if '--no-video' not in sys.argv:
        import subprocess
        subprocess.run([sys.executable, str(ROOT / 'test' / 'tour.py')], cwd=ROOT, check=True)

# ------------------------------------------------------------------ gallery page and README
esc = html.escape
VIEW_NAME = {'2': 'top', '3': 'side'}
FAVICON = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' "
           "fill='%23070b10'/%3E%3Cellipse cx='32' cy='33' rx='23' ry='14' fill='none' stroke='%232de2e6' stroke-width='5'/%3E%3Cpath "
           "d='M21 31c6 5 16 5 22 0M24 34c5-3 11-3 16 0' fill='none' stroke='%232de2e6' stroke-width='3.4' stroke-linecap='round'/%3E%3C/svg%3E")
counts = {}
for s in SAMPLES:
    for t in s['tags']: counts[t] = counts.get(t, 0) + 1
TAGS = sorted((t for t in counts if counts[t] > 1), key=lambda t: (-counts[t], t))  # tags shared by two samples or more


def thumb(s):
    return 'img/thumb/%s.webp' % s['id'] if (THUMB / ('%s.webp' % s['id'])).exists() else 'img/%s.png' % s['id']


def card(s, app):
    hint = '' if s['view'] == '1' else '<span class="hint">then press <kbd>%s</kbd> for the %s view</span>' % (s['view'], VIEW_NAME[s['view']])
    tags = ''.join('<span>%s</span>' % esc(t) for t in s['tags'])
    return '\n'.join([
        '    <article class="card" id="%s" data-tags="%s">' % (s['id'], esc('|'.join(s['tags']))),  # id: README links land on the card
        '      <a class="shot%s" href="img/%s.png" target="_blank" rel="noopener" title="Enlarge"><img src="%s" alt="%s" loading="lazy" width="760" height="640"></a>'
        % (' full' if s.get('thumb') == 'full' else '', s['id'], thumb(s), esc(s['title'])),
        '      <div class="body">',
        '        <h2>%s</h2>' % esc(s['title']),
        '        <p>%s</p>' % esc(s['text']),
        '        <div class="tags">%s</div>' % tags,
        '        <div class="acts"><a class="open" href="%s#s=%s" target="_blank" rel="noopener">Open this state</a>%s</div>' % (app, s['link'], hint),
        '      </div>',
        '    </article>'])


def gallery(app, site):
    """The gallery page. app: where "Open this state" points; site: the copy served at SITE_URL (absolute social tags)."""
    cards = '\n'.join(card(s, app) for s in SAMPLES)
    filters = '\n'.join(['    <button class="ft" data-tag="" aria-pressed="true">All <span>%d</span></button>' % len(SAMPLES)]
                        + ['    <button class="ft" data-tag="%s" aria-pressed="false">%s <span>%d</span></button>' % (esc(t), esc(t), counts[t]) for t in TAGS])
    video = '' if not (OUT / 'tour.mp4').exists() else '''  <section class="tour">
    <video src="tour.mp4" poster="img/tour-poster.jpg" width="1920" height="1080" controls muted loop playsinline preload="metadata"></video>
    <p>A short tour of the F₂₂₃ sample: auto-rotate, sticky hover cards, a pinned result with its leader line,
    the paper theme, the side view with the mirror plane edge-on, Step walking P₁ through the multiples (key N),
    then every shape in turn (key S), each one morphing out of the last.</p>
  </section>'''
    desc = ('Points of y² = x³ + ax + b over F_p on a torus and eight other shapes: eighteen ready-made states of a single-file, '
            'offline elliptic-curve visualizer, each one click away from the live page.')
    social = '' if not site else '\n'.join([
        '<link rel="canonical" href="%s">' % SITE_URL,
        '<meta property="og:type" content="website">',
        '<meta property="og:title" content="Elliptic curve → torus · showcase">',
        '<meta property="og:description" content="%s">' % esc(desc),
        '<meta property="og:url" content="%s">' % SITE_URL,
        '<meta property="og:image" content="%simg/06-f223-chord.png">' % SITE_URL,
        '<meta name="twitter:card" content="summary_large_image">'])
    where = ('Each card opens <a href="%s" target="_blank" rel="noopener">the visualizer</a> in the exact state of its screenshot. It is one '
             'HTML file that also runs offline: download it from <a href="%s" target="_blank" rel="noopener">GitHub</a> and open it from disk.'
             % (app, REPO_URL)) if site else (
             'Each card opens <a href="%s" target="_blank" rel="noopener">the visualizer</a> in the exact state of its screenshot (one offline '
             'HTML file, no network). The same gallery is online at <a href="%s" target="_blank" rel="noopener">idlebg.com/idleGevrek</a>.'
             % (app, SITE_URL))
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Elliptic curve → torus · showcase</title>
<meta name="description" content="{esc(desc)}">
<meta name="author" content="idlebg.com">
<link rel="icon" href="{FAVICON}">
{social}
<style>
:root {{ --bg: #070b10; --panel: #0a1017; --panel-2: #0d151e; --line: #17222d; --line-2: #233140; --text: #d5e1ea; --muted: #8293a3; --accent: #2de2e6;
  --font-ui: "Segoe UI Variable Text", "Segoe UI", "SF Pro Text", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif; color-scheme: dark; }}
* {{ box-sizing: border-box; }}
[hidden] {{ display: none !important; }}
body {{ margin: 0; background: radial-gradient(120% 80% at 50% 0%, #0b131c 0%, var(--bg) 60%) fixed; color: var(--text); font: 14px/1.55 var(--font-ui); }}
:focus-visible {{ outline: 2px solid var(--accent); outline-offset: 2px; }}
header {{ max-width: 1240px; margin: 0 auto; padding: 40px 24px 8px; }}
h1 {{ margin: 0 0 8px; font-size: 26px; font-weight: 650; letter-spacing: -.01em; }}
h1 .to {{ color: var(--accent); font-weight: 400; }}
header p {{ margin: 6px 0; max-width: 80ch; color: var(--muted); }}
header p a, .foot a {{ color: var(--text); text-decoration: none; border-bottom: 1px solid var(--line-2); }}
header p a:hover, .foot a:hover {{ border-color: var(--accent); }}
.ctas {{ display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; }}
.cta {{ display: inline-flex; align-items: center; gap: 8px; background: var(--accent); color: #04191a; font-weight: 650; text-decoration: none; border-radius: 8px; padding: 8px 16px; border: 1px solid var(--accent); }}
.cta:hover {{ filter: brightness(1.08); }}
.cta.ghost {{ background: transparent; color: var(--text); border-color: var(--line-2); font-weight: 600; }}
.cta.ghost:hover {{ border-color: var(--accent); filter: none; }}
.cta svg {{ width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }}
.filters {{ position: sticky; top: 0; z-index: 3; max-width: 1240px; margin: 0 auto; padding: 12px 24px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center;
  background: color-mix(in srgb, var(--bg) 82%, transparent); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); }}
.ft {{ font: inherit; font-size: 12.5px; color: var(--muted); background: transparent; border: 1px solid var(--line-2); border-radius: 999px; padding: 3px 11px; cursor: pointer; transition: color .12s, border-color .12s, background .12s; }}
.ft span {{ color: var(--muted); opacity: .7; font-size: 11.5px; margin-left: 2px; }}
.ft:hover {{ color: var(--text); border-color: #55667a; }}
.ft[aria-pressed="true"] {{ color: #04191a; background: var(--accent); border-color: var(--accent); font-weight: 600; }}
.ft[aria-pressed="true"] span {{ color: #04191a; }}
main {{ max-width: 1240px; margin: 0 auto; padding: 8px 24px 40px; display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 20px; }}
.card {{ background: var(--panel); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; transition: transform .18s, box-shadow .18s, border-color .18s; }}
.card:hover {{ transform: translateY(-2px); border-color: var(--line-2); box-shadow: 0 14px 34px rgba(0, 0, 0, .45); }}
.card {{ scroll-margin-top: 72px; }}
.card:target {{ border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent), 0 14px 34px rgba(0, 0, 0, .45); }}
.shot {{ display: block; overflow: hidden; cursor: zoom-in; border-bottom: 1px solid var(--line); }}
.shot img {{ display: block; width: 100%; height: auto; aspect-ratio: 1068 / 900; object-fit: cover; object-position: 100% 50%; transition: transform .35s; }}
.card:hover .shot img {{ transform: scale(1.025); }}
.shot.full img {{ object-fit: contain; object-position: 50% 50%; background: #070b10; }}
.body {{ padding: 14px 16px 16px; display: flex; flex-direction: column; gap: 8px; flex: 1; }}
.body h2 {{ margin: 0; font-size: 15.5px; font-weight: 650; }}
.body p {{ margin: 0; color: var(--muted); font-size: 13px; }}
.tags {{ display: flex; flex-wrap: wrap; gap: 6px; }}
.tags span {{ font-size: 11.5px; border: 1px solid var(--line-2); border-radius: 999px; padding: 1px 8px; color: var(--muted); }}
.acts {{ margin-top: auto; padding-top: 6px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }}
.open {{ background: var(--accent); color: #04191a; font-weight: 650; text-decoration: none; border-radius: 6px; padding: 6px 12px; font-size: 13px; }}
.open:hover {{ filter: brightness(1.08); }}
.hint {{ color: var(--muted); font-size: 12px; }}
kbd {{ font: 11px var(--font-ui); border: 1px solid var(--line-2); border-bottom-width: 2px; border-radius: 4px; padding: 0 4px; background: var(--panel-2); color: var(--text); }}
.tour {{ max-width: 1008px; margin: 0 auto; padding: 8px 24px 8px; }}
.tour video {{ width: 100%; border-radius: 12px; border: 1px solid var(--line); display: block; background: #000; }}
.tour p {{ color: var(--muted); font-size: 13px; margin: 8px 0 0; }}
dialog {{ padding: 0; border: 1px solid var(--line-2); border-radius: 12px; background: #000; max-width: min(1440px, 96vw); max-height: 94vh; box-shadow: 0 20px 60px rgba(0, 0, 0, .6); }}
dialog::backdrop {{ background: rgba(3, 6, 10, .78); -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px); }}
dialog img {{ display: block; max-width: 100%; max-height: 88vh; width: auto; height: auto; cursor: zoom-out; }}
dialog p {{ margin: 0; padding: 8px 14px; font-size: 13px; color: var(--muted); background: var(--panel); }}
.foot {{ max-width: 1240px; margin: 0 auto; padding: 8px 24px 32px; color: var(--muted); font-size: 12.5px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px 18px; }}
.foot nav {{ display: flex; flex-wrap: wrap; gap: 6px 18px; }}
.heart {{ color: #ff4d6d; }}
@media (prefers-reduced-motion: reduce) {{ * {{ transition: none !important; }} }}
</style>
</head>
<body>
<header>
  <h1>Elliptic curve <span class="to">→</span> torus · showcase</h1>
  <p>Points of y² = x³ + ax + b over F<sub>p</sub> live in {{0, …, p−1}}², and both coordinates wrap at p, so the plane is already a torus:
  x goes once around the hole, y once around the tube. The same points also land on eight other shapes, from a sphere to a trefoil knot.
  {where} Drag to orbit, hover for cards, click to pin, <kbd>?</kbd> for every key.</p>
  <p>Every statement in the captions is checked against the visualizer's own computation when the gallery is built, and that engine is checked
  against OpenSSL and sympy (<code>test/showcase.py</code>, <code>test/engine.test.mjs</code>).</p>
  <div class="ctas">
    <a class="cta" href="{app}" target="_blank" rel="noopener"><svg viewBox="0 0 16 16"><ellipse cx="8" cy="8.4" rx="6.3" ry="4"/><path d="M5.3 8c1.5 1.2 3.9 1.2 5.4 0"/></svg>Open the visualizer</a>
    <a class="cta ghost" href="{REPO_URL}" target="_blank" rel="noopener"><svg viewBox="0 0 16 16"><path d="m5.5 4.5-3.5 3.5 3.5 3.5M10.5 4.5 14 8l-3.5 3.5M9.2 2.8 6.8 13.2"/></svg>Source on GitHub</a>
  </div>
</header>
{video}
<nav class="filters" aria-label="Filter by tag">
{filters}
</nav>
<main>
{cards}
</main>
<dialog id="lb" aria-label="Screenshot"><img alt=""><p></p></dialog>
<footer class="foot"><span>made with <span class="heart">❤</span> by <a href="https://idlebg.com" target="_blank" rel="noopener">idlebg.com</a></span>
  <nav aria-label="Project links"><a href="{REPO_URL}" target="_blank" rel="noopener">github.com/idlebg/EllipticTorus3d</a><a href="{SITE_URL}" target="_blank" rel="noopener">idlebg.com/idleGevrek</a><span>three.js r187 inside the visualizer (MIT)</span></nav></footer>
<script>
// tag filter: one tag at a time; "All" (or the active tag again) shows everything
const cards = [...document.querySelectorAll('.card')], chips = [...document.querySelectorAll('.ft')];
let cur = '';
for (const c of chips) c.addEventListener('click', () => {{
  cur = c.dataset.tag === cur ? '' : c.dataset.tag;
  for (const x of chips) x.setAttribute('aria-pressed', String(x.dataset.tag === cur));
  for (const k of cards) k.hidden = !!cur && !k.dataset.tags.split('|').includes(cur);
}});
// screenshots open in a lightbox (a modified click still opens the file in a new tab)
const lb = document.getElementById('lb'), lbImg = lb.querySelector('img'), lbCap = lb.querySelector('p');
document.addEventListener('click', (e) => {{
  const a = e.target.closest('a.shot');
  if (!a || e.button || e.ctrlKey || e.metaKey || e.shiftKey || !lb.showModal) return;
  e.preventDefault();
  const img = a.querySelector('img');
  lbImg.src = a.href; lbImg.alt = img.alt; lbCap.textContent = img.alt;
  lb.showModal();
}});
lb.addEventListener('click', () => lb.close());
</script>
</body>
</html>
'''


(OUT / 'index.html').write_text(gallery(APP, site=False), encoding='utf-8', newline='\n')  # LF, as everything in the repo
if SITE_OUT:
    SITE_OUT.mkdir(parents=True, exist_ok=True)
    (SITE_OUT / 'index.html').write_text(gallery(APP_FILE, site=True), encoding='utf-8', newline='\n')
    print('wrote', SITE_OUT / 'index.html')

# README for GitHub: the links open the hosted copy of the visualizer (a repository page cannot run the HTML)
md = ['# Showcase — elliptic curve → torus', '',
      'Eighteen ready-made states of the visualizer, each a screenshot plus a link that opens the page exactly there. The gallery is',
      'online at [idlebg.com/idleGevrek](%s); `samples/index.html` is the same gallery offline, opening the' % SITE_URL,
      '`elliptic_curve_torus_visualizer_v3.html` next to it. The claims in the captions are checked against the visualizer\'s own',
      'computation when the gallery is built (`py -3 test/showcase.py --gpu`); screenshots were taken in Chrome on an RTX 4090.', '']
if (OUT / 'tour.mp4').exists():
    md += ['A 40-second tour of the F₂₂₃ sample, 1920×1080 (auto-rotate, hover cards, a pinned result, paper theme, side view, Step walking '
           'the multiples, then every shape morphing into the next): [`tour.mp4`](tour.mp4).', '',
           '[![the tour video: the F₂₂₃ chord on the torus with a pinned result](img/tour-poster.jpg)](tour.mp4)', '']
for s in SAMPLES:
    view = '' if s['view'] == '1' else ' Then press `%s` for the %s view.' % (s['view'], VIEW_NAME[s['view']])
    md += ['## ' + s['title'], '', '<img src="img/%s.png" width="720" alt="%s">' % (s['id'], esc(s['title'])), '', s['text'], '',
           '[Open this state](%s%s#s=%s).%s Tags: %s.' % (SITE_URL, APP_FILE, s['link'], view, ', '.join(s['tags'])), '']
md += ['made with ❤ by [idlebg.com](https://idlebg.com) · source: [github.com/idlebg/EllipticTorus3d](%s)' % REPO_URL, '']
(OUT / 'README.md').write_text('\n'.join(md), encoding='utf-8', newline='\n')
print('wrote', OUT / 'index.html', 'and', OUT / 'README.md')
