const statusMessage = document.getElementById("statusMessage");
const refreshButton = document.getElementById("refreshButton");
const currentProjectName = document.getElementById("currentProjectName");
const currentProjectMeta = document.getElementById("currentProjectMeta");
const projectCount = document.getElementById("projectCount");
const projectList = document.getElementById("projectList");
const topicCount = document.getElementById("topicCount");
const topicList = document.getElementById("topicList");
const rawOutput = document.getElementById("rawOutput");

let workspaceApi;
let accessToken = "";
let selectedProjectId = "";
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
let projects = [];

function setStatus(message) {
=======
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
let currentProjectId = "";

function buildBcfTopicEndpointCandidates(projectId) {
  const encodedProjectId = encodeURIComponent(projectId);
  const pathV30 = `/bcf/3.0/projects/${encodedProjectId}/topics`;
  const pathV21 = `/bcf/2.1/projects/${encodedProjectId}/topics`;
  const host = "https://app.connect.trimble.com";

  return [
    { version: "3.0", url: `${host}${pathV30}` },
    { version: "3.0", url: `${host}${pathV30}?includeAuthorization=true` },
    { version: "2.1", url: `${host}${pathV21}` },
    { version: "2.1", url: `${host}${pathV21}?includeAuthorization=true` },
  ];
=======
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
let currentProjectId = "";

const TOPICS_REGION_HOSTS = {
  northamerica: "https://open11.connect.trimble.com",
  europe: "https://open21.connect.trimble.com",
  asiapacific: "https://open31.connect.trimble.com",
  australia: "https://open32.connect.trimble.com",
};

function buildBcfTopicEndpointCandidates(projectId) {
  const encodedProjectId = encodeURIComponent(projectId);
  const bcf3Path = `/bcf/3.0/projects/${encodedProjectId}/topics`;
  const bcf21Path = `/bcf/2.1/projects/${encodedProjectId}/topics?top=500`;
  const allHosts = Object.values(TOPICS_REGION_HOSTS);

  return allHosts.flatMap((host) => [
    { version: "3.0", url: `${host}${bcf3Path}` },
    { version: "2.1", url: `${host}${bcf21Path}` },
  ]);
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
=======
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
}

function normalizeProjectLocation(location) {
  return String(location || "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
=======
>>>>>>> theirs

function prioritizeTopicHostsByProject(projectRaw) {
  const normalizedLocation = normalizeProjectLocation(projectRaw?.location);
  const prioritizedHost = TOPICS_REGION_HOSTS[normalizedLocation];
  const allHosts = Object.values(TOPICS_REGION_HOSTS);
<<<<<<< ours
<<<<<<< ours

  if (!prioritizedHost) {
    return allHosts;
  }

=======

=======
=======
>>>>>>> theirs
=======
>>>>>>> theirs

function prioritizeTopicHostsByProject(projectRaw) {
  const normalizedLocation = normalizeProjectLocation(projectRaw?.location);
  const prioritizedHost = TOPICS_REGION_HOSTS[normalizedLocation];
  const allHosts = Object.values(TOPICS_REGION_HOSTS);

<<<<<<< ours
<<<<<<< ours
>>>>>>> theirs
=======

>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
  if (!prioritizedHost) {
    return allHosts;
  }

<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
  return [prioritizedHost, ...allHosts.filter((host) => host !== prioritizedHost)];
}

function showStatus(message, type = "info") {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
>>>>>>> theirs
}

function normalizeProjectLocation(location) {
  return String(location || "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

function prioritizeTopicHostsByProject(projectRaw) {
  const normalizedLocation = normalizeProjectLocation(projectRaw?.location);
  const prioritizedHost = TOPICS_REGION_HOSTS[normalizedLocation];
  const allHosts = Object.values(TOPICS_REGION_HOSTS);

  if (!prioritizedHost) {
    return allHosts;
  }

  return [prioritizedHost, ...allHosts.filter((host) => host !== prioritizedHost)];
>>>>>>> theirs
}

function showStatus(message, type = "info") {
>>>>>>> theirs
  statusMessage.textContent = message;
}

function setJson(data) {
  rawOutput.textContent = typeof data === "string" ? data : JSON.stringify(data, null, 2);
}

function normalizeProjects(payload) {
  const items = Array.isArray(payload)
    ? payload
    : payload?.data || payload?.items || payload?.projects || payload?.results || [];

  return items.map((project) => ({
    id: project.id || project.projectId || project.identifier || "",
    name: project.name || project.projectName || "Projeto sem nome",
    number: project.number || project.projectNumber || project.externalId || "",
    location: project.location || "",
    raw: project,
  }));
}

function normalizeTopics(payload) {
  const items = Array.isArray(payload)
    ? payload
    : payload?.data || payload?.items || payload?.topics || payload?.results || [];

  return items.map((topic) => ({
    id: topic.topic_id || topic.id || topic.guid || "",
    title: topic.title || topic.topic_title || topic.description || "Topico sem titulo",
    meta: [topic.topic_status || topic.status, topic.topic_type || topic.type, topic.guid || topic.id]
      .filter(Boolean)
      .join(" | "),
    raw: topic,
  }));
}

async function fetchJson(url, token) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

function renderProjects() {
  projectList.innerHTML = "";
  projectCount.textContent = String(projects.length);

  if (!projects.length) {
    projectList.innerHTML = '<p class="empty">Nenhum projeto encontrado.</p>';
    return;
  }

  projects.forEach((project, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "item";
    if (project.id === selectedProjectId || (!selectedProjectId && index === 0)) {
      selectedProjectId = project.id;
      button.classList.add("active");
    }

    const title = document.createElement("span");
    title.className = "title";
    title.textContent = project.name;

    const meta = document.createElement("span");
    meta.className = "meta";
    meta.textContent = [project.number, project.id].filter(Boolean).join(" | ");

    button.append(title, meta);
    button.addEventListener("click", async () => {
      selectedProjectId = project.id;
      document.querySelectorAll("#projectList .item").forEach((item) => {
        item.classList.toggle("active", item === button);
      });
<<<<<<< ours
      setJson(project.raw);
      await loadTopics(project);
=======

      try {
        await loadTopicsForProject(project);
      } catch (error) {
        showStatus(`Nao foi possivel carregar os topicos do projeto: ${error.message}`, "error");
      }
>>>>>>> theirs
    });

    projectList.appendChild(button);
  });
}

<<<<<<< ours
function renderTopics(items) {
  topicList.innerHTML = "";
  topicCount.textContent = String(items.length);
=======
function normalizeProjects(payload) {
  const candidates = Array.isArray(payload)
    ? payload
    : payload?.data || payload?.items || payload?.projects || payload?.results || [];

  return candidates.map((project) => ({
    id: project.id || project.projectId || project.identifier || "",
    name: project.name || project.projectName || "Projeto sem nome",
    number: project.number || project.projectNumber || project.externalId || "",
    raw: project,
  }));
}

function normalizeTopics(payload) {
  const candidates = Array.isArray(payload)
    ? payload
    : payload?.data || payload?.items || payload?.topics || payload?.results || [];

  return candidates.map((topic) => ({
    id: topic.topic_id || topic.id || topic.guid || "",
    guid: topic.guid || topic.topic_id || topic.id || "",
    title: topic.title || topic.topic_title || topic.description || "",
    status: topic.topic_status || topic.status || "",
    type: topic.topic_type || topic.type || "",
    raw: topic,
  }));
}

async function fetchJson(url, token, extraHeaders = {}) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...extraHeaders,
    },
  });
>>>>>>> theirs

  if (!items.length) {
    topicList.innerHTML = '<p class="empty">Nenhum topico encontrado.</p>';
    return;
  }

  items.forEach((topic) => {
    const article = document.createElement("article");
    article.className = "item";

<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
    const title = document.createElement("span");
    title.className = "title";
    title.textContent = topic.title;

<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
    const meta = document.createElement("span");
    meta.className = "meta";
    meta.textContent = topic.meta;

    article.append(title, meta);
    topicList.appendChild(article);
  });
}

<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
async function loadTopics(project) {
  if (!project?.id || !accessToken) {
=======
=======
>>>>>>> theirs
=======
>>>>>>> theirs
async function fetchBcfTopics(projectId, token) {
  const errors = [];
  const endpointCandidates = buildBcfTopicEndpointCandidates(projectId);

=======
async function fetchBcfTopics(projectId, token) {
  const errors = [];
  const endpointCandidates = buildBcfTopicEndpointCandidates(projectId);

>>>>>>> theirs
=======
async function fetchBcfTopics(projectId, token) {
  const errors = [];
  const endpointCandidates = buildBcfTopicEndpointCandidates(projectId);

>>>>>>> theirs
  for (const endpoint of endpointCandidates) {
    try {
      const payload = await fetchJson(endpoint.url, token, {
        "Content-Type": "application/json",
      });
=======
async function fetchBcfTopics(projectId, token, projectRaw) {
  const errors = [];
  const orderedHosts = prioritizeTopicHostsByProject(projectRaw);
  const endpointCandidates = buildBcfTopicEndpointCandidates(projectId).sort((a, b) => {
    const hostA = orderedHosts.indexOf(new URL(a.url).origin);
    const hostB = orderedHosts.indexOf(new URL(b.url).origin);
    return hostA - hostB;
  });

  for (const endpoint of endpointCandidates) {
    try {
      const payload = await fetchJson(endpoint.url, token);
>>>>>>> theirs
=======
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
async function fetchBcfTopics(projectId, token, projectRaw) {
  const errors = [];
  const orderedHosts = prioritizeTopicHostsByProject(projectRaw);
  const endpointCandidates = buildBcfTopicEndpointCandidates(projectId).sort((a, b) => {
    const hostA = orderedHosts.indexOf(new URL(a.url).origin);
    const hostB = orderedHosts.indexOf(new URL(b.url).origin);
    return hostA - hostB;
  });

  for (const endpoint of endpointCandidates) {
    try {
      const payload = await fetchJson(endpoint.url, token);
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
      return {
        payload,
        endpoint,
      };
    } catch (error) {
      errors.push({
        url: endpoint.url,
        version: endpoint.version,
        message: error.message,
      });
    }
  }

  const message = errors
    .map((error) => `[BCF ${error.version}] ${error.url} -> ${error.message}`)
    .join(" || ");
  throw new Error(`Nenhum endpoint BCF retornou topicos. Tentativas: ${message}`);
}

async function loadTopicsForProject(project) {
  const projectId = typeof project === "string" ? project : project?.id || project?.projectId || "";
  const projectRaw = typeof project === "string" ? null : project?.raw || project;

  if (!projectId) {
    setTopicLoading("O projeto selecionado nao possui identificador valido.");
>>>>>>> theirs
    return;
  }

  setStatus("Carregando topicos...");
  topicList.innerHTML = '<p class="empty">Carregando...</p>';

<<<<<<< ours
  try {
    const payload = await fetchJson(
      `/api/projects/${encodeURIComponent(project.id)}/topics?location=${encodeURIComponent(project.location)}`,
      accessToken
    );
    const topics = normalizeTopics(payload);
    renderTopics(topics);
    setJson({ projectId: project.id, topics, raw: payload });
    setStatus("Topicos carregados.");
  } catch (error) {
    topicList.innerHTML = `<p class="empty">${error.message}</p>`;
    topicCount.textContent = "0";
    setJson({ projectId: project.id, projectRaw: project.raw, error: error.message });
    setStatus("Falha ao carregar topicos.");
=======
  setTopicLoading("Carregando topicos do projeto selecionado...");
  try {
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
    const topicsResponse = await fetchBcfTopics(projectId, accessToken);
=======
    const topicsResponse = await fetchBcfTopics(projectId, accessToken, projectRaw);
>>>>>>> theirs
=======
    const topicsResponse = await fetchBcfTopics(projectId, accessToken, projectRaw);
>>>>>>> theirs
=======
    const topicsResponse = await fetchBcfTopics(projectId, accessToken, projectRaw);
>>>>>>> theirs
=======
    const topicsResponse = await fetchBcfTopics(projectId, accessToken, projectRaw);
>>>>>>> theirs
=======
    const topicsResponse = await fetchBcfTopics(projectId, accessToken, projectRaw);
>>>>>>> theirs
=======
    const topicsResponse = await fetchBcfTopics(projectId, accessToken, projectRaw);
>>>>>>> theirs
=======
    const topicsResponse = await fetchBcfTopics(projectId, accessToken, projectRaw);
>>>>>>> theirs
    const topicsPayload = topicsResponse.payload;
    const topics = normalizeTopics(topicsPayload);

    renderTopicList(topics);
    rawOutput.textContent = JSON.stringify(
      {
        projectId,
        projectRaw,
        bcfEndpoint: topicsResponse.endpoint,
        topics,
        raw: topicsPayload,
      },
      null,
      2
    );
  } catch (error) {
    renderTopicList([]);
    rawOutput.textContent = JSON.stringify(
      {
        projectId,
        projectRaw,
        error: error.message,
      },
      null,
      2
    );
    throw error;
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
  }
}

async function loadCurrentProject() {
  try {
    const project =
      (await workspaceApi.project.getCurrentProject?.()) ||
      (await workspaceApi.project.getProject?.());

    if (!project) {
      currentProjectName.textContent = "Projeto nao encontrado";
<<<<<<< ours
      currentProjectMeta.textContent = "Abra a extensao dentro de um projeto.";
      return;
    }

    currentProjectName.textContent = project.name || project.projectName || "Projeto atual";
    currentProjectMeta.textContent = [project.id, project.number].filter(Boolean).join(" | ");
  } catch (error) {
    currentProjectName.textContent = "Falha ao ler projeto";
=======
      currentProjectMeta.textContent =
        "A extensao precisa ser aberta dentro do contexto de um projeto.";
      currentProjectId = "";
      return;
    }

    currentProjectId = project.id || project.projectId || "";
    currentProjectName.textContent =
      project.name || project.projectName || "Projeto atual";
    currentProjectMeta.textContent = [project.id, project.number]
      .filter(Boolean)
      .join(" | ");
  } catch (error) {
    currentProjectId = "";
    currentProjectName.textContent = "Falha ao ler o projeto atual";
>>>>>>> theirs
    currentProjectMeta.textContent = error.message;
  }
}

<<<<<<< ours
=======
async function loadUserAndProjects() {
  if (!accessToken) {
    throw new Error("A extensao ainda nao recebeu um access token.");
  }

  showStatus("Consultando dados do usuario e lista de projetos...", "info");

  const [userPayload, projectsPayload] = await Promise.all([
    fetchJson("https://app.connect.trimble.com/tc/api/2.0/users/me", accessToken),
    fetchJson("https://app.connect.trimble.com/tc/api/2.0/projects?fullyLoaded=false", accessToken),
  ]);

  userName.textContent =
    userPayload.name || userPayload.displayName || userPayload.fullName || "Usuario autenticado";
  userEmail.textContent =
    userPayload.email || userPayload.mail || "E-mail nao informado";

  const projects = normalizeProjects(projectsPayload);
  const resolvedProjectId =
    currentProjectId && projects.some((project) => project.id === currentProjectId)
      ? currentProjectId
      : selectedProjectId || projects[0]?.id || "";

  selectedProjectId = resolvedProjectId;
  renderProjectList(projects);

  if (resolvedProjectId) {
    const selectedProject =
      projects.find((project) => project.id === resolvedProjectId) || { id: resolvedProjectId };
    await loadTopicsForProject(selectedProject);
  } else {
    setTopicLoading("Nenhum projeto disponivel para carregar topicos.");
  }

  showStatus("Dados carregados com sucesso a partir da sessao do Trimble Connect.", "success");
}

>>>>>>> theirs
async function requestAccessToken() {
  const result = await workspaceApi.extension.requestPermission("accesstoken");

  if (result === "pending") {
    setStatus("Aguardando permissao do usuario.");
    return;
  }

  if (result === "denied") {
    throw new Error("Permissao do token negada.");
  }

  accessToken = result;
}

async function loadProjects() {
  setStatus("Carregando projetos...");

  const payload = await fetchJson("https://app.connect.trimble.com/tc/api/2.0/projects?fullyLoaded=false", accessToken);
  projects = normalizeProjects(payload);
  renderProjects();

  const selectedProject = projects.find((project) => project.id === selectedProjectId) || projects[0];
  if (selectedProject) {
    setJson(selectedProject.raw);
    await loadTopics(selectedProject);
  } else {
    topicList.innerHTML = '<p class="empty">Nenhum projeto encontrado.</p>';
    topicCount.textContent = "0";
    setJson("Sem dados.");
    setStatus("Nenhum projeto encontrado.");
  }
}

async function initialize() {
  workspaceApi = await window.TrimbleConnectWorkspace.connect(window.parent, async (event, args) => {
    if (event === "extension.accessToken" && typeof args?.data === "string") {
      accessToken = args.data;
      await loadProjects();
    }
  });

  await loadCurrentProject();
  await requestAccessToken();

  if (accessToken) {
    await loadProjects();
  }
}

refreshButton.addEventListener("click", async () => {
  refreshButton.disabled = true;

  try {
    await loadCurrentProject();
    if (!accessToken) {
      await requestAccessToken();
    }
    if (accessToken) {
      await loadProjects();
    }
  } catch (error) {
    setStatus(error.message);
    setJson(error.stack || error.message);
  } finally {
    refreshButton.disabled = false;
  }
});

initialize().catch((error) => {
  setStatus(error.message);
  setJson(error.stack || error.message);
});
