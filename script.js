const statusMessage = document.getElementById("statusMessage");
const projectList = document.getElementById("projectList");
const rawOutput = document.getElementById("rawOutput");
const refreshButton = document.getElementById("refreshButton");
const showJsonButton = document.getElementById("showJsonButton");
const toggleTopicsButton = document.getElementById("toggleTopicsButton");
const exportTopicsButton = document.getElementById("exportTopicsButton");
const currentProjectName = document.getElementById("currentProjectName");
const currentProjectMeta = document.getElementById("currentProjectMeta");
const projectCount = document.getElementById("projectCount");
const topicCount = document.getElementById("topicCount");
const topicList = document.getElementById("topicList");
const connectionState = document.getElementById("connectionState");
const tokenState = document.getElementById("tokenState");
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
let assigneeDirectory = new Map();

const { prioritizeTopicHostsByProject, buildBcfTopicEndpointCandidates } = window.BcfEndpoints;
const COMPLETED_TOPIC_STATUS_KEYS = new Set(["resolved", "done", "closed"]);

function setStatus(message, type = "info") {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
}

function setConnectionState(state) {
  connectionState.textContent = state;
}

function setTokenState(state) {
  tokenState.textContent = state;
}

function setUserIdentity(profile) {
  userName.textContent = profile?.name || profile?.displayName || profile?.fullName || "Nao identificado";
  userEmail.textContent = profile?.email || profile?.mail || "Email nao disponivel";
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
  exportTopicsButton.disabled = selectedTopicsData.length === 0;
  toggleTopicsButton.textContent = "Exibir topicos";
  topicList.hidden = true;
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

function normalizeTopicAssignee(topic, directory = new Map()) {
  const normalizeAssigneeEntry = (item, forcedType = "") => {
    if (!item) {
      return [];
    }

    if (typeof item === "string" || typeof item === "number") {
      const value = String(item).trim();
      if (!value) {
        return [];
      }

      const resolvedValue = directory.get(value) || value;
      return [forcedType ? `${forcedType}: ${resolvedValue}` : resolvedValue];
    }

    if (Array.isArray(item)) {
      return item.flatMap((entry) => normalizeAssigneeEntry(entry, forcedType));
    }

    if (typeof item !== "object") {
      return [];
    }

    if (Array.isArray(item.users) || Array.isArray(item.groups)) {
      return [
        ...normalizeAssigneeEntry(item.users || [], "USER"),
        ...normalizeAssigneeEntry(item.groups || [], "GROUP"),
      ];
    }

    if (item.member) {
      return normalizeAssigneeEntry(item.member, forcedType);
    }

    const type = String(
      forcedType ||
        item.type ||
        item.assignee_type ||
        item.assigneeType ||
        item.memberType ||
        item.kind ||
        ""
    )
      .trim()
      .toUpperCase();
    const label =
      item.name ||
      item.display_name ||
      item.displayName ||
      item.email ||
      item.mail ||
      item.userName ||
      item.groupName ||
      item.title ||
      item.id ||
      item.uuid ||
      item.userId ||
      item.groupId ||
      "";
    const normalizedLabel = String(label).trim();
    const labelFromDirectory =
      directory.get(item.id) ||
      directory.get(item.uuid) ||
      directory.get(item.userId) ||
      directory.get(item.groupId) ||
      "";
    const resolvedLabel = labelFromDirectory || normalizedLabel;

    if (!resolvedLabel) {
      return [];
    }

    return [type ? `${type}: ${resolvedLabel}` : resolvedLabel];
  };

  const normalizedAssignees = [
    ...normalizeAssigneeEntry(topic.assigned_to),
    ...normalizeAssigneeEntry(topic.assignee),
    ...normalizeAssigneeEntry(topic.assignees),
  ].filter((value) => Boolean(value));

  return normalizedAssignees.length ? Array.from(new Set(normalizedAssignees)).join(", ") : "-";
}

function normalizeTopics(payload) {
  const items = Array.isArray(payload)
    ? payload
    : payload?.data || payload?.items || payload?.topics || payload?.results || [];

  return items.map((topic) => ({
    id: topic.topic_id || topic.id || topic.guid || "",
    code: topic.server_assigned_id || topic.topic_id || topic.id || topic.guid || "-",
    title: topic.title || topic.topic_title || topic.description || "Topico sem titulo",
    status: topic.topic_status || topic.status || "-",
    type: topic.topic_type || topic.type || "-",
    priority: topic.priority || "-",
    dueDate: topic.due_date || "",
    createdAt: topic.creation_date || "",
    labels: Array.isArray(topic.labels) ? topic.labels : [],
    assignee: normalizeTopicAssignee(topic, assigneeDirectory),
    owner: topic.assigned_to || topic.creation_author || "-",
    createdBy: topic.creation_author || "-",
    updatedAt: topic.modified_date || topic.creation_date || "",
    raw: topic,
  }));
}

function extractAssigneeDirectoryEntries(payload, directory = new Map()) {
  if (!payload) {
    return directory;
  }

  const queue = Array.isArray(payload) ? [...payload] : [payload];

  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== "object") {
      continue;
    }

    const candidateId = current.id || current.uuid || current.userId || current.groupId || null;
    const candidateName =
      current.name ||
      current.displayName ||
      current.display_name ||
      current.title ||
      current.email ||
      current.mail ||
      null;

    if (candidateId && candidateName) {
      directory.set(String(candidateId), String(candidateName));
    }

    Object.values(current).forEach((value) => {
      if (value && typeof value === "object") {
        queue.push(value);
      }
    });
  }

  return directory;
}

