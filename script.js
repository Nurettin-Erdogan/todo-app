const taskInput = document.getElementById("taskInput");
const addBtn = document.getElementById("addBtn");
const taskList = document.getElementById("taskList");
const remainingCount = document.getElementById("remainingCount");
const clearCompletedBtn = document.getElementById("clearCompletedBtn");
const filterAllBtn = document.getElementById("filterAll");
const filterActiveBtn = document.getElementById("filterActive");
const filterCompletedBtn = document.getElementById("filterCompleted");
const snackbar = document.getElementById("snackbar");
const toggleAboutBtn = document.getElementById("toggleAboutBtn");
const aboutSection = document.getElementById("about");

let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
let currentFilter = "all";
let lastDeleted = null; // { task, index } or { tasks: [...] }
let undoTimeoutId = null;

addBtn.addEventListener("click", handleAddTask);
taskInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter") handleAddTask();
});

clearCompletedBtn.addEventListener("click", clearCompletedTasks);
filterAllBtn.addEventListener("click", () => setFilter("all"));
filterActiveBtn.addEventListener("click", () => setFilter("active"));
filterCompletedBtn.addEventListener("click", () => setFilter("completed"));

if (toggleAboutBtn && aboutSection) {
  toggleAboutBtn.addEventListener("click", () => {
    const hidden = aboutSection.classList.toggle("hidden");
    toggleAboutBtn.setAttribute("aria-expanded", String(!hidden));
    toggleAboutBtn.textContent = hidden ? "Hakkında Göster" : "Hakkında Gizle";
  });
}

function handleAddTask() {
  const taskText = taskInput.value.trim();

  if (taskText === "") {
    alert("Lütfen bir görev giriniz.");
    return;
  }

  const task = { id: Date.now(), text: taskText, completed: false };
  tasks.push(task);
  saveAndRender();

  taskInput.value = "";
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
    if (currentFilter === "active") return !t.completed;
    if (currentFilter === "completed") return t.completed;
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

    const span = document.createElement("span");
    span.textContent = task.text;
    span.className = task.completed ? "task-text completed" : "task-text";
    span.addEventListener("click", () => toggleTask(task.id));
    span.addEventListener("dblclick", () => startEditing(span, task));

    const buttonContainer = document.createElement("div");
    buttonContainer.classList.add("task-buttons");

    const completeBtn = document.createElement("button");
    completeBtn.textContent = task.completed ? "Geri Al" : "Tamamlandı";
    completeBtn.addEventListener("click", () => toggleTask(task.id));

    const editBtn = document.createElement("button");
    editBtn.textContent = "Düzenle";
    editBtn.addEventListener("click", () => startEditing(span, task));

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Sil";
    deleteBtn.addEventListener("click", () => deleteTask(task.id));

    buttonContainer.appendChild(completeBtn);
    buttonContainer.appendChild(editBtn);
    buttonContainer.appendChild(deleteBtn);

    li.appendChild(span);
    li.appendChild(buttonContainer);

    taskList.appendChild(li);
  });

  updateFilterUI();
  updateRemainingCount();
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