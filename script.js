const statusMessage = document.getElementById("statusMessage");
const refreshButton = document.getElementById("refreshButton");
const currentProjectName = document.getElementById("currentProjectName");
const currentProjectMeta = document.getElementById("currentProjectMeta");
const projectCount = document.getElementById("projectCount");
const projectList = document.getElementById("projectList");
const topicCount = document.getElementById("topicCount");
const topicSummary = document.getElementById("topicSummary");
const topicList = document.getElementById("topicList");
const jsonHint = document.getElementById("jsonHint");
const jsonToggleButton = document.getElementById("jsonToggleButton");
const jsonPanel = document.getElementById("jsonPanel");
const rawOutput = document.getElementById("rawOutput");

const PROJECTS_URL = "https://app.connect.trimble.com/tc/api/2.0/projects?fullyLoaded=false";

let workspaceApi;
let accessToken = "";
let currentProjectId = "";
let selectedProjectId = "";
let selectedTopicId = "";
let projects = [];
let currentTopics = [];
let topicRequestId = 0;
let projectLoadPromise = null;
let currentJsonText = "Sem dados.";
let currentJsonLabel = "resultado atual";

function setStatus(message) {
  statusMessage.textContent = message;
}

function setJsonVisibility(visible) {
  jsonPanel.hidden = !visible;
  jsonToggleButton.setAttribute("aria-expanded", String(visible));
  jsonToggleButton.textContent = visible ? "Ocultar JSON" : "Exibir JSON do resultado";
  jsonHint.textContent = visible
    ? `Exibindo o JSON bruto de ${currentJsonLabel}.`
    : `JSON pronto para consulta: ${currentJsonLabel}.`;
}

function setJson(data, label = "resultado atual") {
  currentJsonLabel = label;
  currentJsonText = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  rawOutput.textContent = currentJsonText;
  jsonToggleButton.disabled = !currentJsonText.trim();
  setJsonVisibility(!jsonPanel.hidden);
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

  return items.map((topic) => {
    const labels = Array.isArray(topic.labels)
      ? topic.labels
      : typeof topic.labels === "string" && topic.labels.trim()
        ? [topic.labels]
        : [];

    return {
      id: topic.topic_id || topic.id || topic.guid || "",
      code: topic.server_assigned_id || topic.topic_id || topic.guid || topic.id || "-",
      title: topic.title || topic.topic_title || topic.description || "Topico sem titulo",
      description: topic.description || "",
      status: topic.topic_status || topic.status || "-",
      type: topic.topic_type || topic.type || "-",
      priority: topic.priority || "-",
      assignedTo: topic.assigned_to || topic.modified_author || topic.creation_author || "-",
      createdAt: topic.creation_date || "",
      updatedAt: topic.modified_date || "",
      dueDate: topic.due_date || "",
      labels,
      meta: [topic.topic_status || topic.status, topic.topic_type || topic.type, topic.guid || topic.id]
        .filter(Boolean)
        .join(" | "),
      raw: topic,
    };
  });
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

function normalizeToken(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isClosedStatus(status) {
  const normalized = normalizeToken(status);
  return ["closed", "done", "resolved"].includes(normalized);
}

function isCriticalPriority(priority) {
  const normalized = normalizeToken(priority);
  return ["critical", "prioridade-altissima", "prioridade-alta"].includes(normalized);
}

function formatDate(value, options = { dateStyle: "short" }) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", options).format(date);
}

function truncateText(value, maxLength = 140) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) {
    return "Sem descricao.";
  }

  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
}

function createPill(value, tone) {
  const pill = document.createElement("span");
  pill.className = "pill";
  pill.textContent = value || "-";

  const normalized = normalizeToken(value);

  if (tone === "status") {
    if (isClosedStatus(normalized)) {
      pill.classList.add("pill-success");
    } else if (["in-progress", "active", "waiting"].includes(normalized)) {
      pill.classList.add("pill-warning");
    } else {
      pill.classList.add("pill-info");
    }
  } else if (tone === "priority") {
    if (isCriticalPriority(normalized)) {
      pill.classList.add("pill-danger");
    } else if (["high", "prioridade-media"].includes(normalized)) {
      pill.classList.add("pill-warning");
    } else {
      pill.classList.add("pill-muted");
    }
  } else {
    pill.classList.add("pill-muted");
  }

  return pill;
}

function createCellText(primary, secondary = "") {
  const wrapper = document.createElement("div");
  wrapper.className = "cell-main";

  const title = document.createElement("span");
  title.className = "cell-title";
  title.textContent = primary || "-";
  wrapper.appendChild(title);

  if (secondary) {
    const subtitle = document.createElement("span");
    subtitle.className = "cell-subtitle";
    subtitle.textContent = secondary;
    wrapper.appendChild(subtitle);
  }

  return wrapper;
}

function updateTopicSummary(items) {
  if (!items.length) {
    topicSummary.textContent = "Nenhum topico encontrado para este projeto.";
    return;
  }

  const openCount = items.filter((topic) => !isClosedStatus(topic.status)).length;
  const criticalCount = items.filter((topic) => isCriticalPriority(topic.priority)).length;
  const overdueCount = items.filter((topic) => {
    if (!topic.dueDate || isClosedStatus(topic.status)) {
      return false;
    }

    const dueDate = new Date(topic.dueDate);
    if (Number.isNaN(dueDate.getTime())) {
      return false;
    }

    return dueDate.getTime() < Date.now();
  }).length;

  topicSummary.textContent =
    `${items.length} topicos no total • ${openCount} abertos/em andamento • ` +
    `${criticalCount} criticos/alta prioridade • ${overdueCount} vencidos`;
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
      selectedTopicId = "";
      renderProjects();
      setJson(project.raw, `projeto ${project.name}`);
      await loadTopics(project);
    });

    projectList.appendChild(button);
  });
}

