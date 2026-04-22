const taskDate = document.getElementById("taskDate");
const taskPriority = document.getElementById("taskPriority");
const addBtn = document.getElementById("addBtn");
const taskList = document.getElementById("taskList");
const remainingCount = document.getElementById("remainingCount");
const clearCompletedBtn = document.getElementById("clearCompletedBtn");
const filterAllBtn = document.getElementById("filterAll");
const filterActiveBtn = document.getElementById("filterActive");
const filterCompletedBtn = document.getElementById("filterCompleted");
const snackbar = document.getElementById("snackbar");
const taskInput = document.getElementById("taskInput");

let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
function normalizeTask(t) {
  return {
    id: t.id ?? Date.now(),
    text: t.text ?? "",
    completed: !!t.completed,
    date: t.date ?? "",
    priority: t.priority ?? "medium",
  };
}
tasks = tasks.map(normalizeTask);
let currentFilter = "all";
let lastDeleted = null; // { task, index } or { tasks: [...] }
let undoTimeoutId = null;
let draggingId = null;

addBtn?.addEventListener("click", handleAddTask);
taskInput?.addEventListener("keydown", function (e) {
  if (e.key === "Enter") handleAddTask();
});

clearCompletedBtn?.addEventListener("click", clearCompletedTasks);
filterAllBtn?.addEventListener("click", () => setFilter("all"));
filterActiveBtn?.addEventListener("click", () => setFilter("active"));
filterCompletedBtn?.addEventListener("click", () => setFilter("completed"));
// export/import/share and saved-filters removed for a simpler UI

function handleAddTask() {
  const taskText = taskInput.value.trim();
  const date = taskDate?.value || "";
  const priority = taskPriority?.value || "medium";

  if (taskText === "") {
    alert("Lütfen bir görev giriniz.");
    return;
  }

  const task = { id: Date.now(), text: taskText, completed: false, date, priority };
  tasks.push(task);
  saveAndRender();

  taskInput.value = "";
  if (taskDate) taskDate.value = "";
  if (taskPriority) taskPriority.value = "medium";
  taskInput.focus();
}

function toggleTask(id) {
  tasks = tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
  saveAndRender();
}

function deleteTask(id) {
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) return;
  lastDeleted = { task: tasks[idx], index: idx };
  tasks.splice(idx, 1);
  saveAndRender();
  showSnackbar(`"${lastDeleted.task.text}" silindi.`, true);
}

function clearCompletedTasks() {
  const removed = tasks.filter((t) => t.completed);
  if (removed.length === 0) {
    alert("Silinecek tamamlanmış görev yok.");
    return;
  }
  lastDeleted = { tasks: removed };
  tasks = tasks.filter((t) => !t.completed);
  saveAndRender();
  showSnackbar(`${removed.length} tamamlanan görev temizlendi.`, true);
}

function undoDelete() {
  if (!lastDeleted) return;
  if (lastDeleted.tasks) {
    // restore removed completed tasks at end
    tasks = tasks.concat(lastDeleted.tasks);
  } else {
    tasks.splice(lastDeleted.index, 0, lastDeleted.task);
  }
  lastDeleted = null;
  clearTimeout(undoTimeoutId);
  saveAndRender();
  hideSnackbar();
}

function saveAndRender() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
  renderTasks();
}

