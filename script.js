const STORAGE_KEY = "gorev-listesi.tasks.v2";
const LEGACY_STORAGE_KEYS = ["gorev-listesi.tasks.v1", "tasks"];
const VALID_PRIORITIES = ["low", "medium", "high"];
const PRIORITY_LABELS = { low: "Düşük", medium: "Orta", high: "Yüksek" };
const TAB_ID = createTaskId();

const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const taskDate = document.getElementById("taskDate");
const taskPriority = document.getElementById("taskPriority");
const taskList = document.getElementById("taskList");
const searchInput = document.getElementById("searchInput");
const remainingCount = document.getElementById("remainingCount");
const resultCount = document.getElementById("resultCount");
const totalCount = document.getElementById("totalCount");
const activeCount = document.getElementById("activeCount");
const completedCount = document.getElementById("completedCount");
const completionRate = document.getElementById("completionRate");
const progressBar = document.getElementById("progressBar");
const progressTrack = document.querySelector(".progress-track");
const progressMessage = document.getElementById("progressMessage");
const clearCompletedBtn = document.getElementById("clearCompletedBtn");
const filterAllBtn = document.getElementById("filterAll");
const filterActiveBtn = document.getElementById("filterActive");
const filterCompletedBtn = document.getElementById("filterCompleted");
const snackbar = document.getElementById("snackbar");
const editModal = document.getElementById("editModal");
const editModalClose = document.getElementById("editModalClose");
const editTaskForm = document.getElementById("editTaskForm");
const editTaskText = document.getElementById("editTaskText");
const editTaskDate = document.getElementById("editTaskDate");
const editTaskPriority = document.getElementById("editTaskPriority");
const editTaskCancel = document.getElementById("editTaskCancel");
const editModalSubtitle = document.getElementById("editModalSubtitle");
const editModalPanel = document.querySelector(".edit-modal-panel");
const installBtn = document.getElementById("installBtn");
const offlineBanner = document.getElementById("offlineBanner");
const updateBanner = document.getElementById("updateBanner");
const refreshAppBtn = document.getElementById("refreshAppBtn");
const launchScreen = document.getElementById("launchScreen");

const initialTaskState = loadTasks();
let tasks = initialTaskState.tasks;
let taskTombstones = initialTaskState.tombstones;
let currentFilter = "all";
let searchQuery = "";
let lastDeleted = null;
let undoTimeoutId = null;
let snackbarHideTimer = null;
let draggingId = null;
let editingTaskId = null;
let modalCloseTimer = null;
let focusBeforeModal = null;
let deferredInstallPrompt = null;
let serviceWorkerRegistration = null;
let storagePersistenceRequested = false;
let reloadingForUpdate = false;
let updateCheckTimer = null;
let lastMutationTimestamp = 0;

taskForm?.addEventListener("submit", handleAddTask);
searchInput?.addEventListener("input", () => {
  searchQuery = searchInput.value.trim().toLocaleLowerCase("tr-TR");
  renderTasks();
});
clearCompletedBtn?.addEventListener("click", clearCompletedTasks);
filterAllBtn?.addEventListener("click", () => setFilter("all"));
filterActiveBtn?.addEventListener("click", () => setFilter("active"));
filterCompletedBtn?.addEventListener("click", () => setFilter("completed"));
editModalClose?.addEventListener("click", closeEditModal);
editTaskCancel?.addEventListener("click", closeEditModal);
editTaskForm?.addEventListener("submit", submitEditForm);
editModal?.addEventListener("click", (event) => {
  if (event.target === editModal) closeEditModal();
});
document.addEventListener("keydown", handleGlobalKeydown);
installBtn?.addEventListener("click", installApp);
refreshAppBtn?.addEventListener("click", applyServiceWorkerUpdate);
window.addEventListener("online", updateConnectionStatus);
window.addEventListener("offline", updateConnectionStatus);
window.addEventListener("storage", syncTasksFromOtherTab);
window.addEventListener("beforeinstallprompt", handleInstallPrompt);
window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  updateInstallButton();
  showSnackbar("Görev Listesi cihazına yüklendi.");
});

