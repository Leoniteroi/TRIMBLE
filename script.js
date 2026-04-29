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
let activeProjectButton = null;
let topicsLoadRequestId = 0;
const frontendState = {
  connection: connectionState.textContent || "Aguardando",
  token: tokenState.textContent || "Nao solicitado",
  permission: permissionState.textContent || "Pendente",
  userName: userName.textContent || "Nao identificado",
  userEmail: userEmail.textContent || "Aguardando permissao do token",
  projectName: currentProjectName.textContent || "Nenhum projeto carregado",
  projectMeta: currentProjectMeta.textContent || "Abra a extensao a partir de um projeto no Trimble Connect.",
};

const { prioritizeTopicHostsByProject, buildBcfTopicEndpointCandidates } = window.BcfEndpoints;
const COMPLETED_TOPIC_STATUS_KEYS = new Set(["resolved", "done", "closed"]);
const TOPIC_TABLE_COLUMNS = [
  { key: "code", label: "Codigo" },
  { key: "title", label: "Titulo" },
  { key: "status", label: "Status" },
  { key: "type", label: "Tipo" },
  { key: "priority", label: "Prioridade" },
  { key: "assignee", label: "Atribuido a" },
  { key: "createdAt", label: "Criado em" },
  { key: "dueDate", label: "Vencimento" },
  { key: "labels", label: "Etiquetas" },
  { key: "owner", label: "Responsavel" },
];
const TOPIC_DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const assigneeDirectoryCache = new Map();

