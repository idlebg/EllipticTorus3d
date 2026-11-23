"""Regenerate docs/screenshots from the built file (fat lines, as on a real GPU).

    py -3 test/docs_shots.py          # SwiftShader, ?lines=fat (default)
    py -3 test/docs_shots.py --gpu    # installed Chrome on the real GPU
"""
from playwright.sync_api import sync_playwright
from _launch import HTML, ROOT, launch, ready

OUT = ROOT / 'docs' / 'screenshots'; OUT.mkdir(parents=True, exist_ok=True)

with sync_playwright() as pw:
    b = launch(pw)
    ctx = b.new_context(viewport={'width': 1440, 'height': 900}, device_scale_factor=1)
    page = ctx.new_page(); errs = []
    page.on('pageerror', lambda e: errs.append(str(e)))
    page.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    page.goto(HTML.as_uri() + '?lines=fat'); ready(page, 900)
    page.evaluate('localStorage.clear()'); page.reload(); ready(page, 900)
    page.screenshot(path=str(OUT / 'dark-secp256k1-mirror-pair.png'))
    page.select_option('#preset', 'k1-glv'); page.wait_for_timeout(800)
    page.screenshot(path=str(OUT / 'dark-secp256k1-glv.png'))
    page.select_option('#preset', 'pb223'); page.wait_for_timeout(800)
    s = page.evaluate("ecTorus.screenOf('sum')"); page.mouse.click(s['x'], s['y']); page.wait_for_timeout(300)
    s = page.evaluate("ecTorus.screenOf('r')"); page.mouse.move(s['x'], s['y']); page.wait_for_timeout(400)
    page.screenshot(path=str(OUT / 'dark-f223-chord-cards.png'))
    page.keyboard.press('Escape'); page.keyboard.press('Escape')
    page.click('#themeBtn'); page.wait_for_timeout(400)
    page.select_option('#preset', 'k1-neg'); page.wait_for_timeout(800)
    page.screenshot(path=str(OUT / 'paper-secp256k1-mirror-pair.png'))
    page.select_option('#preset', 'p256'); page.wait_for_timeout(800)
    page.screenshot(path=str(OUT / 'paper-p256.png'))
    page.evaluate('localStorage.clear()')
    ctx.close()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
    page = ctx.new_page()
    page.goto(HTML.as_uri() + '?lines=fat'); ready(page, 900)
    page.select_option('#preset', 'pb223'); page.wait_for_timeout(800)
    page.screenshot(path=str(OUT / 'phone-f223.png'))
    page.evaluate('localStorage.clear()')
    b.close()
    print('errors:', errs)
    print('\n'.join(sorted(p.name for p in OUT.glob('*.png'))))
