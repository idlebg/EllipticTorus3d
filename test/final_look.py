"""Final visual check: fresh loads at desktop (fat lines) and phone size, into shots/final/.

    py -3 test/final_look.py [--gpu]
"""
from playwright.sync_api import sync_playwright
from _launch import HTML, SHOTS, launch, ready

OUT = SHOTS / 'final'; OUT.mkdir(parents=True, exist_ok=True)
with sync_playwright() as pw:
    b = launch(pw)
    for name, vp, dpr, url in [('desktop', (1440, 900), 1, '?lines=fat'), ('phone', (390, 844), 2, '?lines=fat')]:
        ctx = b.new_context(viewport={'width': vp[0], 'height': vp[1]}, device_scale_factor=dpr)
        page = ctx.new_page(); errs = []
        page.on('pageerror', lambda e: errs.append(str(e)))
        page.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        page.goto(HTML.as_uri() + url); ready(page, 1200)
        page.screenshot(path=str(OUT / f'{name}-default.png'))
        page.select_option('#preset', 'pb223'); page.wait_for_timeout(900)
        page.screenshot(path=str(OUT / f'{name}-pb223.png'))
        print(name, 'errors:', errs, 'scrollW', page.evaluate('document.documentElement.scrollWidth'), 'innerW', page.evaluate('innerWidth'))
        ctx.close()
    b.close()
