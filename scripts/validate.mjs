import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export function validateMetadata({ manifest, pkg, lock, versions }, tag = '') {
  const semver = /^\d+\.\d+\.\d+$/;
  assert.equal(manifest.id, 'snippet-palette', 'Unexpected plugin ID');
  assert.equal(manifest.name, 'Snippet Palette', 'Unexpected plugin name');
  assert.match(manifest.version, semver, 'Plugin version must be stable semver');
  assert.match(manifest.minAppVersion, semver, 'Minimum Obsidian version must be semver');
  assert.equal(typeof manifest.isDesktopOnly, 'boolean');
  for (const key of ['author', 'description']) assert.ok(manifest[key]?.trim(), `Missing ${key}`);
  assert.equal(pkg.version, manifest.version, 'package and manifest versions differ');
  assert.equal(lock.version, pkg.version, 'Lockfile version differs');
  assert.equal(lock.packages[''].version, pkg.version, 'Lockfile root version differs');
  assert.deepEqual(lock.packages[''].devDependencies, pkg.devDependencies, 'Lockfile dependencies differ');
  assert.equal(versions[manifest.version], manifest.minAppVersion, 'versions.json mapping differs');
  if (tag) assert.equal(tag.replace(/^v/, ''), manifest.version, 'Release tag must match plugin version');
}

export async function readMetadata() {
  const read = async path => JSON.parse(await readFile(path, 'utf8'));
  const [manifest, pkg, lock, versions] = await Promise.all(
    ['manifest.json', 'package.json', 'package-lock.json', 'versions.json'].map(read)
  );
  return { manifest, pkg, lock, versions };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  validateMetadata(await readMetadata(), process.env.RELEASE_TAG ?? '');
  console.log('Plugin metadata, lockfile and release version are consistent.');
}
