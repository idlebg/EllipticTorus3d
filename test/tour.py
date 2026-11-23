"""Record the tour video: samples/tour.mp4, 1920×1080, 30 fps, H.264 High profile.

Frames are made, not filmed: the page runs on Playwright's virtual clock, and each frame advances it by exactly
1/30 s (two animation frames, as on a 60 Hz screen) before the view is captured, so motion is even whatever the
machine's speed. Each frame is rendered at 2× (3840×2160) and shrunk with the browser's high-quality filter, turned
into BT.709 limited-range YUV 4:2:0 here, and compressed by Chrome's own H.264 encoder (WebCodecs, constant
quantizer) in a second page; the MP4 container is written in Python. CSS transitions are off while recording (they
run on real time, not on the virtual clock), and a drawn pointer shows where the mouse is.

The result is read back through its own tables and decoded (WebCodecs) against the captured frames (PSNR), and
played once in a <video>; frame POSTER of the decoded video becomes samples/img/tour-poster.jpg. Needs the installed
Chrome (H.264 and the real GPU), so it runs headed; about three minutes on an RTX 4090. Run test/showcase.py first:
the tour starts from sample 06's state link.

    py -3 test/tour.py                 # samples/tour.mp4 and its poster
    py -3 test/tour.py --verify-only   # check an existing samples/tour.mp4 again (and rewrite the poster)
    py -3 test/tour.py --pilot         # three seconds only, to check the pipeline
    py -3 test/tour.py --qp=20         # quantizer (lower is better and bigger)
"""
import sys, json, base64, struct, time
from pathlib import Path
from playwright.sync_api import sync_playwright
from _launch import ROOT, HTML, opt

FPS, W, H = 30, 1920, 1080
QP = int(opt('qp', '20'))
PILOT = '--pilot' in sys.argv
OUT = ROOT / 'samples' / ('tour-pilot.mp4' if PILOT else 'tour.mp4')
POSTER = 380  # the result pinned, dark theme: the gallery shows it before the video plays

