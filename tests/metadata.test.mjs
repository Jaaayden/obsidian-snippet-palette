import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readMetadata, validateMetadata } from '../scripts/validate.mjs';

test('current metadata and both supported tag formats validate', async () => {
  const data = await readMetadata();
  validateMetadata(data);
  validateMetadata(data, data.manifest.version);
  validateMetadata(data, `v${data.manifest.version}`);
});
test('wrong release tag, stale manifest and stale lockfile fail validation', async () => {
  const data = await readMetadata();
  assert.throws(() => validateMetadata(data, 'v999.0.0'), /tag must match/);
  assert.throws(() => validateMetadata({ ...data, manifest: { ...data.manifest, version: '999.0.0' } }), /versions differ/);
  assert.throws(() => validateMetadata({ ...data, versions: {} }), /mapping differs/);
  const stale = structuredClone(data); stale.lock.packages[''].devDependencies.typescript = '0.0.0';
  assert.throws(() => validateMetadata(stale), /dependencies differ/);
});
