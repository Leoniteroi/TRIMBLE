const statusMessage = document.getElementById("statusMessage");
const projectList = document.getElementById("projectList");
const rawOutput = document.getElementById("rawOutput");
const refreshButton = document.getElementById("refreshButton");
const connectionState = document.getElementById("connectionState");
const tokenState = document.getElementById("tokenState");
const permissionState = document.getElementById("permissionState");
const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");
const currentProjectName = document.getElementById("currentProjectName");
const currentProjectMeta = document.getElementById("currentProjectMeta");
const projectCount = document.getElementById("projectCount");
const topicList = document.getElementById("topicList");
const topicCount = document.getElementById("topicCount");

let workspaceApi = null;
let accessToken = "";
let selectedProjectId = "";
let currentProjectId = "";

function buildBcfTopicEndpointCandidates(projectId) {
  const encodedProjectId = encodeURIComponent(projectId);

  return [
    `https://web.connect.trimble.com/bcf/2.1/projects/${encodedProjectId}/topics`,
    `https://app.connect.trimble.com/bcf/2.1/projects/${encodedProjectId}/topics`,
  ];
}

function showStatus(message, type = "info") {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
}

function setConnectionState(message) {
  connectionState.textContent = message;
}

function setTokenState(message) {
  tokenState.textContent = message;
}

function setPermissionState(message) {
  permissionState.textContent = message;
}

function renderTopicList(topics) {
  topicList.innerHTML = "";
  topicCount.textContent = `${topics.length} topico${topics.length === 1 ? "" : "s"}`;

  if (!topics.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Nenhum topico retornado para este projeto.";
    topicList.appendChild(empty);
    return;
  }

  topics.forEach((topic) => {
    const card = document.createElement("article");
    card.className = "topic-item";

    const title = document.createElement("span");
    title.className = "topic-title";
    title.textContent = topic.title || "Topico sem titulo";

    const meta = document.createElement("span");
    meta.className = "topic-meta";
    meta.textContent = [topic.status, topic.type, topic.guid || topic.id]
      .filter(Boolean)
      .join(" | ");

    card.append(title, meta);
    topicList.appendChild(card);
  });
}

function setTopicLoading(message) {
  topicList.innerHTML = `<p class="empty-state">${message}</p>`;
  topicCount.textContent = "0 topicos";
}

function renderProjectList(projects) {
  projectList.innerHTML = "";
  projectCount.textContent = `${projects.length} projeto${projects.length === 1 ? "" : "s"}`;

  if (!projects.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Nenhum projeto retornado para este usuario.";
    projectList.appendChild(empty);
    rawOutput.textContent = "Sem projetos para exibir.";
    return;
  }

  projects.forEach((project, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "project-item";
    if (project.id === selectedProjectId || (!selectedProjectId && index === 0)) {
      button.classList.add("active");
      selectedProjectId = project.id;
      rawOutput.textContent = JSON.stringify(project.raw, null, 2);
    }

    const title = document.createElement("span");
    title.className = "project-title";
    title.textContent = project.name || "Projeto sem nome";

    const meta = document.createElement("span");
    meta.className = "project-meta";
    meta.textContent = [project.number, project.id].filter(Boolean).join(" | ");

    button.append(title, meta);
    button.addEventListener("click", async () => {
      selectedProjectId = project.id;
      rawOutput.textContent = JSON.stringify(project.raw, null, 2);
      document.querySelectorAll(".project-item").forEach((item) => {
        item.classList.toggle("active", item === button);
      });

      try {
        await loadTopicsForProject(project);
      } catch (error) {
        showStatus(`Nao foi possivel carregar os topicos do projeto: ${error.message}`, "error");
      }
    });

    projectList.appendChild(button);
  });
}

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

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status}: ${body}`);
  }

  return response.json();
}

async function fetchBcfTopics(projectId, token) {
  let lastError = null;
  const endpointCandidates = buildBcfTopicEndpointCandidates(projectId);

  for (const url of endpointCandidates) {
    try {
      return await fetchJson(url, token, {
        "Content-Type": "application/json",
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Nenhum endpoint BCF 2.1 de topicos respondeu com sucesso.");
}

async function loadTopicsForProject(project) {
  const projectId = typeof project === "string" ? project : project?.id || project?.projectId || "";
  const projectRaw = typeof project === "string" ? null : project?.raw || project;

  if (!projectId) {
    setTopicLoading("O projeto selecionado nao possui identificador valido.");
    return;
  }

  if (!accessToken) {
    throw new Error("A extensao ainda nao recebeu um access token.");
  }

  setTopicLoading("Carregando topicos do projeto selecionado...");
  try {
    const topicsPayload = await fetchBcfTopics(projectId, accessToken);
    const topics = normalizeTopics(topicsPayload);

    renderTopicList(topics);
    rawOutput.textContent = JSON.stringify(
      {
        projectId,
        projectRaw,
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
  }
}

async function loadCurrentProject() {
  try {
    const project =
      (await workspaceApi.project.getCurrentProject?.()) ||
      (await workspaceApi.project.getProject?.());

    if (!project) {
      currentProjectName.textContent = "Projeto nao encontrado";
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
    currentProjectMeta.textContent = error.message;
  }
}

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

async function requestAccessToken() {
  setPermissionState("Solicitando consentimento");
  setTokenState("Pendente");

  const result = await workspaceApi.extension.requestPermission("accesstoken");

  if (result === "pending") {
    showStatus("Aguardando o usuario conceder permissao ao token na interface do Connect.", "info");
    return;
  }

  if (result === "denied") {
    setPermissionState("Negado");
    setTokenState("Acesso negado");
    throw new Error("O usuario negou a permissao do access token para a extensao.");
  }

  accessToken = result;
  setPermissionState("Concedido");
  setTokenState("Recebido");
}

async function initializeExtension() {
  showStatus("Conectando ao Workspace API do Trimble Connect...", "info");

  workspaceApi = await window.TrimbleConnectWorkspace.connect(
    window.parent,
    async (event, args) => {
      if (event === "extension.accessToken") {
        if (typeof args?.data === "string" && args.data !== "pending" && args.data !== "denied") {
          accessToken = args.data;
          setPermissionState("Concedido");
          setTokenState("Atualizado pelo Connect");

          try {
            await loadUserAndProjects();
          } catch (error) {
            showStatus(`Falha ao atualizar dados apos refresh do token: ${error.message}`, "error");
          }
        }
      }

      if (event === "extension.command") {
        showStatus(`Comando recebido da extensao: ${args?.data || "sem payload"}`, "info");
      }
    },
    30000
  );

  setConnectionState("Conectado");
  await loadCurrentProject();
  await requestAccessToken();

  if (accessToken) {
    await loadUserAndProjects();
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
      await loadUserAndProjects();
    }
  } catch (error) {
    showStatus(`Nao foi possivel atualizar os dados: ${error.message}`, "error");
  } finally {
    refreshButton.disabled = false;
  }
});

initializeExtension().catch((error) => {
  setConnectionState("Falhou");
  setPermissionState("Indisponivel");
  setTokenState("Indisponivel");
  showStatus(
    `Nao foi possivel iniciar a extensao. Abra esta pagina dentro do Trimble Connect. Detalhes: ${error.message}`,
    "error"
  );
  rawOutput.textContent = error.stack || error.message;
});
