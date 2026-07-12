const tg = window.Telegram?.WebApp;
const userInfo = document.getElementById("userInfo");
const button = document.getElementById("btn");

if (tg) {
  tg.ready();
  tg.expand();

  const user = tg.initDataUnsafe?.user;

  if (user) {
    const name = [user.first_name, user.last_name].filter(Boolean).join(" ");
    userInfo.textContent = `ID: ${user.id} | Імʼя: ${name || "без імені"}`;
  }

  recordVisit();
}

button.addEventListener("click", () => {
  if (tg) {
    tg.showAlert("Працює!");
    return;
  }

  alert("Працює! Відкрий через Telegram, щоб перевірити Mini App API.");
});

async function recordVisit() {
  if (!tg?.initData) {
    return;
  }

  try {
    await fetch("/api/visit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        initData: tg.initData
      })
    });
  } catch (error) {
    console.error("Visit tracking failed", error);
  }
}