function loadTasks() {
  try {
    const currentState = parseStoredState(localStorage.getItem(STORAGE_KEY));
    if (currentState) return currentState;

    const legacyValue = LEGACY_STORAGE_KEYS
      .map((key) => localStorage.getItem(key))
      .find(Boolean);
    const legacyState = parseStoredState(legacyValue);
    if (!legacyState) return createEmptyTaskState();

    localStorage.setItem(STORAGE_KEY, serializeTaskState(legacyState));
    return legacyState;
  } catch (error) {
    console.warn("Görev verileri okunamadı:", error);
    return createEmptyTaskState();
  }
}

function createEmptyTaskState() {
  return { tasks: [], tombstones: {} };
}

function parseStoredState(value) {
  if (!value) return null;

  const parsed = JSON.parse(value);
  if (Array.isArray(parsed)) {
    return { tasks: normalizeTaskList(parsed), tombstones: {} };
  }
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.tasks)) return null;

  return mergeTaskStates({
    tasks: normalizeTaskList(parsed.tasks),
    tombstones: normalizeTombstones(parsed.tombstones),
  });
}

function normalizeTaskList(taskList) {
  const tasksById = new Map();

  taskList.forEach((task, index) => {
    const normalized = normalizeTask(task, index);
    if (!normalized.text) return;

    const existing = tasksById.get(String(normalized.id));
    if (!existing || compareVersions(normalized, existing) > 0) {
      tasksById.set(String(normalized.id), normalized);
    }
  });

  return [...tasksById.values()].sort(compareTaskOrder);
}

function normalizeTombstones(tombstones) {
  if (!tombstones || Array.isArray(tombstones) || typeof tombstones !== "object") return {};

  return Object.entries(tombstones).reduce((normalized, [id, value]) => {
    const isTombstoneObject = value && typeof value === "object" && !Array.isArray(value);
    const updatedAt = Number(isTombstoneObject ? value.updatedAt : value);
    if (!Number.isFinite(updatedAt) || updatedAt <= 0) return normalized;

    normalized[String(id)] = {
      updatedAt: Math.floor(updatedAt),
      updatedBy: isTombstoneObject && typeof value.updatedBy === "string"
        ? value.updatedBy
        : "",
    };
    return normalized;
  }, {});
}

function normalizeTask(task = {}, index = 0) {
  const priority = VALID_PRIORITIES.includes(task.priority) ? task.priority : "medium";
  const rawDate = String(task.date ?? "");
  const id = ["string", "number"].includes(typeof task.id) && String(task.id).trim()
    ? task.id
    : createTaskId();
  const order = Number(task.order);
  const updatedAt = Number(task.updatedAt);
  return {
    id,
    text: String(task.text ?? "").trim().slice(0, 180),
    completed: Boolean(task.completed),
    date: /^\d{4}-\d{2}-\d{2}$/.test(rawDate) && parseLocalDate(rawDate) ? rawDate : "",
    priority,
    order: Number.isFinite(order) ? order : index,
    updatedAt: Number.isFinite(updatedAt) && updatedAt >= 0 ? Math.floor(updatedAt) : 0,
    updatedBy: typeof task.updatedBy === "string" ? task.updatedBy : "",
  };
}

function compareVersions(left, right) {
  const timestampDifference = Number(left.updatedAt || 0) - Number(right.updatedAt || 0);
  if (timestampDifference) return timestampDifference;
  return String(left.updatedBy || "").localeCompare(String(right.updatedBy || ""));
}

function compareTaskOrder(left, right) {
  const orderDifference = left.order - right.order;
  return orderDifference || String(left.id).localeCompare(String(right.id));
}

