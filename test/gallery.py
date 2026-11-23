"""Screenshots for visual review (fat lines, as on a real GPU), into shots/gallery/.

    py -3 test/gallery.py [scale] [preset ids…] [--gpu]
"""
import sys
from playwright.sync_api import sync_playwright
from _launch import HTML, SHOTS, launch, ready

OUT = SHOTS / 'gallery'; OUT.mkdir(parents=True, exist_ok=True)
args = [a for a in sys.argv[1:] if not a.startswith('--')]
SCALE = float(args[0]) if args else 1
with sync_playwright() as pw:
    b = launch(pw)
    ctx = b.new_context(viewport={'width': 1440, 'height': 900}, device_scale_factor=SCALE)
    page = ctx.new_page()
    errs = []
    page.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    page.on('pageerror', lambda e: errs.append(str(e)))
    page.goto(HTML.as_uri() + '?lines=fat'); ready(page, 300)
    page.evaluate("localStorage.clear()")
    shots = args[1:] or ['k1-neg', 'k1-chord', 'k1-glv', 'p256', 'pb223', 't211', 'c97', 'pp17', 't10009']
    for theme in ['dark', 'paper']:
        if page.evaluate("document.documentElement.dataset.theme") != theme:
            page.click('#themeBtn'); page.wait_for_timeout(300)
        for pid in shots:
            page.select_option('#preset', pid); page.wait_for_timeout(700)
            page.screenshot(path=str(OUT / f'{theme}-{pid}.png'))
    # a hover card on a plain curve point and a pinned result
    page.select_option('#preset', 'pb223'); page.wait_for_timeout(600)
    s = page.evaluate("ecTorus.screenOf('sum')")
    page.mouse.click(s['x'], s['y']); page.wait_for_timeout(300)
    s = page.evaluate("ecTorus.screenOf('r')")
    page.mouse.move(s['x'], s['y']); page.wait_for_timeout(400)
    page.screenshot(path=str(OUT / 'paper-cards.png'))
    page.keyboard.press('t'); page.wait_for_timeout(500)
    page.screenshot(path=str(OUT / 'dark-cards.png'))
    page.keyboard.press('3'); page.wait_for_timeout(1200)
    page.screenshot(path=str(OUT / 'dark-side.png'))
    print('errors:', errs)
    b.close()
