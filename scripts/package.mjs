import assert from 'node:assert/strict';
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { Script } from 'node:vm';
import { readMetadata, validateMetadata } from './validate.mjs';

validateMetadata(await readMetadata(), process.env.RELEASE_TAG ?? '');
const bundle = await readFile('main.js', 'utf8');
assert.ok(bundle.trim(), 'Plugin bundle is empty');
new Script(bundle, { filename: 'main.js' });
const directory = 'artifacts/snippet-palette';
await mkdir(directory, { recursive: true });
for (const file of ['main.js', 'manifest.json', 'styles.css', 'LICENSE']) {
  assert.ok((await readFile(file)).length, `${file} is empty`);
  await copyFile(file, `${directory}/${file}`);
}
console.log(`Installable plugin staged in ${directory}`);