function mergeTaskStates(...states) {
  const tasksById = new Map();
  const tombstones = {};

  states.filter(Boolean).forEach((state) => {
    (state.tasks || []).forEach((task, index) => {
      const normalized = normalizeTask(task, index);
      if (!normalized.text) return;

      const existing = tasksById.get(String(normalized.id));
      if (!existing || compareVersions(normalized, existing) > 0) {
        tasksById.set(String(normalized.id), normalized);
      }
    });

    Object.entries(normalizeTombstones(state.tombstones)).forEach(([id, tombstone]) => {
      const existing = tombstones[id];
      if (!existing || compareVersions(tombstone, existing) > 0) tombstones[id] = tombstone;
    });
  });

  const mergedTasks = [...tasksById.values()]
    .filter((task) => {
      const tombstone = tombstones[String(task.id)];
      return !tombstone || compareVersions(task, tombstone) > 0;
    })
    .sort(compareTaskOrder);

  return { tasks: mergedTasks, tombstones };
}

function serializeTaskState(state) {
  return JSON.stringify({ version: 2, tasks: state.tasks, tombstones: state.tombstones });
}

function createMutationStamp() {
  lastMutationTimestamp = Math.max(Date.now(), lastMutationTimestamp + 1);
  return { updatedAt: lastMutationTimestamp, updatedBy: TAB_ID };
}

function updateTask(task, changes = {}) {
  return { ...task, ...changes, ...createMutationStamp() };
}

function getNextTaskOrder() {
  return tasks.reduce((highestOrder, task) => Math.max(highestOrder, task.order), -1) + 1;
}

function createTaskId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function handleAddTask(event) {
  event.preventDefault();
  const text = taskInput.value.trim();

  if (!text) {
    showSnackbar("Görev metni boş olamaz.");
    taskInput.focus();
    return;
  }

  tasks.push(normalizeTask({
    id: createTaskId(),
    text,
    date: taskDate?.value || "",
    priority: taskPriority?.value || "medium",
    order: getNextTaskOrder(),
    ...createMutationStamp(),
  }));

  saveAndRender();
  taskForm.reset();
  taskPriority.value = "medium";
  taskInput.focus();
  showSnackbar("Görev plana eklendi.");
}

function toggleTask(id) {
  tasks = tasks.map((task) => (
    String(task.id) === String(id) ? updateTask(task, { completed: !task.completed }) : task
  ));
  saveAndRender();
  focusTaskControl(id, ".task-check");
}

function deleteTask(id) {
  const index = tasks.findIndex((task) => String(task.id) === String(id));
  if (index === -1) return;

  lastDeleted = { task: tasks[index], index };
  taskTombstones = {
    ...taskTombstones,
    [String(tasks[index].id)]: createMutationStamp(),
  };
  tasks = tasks.filter((task) => String(task.id) !== String(id));
  saveAndRender();
  showSnackbar(`“${lastDeleted.task.text}” silindi.`, true);
}

function clearCompletedTasks() {
  const removed = tasks
    .map((task, index) => ({ task, index }))
    .filter(({ task }) => task.completed);

  if (!removed.length) {
    showSnackbar("Temizlenecek tamamlanmış görev yok.");
    return;
  }

  lastDeleted = { tasks: removed };
  const deletionStamp = createMutationStamp();
  taskTombstones = removed.reduce((tombstones, { task }) => {
    tombstones[String(task.id)] = deletionStamp;
    return tombstones;
  }, { ...taskTombstones });
  tasks = tasks.filter((task) => !task.completed);
  saveAndRender();
  showSnackbar(`${removed.length} tamamlanmış görev temizlendi.`, true);
}

function undoDelete() {
  if (!lastDeleted) return;

  if (lastDeleted.tasks) {
    tasks = [
      ...tasks,
      ...lastDeleted.tasks.map(({ task }) => updateTask(task)),
    ].sort(compareTaskOrder);
  } else {
    tasks = [...tasks, updateTask(lastDeleted.task)].sort(compareTaskOrder);
  }

  lastDeleted = null;
  clearTimeout(undoTimeoutId);
  saveAndRender();
  hideSnackbar();
}