# ------------------------------------------------------------------ the encoder page (WebCodecs, H.264)
ENCODER = """async ([w, h, fps, qp]) => {
  window.chunks = []; window.desc = null; window.encErr = null;
  window.enc = new VideoEncoder({
    output: (chunk, meta) => {
      const b = new Uint8Array(chunk.byteLength); chunk.copyTo(b);
      window.chunks.push({ t: chunk.timestamp, key: chunk.type === 'key', data: b });
      if (meta && meta.decoderConfig && meta.decoderConfig.description) window.desc = new Uint8Array(meta.decoderConfig.description);
      if (meta && meta.decoderConfig && meta.decoderConfig.colorSpace) window.encSpace = meta.decoderConfig.colorSpace;
    },
    error: (e) => { window.encErr = String(e); },
  });
  enc.configure({ codec: 'avc1.640028', width: w, height: h, framerate: fps, bitrateMode: 'quantizer', latencyMode: 'quality', avc: { format: 'avc' } });
  // frames arrive at 2× (3840×2160) and are scaled down here with the browser's high-quality filter: supersampled
  window.shrink = async (b64) => createImageBitmap(await (await fetch('data:image/jpeg;base64,' + b64)).blob(), { resizeWidth: w, resizeHeight: h, resizeQuality: 'high' });
  // RGB → YUV 4:2:0 here, BT.709 limited range (the 8-bit matrix every player assumes for HD video). Handing the
  // encoder RGB made it write full-range YUV without saying so, and decoders read it as limited: crushed colours.
  const cg = new OffscreenCanvas(w, h).getContext('2d', { willReadFrequently: true }), yuv = new Uint8Array(w * h * 3 / 2);
  const toI420 = (d) => {
    const U0 = w * h, V0 = U0 + U0 / 4, cw = w >> 1;
    for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
      let rs = 0, gs = 0, bs = 0;
      for (const [dy, dx] of [[0, 0], [0, 1], [1, 0], [1, 1]]) {
        const p = ((y + dy) * w + x + dx) * 4, r = d[p], g = d[p + 1], b = d[p + 2];
        yuv[(y + dy) * w + x + dx] = (11967 * r + 40252 * g + 4063 * b + 1081344) >> 16;  // 16 + 0.1826 R + 0.6142 G + 0.0620 B
        rs += r; gs += g; bs += b;
      }
      const c = (y >> 1) * cw + (x >> 1);  // chroma from the 2×2 average (sums of four, hence >> 18)
      yuv[U0 + c] = (-6593 * rs - 22190 * gs + 28783 * bs + 33685504) >> 18;  // 128 − 0.1006 R − 0.3386 G + 0.4392 B
      yuv[V0 + c] = (28783 * rs - 26142 * gs - 2641 * bs + 33685504) >> 18;   // 128 + 0.4392 R − 0.3989 G − 0.0403 B
    }
  };
  window.encodeFrame = async (b64, i) => {
    const bmp = await shrink(b64);
    cg.drawImage(bmp, 0, 0); bmp.close(); toI420(cg.getImageData(0, 0, w, h).data);
    const f = new VideoFrame(yuv, { format: 'I420', codedWidth: w, codedHeight: h, timestamp: Math.round(i * 1e6 / fps), duration: Math.round(1e6 / fps),
      colorSpace: { primaries: 'bt709', transfer: 'bt709', matrix: 'bt709', fullRange: false } });
    enc.encode(f, { keyFrame: i % (2 * fps) === 0, avc: { quantizer: qp } });
    f.close();
    while (enc.encodeQueueSize > 4) await new Promise((r) => enc.addEventListener('dequeue', r, { once: true }));
    if (window.encErr) throw new Error(window.encErr);
  };
  window.finish = async () => {
    await enc.flush();
    const n = chunks.reduce((s, c) => s + c.data.length, 0), all = new Uint8Array(n);
    let o = 0; for (const c of chunks) { all.set(c.data, o); o += c.data.length; }
    window.all = all;
    return { sizes: chunks.map((c) => c.data.length), keys: chunks.map((c) => c.key), times: chunks.map((c) => c.t), desc: Array.from(desc || []), total: n, space: window.encSpace || null };
  };
  window.slice = (a, b) => { let s = ''; const u = all.subarray(a, b); for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); return btoa(s); };
}"""

# ------------------------------------------------------------------ the MP4 container (ISO BMFF, one H.264 track)
def box(kind, *parts):
    data = b''.join(parts)
    return struct.pack('>I', 8 + len(data)) + kind + data


def full(kind, version, flags, *parts):
    return box(kind, struct.pack('>I', (version << 24) | flags), *parts)


