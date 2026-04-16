const statusMessage = document.getElementById("statusMessage");
const projectList = document.getElementById("projectList");
const rawOutput = document.getElementById("rawOutput");
const refreshButton = document.getElementById("refreshButton");
const currentProjectName = document.getElementById("currentProjectName");
const currentProjectMeta = document.getElementById("currentProjectMeta");
const projectCount = document.getElementById("projectCount");
const topicCount = document.getElementById("topicCount");
const topicList = document.getElementById("topicList");
const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");
const permissionState = document.getElementById("permissionState");
const connectionState = document.getElementById("connectionState");
const tokenState = document.getElementById("tokenState");

const PROJECTS_URL = "https://app.connect.trimble.com/tc/api/2.0/projects?fullyLoaded=false";

let workspaceApi;
let accessToken = "";
let selectedProjectId = "";
let projects = [];
let currentProjectId = "";
let topicRequestId = 0;
let projectLoadPromise = null;

function setText(element, value) {
  if (element) {
    element.textContent = value;
  }
}

function setStatus(message, type = "info") {
  if (statusMessage) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
  }
}

function setJson(data) {
  if (!rawOutput) {
    return;
  }

  rawOutput.textContent = typeof data === "string" ? data : JSON.stringify(data, null, 2);
}

function setTopicMessage(message) {
  if (!topicList) {
    return;
  }

  topicList.innerHTML = "";
  const paragraph = document.createElement("p");
  paragraph.className = "empty";
  paragraph.textContent = message;
  topicList.appendChild(paragraph);
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
  if (!projectList) {
    return;
  }

  projectList.innerHTML = "";
  setText(projectCount, `${projects.length} projetos`);

  if (!projects.length) {
    projectList.innerHTML = '<p class="empty">Nenhum projeto encontrado.</p>';
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
  if (!topicList) {
    return;
  }

  topicList.innerHTML = "";
  setText(topicCount, `${items.length} topicos`);

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
    meta.textContent = topic.meta || topic.id || "Sem detalhes";

    article.append(title, meta);
    topicList.appendChild(article);
  });
}

async function loadTopics(project) {
  if (!project?.id || !accessToken) {
    setStatus("Projeto ou token invalido para consulta dos topicos.", "error");
    renderTopics([]);
    setText(topicCount, "0 topicos");
    return;
  }

  const requestId = ++topicRequestId;
  setStatus("Carregando topicos...");
  setTopicMessage("Carregando...");
  setText(topicCount, "Carregando...");

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
    setJson(
      {
        projectId: project.id,
        bcfEndpoint: {
          version: "auto",
          url: `/api/projects/${project.id}/topics`,
        },
        topics,
        raw: payload,
      }
    );
    setStatus(topics.length ? "Topicos carregados." : "Nenhum topico encontrado.");
  } catch (error) {
    if (requestId !== topicRequestId) {
      return;
    }

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
      currentProjectId = "";
      setText(currentProjectName, "Projeto nao encontrado");
      setText(currentProjectMeta, "Abra a extensao dentro de um projeto.");
      return;
    }

    currentProjectId = project.id || project.projectId || "";
    if (!selectedProjectId && currentProjectId) {
      selectedProjectId = currentProjectId;
    }

    setText(currentProjectName, project.name || project.projectName || "Projeto atual");
    setText(currentProjectMeta, [project.id, project.number].filter(Boolean).join(" | "));
  } catch (error) {
    currentProjectId = "";
    setText(currentProjectName, "Falha ao ler o projeto atual");
    setText(currentProjectMeta, error.message);
    setStatus("Nao foi possivel obter o projeto atual.", "error");
  }
}

async function loadCurrentUser() {
  try {
    const user =
      (await workspaceApi?.user?.getUser?.()) ||
      (await workspaceApi?.user?.getCurrentUser?.()) ||
      null;

    if (!user) {
      return;
    }

    setText(userName, user.name || user.displayName || "Usuario conectado");
    setText(userEmail, user.email || user.mail || "Email indisponivel");
  } catch {
    // Dados do usuario sao opcionais para a listagem dos topicos.
  }
}

function getInitialProject() {
  return (
    projects.find((project) => project.id === currentProjectId) ||
    projects.find((project) => project.id === selectedProjectId) ||
    projects[0]
  );
}

async function requestAccessToken() {
  if (!workspaceApi?.extension?.requestPermission) {
    throw new Error("Workspace API de extensao nao disponivel.");
  }

  const result = await workspaceApi.extension.requestPermission("accesstoken");

  if (result === "pending") {
    setText(permissionState, "Pendente");
    setText(tokenState, "Aguardando");
    setStatus("Aguardando permissao do usuario.");
    return;
  }

  if (result === "denied") {
    setText(permissionState, "Negado");
    setText(tokenState, "Negado");
    throw new Error("Permissao do token negada.");
  }

  accessToken = String(result);
  setText(permissionState, "Concedido");
  setText(tokenState, "Recebido");
  setStatus("Token recebido.");
}

async function loadProjects(force = false) {
  if (projectLoadPromise && !force) {
    return projectLoadPromise;
  }

  projectLoadPromise = (async () => {
    if (!accessToken) {
      throw new Error("Token de acesso nao disponivel.");
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
      renderTopics([]);
      setText(topicCount, "0 topicos");
      setJson("Sem dados.");
      setStatus("Nenhum projeto encontrado.", "error");
      return;
    }

    setJson(initialProject.raw);
    await loadTopics(initialProject);
  })().finally(() => {
    projectLoadPromise = null;
  });

  return projectLoadPromise;
}

async function refreshData(force = true) {
  await loadCurrentProject();

  if (!accessToken) {
    await requestAccessToken();
  }

  if (accessToken) {
    await loadProjects(force);
  }
}

async function initialize() {
  if (!window.TrimbleConnectWorkspace?.connect) {
    setText(connectionState, "Indisponivel");
    setStatus("Workspace API indisponivel.", "error");
    return;
  }

  workspaceApi = await window.TrimbleConnectWorkspace.connect(window.parent, async (event, args) => {
    if (event === "extension.accessToken" && typeof args?.data === "string") {
      accessToken = args.data;
      setText(permissionState, "Concedido");
      setText(tokenState, "Recebido");

      if (!projects.length && !projectLoadPromise) {
        try {
          await loadProjects();
        } catch (error) {
          setStatus(error.message, "error");
          setJson(error.stack || error.message);
        }
      }
    }
  });

  setText(connectionState, "Conectado");
  await loadCurrentProject();
  await loadCurrentUser();
  await refreshData(false);
}

refreshButton?.addEventListener("click", async () => {
  refreshButton.disabled = true;

  try {
    await refreshData(true);
  } catch (error) {
    setStatus(error.message, "error");
    setJson(error.stack || error.message);
  } finally {
    refreshButton.disabled = false;
  }
});

initialize().catch((error) => {
  setText(connectionState, "Falha");
  setStatus(error.message, "error");
  setJson(error.stack || error.message);
});