function moveTask(id, direction) {
  const orderedTasks = [...tasks].sort(compareTaskOrder);
  const index = orderedTasks.findIndex((task) => String(task.id) === String(id));
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= orderedTasks.length) return;

  [orderedTasks[index], orderedTasks[nextIndex]] = [orderedTasks[nextIndex], orderedTasks[index]];
  updateTaskOrder(orderedTasks);
  saveAndRender();
  focusTaskControl(id, ".move-btn:not(:disabled)");
}

function updateTaskOrder(orderedTasks) {
  const mutationStamp = createMutationStamp();
  tasks = orderedTasks.map((task, index) => ({ ...task, order: index, ...mutationStamp }));
}

function findTaskElement(id) {
  return [...document.querySelectorAll(".task-item")]
    .find((element) => String(element.dataset.id) === String(id));
}

function focusTaskControl(id, selector) {
  const control = findTaskElement(id)?.querySelector(selector);
  if (control instanceof HTMLElement) control.focus();
  else taskInput?.focus();
}

function saveAndRender() {
  try {
    const storedState = parseStoredState(localStorage.getItem(STORAGE_KEY));
    const mergedState = mergeTaskStates(storedState, { tasks, tombstones: taskTombstones });
    tasks = mergedState.tasks;
    taskTombstones = mergedState.tombstones;
    localStorage.setItem(STORAGE_KEY, serializeTaskState(mergedState));
    requestPersistentStorage();
  } catch (error) {
    console.warn("Görevler kaydedilemedi:", error);
    showSnackbar("Değişiklik tarayıcıya kaydedilemedi.");
  }
  renderTasks();
}

function getVisibleTasks() {
  return tasks.filter((task) => {
    const matchesFilter = currentFilter === "all"
      || (currentFilter === "active" && !task.completed)
      || (currentFilter === "completed" && task.completed);
    const matchesSearch = !searchQuery
      || task.text.toLocaleLowerCase("tr-TR").includes(searchQuery);
    return matchesFilter && matchesSearch;
  });
}

function renderTasks() {
  if (!taskList) return;

  const visibleTasks = getVisibleTasks();
  const canReorder = currentFilter === "all" && !searchQuery;
  const taskIndexes = new Map(tasks.map((task, index) => [String(task.id), index]));
  const fragment = document.createDocumentFragment();

  if (!visibleTasks.length) {
    fragment.appendChild(createEmptyState());
  }

  visibleTasks.forEach((task) => {
    const index = taskIndexes.get(String(task.id));
    fragment.appendChild(createTaskElement(task, index, canReorder));
  });

  taskList.replaceChildren(fragment);
  updateDashboard(visibleTasks.length);
  updateFilterUI();
}

function createEmptyState() {
  const empty = document.createElement("li");
  empty.className = "empty";

  const mark = document.createElement("span");
  mark.className = "empty-mark";
  mark.setAttribute("aria-hidden", "true");
  mark.textContent = searchQuery ? "⌕" : "✓";

  const title = document.createElement("p");
  title.className = "empty-title";
  title.textContent = searchQuery
    ? "Aramana uygun görev bulunamadı"
    : currentFilter === "completed"
      ? "Henüz tamamlanan görev yok"
      : currentFilter === "active"
        ? "Tüm görevler tamamlandı"
        : "Planın yeni görevini bekliyor";

  const hint = document.createElement("p");
  hint.className = "empty-hint";
  hint.textContent = searchQuery
    ? "Farklı bir kelime deneyebilir veya aramayı temizleyebilirsin."
    : currentFilter === "all"
      ? "Yukarıdaki alandan küçük bir adım ekleyerek başla."
      : "Diğer görevleri görmek için filtreyi değiştirebilirsin.";

  empty.append(mark, title, hint);
  return empty;
}

