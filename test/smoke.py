"""Quick look: load the built file from file://, report console output, take one screenshot.

    py -3 test/smoke.py [file.html] [--gpu | --browser=firefox|webkit]
"""
import sys, json, pathlib
from playwright.sync_api import sync_playwright
from _launch import HTML, SHOTS, launch, gl_info

args = [a for a in sys.argv[1:] if not a.startswith('--')]
FILE = pathlib.Path(args[0]).resolve() if args else HTML
SHOTS.mkdir(exist_ok=True)

with sync_playwright() as pw:
    b = launch(pw)
    ctx = b.new_context(viewport={'width': 1440, 'height': 900}, device_scale_factor=1)
    page = ctx.new_page()
    logs = []
    page.on('console', lambda m: logs.append(f'[{m.type}] {m.text}'))
    page.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
    page.goto(FILE.as_uri())
    page.wait_for_timeout(1500)
    page.screenshot(path=str(SHOTS / '01-default.png'))
    info = page.evaluate("""() => ({
      gl: !document.getElementById('glfail').hidden ? 'FAILED' : 'ok',
      facts: document.getElementById('facts').innerText,
      rel: document.getElementById('relations').innerText,
      legend: document.getElementById('legend').innerText,
      msgs: ['p1Msg','p2Msg','gMsg'].map(id => document.getElementById(id).innerText),
      test: document.getElementById('testAside').innerText,
    })""")
    print(json.dumps(info, indent=1, ensure_ascii=False))
    print('GL', json.dumps(gl_info(page)))
    print('\n'.join(logs))
    b.close()
