/* eslint-disable no-console */

// Runs after `tsc` (see package.json's `build:types` script). `dist/types/utils`
// only ever contains internal helpers (throttle, escapeRegex) - they're marked
// `@internal` + stripped of content via tsconfig's `stripInternal`, but TypeScript
// still emits a (now-empty) .d.ts file for every source file it compiles, regardless
// of whether anything is actually exported from it. There's no tsconfig option to
// suppress emission for a specific transitively-imported file, so this just deletes
// the resulting empty stub directory after the fact.

const Fs = require('fs');
const Path = require('path');

const utilsTypesDir = Path.resolve(__dirname, '../dist/types/utils');

Fs.rmSync(utilsTypesDir, { recursive: true, force: true });

console.info('Removed ' + Path.relative(process.cwd(), utilsTypesDir) + ' (private-only, nothing public to publish).');
