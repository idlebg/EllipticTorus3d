"""End-to-end pass over every control. Fails loudly on any console error.

    py -3 test/interact.py          # headless Chromium + SwiftShader (default)
    py -3 test/interact.py --gpu    # installed Chrome, headed, real GPU
    py -3 test/interact.py --fat    # force fat lines (?lines=fat)
"""
import sys, json, time
from playwright.sync_api import sync_playwright
from _launch import HTML, SHOTS, MODE, launch, gl_info

OUT = SHOTS if MODE == 'swiftshader' else SHOTS / MODE; OUT.mkdir(parents=True, exist_ok=True)
results = []

def check(name, cond, detail=''):
    results.append((name, bool(cond), detail))
    print(('PASS ' if cond else 'FAIL ') + name + (f'  [{detail}]' if detail and not cond else ''))

with sync_playwright() as pw:
    b = launch(pw)
    ctx = b.new_context(viewport={'width': 1440, 'height': 900}, device_scale_factor=1, accept_downloads=True)
    ctx.grant_permissions(['clipboard-read', 'clipboard-write'])
    page = ctx.new_page()
    errors, logs = [], []
    page.on('console', lambda m: (logs.append(f'[{m.type}] {m.text}'), errors.append(m.text) if m.type == 'error' else None))
    page.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
    page.goto(HTML.as_uri() + ('?lines=fat' if '--fat' in sys.argv else ''))
    page.wait_for_function('window.ecTorus && ecTorus.model && ecTorus.model.curve')
    page.wait_for_timeout(900)
    # headed (--gpu) runs: a freshly opened window behind others may not deliver animation frames yet, and hover
    # is handled on the next frame; bring it forward and wait until frames run
    page.bring_to_front()
    page.wait_for_function('true', polling='raf', timeout=15000)
    shot = lambda n: page.screenshot(path=str(OUT / f'{n}.png'))
    ev = page.evaluate
    print('GL', json.dumps(gl_info(page)))
    shot('i01-default')
    check('webgl running', ev("document.getElementById('glfail').hidden"))
    check('show-panel button hidden while panel open', ev("document.getElementById('showPanelBtn').hidden && getComputedStyle(document.getElementById('showPanelBtn')).display === 'none'"))
    check('self-test all pass', ev("ecTorus.selfTest().fail === 0"))

    # --- hover is sticky, click pins
    pos = ev("ecTorus.screenOf('p1')")
    page.mouse.move(pos['x'], pos['y'])
    # hover is handled on the next animation frame; a headed window that is covered may be throttled, so wait for it
    try: page.wait_for_selector('.card.hover', timeout=3000)
    except Exception: pass
    page.wait_for_timeout(150)
    check('hover card appears on P1', ev("!!document.querySelector('.card.hover')"))
    check('inspector shows P1', 'P₁' in ev("document.getElementById('inspector').innerText"))
    shot('i02-hover')
    page.mouse.move(700, 120); page.wait_for_timeout(250)
    check('hover card sticks after leaving the point', ev("!!document.querySelector('.card.hover')"))
    page.mouse.move(pos['x'], pos['y']); page.wait_for_timeout(150)
    page.mouse.click(pos['x'], pos['y']); page.wait_for_timeout(250)
    check('click pins a card', ev("document.querySelectorAll('.card.pinned').length") == 1)
    pos2 = ev("ecTorus.screenOf('p2')")
    page.mouse.move(pos2['x'], pos2['y']); page.wait_for_timeout(150)
    page.mouse.click(pos2['x'], pos2['y']); page.wait_for_timeout(250)
    check('second pin', ev("document.querySelectorAll('.card.pinned').length") == 2)
    shot('i03-pins')
    # orbit with a drag; cards must follow (position changes)
    before = ev("document.querySelector('.card.pinned').style.transform")
    page.mouse.move(470, 780); page.mouse.down(); page.mouse.move(600, 800, steps=8); page.mouse.up(); page.wait_for_timeout(900)
    after = ev("document.querySelector('.card.pinned').style.transform")
    check('pinned card follows the camera', before != after, f'{before} -> {after}')
    check('drag did not pin/unpin', ev("document.querySelectorAll('.card.pinned').length") == 2)
    page.click('.card.pinned [data-act="focus"]'); page.wait_for_timeout(900)
    shot('i04-focus')
    page.keyboard.press('Escape'); page.wait_for_timeout(100)
    page.keyboard.press('Escape'); page.wait_for_timeout(150)
    check('Esc clears pins', ev("document.querySelectorAll('.card.pinned').length") == 0)
    page.keyboard.press('r'); page.wait_for_timeout(900)

    # --- presets
    opts = ev("[...document.querySelectorAll('#preset option')].map(o => o.value)")
    for pid in opts:
        if pid == 'custom': continue
        page.select_option('#preset', pid); page.wait_for_timeout(500)
        m = ev("(() => { const m = ecTorus.model; return { err: m.curveErr, p1: !!m.pts.p1, p2: !!m.pts.p2, op: m.op.status, sum: m.op.P === null ? 'O' : (m.op.P ? 'pt' : '-'), g: !!m.G, cloud: m.cloudOK } })()")
        check(f'preset {pid} computes', not m['err'] and m['p1'] and m['p2'] and m['op'] == 'ok' and m['g'], json.dumps(m))
        shot(f'i10-preset-{pid}')
    # expected group-law results on the toys
    page.select_option('#preset', 'pb223'); page.wait_for_timeout(400)
    check('F223: G + 8G = 9G = (69, 86)', ev("(() => { const P = ecTorus.model.op.P; return P.x === 69n && P.y === 86n })()"))
    check('F223: k of result = 9', ev("ecTorus.model.pts.sum.k === 9n"))
    check('F223: chord winds 3 times', 'winds 3×' in ev("document.getElementById('legend').innerText"))
    page.select_option('#preset', 'k1-chord'); page.wait_for_timeout(400)
    check('secp256k1: G + 2G = 3G', ev("ecTorus.model.op.P.x === 0xf9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9n"))
    check('secp256k1: k of result = 3 (propagated)', ev("ecTorus.model.pts.sum.k === 3n"))
    page.select_option('#preset', 'k1-glv'); page.wait_for_timeout(400)
    check('GLV relation detected', 'λ·P₁' in ev("document.getElementById('relations').innerText") or 'P₂ = λ·P₁' in ev("document.getElementById('relations').innerText"))
    check('β siblings drawn', ev("Object.keys(ecTorus.model.pts).filter(k => k.includes('b')).length") >= 2)

    # --- hover a curve point in the cloud (toy curve)
    page.select_option('#preset', 'pb223'); page.wait_for_timeout(500)
    found = ev("""(() => { const r = document.getElementById('mini').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; })()""")
    # pick (47,71)=G position on the minimap is known: hover near the P2 marker instead via 3D
    pos = ev("ecTorus.screenOf('sum')")
    page.mouse.move(pos['x'], pos['y']); page.wait_for_timeout(250)
    check('hover result marker', 'P₁ + P₂' in ev("document.getElementById('inspector').innerText"))
    shot('i11-pb223-hover-sum')

    # --- op switch
    for op in ['sub', 'dbl', 'add']:
        page.click(f'#opSeg [data-op="{op}"]'); page.wait_for_timeout(250)
        check(f'op {op}', ev(f"ecTorus.state.op === '{op}' && ecTorus.model.op.status === 'ok'"))
    page.click('#opSeg [data-op="dbl"]'); page.wait_for_timeout(250)
    check('2·(47,71) = (36,111)', ev("ecTorus.model.op.P.x === 36n && ecTorus.model.op.P.y === 111n"))
    page.click('#opSeg [data-op="add"]')

    # --- chips
    chips = ev("[...document.querySelectorAll('[data-show]')].map(i => i.dataset.show)")
    for c in chips:
        page.click(f'label.chip:has([data-show="{c}"])'); page.wait_for_timeout(200)
        page.click(f'label.chip:has([data-show="{c}"])'); page.wait_for_timeout(200)
    check('chips toggle round-trip', ev("ecTorus.state.show.grid && ecTorus.state.show.labels"))
    for c in ['p1', 'p2', 'sum', 'g']:
        page.click(f'label.chip:has([data-ring="{c}"])'); page.wait_for_timeout(120)
    shot('i12-rings-toggled')
    for c in ['p1', 'p2', 'sum', 'g']:
        page.click(f'label.chip:has([data-ring="{c}"])'); page.wait_for_timeout(120)

    # --- mapping / sectors / sliders
    page.select_option('#map', 'low'); page.wait_for_timeout(300)
    page.fill('#bits', '6'); page.press('#bits', 'Tab'); page.wait_for_timeout(300)
    check('low-bits mapping applied', ev("ecTorus.state.map === 'low' && ecTorus.state.bits === 6"))
    shot('i13-lowbits')
    page.select_option('#map', 'scale'); page.wait_for_timeout(200)
    page.fill('#su', '36'); page.press('#su', 'Tab'); page.fill('#sv', '12'); page.press('#sv', 'Tab'); page.wait_for_timeout(300)
    check('sectors applied', ev("ecTorus.state.su === 36 && ecTorus.state.sv === 12"))
    for sid, val in [('R', '1.5'), ('r', '0.3'), ('glass', '0.9'), ('back', '0')]:
        page.eval_on_selector(f'#{sid}', "(el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }", val)
        page.wait_for_timeout(150)
    check('sliders applied', ev("ecTorus.state.R === 1.5 && ecTorus.state.r === 0.3 && ecTorus.state.back === 0"))
    shot('i14-sliders')
    page.fill('#su', '24'); page.press('#su', 'Tab'); page.fill('#sv', '16'); page.press('#sv', 'Tab')
    for sid, val in [('R', '1.2'), ('r', '0.46'), ('glass', '0.55'), ('back', '0.4')]:
        page.eval_on_selector(f'#{sid}', "(el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }", val)
    page.wait_for_timeout(300)

    # --- buttons
    page.click('#swapBtn'); page.wait_for_timeout(200)
    check('swap', ev("ecTorus.state.p1 === '(116, 55)'"))
    # keyboard: Space on a focused button presses it (and does not toggle auto-rotate)
    page.focus('#swapBtn'); page.keyboard.press(' '); page.wait_for_timeout(200)
    check('Space on a focused button presses it, not auto-rotate', ev("ecTorus.state.p1 === '(47, 71)' && !ecTorus.state.show.spin"))
    # keyboard: Space on a focused section header opens / closes it
    was = ev("document.querySelector('details.sec:has(#testBtn)').open")
    page.focus('details.sec:has(#testBtn) > summary'); page.keyboard.press(' '); page.wait_for_timeout(150)
    check('Space on a section header toggles the section', ev("document.querySelector('details.sec:has(#testBtn)').open") != was and not ev("ecTorus.state.show.spin"))
    if ev("document.querySelector('details.sec:has(#testBtn)').open") != was: page.keyboard.press(' ')
    if ev("ecTorus.state.show.spin"): ev("ecTorus.set({ show: { ...ecTorus.state.show, spin: false } })")
    page.evaluate("document.activeElement.blur()")
    page.click('#swapBtn'); page.wait_for_timeout(200)
    page.click('[data-rand="p1"]'); page.wait_for_timeout(200)
    check('random P1 on curve', ev("ecTorus.model.pts.p1 && ecTorus.model.pts.p1.onCurve"))
    page.click('[data-rand="p2"]'); page.wait_for_timeout(200)
    check('random P2 on curve', ev("ecTorus.model.pts.p2 && ecTorus.model.pts.p2.onCurve"))
    page.fill('#g', '(1, 1)'); page.wait_for_timeout(500)
    check('bad G flagged', 'NOT on the curve' in ev("document.getElementById('gMsg').innerText"))
    page.click('#resetG'); page.wait_for_timeout(200)
    check('reset G', ev("ecTorus.state.g === '(47, 71)'"))
    page.click('#clearBtn'); page.wait_for_timeout(200)
    check('clear points', ev("!ecTorus.model.pts.p1 && !ecTorus.model.pts.p2"))
    page.fill('#p1', '5G'); page.fill('#p2', '-5G'); page.press('#p2', 'Enter'); page.wait_for_timeout(300)
    check('5G + (−5G) = O', ev("ecTorus.model.op.P === null"))
    page.click('#plotBtn'); page.wait_for_timeout(200)
    # step: P₁ ← the result, so P₁ = P₂ = G walks the multiples; −P₁ button
    page.fill('#p1', 'G'); page.fill('#p2', 'G'); page.press('#p2', 'Enter'); page.wait_for_timeout(300)
    page.click('#stepBtn'); page.wait_for_timeout(250); page.click('#stepBtn'); page.wait_for_timeout(250)
    check('Step walks the multiples: P1 = 3G, result 4G', ev("ecTorus.state.p1 === '3G' && ecTorus.model.pts.sum.k === 4n"), ev("ecTorus.state.p1"))
    page.evaluate("document.activeElement.blur()"); page.keyboard.press('n'); page.wait_for_timeout(250)
    check('N steps too', ev("ecTorus.state.p1 === '4G'"))
    page.click('#negBtn'); page.wait_for_timeout(250)
    check('P2 = -P1 button', ev("(() => { const m = ecTorus.model; return m.pts.p2.P.x === m.pts.p1.P.x && m.pts.p2.P.y === m.curve.p - m.pts.p1.P.y && m.op.P === null; })()"))
    for v in ['iso', 'top', 'side']:
        page.click(f'[data-view="{v}"]'); page.wait_for_timeout(900)
        shot(f'i15-view-{v}')
    check('toolbar marks the active view', ev("document.querySelector('[data-view=\"side\"]').getAttribute('aria-pressed') === 'true' && document.querySelector('[data-view=\"iso\"]').getAttribute('aria-pressed') === 'false'"))
    page.click('#resetCam'); page.wait_for_timeout(900)
    page.click('#spinBtn'); page.wait_for_timeout(200)
    check('toolbar auto-rotate on', ev("ecTorus.state.show.spin && ecTorus.debug.view.controls.autoRotate && document.getElementById('spinBtn').getAttribute('aria-pressed') === 'true'"))
    page.click('#spinBtn'); page.wait_for_timeout(200)
    check('toolbar auto-rotate off', ev("!ecTorus.state.show.spin && document.getElementById('spinBtn').getAttribute('aria-pressed') === 'false'"))
    page.click('#fsBtn'); page.wait_for_timeout(400)
    check('full screen button reflects the state', ev("document.getElementById('fsBtn').getAttribute('aria-pressed') === String(!!document.fullscreenElement)"))
    if ev("!!document.fullscreenElement"): page.click('#fsBtn'); page.wait_for_timeout(400)
    page.click('#legendTog'); page.wait_for_timeout(200)
    check('legend compacts', ev("document.getElementById('legend').classList.contains('min') && ecTorus.state.legendMin")); shot('i15-legend-min')
    page.click('#legendTog'); page.wait_for_timeout(200)
    page.click('#resetCam'); page.wait_for_timeout(900)
    with page.expect_download() as d: page.click('#pngBtn')
    check('PNG download', d.value.suggested_filename.endswith('.png'))
    png = OUT / 'export.png'; d.value.save_as(str(png)); check('PNG non-empty', png.stat().st_size > 20000, str(png.stat().st_size))
    with page.expect_download() as d: page.click('#jsonBtn')
    jp = OUT / 'export.json'; d.value.save_as(str(jp)); data = json.loads(jp.read_text())
    check('JSON export parses', data['curve']['p'] == '0xdf' and 'p1' in data['points'], json.dumps(data)[:200])
    page.click('#linkBtn'); page.wait_for_timeout(300)
    link = ev("navigator.clipboard.readText()")
    check('copy link has state', '#s=' in link)
    page.click('details.sec:has(#testBtn) > summary'); page.wait_for_timeout(200)
    page.click('#testBtn'); page.wait_for_timeout(300)
    check('self-test button', 'checks pass' in ev("document.getElementById('testOut').innerText"))
    page.click('#helpBtn'); page.wait_for_timeout(200)
    check('help opens', ev("document.getElementById('help').open")); shot('i16-help')
    page.click('#helpClose'); page.wait_for_timeout(100)
    check('help closes', not ev("document.getElementById('help').open"))
    page.click('#collapseBtn'); page.wait_for_timeout(400)
    check('panel hides', ev("document.getElementById('app').classList.contains('panel-hidden')")); shot('i17-panel-hidden')
    page.click('#showPanelBtn'); page.wait_for_timeout(400)
    check('panel shows', not ev("document.getElementById('app').classList.contains('panel-hidden')"))
    page.click('#miniSize'); page.wait_for_timeout(300); shot('i18-mini-big'); page.click('#miniSize')

    # --- theme
    page.click('#themeBtn'); page.wait_for_timeout(600)
    check('paper theme', ev("document.documentElement.dataset.theme === 'paper'"))
    page.select_option('#preset', 'k1-neg'); page.wait_for_timeout(500); shot('i20-paper-k1')
    page.select_option('#preset', 'pb223'); page.wait_for_timeout(500); shot('i21-paper-pb223')
    page.keyboard.press('t'); page.wait_for_timeout(400)
    check('T toggles back to dark', ev("document.documentElement.dataset.theme === 'dark'"))

    # --- bad inputs
    page.fill('#p', 'abc'); page.press('#p', 'Enter'); page.wait_for_timeout(300)
    check('bad p reported', 'unknown name' in ev("document.getElementById('curveErr').innerText"))
    page.fill('#p', '221'); page.press('#p', 'Enter'); page.wait_for_timeout(300)
    check('composite p flagged', 'composite' in ev("document.getElementById('facts').innerText"))
    page.select_option('#preset', 'k1-neg'); page.wait_for_timeout(400)
    page.fill('#p1', '04' + '11' * 64); page.press('#p1', 'Enter'); page.wait_for_timeout(300)
    check('off-curve 04 point flagged', 'NOT on the curve' in ev("document.getElementById('p1Msg').innerText"))
    check('op skipped for off-curve', ev("ecTorus.model.op.status === 'offcurve'"))
    page.click('label.chk:has(#force)'); page.wait_for_timeout(300)
    check('force math computes', ev("ecTorus.model.op.status === 'ok'"))
    shot('i22-offcurve-forced')
    page.click('label.chk:has(#force)')
    page.fill('#p1', '02' + '00' * 31 + '05'); page.press('#p1', 'Enter'); page.wait_for_timeout(300)
    check('twist x message', 'twist' in ev("document.getElementById('p1Msg').innerText"))
    page.fill('#p1', '07' + ev("ecTorus.engine.encodeSEC(ecTorus.engine.KNOWN[0].G, ecTorus.model.curve, 'uncompressed').slice(2)")); page.press('#p1', 'Enter'); page.wait_for_timeout(300)
    check('hybrid mismatch warns', 'claims odd' in ev("document.getElementById('p1Msg').innerText"))
    page.fill('#p1', ev("ecTorus.engine.KNOWN[0].G.x.toString(16).padStart(64,'0')")); page.press('#p1', 'Enter'); page.wait_for_timeout(300)
    check('x-only accepted', 'x-only' in ev("document.getElementById('p1Msg').innerText"))
    page.fill('#p1', '(n-1)G'); page.press('#p1', 'Enter'); page.wait_for_timeout(300)
    check('(n-1)G equals −G', ev("ecTorus.model.pts.p1.P.y === ecTorus.engine.KNOWN[0].p - ecTorus.engine.KNOWN[0].G.y"))

    # --- shapes: every shape builds (the surface morphs there), G and −G stay mirror images (on the chiral trefoil:
    # inside their shared ring), the legend follows
    page.select_option('#preset', 'k1-neg'); page.wait_for_timeout(400)
    shapes = ev("[...document.querySelectorAll('#shape input[name=\"shape\"]')].map(i => i.value)")
    check('shape picker lists the 9 shapes', shapes == ['torus', 'cylinder', 'sphere', 'ellipsoid', 'icosahedron', 'lemniscate', 'trefoil', 'wavy', 'klein'], json.dumps(shapes))
    check('every tile has a pictogram', ev("[...document.querySelectorAll('#shape .tile svg path:last-child')].every(p => p.getAttribute('d').length > 200)"))
    MIRROR = """(() => { const m = ecTorus.model, a = m.pts.p1.pos, b = m.pts.p2.pos, sh = ecTorus.debug.shape(), S = ecTorus.state;
      let o = [0, 0, 0], n = sh.mirror;
      if (!n) { const s = m.pts.p1.tu, q = (t) => sh.pos(s, t, S.R, S.r, {}), c0 = q(0), c1 = q(0.5), w0 = q(0.25), w1 = q(0.75);
        const w = [w0.x - w1.x, w0.y - w1.y, w0.z - w1.z], l = Math.hypot(...w);
        o = [(c0.x + c1.x) / 2, (c0.y + c1.y) / 2, (c0.z + c1.z) / 2]; n = w.map((x) => x / l); }
      const d = 2 * ((a.x - o[0]) * n[0] + (a.y - o[1]) * n[1] + (a.z - o[2]) * n[2]), err = Math.hypot(a.x - d * n[0] - b.x, a.y - d * n[1] - b.y, a.z - d * n[2] - b.z);
      return { shape: S.shape, err, legend: document.getElementById('legend').innerText.includes(sh.legend.slice(0, 20)) }; })()"""
    morphs = []
    for sid in shapes:
        page.click(f'label.tile:has(input[value="{sid}"])')
        morphs.append(ev("!!ecTorus.debug.view.morph"))
        page.wait_for_function('!ecTorus.debug.view.morph', timeout=15000); page.wait_for_timeout(250)
        r = ev(MIRROR)
        check(f'shape {sid}: G and −G are mirror images, legend explains the map', r['shape'] == sid and r['err'] < 1e-6 and r['legend'], json.dumps(r))
        shot(f'i40-shape-{sid}')
    check('every shape change morphs the surface', all(morphs[1:]), json.dumps(morphs))
    # a change of shape during a morph starts from where it is; any other change ends it at once
    page.click('label.tile:has(input[value="cylinder"])'); page.wait_for_timeout(120); page.click('label.tile:has(input[value="sphere"])')
    page.wait_for_function('!ecTorus.debug.view.morph', timeout=15000); page.wait_for_timeout(200)
    check('shape change during a morph lands on the last one', ev("ecTorus.state.shape === 'sphere' && ecTorus.debug.view.morphG.children.length === 0 && ecTorus.debug.view.torusG.visible"))
    page.click('label.tile:has(input[value="torus"])'); page.wait_for_timeout(60)
    ev("ecTorus.set({ glass: 0.6 })")
    check('another change ends the morph at once', ev("!ecTorus.debug.view.morph && ecTorus.state.shape === 'torus' && ecTorus.debug.view.torusG.visible"))
    ev("ecTorus.set({ glass: 0.55 })")
    page.select_option('#preset', 'pb223'); page.wait_for_timeout(300)
    page.click('label.tile:has(input[value="sphere"])'); page.wait_for_function('!ecTorus.debug.view.morph', timeout=15000); page.wait_for_timeout(400); shot('i41-sphere-pb223')
    page.click('label.tile:has(input[value="trefoil"])'); page.wait_for_function('!ecTorus.debug.view.morph', timeout=15000); page.wait_for_timeout(400); shot('i42-trefoil-pb223')
    page.click('label.tile:has(input[value="sphere"])'); page.wait_for_function('!ecTorus.debug.view.morph', timeout=15000)
    page.evaluate("document.activeElement.blur()")  # keys typed into a focused radio belong to it, not to the shortcuts
    page.keyboard.press('s'); page.wait_for_function('!ecTorus.debug.view.morph', timeout=15000)
    check('S cycles to the next shape', ev("ecTorus.state.shape") == 'ellipsoid')
    page.keyboard.press('Shift+S'); page.wait_for_function('!ecTorus.debug.view.morph', timeout=15000)
    check('Shift+S cycles back', ev("ecTorus.state.shape") == 'sphere')
    page.click('details.sec[data-sec="relations"] > summary'); page.wait_for_timeout(700)
    page.reload(); page.wait_for_function('window.ecTorus && ecTorus.model && ecTorus.model.curve'); page.wait_for_timeout(500)
    check('shape persists across reload', ev("ecTorus.state.shape") == 'sphere' and ev("document.querySelector('#shape input:checked').value") == 'sphere')
    check('closed section stays closed across reload', ev("!document.querySelector('details.sec[data-sec=\"relations\"]').open && ecTorus.state.secs.relations === false"))
    page.click('details.sec[data-sec="relations"] > summary')
    page.click('label.tile:has(input[value="torus"])'); page.wait_for_function('!ecTorus.debug.view.morph', timeout=15000); page.wait_for_timeout(300)

    # --- dense curve + reload persistence
    page.select_option('#preset', 't10009'); page.wait_for_timeout(700)
    t0 = time.time()
    for i in range(12):
        page.mouse.move(600 + i * 25, 380 + i * 12); page.wait_for_timeout(30)
    check('hover over dense cloud responsive', time.time() - t0 < 4, f'{time.time() - t0:.2f}s')
    shot('i23-dense')
    page.reload(); page.wait_for_function('window.ecTorus && ecTorus.model && ecTorus.model.curve'); page.wait_for_timeout(500)
    check('state persists across reload', ev("ecTorus.state.preset === 't10009'"))
    page.goto(link); page.wait_for_function('window.ecTorus && ecTorus.model && ecTorus.model.curve'); page.wait_for_timeout(500)
    check('link restores state', ev("ecTorus.state.p === '223'"))

    # mobile layout
    page.set_viewport_size({'width': 390, 'height': 844}); page.wait_for_timeout(600); shot('i30-mobile')
    check('no horizontal scroll on mobile', ev("document.documentElement.scrollWidth <= window.innerWidth + 1"))

    check('zero console errors', not errors, ' | '.join(errors[:5]))
    b.close()

fails = [r for r in results if not r[1]]
print(f'\n{len(results) - len(fails)}/{len(results)} passed')
sys.exit(1 if fails else 0)