function createTaskElement(task, index, canReorder) {
  const li = document.createElement("li");
  li.className = `task-item task-${task.priority}`;
  if (task.completed) li.classList.add("is-completed");
  li.dataset.id = task.id;
  li.draggable = canReorder;

  const dragHandle = document.createElement("span");
  dragHandle.className = "drag-handle";
  dragHandle.textContent = "⋮⋮";
  dragHandle.title = canReorder ? "Sürükleyerek sırala" : "Sıralama için Tümü filtresini aç";
  dragHandle.setAttribute("aria-hidden", "true");

  const checkButton = document.createElement("button");
  checkButton.type = "button";
  checkButton.className = "task-check";
  checkButton.setAttribute("aria-pressed", String(task.completed));
  checkButton.setAttribute("aria-label", task.completed ? "Görevi yeniden aktif yap" : "Görevi tamamla");
  checkButton.textContent = task.completed ? "✓" : "";
  checkButton.addEventListener("click", () => toggleTask(task.id));

  const taskMain = document.createElement("div");
  taskMain.className = "task-main";
  taskMain.addEventListener("dblclick", () => openEditModal(task));

  const taskText = document.createElement("p");
  taskText.className = "task-text";
  taskText.textContent = task.text;

  const meta = document.createElement("div");
  meta.className = "task-meta";

  const badge = document.createElement("span");
  badge.className = `badge priority-${task.priority}`;
  badge.textContent = PRIORITY_LABELS[task.priority];
  meta.appendChild(badge);

  if (task.date) {
    const dueInfo = task.completed
      ? { label: formatDate(task.date), className: "" }
      : getDueInfo(task.date);
    const due = document.createElement("time");
    due.className = `due ${dueInfo.className}`.trim();
    due.textContent = dueInfo.label;
    due.title = formatDate(task.date);
    due.dateTime = task.date;
    meta.appendChild(due);
  }

  taskMain.append(taskText, meta);

  const actions = document.createElement("div");
  actions.className = "task-actions";

  const reorderActions = document.createElement("div");
  reorderActions.className = "reorder-actions";
  reorderActions.hidden = !canReorder;
  reorderActions.append(
    createActionButton("↑", `“${task.text}” görevini yukarı taşı`, "move-btn", () => moveTask(task.id, -1), index === 0),
    createActionButton("↓", `“${task.text}” görevini aşağı taşı`, "move-btn", () => moveTask(task.id, 1), index === tasks.length - 1),
  );

  actions.append(
    reorderActions,
    createActionButton("Düzenle", `“${task.text}” görevini düzenle`, "edit-btn", () => openEditModal(task)),
    createActionButton("Sil", `“${task.text}” görevini sil`, "delete-btn", () => deleteTask(task.id)),
  );

  li.append(dragHandle, checkButton, taskMain, actions);

  if (canReorder) addDragEvents(li, task.id);
  return li;
}

function createActionButton(text, label, className, onClick, disabled = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = text;
  button.setAttribute("aria-label", label);
  button.disabled = disabled;
  button.addEventListener("click", onClick);
  return button;
}

function addDragEvents(element, taskId) {
  element.addEventListener("dragstart", (event) => {
    draggingId = taskId;
    element.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(taskId));
  });

  element.addEventListener("dragend", () => {
    draggingId = null;
    document.querySelectorAll(".task-item").forEach((item) => {
      item.classList.remove("dragging", "drag-over");
    });
  });

  element.addEventListener("dragover", (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    element.classList.add("drag-over");
  });

  element.addEventListener("dragleave", () => element.classList.remove("drag-over"));
  element.addEventListener("drop", (event) => {
    event.preventDefault();
    element.classList.remove("drag-over");
    const sourceId = draggingId || event.dataTransfer.getData("text/plain");
    const orderedTasks = [...tasks].sort(compareTaskOrder);
    const fromIndex = orderedTasks.findIndex((task) => String(task.id) === String(sourceId));
    const toIndex = orderedTasks.findIndex((task) => String(task.id) === String(taskId));
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;

    const [movedTask] = orderedTasks.splice(fromIndex, 1);
    orderedTasks.splice(toIndex, 0, movedTask);
    updateTaskOrder(orderedTasks);
    saveAndRender();
  });
}

