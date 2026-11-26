// `npm run lint`
//
// This project has no ESLint setup. The check below is the linter the CI job
// runs: it asks Node to parse every JavaScript file, so a typo fails before
// the tests start. It does not judge style.

const { execFileSync } = require('child_process');
const { readdirSync, statSync } = require('fs');
const path = require('path');

const SKIP = new Set(['node_modules', 'data', '.git']);

function javascriptFiles(dir) {
  const found = [];
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) found.push(...javascriptFiles(full));
    else if (name.endsWith('.js')) found.push(full);
  }
  return found;
}

const files = javascriptFiles(process.cwd());
for (const file of files) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
}
console.log(`syntax ok (${files.length} files)`);
