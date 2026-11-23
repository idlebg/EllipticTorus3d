"""Cross-browser pass (Playwright builds): file:// load, console, self-test, presets, hover/pin, both themes,
screenshots in shots/<browser>/.

    py -3 test/browsers.py                    # firefox and webkit
    py -3 test/browsers.py chromium firefox   # any subset
"""
import sys, json
from playwright.sync_api import sync_playwright
from _launch import HTML, SHOTS, launch, gl_info, ready

names = [a for a in sys.argv[1:] if not a.startswith('--')] or ['firefox', 'webkit']
results = []

def check(name, cond, detail=''):
    results.append((name, bool(cond), detail))
    print(('PASS ' if cond else 'FAIL ') + name + (f'  [{detail}]' if detail and not cond else ''))

with sync_playwright() as pw:
    for name in names:
        out = SHOTS / name; out.mkdir(parents=True, exist_ok=True)
        b = launch(pw, browser=name)
        ctx = b.new_context(viewport={'width': 1440, 'height': 900}, device_scale_factor=1)
        page = ctx.new_page(); errors, warns = [], []
        page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else warns.append(m.text) if m.type == 'warning' else None)
        page.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
        page.goto(HTML.as_uri()); ready(page, 1200)
        info = gl_info(page)
        print(name, b.version, 'GL', json.dumps(info))
        gl = page.evaluate("document.getElementById('glfail').hidden")
        check(f'{name}: 3D view running (WebGL)', gl, 'WebGL unavailable: #glfail shown')
        st = page.evaluate("ecTorus.selfTest()")
        check(f'{name}: self-test {st["pass"]}/{st["pass"] + st["fail"]}', st['fail'] == 0 and st['pass'] == len(st['items']), json.dumps([i['name'] for i in st['items'] if not i['ok']]))
        page.screenshot(path=str(out / 'b01-default-dark.png'))
        # hover + pin P1
        if gl:
            pos = page.evaluate("ecTorus.screenOf('p1')")
            page.mouse.move(pos['x'], pos['y']); page.wait_for_timeout(300)
            check(f'{name}: hover card on P1', page.evaluate("!!document.querySelector('.card.hover')"))
            page.mouse.click(pos['x'], pos['y']); page.wait_for_timeout(300)
            check(f'{name}: click pins a card', page.evaluate("document.querySelectorAll('.card.pinned').length") == 1)
            page.screenshot(path=str(out / 'b02-pinned.png'))
            page.keyboard.press('Escape'); page.keyboard.press('Escape'); page.wait_for_timeout(150)
        # presets, both themes
        opts = [o for o in page.evaluate("[...document.querySelectorAll('#preset option')].map(o => o.value)") if o != 'custom']
        for theme in ['dark', 'paper']:
            if page.evaluate("document.documentElement.dataset.theme") != theme:
                page.click('#themeBtn'); page.wait_for_timeout(300)
            bad = []
            for pid in opts:
                page.select_option('#preset', pid); page.wait_for_timeout(350)
                m = page.evaluate("(() => { const m = ecTorus.model; return { err: m.curveErr, p1: !!m.pts.p1, p2: !!m.pts.p2, op: m.op.status, g: !!m.G } })()")
                if m['err'] or not (m['p1'] and m['p2'] and m['op'] == 'ok' and m['g']): bad.append(pid)
                if pid in ('pb223', 'k1-glv', 't10009'): page.screenshot(path=str(out / f'b10-{theme}-{pid}.png'))
            check(f'{name}: {theme} theme, all {len(opts)} presets compute', not bad, ', '.join(bad))
        if gl:
            page.select_option('#preset', 'pb223'); page.wait_for_timeout(400)
            pos = page.evaluate("ecTorus.screenOf('sum')")
            page.mouse.move(pos['x'], pos['y']); page.wait_for_timeout(300)
            page.mouse.click(pos['x'], pos['y']); page.wait_for_timeout(300)
            pos = page.evaluate("ecTorus.screenOf('r')")
            page.mouse.move(pos['x'], pos['y']); page.wait_for_timeout(300)
            check(f'{name}: paper theme pin + hover on F223', page.evaluate("document.querySelectorAll('.card.pinned').length === 1 && !!document.querySelector('.card.hover')"))
            page.screenshot(path=str(out / 'b20-paper-cards.png'))
        check(f'{name}: zero console errors', not errors, ' | '.join(errors[:4]))
        if warns: print(f'  {name} console warnings: {len(warns)}; first: {warns[0][:160]}')
        page.evaluate("localStorage.clear()")
        b.close()

fails = [r for r in results if not r[1]]
print(f'\n{len(results) - len(fails)}/{len(results)} passed')
sys.exit(1 if fails else 0)
