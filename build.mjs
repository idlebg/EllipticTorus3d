// Build: one self-contained HTML file (app as an inline module + vendored three.js).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { buildSync } from 'esbuild';

mkdirSync('build', { recursive: true });
buildSync({
  entryPoints: ['src/vendor-entry.js'], bundle: true, format: 'iife', globalName: 'VENDOR_THREE',
  minify: true, lineLimit: 160, legalComments: 'inline', target: ['es2020'], outfile: 'build/vendor.js', logLevel: 'warning',
});
const vendor = readFileSync('build/vendor.js', 'utf8');
const strip = (s) => s.replace(/^export (?=(?:async\s+)?(?:function|const|let|class)\b)/gm, '');
const files = ['src/engine.js', 'src/app-core.js', 'src/app-shapes.js', 'src/app-scene.js', 'src/app-ui.js', 'src/app-selftest.js'];
const app = files.map((f) => strip(readFileSync(f, 'utf8'))).join('\n');
if (/<\/script/i.test(app) || /<\/script/i.test(vendor)) throw new Error('</script> inside inline code');
if (/^\s*import\s/m.test(app)) throw new Error('stray import in app code');
let html = readFileSync('src/index.html', 'utf8');
html = html.replace('/*__APP__*/', () => app).replace('/*__VENDOR__*/', () => vendor);
const out = process.argv[2] || 'elliptic_curve_torus_visualizer_v3.html';
writeFileSync(out, html);
console.log(`${out}: ${(html.length / 1024).toFixed(1)} KiB (app ${(app.length / 1024).toFixed(1)} KiB, vendor ${(vendor.length / 1024).toFixed(1)} KiB)`);
