const statusMessage = document.getElementById("statusMessage");
const projectList = document.getElementById("projectList");
const rawOutput = document.getElementById("rawOutput");
const refreshButton = document.getElementById("refreshButton");
const showJsonButton = document.getElementById("showJsonButton");
const toggleTopicsButton = document.getElementById("toggleTopicsButton");
const currentProjectName = document.getElementById("currentProjectName");
const currentProjectMeta = document.getElementById("currentProjectMeta");
const projectCount = document.getElementById("projectCount");
const topicCount = document.getElementById("topicCount");
const topicList = document.getElementById("topicList");
const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");
const permissionState = document.getElementById("permissionState");

let workspaceApi;
let accessToken = "";
let selectedProjectId = "";
let projects = [];
let currentProjectId = "";
let selectedJsonData = null;
let selectedTopicsData = [];

const TOPICS_REGION_HOSTS = {
  northamerica: "https://open11.connect.trimble.com",
  europe: "https://open21.connect.trimble.com",
  asiapacific: "https://open31.connect.trimble.com",
  australia: "https://open32.connect.trimble.com",
};

function setStatus(message, type = "info") {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
}

function setJson(data) {
  selectedJsonData = data;
  showJsonButton.disabled = data == null;
  showJsonButton.textContent = "Exibir JSON";
  rawOutput.hidden = true;
}

function setTopicsData(items) {
  selectedTopicsData = Array.isArray(items) ? items : [];
  toggleTopicsButton.disabled = selectedTopicsData.length === 0;
  toggleTopicsButton.textContent = "Exibir topicos";
  topicList.hidden = true;
}

function normalizeProjectLocation(location) {
  return String(location || "").toLowerCase().replace(/[^a-z]/g, "");
}

function prioritizeTopicHostsByProject(projectRaw) {
  const normalizedLocation = normalizeProjectLocation(projectRaw?.location);
  const prioritizedHost = TOPICS_REGION_HOSTS[normalizedLocation];
  const allHosts = Object.values(TOPICS_REGION_HOSTS);

  if (!prioritizedHost) {
    return allHosts;
  }

  return [prioritizedHost, ...allHosts.filter((host) => host !== prioritizedHost)];
}

function buildBcfTopicEndpointCandidates(projectId) {
  const encodedProjectId = encodeURIComponent(projectId);
  const bcf3Path = `/bcf/3.0/projects/${encodedProjectId}/topics`;
  const bcf21Path = `/bcf/2.1/projects/${encodedProjectId}/topics?top=500`;
  const allHosts = Object.values(TOPICS_REGION_HOSTS);

  return allHosts.flatMap((host) => [
    { version: "3.0", url: `${host}${bcf3Path}` },
    { version: "2.1", url: `${host}${bcf21Path}` },
  ]);
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

    button.append(title);
    button.addEventListener("click", async () => {
      selectedProjectId = project.id;
      document.querySelectorAll("#projectList .item").forEach((item) => {
        item.classList.toggle("active", item === button);
      });
      setJson(project.raw);
      await loadTopics(project);
    });

    projectList.appendChild(button);
  });
}

function renderTopics(items) {
  topicList.innerHTML = "";
  topicCount.textContent = String(items.length);
  setTopicsData(items);

  if (!items.length) {
    topicList.innerHTML = '<p class="empty">Nenhum topico encontrado.</p>';
    return;
  }

  items.forEach((topic) => {
    const article = document.createElement("article");
    article.className = "item";

    const title = document.createElement("span");
    title.className = "title";
    title.textContent = topic.title;

    const meta = document.createElement("span");
    meta.className = "meta";
    meta.textContent = topic.meta;

    article.append(title, meta);
    topicList.appendChild(article);
  });
}

