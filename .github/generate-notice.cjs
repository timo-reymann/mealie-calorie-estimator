const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function resolveInside(p, roots) {
  if (typeof p !== 'string' || p.includes('\0')) {
    throw new Error('Invalid path: expected a string without null bytes');
  }
  const resolved = path.resolve(p);
  let real;
  try {
    real = fs.realpathSync(resolved);
  } catch {
    real = resolved;
  }
  const inside = roots.some(
    (root) => real === root || real.startsWith(root + path.sep),
  );
  if (!inside) {
    throw new Error(`Path outside allowed directories: ${p}`);
  }
  return resolved;
}

const allowedRoots = [process.cwd(), os.tmpdir(), '/tmp'].map((root) => {
  try {
    return fs.realpathSync(root);
  } catch {
    return path.resolve(root);
  }
});

if (typeof process.argv[2] !== 'string' || typeof process.argv[3] !== 'string') {
  throw new TypeError('Usage: node generate-notice.cjs <licenses.json> <output-file>');
}

const inputFile = fs.realpathSync(path.resolve(process.argv[2]));
if (!allowedRoots.some((root) => inputFile === root || inputFile.startsWith(root + path.sep))) {
  throw new Error(`Input path outside allowed directories: ${process.argv[2]}`);
}

const outputResolved = path.resolve(process.argv[3]);
const outputFile = path.join(fs.realpathSync(path.dirname(outputResolved)), path.basename(outputResolved));
if (!allowedRoots.some((root) => outputFile === root || outputFile.startsWith(root + path.sep))) {
  throw new Error(`Output path outside allowed directories: ${process.argv[3]}`);
}

const licenses = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
const entries = Object.entries(licenses).sort(([a], [b]) => a.localeCompare(b));

const lines = [
  'This software includes external packages and source code.',
  'The applicable license information is listed below:',
  ''
];

for (const [key, info] of entries) {
  const lastAt = key.lastIndexOf('@');
  const pkgName = lastAt > 0 ? key.substring(0, lastAt) : key;
  const version = lastAt > 0 ? key.substring(lastAt + 1) : 'unknown';
  const licenseType = Array.isArray(info.licenses)
    ? info.licenses.join(', ')
    : (info.licenses || 'unknown');

  lines.push(
    '=============================================',
    '',
    `Module:  ${pkgName}`,
    `Version: ${version}`,
    `License: ${licenseType}`,
    ''
  );

  if (info.licenseFile) {
    const licensePath = resolveInside(info.licenseFile, allowedRoots);
    if (fs.existsSync(licensePath)) {
      lines.push(fs.readFileSync(licensePath, 'utf8').trim(), '');
    }
  }
}

fs.writeFileSync(outputFile, lines.join('\n') + '\n');