function getStatusKey(state) {
  return String(state || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
}

function setVisualState(element, state) {
  const chip = element.closest(".status-chip");
  const statusKey = getStatusKey(state);

  element.textContent = state;

  if (!chip) {
    return;
  }

  chip.className = "status-chip";
  chip.classList.add(`status-chip-${statusKey}`);
  chip.dataset.state = statusKey;
  chip.setAttribute("aria-label", `${chip.querySelector(".status-label")?.textContent || "Status"}: ${state}`);
}

function renderFrontendState() {
  setVisualState(connectionState, frontendState.connection);
  setVisualState(tokenState, frontendState.token);
  permissionState.textContent = frontendState.permission;
  userName.textContent = frontendState.userName;
  userEmail.textContent = frontendState.userEmail;
  currentProjectName.textContent = frontendState.projectName;
  currentProjectMeta.textContent = frontendState.projectMeta;
}

function setStatus(message, type = "info") {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
}

function setConnectionState(state) {
  frontendState.connection = state;
  renderFrontendState();
}

function setTokenState(state) {
  frontendState.token = state;
  renderFrontendState();
}

function setPermissionState(state) {
  frontendState.permission = state;
  renderFrontendState();
}

function setCurrentProjectState(name, meta) {
  frontendState.projectName = name || "Nenhum projeto carregado";
  frontendState.projectMeta = meta || "Abra a extensao a partir de um projeto no Trimble Connect.";
  renderFrontendState();
}

function formatProjectMeta(project) {
  const metadata = [
    project?.number ? `Numero: ${project.number}` : "",
    project?.id ? `ID: ${project.id}` : "",
    project?.location ? `Regiao: ${project.location}` : "",
  ].filter(Boolean);

  return metadata.length ? metadata.join(" | ") : "Metadados do projeto indisponiveis";
}

function setActiveProjectState(project) {
  if (!project) {
    currentProjectId = "";
    setCurrentProjectState("Nenhum projeto selecionado", "Selecione um projeto para carregar os dados.");
    return;
  }

  currentProjectId = project.id || "";
  setCurrentProjectState(project.name || "Projeto sem nome", formatProjectMeta(project));
}

function extractAccessToken(value) {
  if (typeof value === "string") {
    return value;
  }

  if (!value || typeof value !== "object") {
    return "";
  }

  if (value.data && typeof value.data !== "object") {
    return value.data;
  }

  return (
    value.accessToken ||
    value.access_token ||
    value.token ||
    value.bearerToken ||
    value.data?.accessToken ||
    value.data?.access_token ||
    value.data?.token ||
    ""
  );
}

function setAccessToken(token) {
  const nextToken = String(extractAccessToken(token) || "");

  if (nextToken !== accessToken) {
    assigneeDirectoryCache.clear();
  }

  accessToken = nextToken;

  if (accessToken) {
    frontendState.token = "Concedido";
    frontendState.permission = "Concedido";
    renderFrontendState();
  }
}

function syncRuntimeFrontendState() {
  if (workspaceApi) {
    frontendState.connection = "Conectado";
  }

  if (accessToken) {
    frontendState.token = "Concedido";
    frontendState.permission = "Concedido";

    if (frontendState.userName === "Nao identificado") {
      frontendState.userName = "Perfil em carregamento";
    }

    if (frontendState.userEmail === "Aguardando permissao do token") {
      frontendState.userEmail = "Token concedido; carregando dados do usuario";
    }
  }

  renderFrontendState();
}

function setUserIdentity(profile) {
  const name = profile?.name || profile?.displayName || profile?.fullName || "";
  const email = profile?.email || profile?.mail || "";

  frontendState.userName = name || (accessToken ? "Perfil indisponivel" : "Nao identificado");
  frontendState.userEmail = email || (accessToken ? "Token concedido; dados do usuario nao retornados" : "Aguardando permissao do token");
  renderFrontendState();
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

function normalizeTopicTextValue(value, fallback = "-") {
  if (value == null || value === "") {
    return fallback;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    const normalizedValue = String(value).trim();
    return normalizedValue || fallback;
  }

  if (Array.isArray(value)) {
    const normalizedItems = value
      .map((item) => normalizeTopicTextValue(item, ""))
      .filter(Boolean);
    return normalizedItems.length ? Array.from(new Set(normalizedItems)).join(", ") : fallback;
  }

  if (typeof value === "object") {
    return normalizeTopicTextValue(
      value.name ||
        value.display_name ||
        value.displayName ||
        value.title ||
        value.label ||
        value.value ||
        value.email ||
        value.mail ||
        value.id ||
        value.uuid,
      fallback
    );
  }

  return fallback;
}

function normalizeTopicLabels(topic) {
  const labels = topic.labels || topic.label || topic.tags || topic.tag || [];
  const normalizedLabels = Array.isArray(labels)
    ? labels.map((label) => normalizeTopicTextValue(label, "")).filter(Boolean)
    : String(labels)
        .split(",")
        .map((label) => label.trim())
        .filter(Boolean);

  return Array.from(new Set(normalizedLabels));
}

function normalizeTopics(payload) {
  const items = Array.isArray(payload)
    ? payload
    : payload?.data || payload?.items || payload?.topics || payload?.results || [];

  return items.map((topic) => {
    const assignee = normalizeTopicAssignee(topic, assigneeDirectory);
    const createdBy = normalizeTopicTextValue(
      topic.creation_author || topic.created_by || topic.createdBy || topic.author,
      "-"
    );

    return {
      id: normalizeTopicTextValue(topic.topic_id || topic.id || topic.guid, ""),
      code: normalizeTopicTextValue(
        topic.server_assigned_id || topic.topic_id || topic.id || topic.guid,
        "-"
      ),
      title: normalizeTopicTextValue(topic.title || topic.topic_title || topic.description, "Topico sem titulo"),
      status: normalizeTopicTextValue(topic.topic_status || topic.status, "-"),
      type: normalizeTopicTextValue(topic.topic_type || topic.type, "-"),
      priority: normalizeTopicTextValue(topic.priority, "-"),
      dueDate: topic.due_date || topic.dueDate || topic.due_at || "",
      createdAt: topic.creation_date || topic.created_at || topic.createdAt || topic.create_date || "",
      labels: normalizeTopicLabels(topic),
      assignee,
      owner: normalizeTopicTextValue(topic.owner || topic.responsible || topic.responsavel, createdBy),
      createdBy,
      updatedAt:
        topic.modified_date ||
        topic.modified_at ||
        topic.updated_at ||
        topic.updatedAt ||
        topic.creation_date ||
        "",
      raw: topic,
    };
  });
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

  if (assigneeDirectoryCache.has(projectId)) {
    assigneeDirectory = assigneeDirectoryCache.get(projectId);
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
  assigneeDirectoryCache.set(projectId, directory);
}

function formatTopicDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return TOPIC_DATE_FORMATTER.format(date);
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
  const activeTopics = [];
  const completedTopics = [];

  sortedTopics.forEach((topic) => {
    const target = COMPLETED_TOPIC_STATUS_KEYS.has(getTopicStatusKey(topic.status))
      ? completedTopics
      : activeTopics;
    target.push(topic);
  });

  return { activeTopics, completedTopics };
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

function formatTopicCellValue(topic, key) {
  if (key === "createdAt" || key === "dueDate") {
    return formatTopicDate(topic[key]);
  }

  if (key === "labels") {
    return topic.labels.length ? topic.labels.join(", ") : "-";
  }

  return topic[key] || "-";
}

function buildExcelWorksheetXml(name, items) {
  const rows = items.map((topic) =>
    TOPIC_TABLE_COLUMNS.map(({ key }) => formatTopicCellValue(topic, key))
  );

  const headerXml = `<Row ss:StyleID="header">${TOPIC_TABLE_COLUMNS
    .map(({ label }) => `<Cell><Data ss:Type="String">${escapeSpreadsheetXml(label)}</Data></Cell>`)
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
  const sectionFragment = document.createDocumentFragment();

  const heading = document.createElement("h3");
  heading.className = "topic-table-heading";
  heading.textContent = `${title} (${items.length})`;
  sectionFragment.appendChild(heading);

  if (!items.length) {
    const emptyState = document.createElement("p");
    emptyState.className = "empty-state";
    emptyState.textContent = "Nenhum topico nesta secao.";
    sectionFragment.appendChild(emptyState);
    section.appendChild(sectionFragment);
    return section;
  }

  const tableWrapper = document.createElement("div");
  tableWrapper.className = "topic-table-wrapper";

  const table = document.createElement("table");
  table.className = "topic-table";
  table.setAttribute("aria-label", title);

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  TOPIC_TABLE_COLUMNS.forEach(({ label }) => {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = label;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  const tbody = document.createElement("tbody");
  const rowsFragment = document.createDocumentFragment();

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
    subtitleText.textContent = `${topic.id} | Criado em ${formatTopicDate(topic.createdAt)} | Atualizado em ${formatTopicDate(topic.updatedAt)}`;

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
    createdAtCell.className = "topic-date";
    createdAtCell.textContent = formatTopicDate(topic.createdAt);

    const dueDateCell = document.createElement("td");
    dueDateCell.className = "topic-date";
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
    rowsFragment.appendChild(row);
  });

  tbody.appendChild(rowsFragment);
  table.append(thead, tbody);
  tableWrapper.appendChild(table);
  sectionFragment.appendChild(tableWrapper);
  section.appendChild(sectionFragment);

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
  activeProjectButton = null;

  if (!projects.length) {
    projectList.innerHTML = '<p class="empty-state">Nenhum projeto encontrado.</p>';
    return;
  }

  if (!projects.some((project) => project.id === selectedProjectId)) {
    selectedProjectId = projects[0].id;
  }

  const fragment = document.createDocumentFragment();

  projects.forEach((project, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "project-item";

    if (project.id === selectedProjectId || (!selectedProjectId && index === 0)) {
      button.classList.add("active");
      activeProjectButton = button;
    }

    const title = document.createElement("span");
    title.className = "project-title";
    title.textContent = project.name;

    button.append(title);
    button.addEventListener("click", async () => {
      selectedProjectId = project.id;
      activeProjectButton?.classList.remove("active");
      button.classList.add("active");
      activeProjectButton = button;
      setActiveProjectState(project);
      setJson(project.raw);
      await loadTopics(project);
    });

    fragment.appendChild(button);
  });

  projectList.appendChild(fragment);
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
  const fragment = document.createDocumentFragment();

  fragment.appendChild(buildTopicsTable("Topicos em andamento", activeTopics));
  fragment.appendChild(buildTopicsTable("Topicos concluidos", completedTopics));
  topicList.appendChild(fragment);
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
  const requestId = ++topicsLoadRequestId;

  if (!project?.id) {
    setStatus("Projeto selecionado invalido.", "error");
    setTopicsData([]);
    renderTopics([]);
    topicCount.textContent = formatCount(0, "topico", "topicos");
    return;
  }

  setActiveProjectState(project);

  if (!accessToken) {
    setTokenState("Nao concedido");
    setPermissionState("Nao concedido");
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

    if (requestId !== topicsLoadRequestId) {
      return;
    }

    syncRuntimeFrontendState();
    renderTopics(topics);
    setJson({
      projectId: project.id,
      bcfEndpoint: topicsResponse.endpoint,
      topics,
      raw: topicsResponse.payload,
    });
    setStatus("Topicos carregados. Clique em Exibir topicos para ver a listagem.");
  } catch (error) {
    if (requestId !== topicsLoadRequestId) {
      return;
    }

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
      currentProjectId = "";
      setCurrentProjectState("Projeto nao encontrado", "Abra a extensao dentro de um projeto.");
      return;
    }

    currentProjectId = project.id || project.projectId || "";
    setCurrentProjectState(
      project.name || project.projectName || "Projeto atual",
      [project.id, project.number].filter(Boolean).join(" | ")
    );
  } catch (error) {
    currentProjectId = "";
    setCurrentProjectState("Falha ao ler o projeto atual", error.message);
    setStatus("Nao foi possivel obter o projeto atual.", "error");
  }
}

async function requestAccessToken() {
  if (!workspaceApi?.extension?.requestPermission) {
    throw new Error("Workspace API de extensao nao disponivel.");
  }

  const result = await workspaceApi.extension.requestPermission("accesstoken");

  if (result === "pending") {
    setPermissionState("Pendente");
    setTokenState("Pendente");
    setStatus("Aguardando permissao do usuario.");
    return;
  }

  if (result === "denied") {
    setPermissionState("Negado");
    setTokenState("Negado");
    throw new Error("Permissao do token negada.");
  }

  setAccessToken(result);
  setPermissionState("Concedido");
  setTokenState("Concedido");
  setStatus("Token recebido.");
}

async function loadProjects() {
  if (!accessToken) {
    throw new Error("Token de acesso nao disponivel.");
  }

  syncRuntimeFrontendState();
  setStatus("Carregando projetos...");

  const payload = await fetchJson(
    "https://app.connect.trimble.com/tc/api/2.0/projects?fullyLoaded=false",
    accessToken
  );

  projects = normalizeProjects(payload);
  syncRuntimeFrontendState();
  renderProjects();

  const selectedProject = projects.find((project) => project.id === selectedProjectId) || projects[0];

  if (selectedProject) {
    selectedProjectId = selectedProject.id;
    setActiveProjectState(selectedProject);
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

  syncRuntimeFrontendState();

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
    setPermissionState("Indisponivel");
    setStatus("Workspace API indisponivel.", "error");
    return;
  }

  setConnectionState("Conectando");
  setTokenState("Nao solicitado");
  setPermissionState("Pendente");
  workspaceApi = await window.TrimbleConnectWorkspace.connect(window.parent, async (event, args) => {
    if (event === "extension.accessToken") {
      setAccessToken(args?.data || args);
      setPermissionState("Concedido");
      setTokenState("Concedido");
      syncRuntimeFrontendState();
      setStatus("Token recebido por evento da extensao.", "success");
      await loadCurrentUserProfile();
      await loadProjects();
    }
  });
  setConnectionState("Conectado");
  syncRuntimeFrontendState();

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

renderFrontendState();

initialize().catch((error) => {
  if (!workspaceApi) {
    setConnectionState("Indisponivel");
  }

  if (["Nao solicitado", "Pendente"].includes(frontendState.token)) {
    setTokenState("Indisponivel");
  }

  setStatus(error.message, "error");
  setJson(error.stack || error.message);
});
