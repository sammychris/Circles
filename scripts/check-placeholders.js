// Stops a production build while placeholder text like [VERIFIED NIGERIA CRISIS LINE] is still in the app.
// EAS runs this before installing (see "eas-build-pre-install" in package.json).
const fs = require('fs');
const path = require('path');

const PLACEHOLDER = /\[[A-Z][A-Z _]{3,}\]/g;

function findPlaceholders(dir) {
  const hits = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      hits.push(...findPlaceholders(full));
    } else if (/\.(ts|tsx)$/.test(name)) {
      for (const match of fs.readFileSync(full, 'utf8').match(PLACEHOLDER) ?? []) hits.push(`${full}: ${match}`);
    }
  }
  return hits;
}

module.exports = { findPlaceholders };

if (require.main === module) {
  const profile = process.env.EAS_BUILD_PROFILE;
  if (profile !== 'production') process.exit(0);
  const hits = findPlaceholders(path.join(__dirname, '..', 'src'));
  if (hits.length > 0) {
    console.error('Placeholder text must be replaced before a production build:\n' + hits.join('\n'));
    process.exit(1);
  }
}
