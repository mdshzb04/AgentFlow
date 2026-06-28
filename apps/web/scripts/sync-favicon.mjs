#!/usr/bin/env node
/**
 * Regenerates public/favicon.ico from public/logo-icon.png.
 * Run after updating the logo: node scripts/sync-favicon.mjs
 */
import { execSync } from "node:child_process";
import { existsSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const logo = join(root, "public/logo-icon.png");
const favicon = join(root, "public/favicon.ico");

if (!existsSync(logo)) {
  console.error("Missing public/logo-icon.png");
  process.exit(1);
}

const script = `from PIL import Image

img = Image.open(${JSON.stringify(logo)}).convert("RGBA")
side = max(img.size)
square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
square.paste(img, ((side - img.width) // 2, (side - img.height) // 2))
square.resize((32, 32), Image.Resampling.LANCZOS).save(
    ${JSON.stringify(favicon)}, format="ICO", sizes=[(32, 32)]
)
print("synced favicon.ico")
`;

const tmp = join(tmpdir(), "sync-favicon.py");
writeFileSync(tmp, script);

try {
  execSync(`python3 "${tmp}"`, { stdio: "inherit" });
} catch {
  console.error("Install Pillow: pip install Pillow");
  process.exit(1);
} finally {
  unlinkSync(tmp);
}
