const taskInput = document.getElementById("taskInput");
const addBtn = document.getElementById("addBtn");
const taskList = document.getElementById("taskList");

addBtn.addEventListener("click", addTask);

function addTask() {
  const taskText = taskInput.value.trim();

  if (taskText === "") {
    alert("Lütfen bir görev gir.");
    return;
  }

  const li = document.createElement("li");

  const span = document.createElement("span");
  span.textContent = taskText;

  const buttonContainer = document.createElement("div");
  buttonContainer.classList.add("task-buttons");

  const completeBtn = document.createElement("button");
  completeBtn.textContent = "Tamamlandı";
  completeBtn.addEventListener("click", function () {
    span.classList.toggle("completed");
  });

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "Sil";
  deleteBtn.addEventListener("click", function () {
    li.remove();
  });

  buttonContainer.appendChild(completeBtn);
  buttonContainer.appendChild(deleteBtn);

  li.appendChild(span);
  li.appendChild(buttonContainer);

  taskList.appendChild(li);

  taskInput.value = "";
}