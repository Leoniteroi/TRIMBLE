const http = require("http");
const fs = require("fs");
const path = require("path");

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 5500);
const ROOT = __dirname;
const STATIC_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const REGION_HOSTS = {
  northamerica: [
    "https://open11.connect.trimble.com",
    "https://app.connect.trimble.com",
  ],
  europe: [
    "https://open21.connect.trimble.com",
    "https://app21.connect.trimble.com",
  ],
  asiapacific: [
    "https://open31.connect.trimble.com",
    "https://app31.connect.trimble.com",
  ],
  australia: [
    "https://open32.connect.trimble.com",
    "https://app32.connect.trimble.com",
    "https://open31.connect.trimble.com",
    "https://app31.connect.trimble.com",
  ],
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload, null, 2));
}

function serveFile(requestPath, response) {
  const relativePath = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
  const filePath = path.join(ROOT, path.normalize(relativePath));

  if (!filePath.startsWith(ROOT)) {
    response.writeHead(403);
    response.end("Acesso negado.");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end("Arquivo nao encontrado.");
      return;
    }

    response.writeHead(200, {
      "Content-Type": STATIC_TYPES[path.extname(filePath)] || "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end(data);
  });
}

function normalizeProjectLocation(location) {
  return String(location || "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

function buildTopicHosts(location) {
  const normalizedLocation = normalizeProjectLocation(location);
  const preferredHosts = REGION_HOSTS[normalizedLocation] || [];
  const fallbackHosts = Object.values(REGION_HOSTS).flat();
  return [...new Set([...preferredHosts, ...fallbackHosts])];
}

async function fetchJson(url, token) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    throw { status: response.status, body, url };
  }

  return body;
}

async function loadTopics(projectId, location, token) {
  const hosts = buildTopicHosts(location);
  const failures = [];

  for (const host of hosts) {
    for (const version of ["3.0", "2.1"]) {
      const suffix = version === "2.1" ? "?top=500" : "";
      const url = `${host}/bcf/${version}/projects/${projectId}/topics${suffix}`;

      try {
        return {
          payload: await fetchJson(url, token),
          endpoint: { version, url },
        };
      } catch (error) {
        failures.push({
          url,
          version,
          status: error.status || null,
          body: error.body || null,
        });
      }
    }
  }

  throw failures;
}

http
  .createServer(async (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const topicMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/topics$/);

    if (request.method === "GET" && topicMatch) {
      const tokenHeader = request.headers.authorization || "";
      const token = tokenHeader.startsWith("Bearer ") ? tokenHeader.slice(7) : "";

      if (!token) {
        sendJson(response, 401, { message: "Token nao informado." });
        return;
      }

      try {
        const result = await loadTopics(
          decodeURIComponent(topicMatch[1]),
          url.searchParams.get("location") || "",
          token
        );
        sendJson(response, 200, result.payload);
      } catch (failures) {
        sendJson(response, 502, { message: "Falha ao carregar topicos.", failures });
      }

      return;
    }

    serveFile(url.pathname, response);
  })
  .listen(PORT, HOST, () => {
    console.log(`Servidor ativo em http://${HOST}:${PORT}`);
  });
