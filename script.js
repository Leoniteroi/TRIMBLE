const form = document.getElementById("loginForm");
const statusMessage = document.getElementById("statusMessage");

function showMessage(text, type) {
  statusMessage.textContent = text;
  statusMessage.className = `status-message ${type}`;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const email = form.email.value.trim();
  const password = form.password.value;

  if (!email || !password) {
    showMessage("Preencha e-mail e senha para continuar.", "error");
    return;
  }

  if (password.length < 8) {
    showMessage("A senha deve conter ao menos 8 caracteres.", "error");
    return;
  }

  showMessage("Autenticando no Trimble Connect...", "success");

  setTimeout(() => {
    showMessage("Tela inicial pronta para integrar com API de autenticação.", "success");
  }, 900);
});
