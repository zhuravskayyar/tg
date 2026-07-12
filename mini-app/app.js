const tg = window.Telegram?.WebApp;
const userInfo = document.getElementById("userInfo");
const button = document.getElementById("btn");

if (tg) {
  tg.ready();
  tg.expand();

  const user = tg.initDataUnsafe?.user;

  if (user) {
    const name = [user.first_name, user.last_name].filter(Boolean).join(" ");
    userInfo.textContent = `ID: ${user.id} | Имя: ${name || "без имени"}`;
  }
}

button.addEventListener("click", () => {
  if (tg) {
    tg.showAlert("Работает!");
    return;
  }

  alert("Работает! Открой через Telegram, чтобы проверить Mini App API.");
});