def mp4(samples, keys, avcc, w, h, fps):
    """samples: AVCC-framed access units in presentation order (no B-frames); keys: their sync flags."""
    ts, n = fps * 1000, len(samples)
    dur = n * 1000
    matrix = struct.pack('>9I', 0x00010000, 0, 0, 0, 0x00010000, 0, 0, 0, 0x40000000)
    ftyp = box(b'ftyp', b'isom', struct.pack('>I', 0x200), b'isomiso2avc1mp41')
    name = b'H.264'
    avc1 = box(b'avc1', b'\0' * 6, struct.pack('>H', 1), b'\0' * 16, struct.pack('>HHII', w, h, 0x00480000, 0x00480000),
               struct.pack('>IH', 0, 1), bytes([len(name)]) + name + b'\0' * (31 - len(name)), struct.pack('>Hh', 0x18, -1), box(b'avcC', avcc))

    def moov(base):
        offsets, o = [], base
        for s in samples: offsets.append(o); o += len(s)
        stbl = box(b'stbl',
                   full(b'stsd', 0, 0, struct.pack('>I', 1), avc1),
                   full(b'stts', 0, 0, struct.pack('>III', 1, n, 1000)),
                   full(b'stss', 0, 0, struct.pack('>I', sum(keys)), b''.join(struct.pack('>I', i + 1) for i, k in enumerate(keys) if k)),
                   full(b'stsc', 0, 0, struct.pack('>IIII', 1, 1, 1, 1)),
                   full(b'stsz', 0, 0, struct.pack('>II', 0, n), b''.join(struct.pack('>I', len(s)) for s in samples)),
                   full(b'stco', 0, 0, struct.pack('>I', n), b''.join(struct.pack('>I', x) for x in offsets)))
        minf = box(b'minf', full(b'vmhd', 0, 1, b'\0' * 8), box(b'dinf', full(b'dref', 0, 0, struct.pack('>I', 1), full(b'url ', 0, 1))), stbl)
        mdia = box(b'mdia', full(b'mdhd', 0, 0, struct.pack('>IIIIHH', 0, 0, ts, dur, 0x55C4, 0)),
                   full(b'hdlr', 0, 0, struct.pack('>I', 0), b'vide', b'\0' * 12, b'VideoHandler\0'), minf)
        tkhd = full(b'tkhd', 0, 3, struct.pack('>IIIII', 0, 0, 1, 0, dur), b'\0' * 8, struct.pack('>hhhH', 0, 0, 0, 0), matrix, struct.pack('>II', w << 16, h << 16))
        mvhd = full(b'mvhd', 0, 0, struct.pack('>IIIIIH', 0, 0, ts, dur, 0x00010000, 0x0100), b'\0' * 10, matrix, b'\0' * 24, struct.pack('>I', 2))
        return box(b'moov', mvhd, box(b'trak', tkhd, mdia))

    size = len(moov(0))  # offsets are fixed-width, so the size does not depend on them: moov goes first (fast start)
    data = b''.join(samples)
    return ftyp + moov(len(ftyp) + size + 8) + struct.pack('>I', 8 + len(data)) + b'mdat' + data


# ------------------------------------------------------------------ the recorder
POINTER = """() => {
  // CSS transitions run on real time, not on the virtual clock: off while recording, so every frame is exact
  const st = document.createElement('style'); st.textContent = '*, *::before, *::after { transition: none !important; }';
  document.head.appendChild(st);
  const d = document.createElement('div'); d.id = '__tourPointer';
  d.style.cssText = 'position:fixed;left:0;top:0;width:22px;height:28px;z-index:99999;pointer-events:none;transform:translate(-100px,-100px);';
  d.innerHTML = '<svg viewBox="0 0 22 28" width="22" height="28"><path d="M2 2v20.5l5.3-5.1 3.6 8.1 3.5-1.6-3.6-7.9H18z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  document.body.appendChild(d); }"""


class Recorder:
    def __init__(self, page, cdp, enc):
        self.page, self.cdp, self.enc, self.n, self.cursor = page, cdp, enc, 0, (W * 0.62, H * 0.86)
        self.t0, self.keep = time.time(), []

    def frame(self):
        step = round((self.n + 1) * 1000 / FPS) - round(self.n * 1000 / FPS)  # 33 or 34 ms, exact on average
        self.page.clock.run_for(step)
        shot = self.cdp.send('Page.captureScreenshot', {'format': 'jpeg', 'quality': 92, 'optimizeForSpeed': True})
        self.enc.evaluate('([b, i]) => encodeFrame(b, i)', [shot['data'], self.n])
        if self.n % 150 == 75 or '--keep-all' in sys.argv: self.keep.append([self.n, shot['data']])  # a few originals for the PSNR check
        self.n += 1

    def hold(self, seconds):
        for _ in range(round(seconds * FPS)): self.frame()

    def pointer(self, x, y):
        self.page.mouse.move(x, y)
        self.page.evaluate('([x, y]) => { document.getElementById("__tourPointer").style.transform = `translate(${x - 2}px, ${y - 2}px)`; }', [x, y])
        self.cursor = (x, y)

    def glide(self, x, y, seconds):
        x0, y0 = self.cursor
        steps = max(1, round(seconds * FPS))
        for k in range(1, steps + 1):
            e = k / steps; e = e * e * (3 - 2 * e)  # smoothstep
            self.pointer(x0 + (x - x0) * e, y0 + (y - y0) * e)
            self.frame()

    def key(self, k, hold):
        self.page.keyboard.press(k); self.hold(hold)

    def screen_of(self, key):
        p = self.page.evaluate(f"ecTorus.screenOf('{key}')")
        return p['x'], p['y']