function setFilter(filter) {
  currentFilter = filter;
  renderTasks();
}

function updateFilterUI() {
  const buttons = {
    all: filterAllBtn,
    active: filterActiveBtn,
    completed: filterCompletedBtn,
  };

  Object.entries(buttons).forEach(([filter, button]) => {
    const isActive = currentFilter === filter;
    button?.classList.toggle("active", isActive);
    button?.setAttribute("aria-pressed", String(isActive));
  });
}

function updateDashboard(visibleCount) {
  const remaining = tasks.filter((task) => !task.completed).length;
  const completed = tasks.length - remaining;
  const rate = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

  if (remainingCount) remainingCount.textContent = remaining;
  if (totalCount) totalCount.textContent = tasks.length;
  if (activeCount) activeCount.textContent = remaining;
  if (completedCount) completedCount.textContent = completed;
  if (completionRate) completionRate.textContent = `%${rate}`;
  if (progressBar) progressBar.style.width = `${rate}%`;
  if (progressTrack) progressTrack.setAttribute("aria-valuenow", String(rate));
  if (clearCompletedBtn) clearCompletedBtn.disabled = completed === 0;
  if (resultCount) {
    resultCount.textContent = searchQuery || currentFilter !== "all"
      ? `${visibleCount} görev gösteriliyor`
      : "";
  }

  if (progressMessage) {
    progressMessage.textContent = !tasks.length
      ? "İlk görevini ekleyerek başlayabilirsin."
      : rate === 100
        ? "Harika, planındaki her şey tamamlandı."
        : rate >= 60
          ? "İyi gidiyorsun, bitiş çizgisi yakın."
          : completed > 0
            ? "İvme kazandın. Sıradaki küçük adıma geç."
            : "Bir görevi tamamlamak ritmi başlatır.";
  }
}

function parseLocalDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  const isValid = !Number.isNaN(date.getTime())
    && date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day;
  return isValid ? date : null;
}

function formatDate(value) {
  const date = parseLocalDate(value);
  return date ? new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date) : value;
}

function getDueInfo(value) {
  const date = parseLocalDate(value);
  if (!date) return { label: value, className: "" };

  const today = new Date();
  const dueDay = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const todayDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const difference = Math.round((dueDay - todayDay) / 86400000);

  if (difference < 0) {
    return { label: `${Math.abs(difference)} gün gecikti`, className: "due-past" };
  }
  if (difference === 0) return { label: "Bugün", className: "due-today" };
  if (difference === 1) return { label: "Yarın", className: "due-soon" };
  return { label: formatDate(value), className: "" };
}

function openEditModal(task) {
  if (!editModal || !editTaskText || !editTaskDate || !editTaskPriority) return;
  clearTimeout(modalCloseTimer);

  const liveTask = tasks.find((item) => String(item.id) === String(task.id));
  if (!liveTask) return;

  focusBeforeModal = document.activeElement;
  editingTaskId = liveTask.id;
  editTaskText.value = liveTask.text;
  editTaskDate.value = liveTask.date;
  editTaskPriority.value = liveTask.priority;
  if (editModalSubtitle) editModalSubtitle.textContent = liveTask.completed ? "Tamamlanmış görev" : "Aktif görev";
  editModalPanel?.classList.remove("closing");
  editModal.hidden = false;

  requestAnimationFrame(() => {
    editModal.classList.add("show");
    editModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    editTaskText.focus();
    editTaskText.select();
  });
}

