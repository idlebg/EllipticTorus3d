// Run a Python test script with whichever interpreter works on this machine: `py -3` (the Windows
// launcher), `python`, `python3`. On Windows `python3` can be the Microsoft Store stub, which exits with
// 9009 without running anything, so every candidate is probed first.
//
//   node test/py.mjs test/interact.py --gpu
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const candidates = process.platform === 'win32' ? [['py', '-3'], ['python'], ['python3']] : [['python3'], ['python']];
for (const [cmd, ...pre] of candidates) {
  const probe = spawnSync(cmd, [...pre, '-c', 'import sys; sys.exit(0 if sys.version_info >= (3, 8) else 1)'], { stdio: 'ignore' });
  if (probe.status !== 0) continue;
  const r = spawnSync(cmd, [...pre, ...args], { stdio: 'inherit', env: { ...process.env, PYTHONUTF8: '1' } });
  process.exit(r.status ?? 1);
}
console.error('No Python 3 found (tried ' + candidates.map((c) => c.join(' ')).join(', ') + ').');
process.exit(1);
