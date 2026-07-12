const passwordKey = "tg-mini-admin-password";
const loginForm = document.getElementById("loginForm");
const passwordInput = document.getElementById("passwordInput");
const adminStatus = document.getElementById("adminStatus");
const refreshBtn = document.getElementById("refreshBtn");
const tableSection = document.getElementById("tableSection");
const usersBody = document.getElementById("usersBody");

const savedPassword = localStorage.getItem(passwordKey);

if (savedPassword) {
  passwordInput.value = savedPassword;
  loadUsers(savedPassword);
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const password = passwordInput.value.trim();

  if (!password) {
    setStatus("Введи пароль адміністратора.");
    return;
  }

  localStorage.setItem(passwordKey, password);
  loadUsers(password);
});

refreshBtn.addEventListener("click", () => {
  loadUsers(passwordInput.value.trim());
});

async function loadUsers(password) {
  setStatus("Завантаження...");

  try {
    const response = await fetch("/api/users?limit=200", {
      headers: {
        "x-admin-password": password
      }
    });
    const data = await response.json();

    if (!response.ok || !data.ok) {
      if (response.status === 401) {
        localStorage.removeItem(passwordKey);
      }

      throw new Error(data.error || "Не вдалося завантажити користувачів.");
    }

    renderUsers(data.users || []);
    loginForm.hidden = true;
    refreshBtn.hidden = false;
    tableSection.hidden = false;
    setStatus(`Користувачів: ${data.users.length}`);
  } catch (error) {
    renderUsers([]);
    loginForm.hidden = false;
    refreshBtn.hidden = true;
    tableSection.hidden = true;
    setStatus(error.message);
  }
}

function renderUsers(users) {
  usersBody.textContent = "";

  if (!users.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 2;
    cell.textContent = "Даних поки немає.";
    row.append(cell);
    usersBody.append(row);
    return;
  }

  for (const user of users) {
    const row = document.createElement("tr");
    const name = document.createElement("td");
    const lastSeen = document.createElement("td");

    name.textContent = user.name || "Unknown";
    lastSeen.textContent = formatDate(user.last_seen);

    row.append(name, lastSeen);
    usersBody.append(row);
  }
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("uk-UA", {
    dateStyle: "short",
    timeStyle: "medium"
  });
}

function setStatus(message) {
  adminStatus.textContent = message;
}
