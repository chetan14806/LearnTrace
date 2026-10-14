const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const exec = promisify(execFile);
const cache = new Map();

async function pythonFor(moduleName) {
  const override = process.env.LEARNTRACE_PYTHON;
  const key = `${override || ''}:${moduleName}`;
  if (cache.has(key)) return cache.get(key);
  const local = path.join(__dirname, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
  const bundled = path.resolve(path.dirname(process.execPath), '../../python', process.platform === 'win32' ? 'python.exe' : 'bin/python3');
  const candidates = override ? [[override, []]] : [
    ...(fs.existsSync(local) ? [[local, []]] : []),
    ...(process.platform === 'win32' ? [['py', ['-3']]] : []),
    ['python3', []], ['python', []],
    ...(fs.existsSync(bundled) ? [[bundled, []]] : [])
  ];
  for (const [command, prefix] of candidates) {
    try {
      await exec(command, [...prefix, '-c', `import ${moduleName}`], { timeout: 15000, windowsHide: true });
      const runtime = { command, prefix }; cache.set(key, runtime); return runtime;
    } catch { /* Try the next installed interpreter; never install implicitly. */ }
  }
  throw new Error(`Python with ${moduleName} is unavailable. Install requirements.txt into a virtual environment or set LEARNTRACE_PYTHON to its interpreter.`);
}
async function runPython(moduleName, args, options = {}) {
  const { command, prefix } = await pythonFor(moduleName);
  return exec(command, [...prefix, ...args], { windowsHide: true, timeout: 120000, maxBuffer: 10 * 1024 * 1024, ...options });
}
module.exports = { pythonFor, runPython };
