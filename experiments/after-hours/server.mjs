import http from "node:http";
import presenceHandler from "./api/presence.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 4173;
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".webp": "image/webp",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};
http
  .createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    if (url.pathname === "/api/presence") {
      await presenceHandler(req, res);
      return;
    }
    const target = path.resolve(
      root,
      "." + decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname)
    );
    if (!target.startsWith(root + path.sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    fs.readFile(target, (err, buffer) => {
      if (err) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      res.writeHead(200, {
        "content-type": types[path.extname(target)] || "application/octet-stream",
        "cache-control": "no-cache",
      });
      res.end(buffer);
    });
  })
  .listen(port, () => console.log(`AFTER HOURS → http://localhost:${port}`));
