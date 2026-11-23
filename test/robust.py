"""Robustness: hostile links and storage, sanitizeState fuzz, inputs that must not freeze the tab,
leaks over 50 cycles, WebGL context loss and restore, shader programs per update.

    py -3 test/robust.py [--gpu]
"""
import sys, json, time, base64, random
from playwright.sync_api import sync_playwright
from _launch import HTML, SHOTS, MODE, launch, ready

OUT = SHOTS / MODE; OUT.mkdir(parents=True, exist_ok=True)
results = []

def check(name, cond, detail=''):
    results.append((name, bool(cond), detail))
    print(('PASS ' if cond else 'FAIL ') + name + (f'  [{detail}]' if detail else ''), flush=True)

b64 = lambda obj: base64.urlsafe_b64encode(json.dumps(obj).encode()).decode().rstrip('=')
XSS = '"><img src=x onerror="window.__pwned=1"><svg onload="window.__pwned=2"><script>window.__pwned=3</script>'

# every place the app writes HTML; nothing typed, linked or stored may become markup there
AUDIT = """() => {
  const hosts = ['#facts', '#relations', '#legend', '#inspector', '#overlay', '#testOut', '#curveErr', '#p1Msg', '#p2Msg', '#gMsg', '#curveAside', '#inspAside'];
  const bad = [];
  for (const sel of hosts) {
    const el = document.querySelector(sel); if (!el) continue;
    for (const n of el.querySelectorAll('*')) {
      if (/^(img|script|iframe|object|embed|image|foreignobject|a|form|input|style|link|meta)$/i.test(n.tagName)) bad.push(sel + ' <' + n.tagName + '>');
      for (const at of n.attributes) if (/^on/i.test(at.name) || /javascript:/i.test(at.value) || (at.name === 'style' && /url\\(|expression/i.test(at.value))) bad.push(sel + ' @' + at.name);
    }
  }
  return { pwned: window.__pwned || 0, bad, imgs: document.querySelectorAll('img').length };
}"""

STATE_OK = """() => { const s = ecTorus.state, D = { su: [4, 96], sv: [4, 64], bits: [4, 52], R: [0.8, 2], r: [0.15, 0.75], glass: [0, 1], back: [0, 1] };
  const errs = [];
  for (const k of ['a', 'b', 'p', 'g', 'p1', 'p2', 'preset', 'basePreset']) if (typeof s[k] !== 'string' || s[k].length >= 5000) errs.push(k);
  if (!['add', 'sub', 'dbl'].includes(s.op)) errs.push('op'); if (!['scale', 'low', 'high'].includes(s.map)) errs.push('map');
  if (!['dark', 'paper'].includes(s.theme)) errs.push('theme');
  for (const [k, [lo, hi]] of Object.entries(D)) if (typeof s[k] !== 'number' || !(s[k] >= lo && s[k] <= hi)) errs.push(k);
  for (const k of ['su', 'sv', 'bits']) if (!Number.isInteger(s[k])) errs.push(k + ' int');
  for (const k of ['showG', 'force', 'panel', 'miniBig', 'legendMin']) if (typeof s[k] !== 'boolean') errs.push(k);
  const keys = (o) => Object.keys(o).sort().join();
  if (keys(s.show) !== 'beta,chord,cloud,grid,labels,map,rings,spin' || Object.values(s.show).some((v) => typeof v !== 'boolean')) errs.push('show');
  if (keys(s.rings) !== 'g,p1,p2,sum' || Object.values(s.rings).some((v) => typeof v !== 'boolean')) errs.push('rings');
  if (keys(s.secs) !== 'curve,inspector,points,relations,shape,test,view' || Object.values(s.secs).some((v) => typeof v !== 'boolean')) errs.push('secs');
  if (typeof s.shape !== 'string' || ecTorus.debug.shape().id !== s.shape) errs.push('shape'); // only known shape ids pass
  if (!ecTorus.model) errs.push('model');
  return errs; }"""