def main():
    tour = next(s for s in json.loads((ROOT / 'samples' / 'samples.json').read_text(encoding='utf-8')) if s['id'] == '06-f223-chord')
    blank = (ROOT / 'build' / 'encoder.html'); blank.parent.mkdir(exist_ok=True)
    blank.write_text('<!doctype html><meta charset="utf-8"><title>encoder</title>', encoding='utf-8', newline='\n')
    with sync_playwright() as pw:
        # exactly 2× whatever the display scaling is: frames are rendered at 3840×2160 and shrunk to 1920×1080
        b = pw.chromium.launch(channel='chrome', headless=False, args=['--force-device-scale-factor=2'])
        enc = b.new_context().new_page(); enc.goto(blank.as_uri())  # secure context, real timers
        enc.evaluate(ENCODER, [W, H, FPS, QP])
        ctx = b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=2)
        page = ctx.new_page()
        page.clock.install(time=0)
        page.goto(HTML.as_uri() + '#s=' + tour['link'])
        page.bring_to_front()
        for _ in range(200):  # the app boots on the virtual clock: advance it until the model is there
            if page.evaluate('() => !!(window.ecTorus && ecTorus.model && ecTorus.model.curve && document.querySelector(".stage.ready"))'): break
            page.clock.run_for(50)
        page.evaluate(POINTER)
        page.evaluate("() => { try { localStorage.clear(); } catch (e) {} }")
        cdp = ctx.new_cdp_session(page)
        r = Recorder(page, cdp, enc)
        r.pointer(*r.cursor)
        r.hold(1.0)
        if PILOT:
            r.key(' ', 2.0)
        else:
            r.key(' ', 4.5); r.key(' ', 0.6)                       # auto-rotate, then settle
            for k in ['p1', 'p2', 'r']:                             # hover cards
                r.glide(*r.screen_of(k), 0.8); r.hold(0.9)
            r.glide(*r.screen_of('sum'), 0.8)
            page.mouse.down(); page.mouse.up(); r.hold(1.2)         # pin the result
            r.key('t', 1.5)                                         # paper theme
            r.key('3', 1.6); r.key('1', 1.4)                        # side view (mirror plane edge-on), back
            for _ in range(4): r.key('n', 1.1)                      # Step: P1 <- the result
            for _ in range(9): r.key('s', 1.5)                      # every shape, morphing, back to the torus
            r.key('t', 0.8); r.key(' ', 3.0)                        # dark again, spin out
        info = enc.evaluate('finish()')
        data = b''.join(base64.b64decode(enc.evaluate('([a, b]) => slice(a, b)', [a, min(a + 8_000_000, info['total'])])) for a in range(0, info['total'], 8_000_000))
        b.close()
    if info['times'] != sorted(info['times']): raise SystemExit('the encoder reordered frames (B-frames): this writer has no ctts')
    sizes, o, samples = info['sizes'], 0, []
    for s in sizes: samples.append(data[o:o + s]); o += s
    OUT.write_bytes(mp4(samples, info['keys'], bytes(info['desc']), W, H, FPS))
    print('encoder colour space:', json.dumps(info.get('space')))
    print(f'{OUT.name}: {len(samples)} frames, {len(samples) / FPS:.1f} s, {OUT.stat().st_size / 1048576:.1f} MiB, '
          f'{sum(info["keys"])} key frames, QP {QP}, made in {time.time() - r.t0:.0f} s', flush=True)
    if '--dump' in sys.argv:  # the kept originals and the chunk sizes, to look at
        for i, b64 in r.keep: (blank.parent / f'tour-frame-{i}.jpg').write_bytes(base64.b64decode(b64))
        print('chunk bytes (key*):', ' '.join(f'{s}{"*" if k else ""}' for s, k in zip(sizes, info['keys'])), '| times[:5]', info['times'][:5], '| avcC', bytes(info['desc'][:12]).hex())
    verify(OUT, r.keep, len(samples))


