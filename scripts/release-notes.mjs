#!/usr/bin/env node
/**
 * Print the release notes for a version: the matching CHANGELOG section plus
 * a fixed download / install guide.
 *
 *   node scripts/release-notes.mjs 1.1.0
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const version = (process.argv[2] || "").replace(/^v/, "");
const repo = "sankar-mechengg/haysu-wellness-companion-desktop-win-mac-app";

let section = "";
try {
  const changelog = readFileSync(resolve(root, "CHANGELOG.md"), "utf8");
  const re = new RegExp(
    `^## \\[?${version.replace(/\./g, "\\.")}\\]?[^\\n]*\\n([\\s\\S]*?)(?=^## |\\s*$)`,
    "m"
  );
  const m = changelog.match(re);
  if (m) section = m[1].trim();
} catch {
  // no changelog
}

const guide = `
### Downloads

| Platform | File |
|----------|------|
| Windows 10/11 | \`Haysu_${version}_x64-setup.exe\` (recommended) or \`Haysu_${version}_x64_en-US.msi\` |
| macOS Apple Silicon | \`Haysu_${version}_aarch64.dmg\` |
| macOS Intel | \`Haysu_${version}_x64.dmg\` |
| Linux | \`Haysu_${version}_amd64.AppImage\` or \`Haysu_${version}_amd64.deb\` |

### Installing

- **Windows:** run the installer. SmartScreen may warn because the build is not code-signed yet. Click *More info → Run anyway*.
- **macOS:** open the DMG and drag Haysu to Applications. The build is not notarised, so on first launch macOS will block it. Open **System Settings → Privacy & Security**, scroll down and click **Open Anyway**. Alternatively run \`xattr -cr /Applications/Haysu.app\` once in Terminal.
- **Linux:** make the AppImage executable (\`chmod +x\`) and run it, or install the .deb with \`sudo apt install ./Haysu_${version}_amd64.deb\`.

Existing installs of 1.1.0 or later update themselves: the widget shows an **Update** button when a new version is out.

\`latest.json\` and the \`.sig\` files are used by the in-app updater; you do not need to download them.
`;

process.stdout.write(
  `${section || `Haysu ${version}.`}\n${guide}\n[Full changelog](https://github.com/${repo}/blob/master/CHANGELOG.md)\n`
);
