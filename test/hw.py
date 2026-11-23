"""Hardware checks: WebGL renderer, hover frame times on F10009, fat-line and marker sizes at DPR 1 / 1.5 / 2,
PNG export at DPR 2. Meant for --gpu (installed Chrome on the real GPU); runs on SwiftShader too.

    py -3 test/hw.py --gpu
"""
import sys, json, base64, struct
from playwright.sync_api import sync_playwright
from _launch import HTML, SHOTS, MODE, launch, gl_info, ready

OUT = SHOTS / MODE; OUT.mkdir(parents=True, exist_ok=True)
results = []

def check(name, cond, detail=''):
    results.append((name, bool(cond), detail))
    print(('PASS ' if cond else 'FAIL ') + name + (f'  [{detail}]' if detail else ''))

# Minimal scene for measuring: one point, its two rings, no grid / cloud / glass / hidden lines / labels.
SCENE = """(rings) => ecTorus.set({ preset: 'custom', a: '0', b: '7', p: '223', g: '(47, 71)', p1: '(47, 71)', p2: '', op: 'add',
  showG: false, glass: 0, back: 0, R: 1.2, r: 0.46,
  show: { grid: false, rings, labels: false, cloud: false, chord: false, beta: false, map: false, spin: false },
  rings: { p1: rings, p2: false, sum: false, g: false } })"""

# Render once, read the drawing buffer back and measure in device pixels from the alpha channel
# (the canvas is transparent, so alpha = coverage × opacity of whatever was drawn).
MEASURE = """() => {
  const T = VENDOR_THREE, v = ecTorus.debug.view, r = v.renderer, gl = r.getContext(), S = ecTorus.state, M = ecTorus.model;
  r.render(v.scene, v.camera);
  const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, k = W / v.viewW;
  const buf = new Uint8Array(W * H * 4);
  gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, buf);
  const A = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 0 : buf[((H - 1 - y) * W + x) * 4 + 3] / 255;
  const scr = (p) => { const q = p.clone().project(v.camera); return [(q.x + 1) / 2 * v.viewW * k, (1 - q.y) / 2 * v.viewH * k]; };
  const tp = (tu, tv, lift) => { const u = tu * 2 * Math.PI, w = tv * 2 * Math.PI, rr = S.r + lift, ww = S.R + rr * Math.cos(w);
    return new T.Vector3(ww * Math.cos(u), ww * Math.sin(u), rr * Math.sin(w)); };
  // integrate alpha across a ring along pixel rows, correct for the ring's angle to the row, and average
  // over ±10 CSS px along the ring (two or three polyline segments) so the round-cap overlap at the
  // joints, where alpha is blended twice, is averaged rather than hit or missed by one row
  const ringWidth = (tuA, tvA, tuB, tvB, opacity) => {
    const [x0, y0] = scr(tp(tuA, tvA, 0.002)), [x1, y1] = scr(tp(tuB, tvB, 0.002));
    const len = Math.hypot(x1 - x0, y1 - y0), sinT = Math.abs(y1 - y0) / len, slope = (x1 - x0) / (y1 - y0);
    const half = Math.ceil(14 * k / Math.max(sinT, 0.2)), rows = Math.round(10 * k * sinT);
    const per = [];
    for (let dy = -rows; dy <= rows; dy++) {
      const row = Math.round(y0) + dy, xc = Math.round(x0 + dy * slope);
      let sum = 0; for (let x = xc - half; x <= xc + half; x++) sum += A(x, row);
      per.push(sum * sinT / opacity);
    }
    const mean = per.reduce((s, w) => s + w, 0) / per.length;
    return { device: +mean.toFixed(2), css: +(mean / k).toFixed(2), minCss: +(Math.min(...per) / k).toFixed(2), maxCss: +(Math.max(...per) / k).toFixed(2), sinT: +sinT.toFixed(3) };
  };
  const t = M.pts.p1, out = { k, W, H, viewW: v.viewW, viewH: v.viewH, pal: v.pal.lw };
  if (S.show.rings) {
    // top view: parallel ring (fixed v) at its leftmost point (vertical on screen), meridian ring (fixed u)
    // 0.2 turn along the tube from P1
    out.parallel = ringWidth(0.5, t.tv, 0.502, t.tv, 0.8);
    out.meridian = ringWidth(t.tu, t.tv - 0.2, t.tu, t.tv - 0.198, 0.95);
  } else {
    // marker: opaque halo disk (radius 50/128 of the sprite quad) -> diameter from its area
    const [cx, cy] = scr(t.pos), R = Math.ceil(16 * k);
    let area = 0; for (let y = Math.round(cy) - R; y <= Math.round(cy) + R; y++) for (let x = Math.round(cx) - R; x <= Math.round(cx) + R; x++) area += A(x, y);
    const d = 2 * Math.sqrt(area / Math.PI);
    out.marker = { device: +d.toFixed(2), css: +(d / k).toFixed(2), expectCss: +(t.px * 100 / 128).toFixed(2) };
  }
  return out;
}"""

