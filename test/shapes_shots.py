"""One screenshot per shape (F₂₂₃ chord preset, dark; secp256k1 GLV, paper) into shots/shapes/.

    py -3 test/shapes_shots.py [--gpu]
"""
import json
from playwright.sync_api import sync_playwright
from _launch import HTML, SHOTS, GPU, launch, ready

OUT = SHOTS / 'shapes'; OUT.mkdir(parents=True, exist_ok=True)
with sync_playwright() as pw:
    b = launch(pw)
    page = b.new_page(viewport={'width': 1440, 'height': 900}); errors = []
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
    page.goto(HTML.as_uri() + ('' if GPU else '?lines=fat')); ready(page)
    page.evaluate('localStorage.clear()')
    shapes = page.evaluate("[...document.querySelectorAll('#shape input[name=\"shape\"]')].map(i => i.value)")
    for theme, preset in (('dark', 'pb223'), ('paper', 'k1-glv')):
        if page.evaluate("document.documentElement.dataset.theme") != theme: page.click('#themeBtn'); page.wait_for_timeout(300)
        page.select_option('#preset', preset); page.wait_for_timeout(400)
        for sid in shapes:
            page.click(f'label.tile:has(input[value="{sid}"])')
            page.wait_for_function('!ecTorus.debug.view.morph', timeout=15000); page.wait_for_timeout(600)
            page.screenshot(path=str(OUT / f'{theme}-{preset}-{sid}.png'))
    print('shapes:', shapes, 'errors:', errors)
    page.evaluate('localStorage.clear()')
    b.close()
