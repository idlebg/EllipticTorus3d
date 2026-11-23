"""Shared Playwright launcher for the browser tests.

    (default)          Playwright's Chromium, headless, SwiftShader (WebGL without a GPU)
    --gpu              installed Chrome (channel="chrome"), headed, real GPU, no SwiftShader flags
    --browser=NAME     chromium | firefox | webkit (Playwright builds, headless)

Also: stdout/stderr switched to UTF-8 (Windows consoles default to cp1251/cp1252 and crash on "β"),
and paths resolved from the project root so the scripts run from any working directory.
"""
import sys, pathlib

for _s in (sys.stdout, sys.stderr):
    try: _s.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOTS = ROOT / 'shots'
SWIFTSHADER = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']


def opt(name, default=None):
    """--name=value from argv (or default)."""
    for a in sys.argv[1:]:
        if a.startswith(f'--{name}='): return a.split('=', 1)[1]
    return default


# --html=path/to/another/elliptic_curve_torus_visualizer_v3.html runs a script against another build (an older release)
HTML = pathlib.Path(opt('html')).resolve() if opt('html') else ROOT / 'elliptic_curve_torus_visualizer_v3.html'


GPU = '--gpu' in sys.argv
BROWSER = opt('browser', 'chromium')
MODE = 'gpu' if GPU else BROWSER if BROWSER != 'chromium' else 'swiftshader'


def launch(pw, *, gpu=None, browser=None, args=()):
    gpu = GPU if gpu is None else gpu
    browser = browser or BROWSER
    if gpu:
        return pw.chromium.launch(channel='chrome', headless=False, args=list(args))
    if browser == 'chromium':
        return pw.chromium.launch(args=[*SWIFTSHADER, *args])
    return getattr(pw, browser).launch()


GL_INFO_JS = """() => {
  const v = window.ecTorus && ecTorus.debug && ecTorus.debug.view;
  let gl = v && v.ok ? v.renderer.getContext() : null, own = !!gl;
  if (!gl) { const c = document.createElement('canvas'); gl = c.getContext('webgl2') || c.getContext('webgl'); }
  if (!gl) return { webgl: false };
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  return { webgl: true, appContext: own, version: gl.getParameter(gl.VERSION),
    vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
    renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    softGL: v ? !!v.softGL : null, dpr: devicePixelRatio, ua: navigator.userAgent };
}"""


def gl_info(page):
    return page.evaluate(GL_INFO_JS)


def ready(page, extra_ms=600, curve=True):
    page.wait_for_function('window.ecTorus && ecTorus.model' + (' && ecTorus.model.curve' if curve else ''))
    page.wait_for_timeout(extra_ms)