with sync_playwright() as pw:
    b = launch(pw)
    # ---------------------------------------------------------------- renderer + hover frame times
    ctx = b.new_context(viewport={'width': 1440, 'height': 900}, device_scale_factor=1)
    page = ctx.new_page(); errors = []
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
    page.goto(HTML.as_uri()); ready(page, 900)
    info = gl_info(page); print('GL', json.dumps(info))
    check('WebGL renderer reported', info.get('webgl') and info.get('renderer'), info.get('renderer', ''))
    if MODE == 'gpu':
        check('running on a hardware GPU (not SwiftShader)', 'swiftshader' not in info['renderer'].lower() and not info['softGL'], info['renderer'])
    page.select_option('#preset', 't10009'); page.wait_for_timeout(900)
    page.evaluate("""() => { window.__ft = []; window.__lt = []; window.__rec = true; let last = performance.now();
      const tick = (t) => { window.__ft.push(t - last); last = t; if (window.__rec) requestAnimationFrame(tick); }; requestAnimationFrame(tick);
      try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push(e.duration); }).observe({ entryTypes: ['longtask'] }); } catch {} }""")
    st = page.evaluate("(() => { const r = document.getElementById('gl').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; })()")
    cx, cy = st['x'] + st['w'] / 2, st['y'] + st['h'] / 2
    import math
    page.mouse.move(cx + 260, cy)
    for i in range(1, 721):  # two slow loops around the torus at the tube's radius
        a = i / 360 * 2 * math.pi
        page.mouse.move(cx + 260 * math.cos(a), cy + 170 * math.sin(a))
    page.wait_for_timeout(200)
    ft = page.evaluate("(() => { window.__rec = false; return { ft: window.__ft.slice(2), lt: window.__lt, hovered: !!document.querySelector('.card.hover') }; })()")
    f = sorted(ft['ft'])
    q = lambda p: f[min(len(f) - 1, int(p * len(f)))]
    hover = {'frames': len(f), 'median_ms': round(q(0.5), 2), 'p95_ms': round(q(0.95), 2), 'max_ms': round(f[-1], 2),
             'over_25ms': sum(1 for x in f if x > 25), 'long_tasks': len(ft['lt'])}
    print('HOVER t10009', json.dumps(hover))
    check('hover over F10009: cards follow the cursor', ft['hovered'])
    check('hover over F10009: no long tasks (> 50 ms)', hover['long_tasks'] == 0, json.dumps(ft['lt'][:5]))
    page.screenshot(path=str(OUT / 'hw-t10009-hover.png'))
    check('zero console errors (hover run)', not errors, ' | '.join(errors[:3]))
    ctx.close()

    # ---------------------------------------------------------------- line widths and marker sizes per DPR
    sizes = {}
    for dpr in (1, 1.5, 2):
        ctx = b.new_context(viewport={'width': 1440, 'height': 900}, device_scale_factor=dpr)
        page = ctx.new_page()
        page.goto(HTML.as_uri()); ready(page, 700)
        page.evaluate("localStorage.clear()")
        page.evaluate(SCENE, True); page.keyboard.press('2'); page.wait_for_timeout(1100)
        lines = page.evaluate(MEASURE)
        page.screenshot(path=str(OUT / f'hw-dpr{dpr}-rings.png'))
        page.evaluate(SCENE, False); page.wait_for_timeout(300)
        mk = page.evaluate(MEASURE)
        sizes[dpr] = {'pixelRatio': lines['k'], 'buffer': [lines['W'], lines['H']], 'parallel': lines['parallel'], 'meridian': lines['meridian'], 'marker': mk['marker'], 'lw': lines['pal']}
        print(f'DPR {dpr}', json.dumps(sizes[dpr]))
        lw = lines['pal']
        check(f'DPR {dpr}: drawing buffer = CSS size × min(DPR, 2)', abs(lines['k'] - min(dpr, 2)) < 0.01, str(lines['k']))
        check(f'DPR {dpr}: parallel ring {lw["par"]} CSS px', abs(lines['parallel']['css'] - lw['par']) < 0.35, str(lines['parallel']))
        check(f'DPR {dpr}: meridian ring {lw["mer"]} CSS px', abs(lines['meridian']['css'] - lw['mer']) < 0.45, str(lines['meridian']))
        check(f'DPR {dpr}: marker halo {mk["marker"]["expectCss"]} CSS px', abs(mk['marker']['css'] - mk['marker']['expectCss']) < 0.6, str(mk['marker']))
        # each line is blended once per pixel: no alpha build-up where neighbouring segments' round caps overlap.
        # Beading adds coverage, so the mean width integrated across the line sits above spec; on the vertical
        # (parallel) ring it also shows as periodic per-row peaks. The 76° meridian's per-row values at DPR 1
        # vary with 4× MSAA sampling whatever the joints do, so only its mean is checked.
        for ring, spec in (('parallel', lw['par']), ('meridian', lw['mer'])):
            w = lines[ring]
            flat = ring != 'parallel' or w['maxCss'] - w['minCss'] < 0.3
            check(f'DPR {dpr}: {ring} ring has no beading at segment joints', flat and abs(w['css'] - spec) < 0.04,
                  f"mean {w['css']} (spec {spec}), per-row {w['minCss']}–{w['maxCss']}")
        page.evaluate("localStorage.clear()")
        ctx.close()

    # ---------------------------------------------------------------- PNG export at DPR 2
    ctx = b.new_context(viewport={'width': 1440, 'height': 900}, device_scale_factor=2, accept_downloads=True)
    page = ctx.new_page(); errors = []
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.goto(HTML.as_uri()); ready(page, 900)
    page.evaluate("localStorage.clear()")
    page.select_option('#preset', 'pb223'); page.wait_for_timeout(800)
    buf = page.evaluate("(() => { const gl = ecTorus.debug.view.renderer.getContext(); return [gl.drawingBufferWidth, gl.drawingBufferHeight]; })()")
    with page.expect_download() as d: page.click('#pngBtn')
    png = OUT / 'hw-export-dpr2.png'; d.value.save_as(str(png))
    raw = png.read_bytes()
    w, h = struct.unpack('>II', raw[16:24])
    check('PNG export DPR 2: size = drawing buffer', [w, h] == buf, f'png {w}x{h}, buffer {buf[0]}x{buf[1]}')
    stats = page.evaluate("""async (b64) => {
      const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data, bg = [d[0], d[1], d[2], d[3]];
      let diff = 0, transparent = 0;
      for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 255) transparent++; if (Math.abs(d[i] - bg[0]) + Math.abs(d[i + 1] - bg[1]) + Math.abs(d[i + 2] - bg[2]) > 40) diff++; }
      return { corner: bg, transparent, drawn: diff, total: d.length / 4 };
    }""", base64.b64encode(raw).decode())
    print('PNG', json.dumps(stats))
    check('PNG export DPR 2: background set (opaque, theme colour #070b10)', stats['transparent'] == 0 and all(abs(a - e) <= 2 for a, e in zip(stats['corner'], [7, 11, 16, 255])), str(stats['corner']))
    check('PNG export DPR 2: not blank', stats['drawn'] > 0.01 * stats['total'], f"{stats['drawn']} of {stats['total']} px drawn")
    check('zero console errors (export run)', not errors, ' | '.join(errors[:3]))
    page.evaluate("localStorage.clear()")
    b.close()

fails = [r for r in results if not r[1]]
print(f'\n{len(results) - len(fails)}/{len(results)} passed')
sys.exit(1 if fails else 0)