async function fetchBcfTopics(projectId, token, projectRaw = {}) {
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

async function loadTopics(project) {
  if (!project?.id) {
    setStatus("Projeto selecionado invalido.", "error");
    setTopicsData([]);
    renderTopics([]);
    topicCount.textContent = "0";
    return;
  }

  if (!accessToken) {
    setStatus("Token de acesso nao disponivel.", "error");
    setTopicsData([]);
    renderTopics([]);
    topicCount.textContent = "0";
    return;
  }

  setStatus("Carregando topicos...");
  setTopicsData([]);
  topicList.innerHTML = '<p class="empty">Carregando...</p>';

  try {
    const topicsResponse = await fetchBcfTopics(project.id, accessToken, project.raw || project);
    const topics = normalizeTopics(topicsResponse.payload);

    renderTopics(topics);
    setJson({
      projectId: project.id,
      bcfEndpoint: topicsResponse.endpoint,
      topics,
      raw: topicsResponse.payload,
    });
    setStatus("Topicos carregados. Clique em Exibir topicos para ver a listagem.");
  } catch (error) {
    setTopicsData([]);
    renderTopics([]);
    setJson({
      projectId: project.id,
      projectRaw: project.raw || project,
      error: error.message,
    });
    setStatus("Falha ao carregar topicos.", "error");
  }
}

async function loadCurrentProject() {
  if (!workspaceApi?.project) {
    setStatus("Workspace API do projeto nao disponivel.", "error");
    return;
  }

  try {
    const project =
      (await workspaceApi.project.getCurrentProject?.()) ||
      (await workspaceApi.project.getProject?.());

    if (!project) {
      currentProjectName.textContent = "Projeto nao encontrado";
      currentProjectMeta.textContent = "Abra a extensao dentro de um projeto.";
      currentProjectId = "";
      return;
    }

    currentProjectId = project.id || project.projectId || "";
    currentProjectName.textContent = project.name || project.projectName || "Projeto atual";
    currentProjectMeta.textContent = [project.id, project.number].filter(Boolean).join(" | ");
  } catch (error) {
    currentProjectId = "";
    currentProjectName.textContent = "Falha ao ler o projeto atual";
    currentProjectMeta.textContent = error.message;
    setStatus("Nao foi possivel obter o projeto atual.", "error");
  }
}

async function requestAccessToken() {
  if (!workspaceApi?.extension?.requestPermission) {
    throw new Error("Workspace API de extensao nao disponivel.");
  }

  const result = await workspaceApi.extension.requestPermission("accesstoken");

  if (result === "pending") {
    permissionState.textContent = "Pendente";
    setStatus("Aguardando permissao do usuario.");
    return;
  }

  if (result === "denied") {
    permissionState.textContent = "Negado";
    throw new Error("Permissao do token negada.");
  }

  accessToken = String(result);
  permissionState.textContent = "Concedido";
  setStatus("Token recebido.");
}

async function loadProjects() {
  if (!accessToken) {
    throw new Error("Token de acesso nao disponivel.");
  }

  setStatus("Carregando projetos...");

  const payload = await fetchJson(
    "https://app.connect.trimble.com/tc/api/2.0/projects?fullyLoaded=false",
    accessToken
  );

  projects = normalizeProjects(payload);
  renderProjects();

  const selectedProject = projects.find((project) => project.id === selectedProjectId) || projects[0];

  if (selectedProject) {
    setJson(selectedProject.raw);
    await loadTopics(selectedProject);
  } else {
    topicList.innerHTML = '<p class="empty">Nenhum projeto encontrado.</p>';
    setTopicsData([]);
    topicCount.textContent = "0";
    setJson("Sem dados.");
    setStatus("Nenhum projeto encontrado.", "error");
  }
}

async function initialize() {
  if (!window.TrimbleConnectWorkspace?.connect) {
    setStatus("Workspace API indisponivel.", "error");
    return;
  }

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
    setStatus(error.message, "error");
    setJson(error.stack || error.message);
  } finally {
    refreshButton.disabled = false;
  }
});

showJsonButton.addEventListener("click", () => {
  if (selectedJsonData == null) {
    setStatus("Nenhum JSON selecionado.", "error");
    return;
  }

  if (!rawOutput.hidden) {
    rawOutput.hidden = true;
    showJsonButton.textContent = "Exibir JSON";
    return;
  }

  rawOutput.textContent =
    typeof selectedJsonData === "string"
      ? selectedJsonData
      : JSON.stringify(selectedJsonData, null, 2);
  rawOutput.hidden = false;
  showJsonButton.textContent = "Ocultar JSON";
});

toggleTopicsButton.addEventListener("click", () => {
  if (!selectedTopicsData.length) {
    setStatus("Nenhum topico carregado.", "error");
    return;
  }

  if (!topicList.hidden) {
    topicList.hidden = true;
    toggleTopicsButton.textContent = "Exibir topicos";
    return;
  }

  topicList.hidden = false;
  toggleTopicsButton.textContent = "Ocultar topicos";
});

initialize().catch((error) => {
  setStatus(error.message, "error");
  setJson(error.stack || error.message);
});