def garbage(rng, depth=0):
    kinds = ['str', 'num', 'bool', 'null', 'list', 'obj', 'xss', 'big', 'special']
    k = rng.choice(kinds if depth < 3 else kinds[:4])
    if k == 'str': return ''.join(rng.choice('0123456789abcdefxG()+-*/^, <>"\'&') for _ in range(rng.randint(0, 40)))
    if k == 'num': return rng.choice([0, -1, 1e308, -1e308, 3.5, 7, 2**53, -0.0, 1e-9])
    if k == 'bool': return rng.random() < 0.5
    if k == 'null': return None
    if k == 'list': return [garbage(rng, depth + 1) for _ in range(rng.randint(0, 3))]
    if k == 'xss': return XSS
    if k == 'big': return 'f' * rng.choice([4999, 5000, 6000])
    if k == 'special': return rng.choice(['__proto__', 'constructor', 'toString', 'NaN', 'Infinity', '1e999', '-0'])
    keys = ['a', 'b', 'p', 'g', 'p1', 'p2', 'op', 'map', 'theme', 'preset', 'basePreset', 'bits', 'su', 'sv', 'R', 'r', 'glass', 'back',
            'show', 'rings', 'showG', 'force', 'panel', 'miniBig', 'grid', 'cloud', 'p1', 'g', '__proto__', 'constructor', 'v',
            'shape', 'secs', 'legendMin', 'curve', 'test']
    return {rng.choice(keys): garbage(rng, depth + 1) for _ in range(rng.randint(0, 12))}