function renderTasks() {
  taskList.innerHTML = "";

  const visible = tasks.filter((t) => {
    if (currentFilter === "active" && t.completed) return false;
    if (currentFilter === "completed" && !t.completed) return false;
    return true;
  });

  if (visible.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "Hiç görev yok. Yeni görev ekleyin.";
    taskList.appendChild(empty);
  }

  visible.forEach((task) => {
    const li = document.createElement("li");
    li.className = "task-item";
    li.dataset.id = task.id;
    li.draggable = true;

    const span = document.createElement("span");
    span.textContent = task.text;
    span.className = task.completed ? "task-text completed" : "task-text";
    span.addEventListener("click", () => toggleTask(task.id));
    span.addEventListener("dblclick", () => startEditing(span, task));

      const meta = document.createElement("div");
      meta.className = "task-meta";

      if (task.date) {
        const due = document.createElement("span");
        due.className = "due";
        due.textContent = formatDate(task.date);
        if (isPastDate(task.date) && !task.completed) due.classList.add("due-past");
        meta.appendChild(due);
      }

      const badge = document.createElement("span");
      badge.className = `badge priority-${task.priority}`;
      badge.textContent = task.priority === "high" ? "Yüksek" : task.priority === "medium" ? "Orta" : "Düşük";
      meta.appendChild(badge);

      // tags removed for simpler UI

      const textWrap = document.createElement("div");
      textWrap.className = "task-main";
      textWrap.appendChild(span);
      textWrap.appendChild(meta);

    const buttonContainer = document.createElement("div");
    buttonContainer.classList.add("task-buttons");

    const completeBtn = document.createElement("button");
    completeBtn.textContent = task.completed ? "Geri Al" : "Tamamlandı";
    completeBtn.addEventListener("click", () => toggleTask(task.id));

    const editBtn = document.createElement("button");
    editBtn.textContent = "Düzenle";
    editBtn.addEventListener("click", () => editTaskDetails(task));

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Sil";
    deleteBtn.addEventListener("click", () => deleteTask(task.id));

    buttonContainer.appendChild(completeBtn);
    buttonContainer.appendChild(editBtn);
    buttonContainer.appendChild(deleteBtn);

    li.appendChild(textWrap);
    li.appendChild(buttonContainer);

    // drag events
    li.addEventListener("dragstart", (e) => {
      draggingId = task.id;
      li.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      try { e.dataTransfer.setData("text/plain", String(task.id)); } catch (err) {}
    });
    li.addEventListener("dragend", () => {
      draggingId = null;
      li.classList.remove("dragging");
      document.querySelectorAll(".task-item").forEach((el) => el.classList.remove("drag-over"));
    });

    li.addEventListener("dragover", (e) => {
      e.preventDefault();
      li.classList.add("drag-over");
    });
    li.addEventListener("dragleave", () => li.classList.remove("drag-over"));

    li.addEventListener("drop", (e) => {
      e.preventDefault();
      li.classList.remove("drag-over");
      const draggedId = draggingId || (e.dataTransfer && e.dataTransfer.getData("text/plain"));
      if (!draggedId) return;
      const fromIndex = tasks.findIndex((t) => String(t.id) === String(draggedId));
      const toIndex = tasks.findIndex((t) => String(t.id) === String(task.id));
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;
      const [moved] = tasks.splice(fromIndex, 1);
      tasks.splice(toIndex, 0, moved);
      saveAndRender();
    });

    taskList.appendChild(li);
  });

  updateFilterUI();
  updateRemainingCount();
}

function editTaskDetails(task) {
  const newText = prompt("Görev metni:", task.text);
  if (newText === null) return;
  const newDate = prompt("Son tarih (YYYY-MM-DD):", task.date || "");
  if (newDate === null) return;
  task.text = newText.trim();
  task.date = newDate ? String(newDate).trim() : "";
  tasks = tasks.map((t)=> t.id===task.id ? normalizeTask(task) : t);
  saveAndRender();
}

function startEditing(span, task) {
  const li = span.closest("li");
  const input = document.createElement("input");
  input.type = "text";
  input.value = task.text;
  input.className = "edit-input";
  li.replaceChild(input, span);
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);

  function saveEdit() {
    const newText = input.value.trim();
    if (!newText) {
      alert("Görev boş olamaz.");
      input.focus();
      return;
    }
    tasks = tasks.map((t) => (t.id === task.id ? { ...t, text: newText } : t));
    saveAndRender();
  }

  function cancelEdit() {
    saveAndRender();
  }

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveEdit();
    if (e.key === "Escape") cancelEdit();
  });

  input.addEventListener("blur", saveEdit);
}

function setFilter(f) {
  currentFilter = f;
  renderTasks();
}

function updateFilterUI() {
  const btns = document.querySelectorAll(".filter-btn");
  btns.forEach((b) => b.classList.remove("active"));
  if (currentFilter === "all") document.getElementById("filterAll").classList.add("active");
  if (currentFilter === "active") document.getElementById("filterActive").classList.add("active");
  if (currentFilter === "completed") document.getElementById("filterCompleted").classList.add("active");
}


function updateRemainingCount() {
  const remaining = tasks.filter((t) => !t.completed).length;
  remainingCount.textContent = remaining;
}

function formatDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString("tr-TR");
}

function isPastDate(d) {
  if (!d) return false;
  const dt = new Date(d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dt < today;
}

function showSnackbar(message, withUndo = false) {
  if (!snackbar) return;
  snackbar.innerHTML = "";
  const msg = document.createElement("span");
  msg.textContent = message;
  snackbar.appendChild(msg);
  if (withUndo) {
    const undoBtn = document.createElement("button");
    undoBtn.textContent = "Geri Al";
    undoBtn.className = "snackbar-undo";
    undoBtn.addEventListener("click", undoDelete);
    snackbar.appendChild(undoBtn);
  }
  snackbar.classList.add("show");
  clearTimeout(undoTimeoutId);
  undoTimeoutId = setTimeout(() => {
    snackbar.classList.remove("show");
    lastDeleted = null;
  }, 5000);
}

function hideSnackbar() {
  if (!snackbar) return;
  snackbar.classList.remove("show");
}
renderTasks();