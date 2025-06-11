const taskInput = document.getElementById("task-input");
const addBtn = document.getElementById("add-btn");
const micBtn = document.getElementById("mic-btn");
const taskList = document.getElementById("task-list");
const themeSwitch = document.getElementById("theme-switch");
const themeLabel = document.getElementById("theme-label");
const filterButtons = document.querySelectorAll(".filter-btn");
const beep = document.getElementById("beep");

let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
let draggedIndex = null;

function getRandomClass(prefix, max) {
  const num = Math.floor(Math.random() * max) + 1;
  return `${prefix}${num}`;
}

function renderTasks() {
  taskList.innerHTML = "";
  tasks.forEach((task, index) => {
    const li = document.createElement("li");
    li.className = `task-color-${task.bgColor} text-color-${task.textColor}`;
    if (task.completed) li.classList.add("completed");

    li.setAttribute("draggable", true);
    li.dataset.index = index;

    li.innerHTML = `
      <span class="task-text">${task.text}</span>
      <div>
        <button class="delete-btn" onclick="deleteTask(${index})">✖</button>
      </div>
    `;

    li.querySelector(".task-text").addEventListener("click", () => {
      task.completed = !task.completed;
      saveTasks();
      renderTasks();
      applyFilter(localStorage.getItem("filter") || "all");
    });

    li.addEventListener("dblclick", () => {
      const editInput = document.createElement("input");
      editInput.className = "edit-input";
      editInput.value = task.text;
      li.innerHTML = "";
      li.appendChild(editInput);
      editInput.focus();

      editInput.addEventListener("blur", () => {
        task.text = editInput.value.trim() || task.text;
        saveTasks();
        renderTasks();
        applyFilter(localStorage.getItem("filter") || "all");
      });

      editInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") editInput.blur();
      });
    });

    li.addEventListener("dragstart", handleDragStart);
    li.addEventListener("dragover", handleDragOver);
    li.addEventListener("drop", handleDrop);
    li.addEventListener("dragend", handleDragEnd);

    taskList.appendChild(li);
  });
}

addBtn.addEventListener("click", () => {
  const text = taskInput.value.trim();
  if (!text) return;

  const newTask = {
    text,
    completed: false,
    bgColor: getRandomClass("task-color-", 6).split("-")[2],
    textColor: getRandomClass("text-color-", 5).split("-")[2]
  };

  tasks.push(newTask);
  saveTasks();
  taskInput.value = "";
  renderTasks();
  applyFilter(localStorage.getItem("filter") || "all");
});

taskInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addBtn.click();
});

function deleteTask(index) {
  tasks.splice(index, 1);
  saveTasks();
  renderTasks();
  applyFilter(localStorage.getItem("filter") || "all");
}

function saveTasks() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

function handleDragStart() {
  draggedIndex = +this.dataset.index;
  this.classList.add("dragging");
}

function handleDragOver(e) {
  e.preventDefault();
  this.classList.add("drag-over");
}

function handleDrop() {
  const targetIndex = +this.dataset.index;
  if (draggedIndex === targetIndex) return;

  const draggedTask = tasks[draggedIndex];
  tasks.splice(draggedIndex, 1);
  tasks.splice(targetIndex, 0, draggedTask);

  saveTasks();
  renderTasks();
  applyFilter(localStorage.getItem("filter") || "all");
}

function handleDragEnd() {
  this.classList.remove("dragging", "drag-over");
  document.querySelectorAll("#task-list li").forEach(li => li.classList.remove("drag-over"));
}

// Theme
document.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
    themeSwitch.checked = true;
    themeLabel.textContent = "🌙 Dark";
  }

  const savedFilter = localStorage.getItem("filter") || "all";
  applyFilter(savedFilter);
});

themeSwitch.addEventListener("change", () => {
  if (themeSwitch.checked) {
    document.body.classList.add("dark-mode");
    themeLabel.textContent = "🌙 Dark";
    localStorage.setItem("theme", "dark");
  } else {
    document.body.classList.remove("dark-mode");
    themeLabel.textContent = "🌞 Light";
    localStorage.setItem("theme", "light");
  }
});

// Filters
filterButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const selected = btn.getAttribute("data-filter");
    applyFilter(selected);
  });
});

function applyFilter(filter) {
  const taskItems = document.querySelectorAll("#task-list li");
  taskItems.forEach((item, index) => {
    const isCompleted = tasks[index].completed;

    if (filter === "all") {
      item.style.display = "flex";
    } else if (filter === "completed" && isCompleted) {
      item.style.display = "flex";
    } else if (filter === "pending" && !isCompleted) {
      item.style.display = "flex";
    } else {
      item.style.display = "none";
    }
  });

  filterButtons.forEach(btn => btn.classList.remove("active"));
  document.querySelector(`.filter-btn[data-filter="${filter}"]`).classList.add("active");
  localStorage.setItem("filter", filter);
}

// Toast
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2000);
}

// Voice Recognition
let recognition;
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript.toLowerCase();
    taskInput.value = transcript;

    // Mark as completed
    if (/mark (.+?) (as )?(completed|done|complete)/i.test(transcript)) {
      const match = transcript.match(/mark (.+?) (as )?(completed|done|complete)/i);
      const taskText = match[1].trim().toLowerCase();
      const found = tasks.find(task => task.text.toLowerCase().includes(taskText));
      if (found) {
        found.completed = true;
        saveTasks();
        renderTasks();
        applyFilter(localStorage.getItem("filter") || "all");
        showToast(`✅ Marked as completed: ${found.text}`);
        beep.play();
        return;
      } else {
        showToast(`❌ Task not found: ${taskText}`);
        return;
      }
    }

    // Remove task
    if (/remove (.+)/i.test(transcript)) {
      const match = transcript.match(/remove (.+)/i);
      const taskText = match[1].trim().toLowerCase();
      const index = tasks.findIndex(task => task.text.toLowerCase().includes(taskText));
      if (index !== -1) {
        const removedTask = tasks[index].text;
        tasks.splice(index, 1);
        saveTasks();
        renderTasks();
        applyFilter(localStorage.getItem("filter") || "all");
        showToast(`🗑️ Removed: ${removedTask}`);
        beep.play();
        return;
      } else {
        showToast(`❌ Task not found: ${taskText}`);
        return;
      }
    }

    // Add new task
    const text = transcript.trim();
    if (text) {
      const newTask = {
        text,
        completed: false,
        bgColor: getRandomClass("task-color-", 6).split("-")[2],
        textColor: getRandomClass("text-color-", 5).split("-")[2]
      };

      tasks.push(newTask);
      saveTasks();
      taskInput.value = "";
      renderTasks();
      applyFilter(localStorage.getItem("filter") || "all");
      beep.play();
      showToast(`➕ Task added: ${text}`);
    }
  };

  recognition.onerror = (event) => {
    showToast("🎤 Error: " + event.error);
  };
} else {
  micBtn.disabled = true;
  micBtn.title = "Your browser doesn't support speech recognition.";
}

micBtn.addEventListener("click", () => {
  if (recognition) {
    recognition.start();
  }
});

// Initial render
renderTasks();
