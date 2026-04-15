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
  northAmerica: "https://app.connect.trimble.com",
  europe: "https://app21.connect.trimble.com",
  asiaPacific: "https://app31.connect.trimble.com",
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
  const hosts = [
    REGION_HOSTS[location],
    "https://app.connect.trimble.com",
    "https://app21.connect.trimble.com",
    "https://app31.connect.trimble.com",
  ].filter(Boolean);

  const failures = [];

  for (const host of hosts) {
    for (const version of ["3.0", "2.1"]) {
      const url = `${host}/bcf/${version}/projects/${projectId}/topics`;

      try {
        return await fetchJson(url, token);
      } catch (error) {
        failures.push({ url, status: error.status || null, body: error.body || null });
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
        const payload = await loadTopics(
          decodeURIComponent(topicMatch[1]),
          url.searchParams.get("location") || "",
          token
        );
        sendJson(response, 200, payload);
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
