const fs = require('fs');

const inputFile = process.argv[2];
const outputFile = process.argv[3];

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

  lines.push('=============================================');
  lines.push('');
  lines.push(`Module:  ${pkgName}`);
  lines.push(`Version: ${version}`);
  lines.push(`License: ${licenseType}`);
  lines.push('');

  if (info.licenseFile && fs.existsSync(info.licenseFile)) {
    lines.push(fs.readFileSync(info.licenseFile, 'utf8').trim());
    lines.push('');
  }
}

fs.writeFileSync(outputFile, lines.join('\n') + '\n');