PLAY = """async (src) => {  // the file in a <video> element: opens, has the right size and length, plays
  const v = document.createElement('video'); v.muted = true; v.src = src; document.body.appendChild(v);
  await new Promise((ok, no) => { v.onloadeddata = ok; v.onerror = () => no(new Error('video error ' + (v.error && v.error.code))); });
  await v.play(); await new Promise((r) => setTimeout(r, 1500)); const played = v.currentTime; v.pause();
  return { duration: v.duration, w: v.videoWidth, h: v.videoHeight, played: +played.toFixed(2) }; }"""

DECODER = """([desc, w, h, fps, wanted]) => {  // VideoDecoder on the avcC read back from the file; keeps the wanted frames' pixels
  const bytes = (b64) => Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
  window.got = new Map(); window.decErr = null; window.space = null; window.decoded = 0;
  const g = new OffscreenCanvas(w, h).getContext('2d', { willReadFrequently: true }), want = new Set(wanted);
  window.dec = new VideoDecoder({
    output: (f) => {
      const i = Math.round(f.timestamp * fps / 1e6); decoded++;
      if (!space) space = f.colorSpace.toJSON();
      if (want.has(i)) { g.drawImage(f, 0, 0); got.set(i, g.getImageData(0, 0, w, h).data); }
      f.close();
    },
    error: (e) => { decErr = String(e); },
  });
  dec.configure({ codec: 'avc1.640028', codedWidth: w, codedHeight: h, description: bytes(desc) });
  window.feed = async (items) => {
    for (const [i, key, b64] of items) dec.decode(new EncodedVideoChunk({ type: key ? 'key' : 'delta', timestamp: Math.round(i * 1e6 / fps), data: bytes(b64) }));
    await dec.flush();
  };
  window.compare = async (frames) => {  // PSNR of each wanted frame against the encoder's input (the same high-quality shrink)
    const out = [];
    for (const [i, b64] of frames) {
      const a = got.get(i); if (!a) { out.push([i, null]); continue; }
      const im = await shrink(b64); g.drawImage(im, 0, 0); im.close(); const s = g.getImageData(0, 0, w, h).data;
      let se = 0; for (let k = 0; k < a.length; k += 4) for (let q = 0; q < 3; q++) { const d = a[k + q] - s[k + q]; se += d * d; }
      out.push([i, +(10 * Math.log10(65025 / Math.max(1e-9, se / (a.length * 0.75)))).toFixed(1)]);
    }
    return out;
  };
}"""


def read_mp4(data):
    """The tables this writer makes, read back from the file (moov comes first, so a tag's first occurrence is its box)."""
    def payload(tag):
        s = data.index(tag) - 4
        return data[s + 8:s + struct.unpack('>I', data[s:s + 4])[0]]
    z, o, k, t = payload(b'stsz'), payload(b'stco'), payload(b'stss'), payload(b'stts')
    n = struct.unpack('>I', z[8:12])[0]
    sizes = struct.unpack(f'>{n}I', z[12:12 + 4 * n])
    offs = struct.unpack(f'>{n}I', o[8:8 + 4 * struct.unpack(">I", o[4:8])[0]])
    keys = set(struct.unpack(f'>{struct.unpack(">I", k[4:8])[0]}I', k[8:]))
    if struct.unpack('>III', t[4:16]) != (1, n, 1000): raise SystemExit('stts is not one run of 1/30 s')
    return payload(b'avcC'), [data[a:a + s] for a, s in zip(offs, sizes)], [i + 1 in keys for i in range(n)]


