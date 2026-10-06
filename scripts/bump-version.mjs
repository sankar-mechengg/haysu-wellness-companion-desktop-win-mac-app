#!/usr/bin/env node
/**
 * Bump the app version in every manifest at once.
 *
 *   npm run bump -- 1.2.0
 *   npm run bump -- patch | minor | major
 *
 * Updates package.json, package-lock.json, src-tauri/tauri.conf.json and
 * src-tauri/Cargo.toml (plus Cargo.lock's own entry), then prints the git
 * commands to tag the release.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const arg = process.argv[2];
if (!arg) {
  console.error("usage: npm run bump -- <x.y.z | patch | minor | major>");
  process.exit(1);
}

const pkgPath = resolve(root, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const current = pkg.version;

function next(cur, how) {
  if (/^\d+\.\d+\.\d+$/.test(how)) return how;
  const [a, b, c] = cur.split(".").map(Number);
  if (how === "major") return `${a + 1}.0.0`;
  if (how === "minor") return `${a}.${b + 1}.0`;
  if (how === "patch") return `${a}.${b}.${c + 1}`;
  throw new Error(`unknown bump: ${how}`);
}

const version = next(current, arg);

// package.json
pkg.version = version;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

// package-lock.json (top level + root package entry)
const lockPath = resolve(root, "package-lock.json");
try {
  const lock = JSON.parse(readFileSync(lockPath, "utf8"));
  lock.version = version;
  if (lock.packages && lock.packages[""]) lock.packages[""].version = version;
  writeFileSync(lockPath, JSON.stringify(lock, null, 2) + "\n");
} catch {
  // no lockfile, fine
}

// tauri.conf.json
const confPath = resolve(root, "src-tauri/tauri.conf.json");
const conf = JSON.parse(readFileSync(confPath, "utf8"));
conf.version = version;
writeFileSync(confPath, JSON.stringify(conf, null, 2) + "\n");

// Cargo.toml: only the [package] version line.
const cargoPath = resolve(root, "src-tauri/Cargo.toml");
const cargo = readFileSync(cargoPath, "utf8").replace(
  /^(\[package\][\s\S]*?^version\s*=\s*")[^"]+(")/m,
  `$1${version}$2`
);
writeFileSync(cargoPath, cargo);

// Cargo.lock: the haysu package entry.
const lockRsPath = resolve(root, "src-tauri/Cargo.lock");
try {
  const lockRs = readFileSync(lockRsPath, "utf8").replace(
    /(\[\[package\]\]\nname = "haysu"\nversion = ")[^"]+(")/,
    `$1${version}$2`
  );
  writeFileSync(lockRsPath, lockRs);
} catch {
  // no lockfile, fine
}

// Keep the JSON manifests in Prettier's style so CI's format check stays green.
try {
  execSync("npx prettier --write package.json package-lock.json src-tauri/tauri.conf.json", {
    cwd: root,
    stdio: "ignore",
  });
} catch {
  console.warn("prettier not available; run `npm run format` before committing");
}

console.log(`${current} → ${version}`);
console.log(`
Next:
  git add -A
  git commit -m "chore: release v${version}"
  git tag v${version}
  git push && git push origin v${version}
`);
