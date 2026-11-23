"""Chromium with WebGL disabled: the panel, flat map, inspector and maths must keep working.

    py -3 test/nowebgl.py
"""
import sys, json
from playwright.sync_api import sync_playwright
from _launch import HTML, SHOTS, launch, ready

OUT = SHOTS / 'nowebgl'; OUT.mkdir(parents=True, exist_ok=True)
results = []

def check(name, cond, detail=''):
    results.append((name, bool(cond), detail))
    print(('PASS ' if cond else 'FAIL ') + name + (f'  [{detail}]' if detail and not cond else ''))

with sync_playwright() as pw:
    b = launch(pw, gpu=False, browser='chromium', args=['--disable-webgl', '--disable-webgl2', '--disable-3d-apis'])
    page = b.new_page(viewport={'width': 1440, 'height': 900})
    errors, logs = [], []
    page.on('console', lambda m: (logs.append(f'[{m.type}] {m.text}'), errors.append(m.text) if m.type == 'error' else None))
    page.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
    page.goto(HTML.as_uri()); ready(page, 900)
    check('no WebGL context available', page.evaluate("(() => { const c = document.createElement('canvas'); return !(c.getContext('webgl2') || c.getContext('webgl')); })()"))
    check('fallback notice shown', not page.evaluate("document.getElementById('glfail').hidden"))
    check('self-test passes', page.evaluate("ecTorus.selfTest().fail === 0"))
    page.select_option('#preset', 'pb223'); page.wait_for_timeout(400)
    check('maths: G + 8G = (69, 86) on F223', page.evaluate("(() => { const P = ecTorus.model.op.P; return P.x === 69n && P.y === 86n })()"))
    check('relations rendered', '(69, 86)' in page.evaluate("document.getElementById('relations').innerText"))
    check('flat map visible and drawn', page.evaluate("""(() => { const c = document.getElementById('mini'); if (!c.offsetParent) return false;
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n > 1000; })()"""))
    # hover a curve point on the flat map (not a marker): inspector must show it
    xy = page.evaluate("""(() => { const m = ecTorus.model, c = document.getElementById('mini'), r = c.getBoundingClientRect();
      const W = c.clientWidth, padL = 24, padT = 6, w = W - 24 - 6, h = W - 6 - 16;
      const used = new Set(m.targets.map((t) => t.P.x + ':' + t.P.y));
      for (let i = 0; i < m.small.xs.length; i++) { const x = m.small.xs[i], y = m.small.ys[i]; if (used.has(x + ':' + y)) continue;
        return { x: r.left + padL + x / 223 * w, y: r.top + padT + (1 - y / 223) * h, pt: '(' + x + ', ' + y + ')' }; } })()""")
    page.mouse.move(xy['x'], xy['y']); page.wait_for_timeout(250)
    insp = page.evaluate("document.getElementById('inspector').innerText")
    check('flat map: hovering a curve point fills the inspector', 'curve point' in insp, insp[:120])
    page.mouse.click(xy['x'], xy['y']); page.wait_for_timeout(250)
    # click the P2 marker on the flat map: a card cannot be anchored without the 3D view
    m2 = page.evaluate("""(() => { const t = ecTorus.model.pts.p2, c = document.getElementById('mini'), r = c.getBoundingClientRect(), W = c.clientWidth;
      return { x: r.left + 24 + t.tu * (W - 30), y: r.top + 6 + (1 - t.tv) * (W - 22) }; })()""")
    page.mouse.move(m2['x'], m2['y']); page.wait_for_timeout(150); page.mouse.click(m2['x'], m2['y']); page.wait_for_timeout(250)
    check('flat map: P2 marker hover/click fills the inspector', 'P₂' in page.evaluate("document.getElementById('inspector').innerText"))
    cards = page.evaluate("[...document.querySelectorAll('.card')].map((c) => ({ t: c.style.transform, d: getComputedStyle(c).display }))")
    check('flat map clicks without WebGL leave no stray card at the stage corner', all(c['d'] == 'none' or c['t'] for c in cards), json.dumps(cards))
    page.screenshot(path=str(OUT / 'nowebgl-pb223.png'))
    page.click('#themeBtn'); page.wait_for_timeout(300)
    page.screenshot(path=str(OUT / 'nowebgl-paper.png'))
    page.keyboard.press('t')
    check('zero console errors', not errors, ' | '.join(errors[:4]))
    print('\n'.join(l for l in logs if 'error' in l.lower() or 'webgl' in l.lower())[:600])
    b.close()

fails = [r for r in results if not r[1]]
print(f'\n{len(results) - len(fails)}/{len(results)} passed')
sys.exit(1 if fails else 0)