with sync_playwright() as pw:
    b = launch(pw)
    ctx = b.new_context(viewport={'width': 1440, 'height': 900})
    ctx.add_init_script("""(() => { const add = EventTarget.prototype.addEventListener, rem = EventTarget.prototype.removeEventListener; window.__lc = 0;
      EventTarget.prototype.addEventListener = function (...a) { window.__lc++; return add.apply(this, a); };
      EventTarget.prototype.removeEventListener = function (...a) { window.__lc--; return rem.apply(this, a); }; })()""")
    # record matchMedia listeners so the test can deliver a (resolution) change that CDP emulation never fires
    ctx.add_init_script("""(() => { const mm = window.matchMedia.bind(window); window.__mq = [];
      window.matchMedia = (q) => { const l = mm(q), rec = { media: q, fns: [] }; window.__mq.push(rec);
        const add = l.addEventListener.bind(l);
        l.addEventListener = (t, f, o) => { if (t === 'change') rec.fns.push(f); return add(t, f, o); };
        rec.fire = () => rec.fns.splice(0).forEach((f) => f({ matches: false, media: q })); return l; }; })()""")
    page = ctx.new_page(); errors = []
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
    base = HTML.as_uri()
    page.goto(base); ready(page)

    # ------------------------------------------------------------------ hostile link
    hostile = {k: XSS for k in ['a', 'b', 'p', 'g', 'p1', 'p2', 'op', 'map', 'theme', 'preset', 'basePreset']}
    hostile.update({'bits': '1e400', 'su': {}, 'sv': [], 'R': 'NaN', 'glass': -5, 'back': 1e9, 'show': {'grid': 'yes', '__proto__': {'polluted': True}},
                    'rings': None, 'panel': 'false', 'extra': XSS, 'shape': XSS, 'legendMin': 'true',
                    'secs': {'curve': 'yes', 'test': 1, 'view': None, '__proto__': {'polluted': True}}})
    page.goto(base + '#s=' + b64(hostile)); ready(page, curve=False)
    a = page.evaluate(AUDIT)
    check('hostile #s= link: nothing executes, no markup injected', not a['pwned'] and not a['bad'] and not a['imgs'], json.dumps(a))
    check('hostile #s= link: state sanitized', not page.evaluate(STATE_OK), json.dumps(page.evaluate(STATE_OK)))
    check('hostile #s= link: no prototype pollution', page.evaluate("({}).polluted === undefined && Object.prototype.polluted === undefined"))
    pr = page.evaluate("[ecTorus.state.preset, ecTorus.state.basePreset]")
    check('hostile #s= link: preset ids not taken on trust (they end up in download file names)', all(x in ('custom', 'k1-neg') for x in pr), json.dumps(pr)[:80])
    # same strings as point / curve inputs that do parse: hover + pin every target, then audit the cards
    page.evaluate("ecTorus.set({ preset: '" + XSS.replace("'", "\\'") + "', a: '0', b: '7', p: '223', g: '(47, 71)', p1: '(47, 71)', p2: '(116, 55)' })")
    page.wait_for_timeout(200)
    for key in page.evaluate("ecTorus.model.targets.map((t) => t.key)"):
        s = page.evaluate(f"ecTorus.screenOf('{key}')")
        if s: page.mouse.move(s['x'], s['y']); page.wait_for_timeout(60); page.mouse.click(s['x'], s['y']); page.wait_for_timeout(60)
    a = page.evaluate(AUDIT)
    check('cards / inspector / legend with every target pinned: clean', not a['pwned'] and not a['bad'], json.dumps(a))
    page.keyboard.press('Escape'); page.keyboard.press('Escape')

    # ------------------------------------------------------------------ hostile localStorage
    page.goto(base); ready(page)
    page.evaluate("(s) => localStorage.setItem('ec-torus-v3', s)", json.dumps(hostile))
    page.reload(); ready(page, curve=False)
    a = page.evaluate(AUDIT)
    check('hostile localStorage: nothing executes, state sanitized', not a['pwned'] and not a['bad'] and not page.evaluate(STATE_OK), json.dumps(a))
    page.evaluate("(s) => localStorage.setItem('ec-torus-v3', s)", '{not json')
    page.reload(); ready(page)
    check('corrupt localStorage: falls back to defaults', page.evaluate("ecTorus.state.preset") == 'k1-neg')

    # ------------------------------------------------------------------ typed hostile input
    for fid in ['p', 'a', 'p1', 'g']:
        page.fill(f'#{fid}', XSS); page.press(f'#{fid}', 'Enter'); page.wait_for_timeout(120)
    page.wait_for_timeout(300)
    a = page.evaluate(AUDIT)
    check('hostile typed input: shown as text only', not a['pwned'] and not a['bad'], json.dumps(a))
    page.evaluate("localStorage.clear()"); page.goto(base); ready(page)

    # ------------------------------------------------------------------ sanitizeState fuzz (300 garbage states via hashchange)
    rng = random.Random(20261122)
    bad = []
    for i in range(300):
        g = garbage(rng)
        page.evaluate("(h) => { location.hash = h; }", '#s=' + b64(g))
        page.wait_for_function("!location.hash.includes('s=')", timeout=5000)
        e = page.evaluate(STATE_OK)
        if e: bad.append((i, e))
    a = page.evaluate(AUDIT)
    check('sanitizeState fuzz: 300 garbage states keep every invariant', not bad and not a['pwned'] and not a['bad'], json.dumps(bad[:3]))
    check('fuzz: no console errors', not errors, ' | '.join(errors[:3]))

    # ------------------------------------------------------------------ inputs that must not freeze the tab
    page.evaluate("localStorage.clear()"); page.goto(base); ready(page)
    p1024 = page.evaluate("(() => { const E = ecTorus.engine; let p = 2n ** 1023n + 1n; while (!(p % 4n === 3n && E.isProbablePrime(p))) p += 2n; return '0x' + p.toString(16); })()")
    comp = hex(3 * (2**1022 + 3))
    cases = [
        ('1024-bit prime p, random points', dict(a='0', b='7', p=p1024, g='', p1='', p2='')),
        ('1024-bit composite p ≡ 1 mod 4, compressed x = 0', dict(a='0', b='1', p=comp, g='', p1='02' + '00' * 128, p2='')),
        ('1024-bit composite p, x-only x = 0', dict(a='0', b='1', p=comp, g='', p1='00' * 128, p2='')),
        ('p just under 2^22 (count only)', dict(a='0', b='7', p='4194301', g='', p1='', p2='')),
        ('p just under 2^18 (every point)', dict(a='0', b='7', p='262139', g='', p1='', p2='')),
        ('p = 2', dict(a='0', b='1', p='2', g='', p1='', p2='')),
        ('p = 3', dict(a='0', b='1', p='3', g='', p1='', p2='')),
        ('Δ = 0 cusp y² = x³', dict(a='0', b='0', p='223', g='(0, 0)', p1='(1, 1)', p2='(4, 8)')),
        ('Δ = 0 node y² = x³ − 3x + 2', dict(a='-3', b='2', p='223', g='(1, 0)', p1='(2, 2)', p2='(3, 4)')),
        ('max-length expression (2**32767)**32768 as p', dict(a='0', b='7', p='(2**32767)**32768', g='', p1='', p2='')),
        ('huge power inside a point', dict(a='0', b='7', p='223', g='(47, 71)', p1='((2**32767)**32768)G', p2='((2**4095)**4096, 1)')),
        ('4000-char expression', dict(a='0', b='7', p='1' + '+1' * 1999, g='', p1='', p2='')),
        ('2000 nested parentheses', dict(a='0', b='7', p='(' * 2000 + '223' + ')' * 2000, g='', p1='', p2='')),
        ('4999 stars as a point', dict(a='0', b='7', p='223', g='', p1='*' * 4999, p2='')),
    ]
    if '--skip-freeze' in sys.argv: cases = []  # e.g. against the legacy build, where they block for minutes
    for name, st in cases:
        t0 = time.time()
        r = page.evaluate("(s) => { const t0 = performance.now(); ecTorus.set(s); const m = ecTorus.model; return { ms: performance.now() - t0, err: m.curveErr, p1: m.inputs.p1 && (m.inputs.p1.error || (m.inputs.p1.ok ? 'ok' : '')) }; }", st)
        wall = time.time() - t0
        page.evaluate("() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))")  # let SwiftShader draw it
        check(f'no freeze: {name}', r['ms'] < 1000 and wall < 5, f"update {r['ms']:.0f} ms, {wall:.2f}s wall, curveErr={r['err'][:50]!r}, p1={str(r['p1'])[:60]!r}")
    check('no console errors from the freeze cases', not errors, ' | '.join(errors[:3]))

    # ------------------------------------------------------------------ shader programs per update
    page.evaluate("localStorage.clear()"); page.goto(base); ready(page)
    page.select_option('#preset', 'pb223'); page.wait_for_timeout(500)
    # through the app's own frame loop (render, then retire old materials), five no-op updates
    links = page.evaluate("""async () => { const v = ecTorus.debug.view, gl = v.renderer.getContext(); let n = 0;
      const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const orig = gl.linkProgram.bind(gl); gl.linkProgram = (p) => { n++; return orig(p); };
      for (let i = 0; i < 5; i++) { ecTorus.set({}); await frame(); }
      gl.linkProgram = orig; return n; }""")
    check('an update that changes nothing builds no new shader programs', links == 0, f'{links} programs linked over 5 updates')
    # the same no-op update must not rewrite the panel (aria-live legend, role=alert error, text selections)
    muts = page.evaluate("""async () => {
      const ids = ['legend', 'facts', 'relations', 'inspector', 'curveErr', 'p1Msg', 'p2Msg', 'gMsg'], hit = {};
      const obs = ids.map((id) => { const o = new MutationObserver((l) => { hit[id] = (hit[id] || 0) + l.length; }); o.observe(document.getElementById(id), { childList: true, subtree: true, characterData: true, attributes: true }); return o; });
      ecTorus.set({}); await new Promise((r) => setTimeout(r, 50)); obs.forEach((o) => o.disconnect()); return hit; }""")
    check('a no-op update leaves the panel DOM untouched', not muts, json.dumps(muts))
    # devicePixelRatio changes: browser zoom (CSS size and DPR change together, a resize fires) and a move to a
    # monitor with another scale (DPR alone; browsers fire the (resolution) media query, CDP emulation fires
    # nothing, so the app's own media-query listener is invoked by hand)
    PR = "(() => { const v = ecTorus.debug.view, gl = v.renderer.getContext(), m = document.getElementById('mini'); return { dpr: devicePixelRatio, renderer: v.renderer.getPixelRatio(), buf: gl.drawingBufferWidth, css: v.viewW, mini: m.width, miniCss: m.clientWidth }; })()"
    okPR = lambda r, k: abs(r['renderer'] - k) < 1e-3 and abs(r['buf'] - k * r['css']) <= 1 and abs(r['mini'] - round(k * r['miniCss'])) <= 1  # headed Chrome reports 1.5000000447
    cdp = ctx.new_cdp_session(page)
    cdp.send('Emulation.setDeviceMetricsOverride', {'width': 1400, 'height': 900, 'deviceScaleFactor': 2, 'mobile': False})
    page.wait_for_timeout(600)
    pr = page.evaluate(PR)
    check('browser zoom (DPR 2 + resize): renderer and flat map follow', okPR(pr, 2), json.dumps(pr))
    cdp.send('Emulation.setDeviceMetricsOverride', {'width': 1400, 'height': 900, 'deviceScaleFactor': 1.5, 'mobile': False})
    page.wait_for_timeout(300)
    page.evaluate("(window.__mq || []).filter((q) => /resolution/.test(q.media)).forEach((q) => q.fire())")
    page.wait_for_timeout(300)
    pr = page.evaluate(PR)
    check('monitor move (DPR 1.5, same CSS size): renderer and flat map follow', okPR(pr, 1.5), json.dumps(pr))
    cdp.send('Emulation.clearDeviceMetricsOverride'); page.set_viewport_size({'width': 1440, 'height': 900}); page.wait_for_timeout(400)

    # ------------------------------------------------------------------ leaks over 50 cycles
    SNAP = """async () => { while (ecTorus.debug.view.morph) await new Promise((r) => requestAnimationFrame(r)); // a shape morph holds extra buffers until it ends
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const v = ecTorus.debug.view, i = v.renderer.info;
      return { geometries: i.memory.geometries, textures: i.memory.textures, programs: i.programs.length, nodes: document.getElementsByTagName('*').length,
               listeners: window.__lc, sprites: v.sprites.length, texCache: v.texCache.size }; }"""
    CYCLE = """async (i) => {
      const ids = [...document.querySelectorAll('#preset option')].map((o) => o.value).filter((v) => v !== 'custom');
      const sel = document.getElementById('preset'); sel.value = ids[i % ids.length]; sel.dispatchEvent(new Event('change'));
      if (i % 5 === 4) document.getElementById('themeBtn').click();
      const tiles = document.querySelectorAll('#shape input[name="shape"]'); if (tiles.length) tiles[i % tiles.length].click();
      for (const k of ['grid', 'cloud', 'chord', 'beta', 'labels', 'rings', 'map']) { const c = document.querySelector(`[data-show="${k}"]`); if (!c.disabled) { c.click(); c.click(); } }
      await new Promise((r) => requestAnimationFrame(r));
    }"""
    for i in range(10): page.evaluate(CYCLE, i)   # warm-up: every preset and both themes once
    page.evaluate("(() => { if (document.documentElement.dataset.theme !== 'dark') document.getElementById('themeBtn').click(); const s = document.getElementById('preset'); s.value = 'pb223'; s.dispatchEvent(new Event('change')); const t = document.querySelector('#shape input[value=torus]'); if (t) t.click(); })()")
    s0 = page.evaluate(SNAP)
    for i in range(50): page.evaluate(CYCLE, i)
    page.evaluate("(() => { if (document.documentElement.dataset.theme !== 'dark') document.getElementById('themeBtn').click(); const s = document.getElementById('preset'); s.value = 'pb223'; s.dispatchEvent(new Event('change')); const t = document.querySelector('#shape input[value=torus]'); if (t) t.click(); })()")
    s1 = page.evaluate(SNAP)
    print('LEAK before', json.dumps(s0)); print('LEAK after ', json.dumps(s1))
    check('50 cycles: GPU geometries / textures / programs back to start', all(s1[k] == s0[k] for k in ('geometries', 'textures', 'programs')), f'{s0} -> {s1}')
    check('50 cycles: DOM nodes and listeners back to start', s1['nodes'] == s0['nodes'] and s1['listeners'] == s0['listeners'], f'{s0} -> {s1}')

    # ------------------------------------------------------------------ WebGL context loss and restore
    page.select_option('#preset', 'pb223'); page.wait_for_timeout(500)
    shot = lambda n: page.screenshot(path=str(OUT / f'ctx-{n}.png'))
    shot('1-before')
    page.evaluate("window.__ext = ecTorus.debug.view.renderer.getContext().getExtension('WEBGL_lose_context'); window.__ext.loseContext()")
    page.wait_for_timeout(500)
    lost = page.evaluate("({ lost: ecTorus.debug.view.renderer.getContext().isContextLost(), notice: !document.getElementById('glfail').hidden, text: document.getElementById('glfail').innerText })")
    shot('2-lost')
    print('CTX lost', json.dumps(lost))
    check('context lost: the user is told', lost['lost'] and lost['notice'], json.dumps(lost))
    page.evaluate("window.__ext.restoreContext()")
    page.wait_for_timeout(1200)
    shot('3-restored')
    rec = page.evaluate("""async () => {
      const load = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = src; });
      return { notice: !document.getElementById('glfail').hidden, lost: ecTorus.debug.view.renderer.getContext().isContextLost() };
    }""")
    imgs = [base64.b64encode((OUT / f'ctx-{n}.png').read_bytes()).decode() for n in ('1-before', '3-restored')]
    diff = page.evaluate("""async ([a, b]) => {
      const load = (s) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = 'data:image/png;base64,' + s; });
      const [A, B] = await Promise.all([load(a), load(b)]), c = document.createElement('canvas'); c.width = A.width; c.height = A.height;
      const g = c.getContext('2d'); g.drawImage(A, 0, 0); const da = g.getImageData(0, 0, c.width, c.height).data;
      g.clearRect(0, 0, c.width, c.height); g.drawImage(B, 0, 0); const db = g.getImageData(0, 0, c.width, c.height).data;
      let n = 0; for (let i = 0; i < da.length; i += 4) if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 30) n++;
      return n / (da.length / 4); }""", imgs)
    print('CTX restored', json.dumps(rec), f'differs from before on {diff * 100:.2f}% of pixels')
    check('context restored: notice gone and the torus is drawn again without user input', not rec['notice'] and not rec['lost'] and diff < 0.01, f'{diff * 100:.2f}% of pixels differ')
    check('zero console errors overall', not [e for e in errors if 'CONTEXT_LOST' not in e], ' | '.join(errors[:3]))
    page.evaluate("localStorage.clear()")
    b.close()

fails = [r for r in results if not r[1]]
print(f'\n{len(results) - len(fails)}/{len(results)} passed')
sys.exit(1 if fails else 0)
