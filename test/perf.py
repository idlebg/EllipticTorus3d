"""Render / pick / overlay / flat-map / update timings (ms, mean of n runs).

    py -3 test/perf.py          # headless Chromium + SwiftShader (default)
    py -3 test/perf.py --gpu    # installed Chrome, headed, real GPU
"""
import json
from playwright.sync_api import sync_playwright
from _launch import HTML, launch, gl_info, ready

with sync_playwright() as pw:
    b = launch(pw)
    page = b.new_page(viewport={'width': 1440, 'height': 900})
    page.goto(HTML.as_uri()); ready(page, 800)
    print('GL', json.dumps(gl_info(page)))
    for pid in ['k1-neg', 't10009']:
        page.select_option('#preset', pid); page.wait_for_timeout(800)
        r = page.evaluate("""() => {
          const d = ecTorus.debug, v = d.view, T = (f, n = 5) => { const t0 = performance.now(); for (let i = 0; i < n; i++) f(); return (performance.now() - t0) / n; };
          const gl = v.renderer.getContext();
          return {
            render: T(() => { v.renderer.render(v.scene, v.camera); gl.finish(); }),
            pick: T(() => d.pick(700, 400), 20),
            afterRender: T(() => d.afterRender(), 10),
            mini: T(() => d.drawMini(), 10),
            update: T(() => ecTorus.set({}), 3),
          };
        }""")
        print(pid, json.dumps({k: round(v, 2) for k, v in r.items()}))
    b.close()