function closeEditModal() {
  if (!editModal || editModal.hidden) return;
  const taskIdToRestore = editingTaskId;
  editModalPanel?.classList.add("closing");
  editModal.classList.remove("show");
  editModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");

  modalCloseTimer = setTimeout(() => {
    editModal.hidden = true;
    editTaskForm?.reset();
    editModalPanel?.classList.remove("closing");
    editingTaskId = null;
    const currentEditButton = taskIdToRestore
      ? findTaskElement(taskIdToRestore)?.querySelector(".edit-btn")
      : null;
    if (currentEditButton instanceof HTMLElement) {
      currentEditButton.focus();
    } else if (focusBeforeModal instanceof HTMLElement && focusBeforeModal.isConnected) {
      focusBeforeModal.focus();
    } else {
      taskInput?.focus();
    }
  }, 200);
}

function submitEditForm(event) {
  event.preventDefault();
  const newText = editTaskText?.value.trim();
  if (!editingTaskId || !newText) {
    showSnackbar("Görev metni boş olamaz.");
    editTaskText?.focus();
    return;
  }

  tasks = tasks.map((task) => (
    String(task.id) === String(editingTaskId)
      ? updateTask(task, {
        text: newText,
        date: editTaskDate?.value || "",
        priority: editTaskPriority?.value || "medium",
      })
      : task
  ));

  saveAndRender();
  closeEditModal();
  showSnackbar("Görev güncellendi.");
}

function handleGlobalKeydown(event) {
  if (!editModal || editModal.hidden) return;

  if (event.key === "Escape") {
    closeEditModal();
    return;
  }

  if (event.key !== "Tab") return;
  const focusable = [...editModal.querySelectorAll(
    "button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])",
  )];
  if (!focusable.length) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function showSnackbar(message, withUndo = false) {
  if (!snackbar) return;
  clearTimeout(undoTimeoutId);
  clearTimeout(snackbarHideTimer);
  snackbar.replaceChildren();

  const text = document.createElement("span");
  text.textContent = message;
  snackbar.appendChild(text);

  if (withUndo) {
    const undoButton = document.createElement("button");
    undoButton.type = "button";
    undoButton.className = "snackbar-undo";
    undoButton.textContent = "Geri Al";
    undoButton.addEventListener("click", undoDelete);
    snackbar.appendChild(undoButton);
  }

  snackbar.hidden = false;
  snackbar.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => snackbar.classList.add("show"));
  undoTimeoutId = setTimeout(() => {
    lastDeleted = null;
    hideSnackbar();
  }, 5000);
}

function hideSnackbar() {
  if (!snackbar) return;
  snackbar.classList.remove("show");
  snackbar.setAttribute("aria-hidden", "true");
  clearTimeout(snackbarHideTimer);
  snackbarHideTimer = setTimeout(() => {
    snackbar.hidden = true;
    snackbar.replaceChildren();
  }, 200);
}

function updateConnectionStatus() {
  if (!offlineBanner) return;
  offlineBanner.hidden = navigator.onLine;
}

function syncTasksFromOtherTab(event) {
  if (event.storageArea !== localStorage) return;
  if (event.key !== STORAGE_KEY && event.key !== null) return;

  if (!event.newValue) {
    tasks = [];
    taskTombstones = {};
    if (editingTaskId) closeEditModal();
    renderTasks();
    showSnackbar("Başka sekmedeki görev verileri temizlendi.");
    return;
  }

  try {
    const incomingState = parseStoredState(event.newValue);
    if (!incomingState) return;

    const mergedState = mergeTaskStates(
      { tasks, tombstones: taskTombstones },
      incomingState,
    );
    const incomingSerialized = serializeTaskState(incomingState);
    const mergedSerialized = serializeTaskState(mergedState);

    tasks = mergedState.tasks;
    taskTombstones = mergedState.tombstones;
    if (mergedSerialized !== incomingSerialized) localStorage.setItem(STORAGE_KEY, mergedSerialized);
  } catch (error) {
    console.warn("Başka sekmedeki görevler eşitlenemedi:", error);
    return;
  }

  if (editingTaskId) closeEditModal();
  renderTasks();
  showSnackbar("Başka sekmedeki değişiklikler eşitlendi.");
}

