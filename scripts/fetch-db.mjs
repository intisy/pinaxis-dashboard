// Mirrors the raw pinaxis database into the site for the PRIVATE build only (it is served behind
// Cloudflare Access). Never run for the public build - the public site must not carry raw secrets.
// The pinaxis repo is private, so the download is authenticated through the gh CLI.
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const publicDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "public");
execFileSync(
  "gh",
  ["release", "download", "dataset", "--repo", "intisy/pinaxis", "--pattern", "pinaxis.db", "--dir", publicDir, "--clobber"],
  { stdio: "inherit" },
);
console.log(`mirrored pinaxis.db into ${publicDir}`);
