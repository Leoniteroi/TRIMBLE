const statusMessage = document.getElementById("statusMessage");
const refreshButton = document.getElementById("refreshButton");
const currentProjectName = document.getElementById("currentProjectName");
const currentProjectMeta = document.getElementById("currentProjectMeta");
const projectCount = document.getElementById("projectCount");
const projectList = document.getElementById("projectList");
const topicCount = document.getElementById("topicCount");
const topicList = document.getElementById("topicList");
const rawOutput = document.getElementById("rawOutput");

const PROJECTS_URL = "https://app.connect.trimble.com/tc/api/2.0/projects?fullyLoaded=false";

let workspaceApi;
let accessToken = "";
let currentProjectId = "";
let selectedProjectId = "";
let projects = [];
let topicRequestId = 0;
let projectLoadPromise = null;

function setStatus(message) {
  statusMessage.textContent = message;
}

function setJson(data) {
  rawOutput.textContent = typeof data === "string" ? data : JSON.stringify(data, null, 2);
}

function setListMessage(container, message) {
  container.innerHTML = "";
  const paragraph = document.createElement("p");
  paragraph.className = "empty";
  paragraph.textContent = message;
  container.appendChild(paragraph);
}

function formatErrorMessage(errorPayload) {
  if (typeof errorPayload === "string" && errorPayload.trim()) {
    return errorPayload;
  }

  if (errorPayload && typeof errorPayload === "object") {
    return JSON.stringify(errorPayload);
  }

  return "Falha ao carregar os dados.";
}

function normalizeProjects(payload) {
  const items = Array.isArray(payload)
    ? payload
    : payload?.data || payload?.items || payload?.projects || payload?.results || [];

  return items.map((project) => ({
    id: project.id || project.projectId || project.identifier || "",
    name: project.name || project.projectName || "Projeto sem nome",
    number: project.number || project.projectNumber || project.externalId || "",
    location: project.location || project.region || project.projectLocation || "",
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
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const bodyText = await response.text();
  let payload = [];

  if (bodyText.trim()) {
    try {
      payload = JSON.parse(bodyText);
    } catch {
      payload = bodyText;
    }
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${formatErrorMessage(payload)}`);
  }

  return payload;
}

function renderProjects() {
  projectList.innerHTML = "";
  projectCount.textContent = String(projects.length);

  if (!projects.length) {
    setListMessage(projectList, "Nenhum projeto encontrado.");
    return;
  }

  projects.forEach((project) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "item";
    button.classList.toggle("active", project.id === selectedProjectId);

    const title = document.createElement("span");
    title.className = "title";
    title.textContent = project.name;

    const meta = document.createElement("span");
    meta.className = "meta";
    meta.textContent = [project.number, project.id].filter(Boolean).join(" | ") || "Sem identificador";

    button.append(title, meta);
    button.addEventListener("click", async () => {
      selectedProjectId = project.id;
      renderProjects();
      setJson(project.raw);
      await loadTopics(project);
    });

    projectList.appendChild(button);
  });
}

function renderTopics(items) {
  topicList.innerHTML = "";
  topicCount.textContent = String(items.length);

  if (!items.length) {
    setListMessage(topicList, "Nenhum topico encontrado.");
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
    meta.textContent = topic.meta || topic.id || "Sem detalhes";

    article.append(title, meta);
    topicList.appendChild(article);
  });
}

async function loadTopics(project) {
  if (!project?.id || !accessToken) {
    setListMessage(topicList, "Selecione um projeto valido.");
    topicCount.textContent = "0";
    return;
  }

  const requestId = ++topicRequestId;
  setStatus("Carregando topicos...");
  setListMessage(topicList, "Carregando...");
  topicCount.textContent = "...";

  try {
    const payload = await fetchJson(
      `/api/projects/${encodeURIComponent(project.id)}/topics?location=${encodeURIComponent(project.location || "")}`,
      accessToken
    );

    if (requestId !== topicRequestId) {
      return;
    }

    const topics = normalizeTopics(payload);
    renderTopics(topics);
    setJson({
      projectId: project.id,
      projectRaw: project.raw,
      topics,
      raw: payload,
    });
    setStatus(topics.length ? "Topicos carregados." : "Nenhum topico encontrado.");
  } catch (error) {
    if (requestId !== topicRequestId) {
      return;
    }

    setListMessage(topicList, error.message);
    topicCount.textContent = "0";
    setJson({
      projectId: project.id,
      projectRaw: project.raw,
      error: error.message,
    });
    setStatus("Falha ao carregar topicos.");
  }
}

async function loadCurrentProject() {
  try {
    const project =
      (await workspaceApi.project.getCurrentProject?.()) ||
      (await workspaceApi.project.getProject?.());

    if (!project) {
      currentProjectId = "";
      currentProjectName.textContent = "Projeto nao encontrado";
      currentProjectMeta.textContent = "Abra a extensao dentro de um projeto.";
      return;
    }

    currentProjectId = project.id || project.projectId || "";
    if (!selectedProjectId && currentProjectId) {
      selectedProjectId = currentProjectId;
    }

    currentProjectName.textContent = project.name || project.projectName || "Projeto atual";
    currentProjectMeta.textContent = [project.id, project.number].filter(Boolean).join(" | ");
  } catch (error) {
    currentProjectId = "";
    currentProjectName.textContent = "Falha ao ler projeto";
    currentProjectMeta.textContent = error.message;
  }
}

function getInitialProject() {
  return (
    projects.find((project) => project.id === currentProjectId) ||
    projects.find((project) => project.id === selectedProjectId) ||
    projects[0]
  );
}

async function loadProjects(force = false) {
  if (projectLoadPromise && !force) {
    return projectLoadPromise;
  }

  projectLoadPromise = (async () => {
    if (!accessToken) {
      throw new Error("Token de acesso indisponivel.");
    }

    setStatus("Carregando projetos...");

    const payload = await fetchJson(PROJECTS_URL, accessToken);
    projects = normalizeProjects(payload);

    const initialProject = getInitialProject();
    if (initialProject) {
      selectedProjectId = initialProject.id;
    }

    renderProjects();

    if (!initialProject) {
      setListMessage(topicList, "Nenhum projeto encontrado.");
      topicCount.textContent = "0";
      setJson("Sem dados.");
      setStatus("Nenhum projeto encontrado.");
      return;
    }

    setJson(initialProject.raw);
    await loadTopics(initialProject);
  })().finally(() => {
    projectLoadPromise = null;
  });

  return projectLoadPromise;
}

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

async function refreshData() {
  await loadCurrentProject();

  if (!accessToken) {
    await requestAccessToken();
  }

  if (accessToken) {
    await loadProjects(true);
  }
}

async function initialize() {
  workspaceApi = await window.TrimbleConnectWorkspace.connect(window.parent, async (event, args) => {
    if (event === "extension.accessToken" && typeof args?.data === "string") {
      accessToken = args.data;

      if (!projects.length && !projectLoadPromise) {
        try {
          await loadProjects();
        } catch (error) {
          setStatus(error.message);
          setJson(error.stack || error.message);
        }
      }
    }
  });

  await refreshData();
}

refreshButton.addEventListener("click", async () => {
  refreshButton.disabled = true;

  try {
    await refreshData();
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