async function requestPersistentStorage() {
  if (storagePersistenceRequested || !navigator.storage?.persist) return;
  storagePersistenceRequested = true;

  try {
    const isPersistent = await navigator.storage.persisted?.();
    if (!isPersistent) await navigator.storage.persist();
  } catch (error) {
    console.warn("Kalıcı depolama isteği tamamlanamadı:", error);
  }
}

function handleInstallPrompt(event) {
  event.preventDefault();
  deferredInstallPrompt = event;
  updateInstallButton();
}

async function installApp() {
  if (!deferredInstallPrompt) {
    if (isIosDevice()) {
      showSnackbar("Paylaş düğmesine, ardından Ana Ekrana Ekle'ye dokun.");
    }
    return;
  }

  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  updateInstallButton();
}

function isIosDevice() {
  return /iPad|iPhone|iPod/i.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches || Boolean(navigator.standalone);
}

function updateInstallButton() {
  if (!installBtn) return;
  const showIosHint = isIosDevice() && !isStandaloneMode() && !deferredInstallPrompt;
  installBtn.hidden = !deferredInstallPrompt && !showIosHint;
  installBtn.textContent = showIosHint ? "Ana Ekrana Ekle" : "Uygulamayı Yükle";
}

function showStandaloneLaunchScreen() {
  if (!isStandaloneMode() || !launchScreen) return;

  launchScreen.hidden = false;
  requestAnimationFrame(() => launchScreen.classList.add("show"));
  setTimeout(() => {
    launchScreen.classList.remove("show");
    setTimeout(() => { launchScreen.hidden = true; }, 280);
  }, 700);
}

function watchForServiceWorkerUpdates(registration) {
  serviceWorkerRegistration = registration;

  showUpdateBannerIfReady();

  registration.addEventListener("updatefound", () => {
    const installingWorker = registration.installing;
    if (!installingWorker) return;

    installingWorker.addEventListener("statechange", () => {
      if (installingWorker.state === "installed" && navigator.serviceWorker.controller && updateBanner) {
        updateBanner.hidden = false;
      }
    });
  });

  checkForAppUpdate();
  clearInterval(updateCheckTimer);
  updateCheckTimer = setInterval(checkForAppUpdate, 15 * 60 * 1000);
}

function showUpdateBannerIfReady() {
  if (serviceWorkerRegistration?.waiting && navigator.serviceWorker.controller && updateBanner) {
    updateBanner.hidden = false;
  }
}

async function checkForAppUpdate() {
  if (!serviceWorkerRegistration || !navigator.onLine) return;

  try {
    await serviceWorkerRegistration.update();
    showUpdateBannerIfReady();
  } catch (error) {
    console.warn("Uygulama güncellemesi kontrol edilemedi:", error);
  }
}

function applyServiceWorkerUpdate() {
  const waitingWorker = serviceWorkerRegistration?.waiting;
  if (!waitingWorker) return;
  waitingWorker.postMessage({ type: "SKIP_WAITING" });
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloadingForUpdate) return;
    reloadingForUpdate = true;
    window.location.reload();
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js", { updateViaCache: "none" })
      .then(watchForServiceWorkerUpdates)
      .catch((error) => {
        console.warn("Service worker kaydı başarısız:", error);
      });
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") checkForAppUpdate();
  });

  window.addEventListener("online", checkForAppUpdate);
}

renderTasks();
updateConnectionStatus();
updateInstallButton();
showStandaloneLaunchScreen();
