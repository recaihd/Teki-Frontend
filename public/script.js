const BACKEND_URL = "http://localhost:3000"; // depois troca pelo Railway

// Elementos da tela
const loginScreen = document.getElementById("login-screen");
const usernameScreen = document.getElementById("username-screen");
const chatScreen = document.getElementById("chat-screen");
const usernameInput = document.getElementById("username-input");
const usernameError = document.getElementById("username-error");
const userLabel = document.getElementById("user-label");
const messagesEl = document.getElementById("messages");

// Botão login
document.getElementById("login-btn").onclick = () => {
  window.location.href = `${BACKEND_URL}/auth/google`;
};

// Verifica se já está logado
async function checkLogin() {
  const res = await fetch(`${BACKEND_URL}/me`, { credentials: "include" });
  const data = await res.json();

  if (!data.loggedIn) {
    loginScreen.classList.remove("hidden");
    return;
  }

  if (data.firstTime) {
    loginScreen.classList.add("hidden");
    usernameScreen.classList.remove("hidden");
  } else {
    loginScreen.classList.add("hidden");
    chatScreen.classList.remove("hidden");
    userLabel.textContent = data.user.username;
    initChat(data.user.username);
  }
}

// Salvar username
document.getElementById("save-username-btn").onclick = async () => {
  const username = usernameInput.value.trim();
  usernameError.textContent = "";

  const res = await fetch(`${BACKEND_URL}/set-username`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username })
  });

  const data = await res.json();
  if (!res.ok) {
    usernameError.textContent = data.error || "Erro ao salvar username";
    return;
  }

  usernameScreen.classList.add("hidden");
  chatScreen.classList.remove("hidden");
  userLabel.textContent = username;
  initChat(username);
};

// Chat em tempo real
function initChat(username) {
  const socket = io(BACKEND_URL, { withCredentials: true });

  document.getElementById("send-btn").onclick = () => {
    const text = document.getElementById("message-input").value;
    if (text.trim() !== "") {
      socket.emit("sendMessage", { user: username, text });
      document.getElementById("message-input").value = "";
    }
  };

  socket.on("newMessage", (msg) => {
    const p = document.createElement("p");
    p.textContent = `${msg.user}: ${msg.text}`;
    messagesEl.appendChild(p);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  });
}

// Checa login ao carregar
checkLogin();