async function loadAssigneeDirectory(projectId) {
  if (!projectId || !accessToken) {
    assigneeDirectory = new Map();
    return;
  }

  const candidates = [
    `https://app.connect.trimble.com/tc/api/2.0/projects/${encodeURIComponent(projectId)}?fullyLoaded=true`,
    `https://app.connect.trimble.com/tc/api/2.0/projects/${encodeURIComponent(projectId)}/users`,
    `https://app.connect.trimble.com/tc/api/2.0/projects/${encodeURIComponent(projectId)}/groups`,
    `https://app.connect.trimble.com/tc/api/2.0/projects/${encodeURIComponent(projectId)}/members`,
  ];

  const directory = new Map();
  await Promise.all(
    candidates.map(async (url) => {
      try {
        const payload = await fetchJson(url, accessToken);
        extractAssigneeDirectoryEntries(payload, directory);
      } catch (_error) {
        // endpoint opcional: ignora se nao estiver disponivel
      }
    })
  );

  assigneeDirectory = directory;
}

function formatTopicDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function slugifyTopicValue(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getTopicStatusKey(value) {
  return slugifyTopicValue(value);
}

function getTopicDueDateOrder(value) {
  if (!value) {
    return Number.MAX_SAFE_INTEGER;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? Number.MAX_SAFE_INTEGER : date.getTime();
}

function sortTopicsByDueDate(items) {
  return [...items].sort((a, b) => {
    const dueDateDiff = getTopicDueDateOrder(a.dueDate) - getTopicDueDateOrder(b.dueDate);

    if (dueDateDiff !== 0) {
      return dueDateDiff;
    }

    return a.title.localeCompare(b.title, "pt-BR");
  });
}

function splitTopicsByCompletion(items) {
  const sortedTopics = sortTopicsByDueDate(items);

  return {
    activeTopics: sortedTopics.filter(
      (topic) => !COMPLETED_TOPIC_STATUS_KEYS.has(getTopicStatusKey(topic.status))
    ),
    completedTopics: sortedTopics.filter((topic) =>
      COMPLETED_TOPIC_STATUS_KEYS.has(getTopicStatusKey(topic.status))
    ),
  };
}

function escapeSpreadsheetXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function sanitizeWorksheetName(value) {
  return String(value)
    .replace(/[\\/*?:[\]]/g, "")
    .slice(0, 31);
}

function buildExcelWorksheetXml(name, items) {
  const columns = [
    "Codigo",
    "Titulo",
    "Status",
    "Tipo",
    "Prioridade",
    "Atribuido a",
    "Criado em",
    "Vencimento",
    "Etiquetas",
    "Responsavel",
  ];
  const rows = items.map((topic) => [
    topic.code,
    topic.title,
    topic.status,
    topic.type,
    topic.priority,
    topic.assignee,
    formatTopicDate(topic.createdAt),
    formatTopicDate(topic.dueDate),
    topic.labels.join(", "),
    topic.owner,
  ]);

  const headerXml = `<Row ss:StyleID="header">${columns
    .map((column) => `<Cell><Data ss:Type="String">${escapeSpreadsheetXml(column)}</Data></Cell>`)
    .join("")}</Row>`;
  const rowsXml = rows
    .map(
      (row) =>
        `<Row>${row
          .map((cell) => `<Cell><Data ss:Type="String">${escapeSpreadsheetXml(cell)}</Data></Cell>`)
          .join("")}</Row>`
    )
    .join("");

  return `<Worksheet ss:Name="${escapeSpreadsheetXml(sanitizeWorksheetName(name))}"><Table>${headerXml}${rowsXml}</Table></Worksheet>`;
}

function exportTopicsToExcel() {
  if (!selectedTopicsData.length) {
    setStatus("Nenhum topico carregado para exportar.", "error");
    return;
  }

  const { activeTopics, completedTopics } = splitTopicsByCompletion(selectedTopicsData);
  const workbookXml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="header">
   <Font ss:Bold="1"/>
   <Interior ss:Color="#EEF7FF" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 ${buildExcelWorksheetXml("Topicos em andamento", activeTopics)}
 ${buildExcelWorksheetXml("Topicos concluidos", completedTopics)}
</Workbook>`;
  const blob = new Blob([workbookXml], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const fileDate = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = `topicos-${selectedProjectId || "projeto"}-${fileDate}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  setStatus("Tabelas exportadas para Excel.");
}

function buildTopicsTable(title, items) {
  const section = document.createElement("section");
  section.className = "topic-table-section";

  const heading = document.createElement("h3");
  heading.className = "topic-table-heading";
  heading.textContent = `${title} (${items.length})`;
  section.appendChild(heading);

  if (!items.length) {
    const emptyState = document.createElement("p");
    emptyState.className = "empty-state";
    emptyState.textContent = "Nenhum topico nesta secao.";
    section.appendChild(emptyState);
    return section;
  }

  const tableWrapper = document.createElement("div");
  tableWrapper.className = "topic-table-wrapper";

  const table = document.createElement("table");
  table.className = "topic-table";
  table.setAttribute("aria-label", title);

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  [
    "Codigo",
    "Titulo",
    "Status",
    "Tipo",
    "Prioridade",
    "Atribuido a",
    "Criado em",
    "Vencimento",
    "Etiquetas",
    "Responsavel",
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

    const codeCell = document.createElement("td");
    codeCell.className = "topic-code";
    codeCell.textContent = topic.code;

    const titleCell = document.createElement("td");
    const titleBlock = document.createElement("div");
    titleBlock.className = "topic-title-cell";

    const titleText = document.createElement("strong");
    titleText.className = "topic-main-title";
    titleText.textContent = topic.title;

    const subtitleText = document.createElement("span");
    subtitleText.className = "topic-subtitle";
    subtitleText.textContent = `${topic.id} | Atualizado em ${formatTopicDate(topic.updatedAt)}`;

    titleBlock.append(titleText, subtitleText);
    titleCell.appendChild(titleBlock);

    const statusCell = document.createElement("td");
    const statusBadge = document.createElement("span");
    statusBadge.className = `topic-badge status-${slugifyTopicValue(topic.status)}`;
    statusBadge.textContent = topic.status;
    statusCell.appendChild(statusBadge);

    const typeCell = document.createElement("td");
    typeCell.textContent = topic.type;

    const priorityCell = document.createElement("td");
    const priorityBadge = document.createElement("span");
    priorityBadge.className = `topic-badge priority-${slugifyTopicValue(topic.priority)}`;
    priorityBadge.textContent = topic.priority;
    priorityCell.appendChild(priorityBadge);

    const assigneeCell = document.createElement("td");
    assigneeCell.textContent = topic.assignee;

    const createdAtCell = document.createElement("td");
    createdAtCell.textContent = formatTopicDate(topic.createdAt);

    const dueDateCell = document.createElement("td");
    dueDateCell.textContent = formatTopicDate(topic.dueDate);

    const labelsCell = document.createElement("td");
    if (topic.labels.length) {
      const labelsGroup = document.createElement("div");
      labelsGroup.className = "topic-labels";

      topic.labels.forEach((label) => {
        const pill = document.createElement("span");
        pill.className = "topic-label-pill";
        pill.textContent = label;
        labelsGroup.appendChild(pill);
      });

      labelsCell.appendChild(labelsGroup);
    } else {
      labelsCell.textContent = "-";
    }

    const ownerCell = document.createElement("td");
    ownerCell.textContent = topic.owner;

    row.append(
      codeCell,
      titleCell,
      statusCell,
      typeCell,
      priorityCell,
      assigneeCell,
      createdAtCell,
      dueDateCell,
      labelsCell,
      ownerCell
    );
    tbody.appendChild(row);
  });

  table.append(thead, tbody);
  tableWrapper.appendChild(table);
  section.appendChild(tableWrapper);

  return section;
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


function formatCount(value, singular, plural) {
  const count = Number(value) || 0;
  return `${count} ${count === 1 ? singular : plural}`;
}

function renderProjects() {
  projectList.innerHTML = "";
  projectCount.textContent = formatCount(projects.length, "projeto", "projetos");

  if (!projects.length) {
    projectList.innerHTML = '<p class="empty-state">Nenhum projeto encontrado.</p>';
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
  topicCount.textContent = formatCount(items.length, "topico", "topicos");
  setTopicsData(items);

  if (!items.length) {
    topicList.innerHTML = '<p class="empty-state">Nenhum topico encontrado.</p>';
    return;
  }

  const { activeTopics, completedTopics } = splitTopicsByCompletion(items);

  topicList.appendChild(buildTopicsTable("Topicos em andamento", activeTopics));
  topicList.appendChild(buildTopicsTable("Topicos concluidos", completedTopics));
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
    topicCount.textContent = formatCount(0, "topico", "topicos");
    return;
  }

  if (!accessToken) {
    setTokenState("Indisponivel");
    permissionState.textContent = "Nao concedido";
    setStatus("Token de acesso nao disponivel.", "error");
    setTopicsData([]);
    renderTopics([]);
    topicCount.textContent = formatCount(0, "topico", "topicos");
    return;
  }

  setStatus("Carregando topicos...");
  setTopicsData([]);
  topicList.innerHTML = '<p class="empty-state">Carregando topicos...</p>';

  try {
    await loadAssigneeDirectory(project.id);
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
    setTokenState("Pendente");
    setStatus("Aguardando permissao do usuario.");
    return;
  }

  if (result === "denied") {
    permissionState.textContent = "Negado";
    setTokenState("Negado");
    throw new Error("Permissao do token negada.");
  }

  accessToken = String(result);
  permissionState.textContent = "Concedido";
  setTokenState("Concedido");
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
    topicList.innerHTML = '<p class="empty-state">Nenhum projeto encontrado.</p>';
    setTopicsData([]);
    topicCount.textContent = formatCount(0, "topico", "topicos");
    setJson("Sem dados.");
    setStatus("Nenhum projeto encontrado.", "error");
  }
}

async function loadCurrentUserProfile() {
  if (!accessToken) {
    return;
  }

  try {
    const profile = await fetchJson("https://app.connect.trimble.com/tc/api/2.0/users/me", accessToken);
    setUserIdentity(profile);
  } catch (_error) {
    setUserIdentity(null);
    setStatus("Nao foi possivel carregar o perfil do usuario.", "error");
  }
}

async function initialize() {
  if (!window.TrimbleConnectWorkspace?.connect) {
    setConnectionState("Indisponivel");
    setTokenState("Indisponivel");
    permissionState.textContent = "Indisponivel";
    setStatus("Workspace API indisponivel.", "error");
    return;
  }

  setConnectionState("Conectando");
  setTokenState("Nao solicitado");
  permissionState.textContent = "Pendente";
  workspaceApi = await window.TrimbleConnectWorkspace.connect(window.parent, async (event, args) => {
    if (event === "extension.accessToken" && typeof args?.data === "string") {
      accessToken = args.data;
      permissionState.textContent = "Concedido";
      setTokenState("Concedido");
      setStatus("Token recebido por evento da extensao.", "success");
      await loadCurrentUserProfile();
      await loadProjects();
    }
  });
  setConnectionState("Conectado");

  await loadCurrentProject();
  await requestAccessToken();

  if (accessToken) {
    await loadCurrentUserProfile();
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
      await loadCurrentUserProfile();
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

exportTopicsButton.addEventListener("click", () => {
  exportTopicsToExcel();
});

initialize().catch((error) => {
  setStatus(error.message, "error");
  setJson(error.stack || error.message);
});