function renderTopics(items) {
  topicList.innerHTML = "";
  topicCount.textContent = String(items.length);
  updateTopicSummary(items);

  if (!items.length) {
    setListMessage(topicList, "Nenhum topico encontrado.");
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "table-wrap";

  const table = document.createElement("table");
  table.className = "topic-table";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  [
    "Codigo",
    "Topico",
    "Status",
    "Tipo",
    "Prioridade",
    "Etiquetas",
    "Responsavel",
    "Datas",
  ].forEach((label) => {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = label;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  const tbody = document.createElement("tbody");

  items.forEach((topic) => {
    const row = document.createElement("tr");
    row.className = "topic-row";
    row.classList.toggle("active", topic.id === selectedTopicId);
    row.tabIndex = 0;

    row.addEventListener("click", () => {
      selectedTopicId = topic.id;
      setJson(topic.raw, `topico ${topic.code}`);
      renderTopics(currentTopics);
    });

    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        row.click();
      }
    });

    const codeCell = document.createElement("td");
    const code = document.createElement("span");
    code.className = "mono";
    code.textContent = topic.code;
    codeCell.appendChild(code);

    const titleCell = document.createElement("td");
    titleCell.appendChild(createCellText(topic.title, truncateText(topic.description)));

    const statusCell = document.createElement("td");
    statusCell.appendChild(createPill(topic.status, "status"));

    const typeCell = document.createElement("td");
    typeCell.appendChild(createPill(topic.type, "type"));

    const priorityCell = document.createElement("td");
    priorityCell.appendChild(createPill(topic.priority, "priority"));

    const labelsCell = document.createElement("td");
    if (topic.labels.length) {
      const labelGroup = document.createElement("div");
      labelGroup.className = "label-group";
      topic.labels.forEach((label) => {
        const chip = document.createElement("span");
        chip.className = "label-chip";
        chip.textContent = label;
        labelGroup.appendChild(chip);
      });
      labelsCell.appendChild(labelGroup);
    } else {
      labelsCell.appendChild(createCellText("-", ""));
    }

    const ownerCell = document.createElement("td");
    ownerCell.appendChild(createCellText(topic.assignedTo, topic.meta));

    const datesCell = document.createElement("td");
    datesCell.appendChild(
      createCellText(
        `Venc.: ${formatDate(topic.dueDate)}`,
        `Atual.: ${formatDate(topic.updatedAt, { dateStyle: "short", timeStyle: "short" })}`
      )
    );

    row.append(codeCell, titleCell, statusCell, typeCell, priorityCell, labelsCell, ownerCell, datesCell);
    tbody.appendChild(row);
  });

  table.append(thead, tbody);
  wrapper.appendChild(table);
  topicList.appendChild(wrapper);
}

async function loadTopics(project) {
  if (!project?.id || !accessToken) {
    currentTopics = [];
    setListMessage(topicList, "Selecione um projeto valido.");
    topicCount.textContent = "0";
    topicSummary.textContent = "Nao ha dados para exibir.";
    return;
  }

  const requestId = ++topicRequestId;
  setStatus("Carregando topicos...");
  setListMessage(topicList, "Carregando...");
  topicCount.textContent = "...";
  topicSummary.textContent = "Organizando dados do projeto...";

  try {
    const payload = await fetchJson(
      `/api/projects/${encodeURIComponent(project.id)}/topics?location=${encodeURIComponent(project.location || "")}`,
      accessToken
    );

    if (requestId !== topicRequestId) {
      return;
    }

    currentTopics = normalizeTopics(payload);
    selectedTopicId = "";
    renderTopics(currentTopics);
    setJson(
      {
        projectId: project.id,
        bcfEndpoint: {
          version: "auto",
          url: `/api/projects/${project.id}/topics`,
        },
        topics: currentTopics,
        raw: payload,
      },
      `resultado do projeto ${project.name || project.id}`
    );
    setStatus(currentTopics.length ? "Topicos carregados." : "Nenhum topico encontrado.");
  } catch (error) {
    if (requestId !== topicRequestId) {
      return;
    }

    currentTopics = [];
    setListMessage(topicList, error.message);
    topicCount.textContent = "0";
    topicSummary.textContent = "Nao foi possivel montar a tabela deste projeto.";
    setJson(
      {
        projectId: project.id,
        projectRaw: project.raw,
        error: error.message,
      },
      `erro do projeto ${project.name || project.id}`
    );
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
      currentTopics = [];
      setListMessage(topicList, "Nenhum projeto encontrado.");
      topicCount.textContent = "0";
      topicSummary.textContent = "Nenhum projeto disponivel para consulta.";
      setJson("Sem dados.", "sem dados");
      setStatus("Nenhum projeto encontrado.");
      return;
    }

    setJson(initialProject.raw, `projeto ${initialProject.name}`);
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
          setJson(error.stack || error.message, "erro de carregamento");
        }
      }
    }
  });

  setJson("Sem dados.", "resultado atual");
  setJsonVisibility(false);
  await refreshData();
}

jsonToggleButton.addEventListener("click", () => {
  setJsonVisibility(jsonPanel.hidden);
});

refreshButton.addEventListener("click", async () => {
  refreshButton.disabled = true;

  try {
    await refreshData();
  } catch (error) {
    setStatus(error.message);
    setJson(error.stack || error.message, "erro de atualizacao");
  } finally {
    refreshButton.disabled = false;
  }
});

initialize().catch((error) => {
  setStatus(error.message);
  setJson(error.stack || error.message, "erro de inicializacao");
});
