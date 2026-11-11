// Foreground static server for `dist/`.
//
// `astro preview` daemonizes — it prints a pid and returns — so Playwright's
// webServer saw the command exit immediately and reported "exited early"
// before any test ran. This stays in the foreground for its whole life, which
// is what lets Playwright own the lifecycle.
import { createServer } from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(process.argv[2] ?? "dist");
const port = Number(process.argv[3] ?? 4173);

// Serving a stale or absent build would report green against yesterday's
// output; fail loudly instead.
if (!existsSync(join(root, "index.html"))) {
  console.error(`no build at ${root} — run \`pnpm build\` first`);
  process.exit(1);
}

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".xml": "text/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

async function resolveFile(pathname) {
  // decodeURIComponent throws URIError on a request like "/%"; an unhandled
  // rejection here would kill the server and fail every remaining test.
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  // normalize() collapses any ../ before it can escape the root.
  const candidate = join(root, normalize(decoded));
  if (!candidate.startsWith(root)) return null;
  for (const file of [candidate, join(candidate, "index.html")]) {
    try {
      if ((await stat(file)).isFile()) return file;
    } catch {
      // try the next candidate
    }
  }
  return null;
}

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");
  const file = await resolveFile(pathname);
  if (!file) {
    const notFound = await resolveFile("/404.html");
    res.writeHead(404, { "content-type": TYPES[".html"] });
    if (notFound) return createReadStream(notFound).pipe(res);
    return res.end("Not found");
  }
  res.writeHead(200, {
    "content-type": TYPES[extname(file)] ?? "application/octet-stream",
  });
  createReadStream(file).pipe(res);
}).listen(port, "127.0.0.1", () => {
  console.log(`serving ${root} at http://127.0.0.1:${port}`);
});