POSTER_JPEG = """async (i) => {  // a decoded frame as the gallery's poster (the video's own pixels, 16:9)
  const d = got.get(i), c = new OffscreenCanvas(1920, 1080);
  c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(d), 1920, 1080), 0, 0);
  const u = new Uint8Array(await (await c.convertToBlob({ type: 'image/jpeg', quality: 0.86 })).arrayBuffer());
  let s = ''; for (let k = 0; k < u.length; k += 32768) s += String.fromCharCode.apply(null, u.subarray(k, k + 32768));
  return btoa(s); }"""


def verify(path, keep, n):
    """The MP4 must open in a <video> at 1920×1080 with the right length and play; its samples, read back through the
    file's own tables, must decode (WebCodecs) to the captured frames. Frame POSTER becomes the gallery's poster."""
    avcc, samples, keys = read_mp4(path.read_bytes())
    n = n or len(samples)
    poster = POSTER if POSTER < len(samples) else 0
    b64 = lambda x: base64.b64encode(x).decode()
    with sync_playwright() as pw:
        b = pw.chromium.launch(channel='chrome', headless=True)
        p = b.new_page()
        p.route('https://tour.check/**', lambda rt: rt.fulfill(path=str(path), content_type='video/mp4') if rt.request.url.endswith('.mp4')
                else rt.fulfill(body='<!doctype html><title>check</title>', content_type='text/html'))
        p.goto('https://tour.check/')  # a secure context for WebCodecs, one origin for page and video
        play = p.evaluate(PLAY, 'https://tour.check/' + path.name)
        p.evaluate("""([w, h]) => { window.shrink = async (b64) => createImageBitmap(await (await fetch('data:image/jpeg;base64,' + b64)).blob(),
          { resizeWidth: w, resizeHeight: h, resizeQuality: 'high' }); }""", [W, H])  # exactly the encoder's input
        p.evaluate(DECODER, [b64(avcc), W, H, FPS, [i for i, _ in keep] + [poster]])
        for a in range(0, len(samples), 60):
            p.evaluate('(items) => feed(items)', [[i, keys[i], b64(samples[i])] for i in range(a, min(a + 60, len(samples)))])
        psnr = p.evaluate('(frames) => compare(frames)', keep)
        dec = p.evaluate('() => ({ decoded, space, err: decErr })')
        if path.name == 'tour.mp4':
            jpg = ROOT / 'samples' / 'img' / 'tour-poster.jpg'
            jpg.write_bytes(base64.b64decode(p.evaluate(POSTER_JPEG, poster)))
            print(f'poster: frame {poster} -> {jpg.relative_to(ROOT)} ({jpg.stat().st_size // 1024} KiB)')
        b.close()
    r = {**play, 'decoded': dec['decoded'], 'colour': dec['space'], 'psnr': psnr, 'error': dec['err']}
    ok = (play['w'] == W and play['h'] == H and abs(play['duration'] - n / FPS) < 0.05 and play['played'] > 0.5
          and dec['decoded'] == n and not dec['err'] and all(x is not None and x > 35 for _, x in psnr))
    print(('ok' if ok else 'FAIL'), 'read back and decoded in Chrome:', json.dumps(r))
    if not ok: raise SystemExit(1)


if __name__ == '__main__':
    if '--verify-only' in sys.argv: verify(OUT, [], 0)  # no originals to compare: opens, plays, decodes, poster
    else: main()
