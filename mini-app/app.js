const tg = window.Telegram?.WebApp;
tg?.ready();
tg?.expand();

const dictionary = {
  uk: {
    terrarium: "ТЕРАРІУМ 01", weather: "Сутінки", species: "Деревна жаба", level: "Рівень",
    today: "Сьогодні", updated: "Щойно оновлено", satiety: "СИТІСТЬ", moisture: "ВОЛОГІСТЬ",
    will: "ВОЛЯ ЖИТИ", health: "ЗДОРОВ’Я", care: "Не залишай її", actionsAvailable: "4 дії доступно",
    feed: "Годувати", insects: "Комахи", water: "Зволожити", mist: "Туман", stay: "Побути поруч",
    talk: "Тиха розмова", clean: "Прибрати", home: "Попільничка", preferences: "ОСОБИСТЕ",
    settings: "Налаштування", settingsIntro: "Зміни мову та правила цієї історії.", language: "МОВА",
    languageTitle: "Мова гри", languageHint: "Спочатку визначається через Telegram.", aboutState: "ПРО СТАН",
    lonelinessTitle: "Самотність реальна",
    lonelinessText: "Коли тебе довго немає, воля Квакі згасає. Повертайся, говори з нею і не дай тиші перемогти.",
    reset: "Почати історію спочатку", settingsNav: "Опції", stateGood: "Вона чекала на тебе",
    stateLow: "Квакі знову віддаляється", stateCritical: "Тиша майже перемогла", fed: "Квакі поїла",
    watered: "Туман освіжив її дім", played: "Твоя присутність повернула їй сили",
    cleaned: "Попільничка порожня. Тут знову можна дихати", bought: "Покупку додано до тераріуму",
    noCoins: "Недостатньо листків", resetDone: "Історія почалася знову", traces: "СЛІДИ"
  },
  ru: {
    terrarium: "ТЕРРАРИУМ 01", weather: "Сумерки", species: "Древесная лягушка", level: "Уровень",
    today: "Сегодня", updated: "Только что обновлено", satiety: "СЫТОСТЬ", moisture: "ВЛАЖНОСТЬ",
    will: "ВОЛЯ ЖИТЬ", health: "ЗДОРОВЬЕ", care: "Не оставляй её", actionsAvailable: "Доступно 4 действия",
    feed: "Покормить", insects: "Насекомые", water: "Увлажнить", mist: "Туман", stay: "Побыть рядом",
    talk: "Тихий разговор", clean: "Убрать", home: "Пепельница", preferences: "ЛИЧНОЕ",
    settings: "Настройки", settingsIntro: "Измени язык и правила этой истории.", language: "ЯЗЫК",
    languageTitle: "Язык игры", languageHint: "Сначала определяется через Telegram.", aboutState: "О СОСТОЯНИИ",
    lonelinessTitle: "Одиночество реально",
    lonelinessText: "Когда тебя долго нет, воля Кваки угасает. Возвращайся, говори с ней и не дай тишине победить.",
    reset: "Начать историю сначала", settingsNav: "Опции", stateGood: "Она ждала тебя",
    stateLow: "Кваки снова отдаляется", stateCritical: "Тишина почти победила", fed: "Кваки поела",
    watered: "Туман освежил её дом", played: "Твоё присутствие вернуло ей силы",
    cleaned: "Пепельница пуста. Здесь снова можно дышать", bought: "Покупка добавлена в террариум",
    noCoins: "Недостаточно листьев", resetDone: "История началась снова", traces: "СЛЕДЫ"
  }
};

const detectedLanguage = (tg?.initDataUnsafe?.user?.language_code || navigator.language || "uk")
  .toLowerCase().startsWith("ru") ? "ru" : "uk";

const defaults = {
  hunger: 64, moisture: 82, mood: 76, health: 95, level: 7, coins: 240,
  butts: 3, buttProgress: 0, lastSeen: Date.now(), lang: detectedLanguage
};

let storedState = {};
try { storedState = JSON.parse(localStorage.getItem("tinyTerrarium") || "{}"); } catch {}
let state = { ...defaults, ...storedState };

const t = key => dictionary[state.lang]?.[key] || dictionary.uk[key] || key;
const clamp = value => Math.max(0, Math.min(100, value));
const sprite = document.querySelector(".pet-sprite");
const stateNames = new Set(["idle", "drink", "read", "smoke", "sleep"]);
const stateSheets = Object.fromEntries([...stateNames].map(name => [name,
  Array.from({ length: 4 }, (_, index) => `assets/frog/final-56/${name}/${name}-part-${index + 1}.png`)
]));

const animationDurations = {
  idle: 15000,
  "idle-to-drink": 500,
  drink: 15000,
  "drink-to-read": 500,
  read: 15000,
  "read-to-smoke": 500,
  smoke: 15000,
  "smoke-to-sleep": 500,
  sleep: 15000,
  "sleep-to-idle": 500
};
const animationFiles = {
  "idle-to-drink": "assets/frog/doubled/idle-to-drink-12.png",
  "drink-to-read": "assets/frog/doubled/drink-to-read-12.png",
  "read-to-smoke": "assets/frog/doubled/read-to-smoke-12.png",
  "smoke-to-sleep": "assets/frog/doubled/smoke-to-sleep-12.png",
  "sleep-to-idle": "assets/frog/doubled/sleep-to-idle-12.png"
};

Object.values(animationFiles).forEach(src => {
  const image = new Image();
  image.src = src;
});

let animationQueue = [];
let animationRunning = false;
let currentAnimation = null;
let animationTimer;
let spriteFrameTimer;
let activeSheetImages = [];
let spritePlaybackToken = 0;
let sequenceTimer;
let toastTimer;
let sequenceIndex = 0;
const autonomousSequence = [
  { name: "idle", pauseAfter: 0 },
  { name: "idle-to-drink", pauseAfter: 0 },
  { name: "drink", pauseAfter: 0 },
  { name: "drink-to-read", pauseAfter: 0 },
  { name: "read", pauseAfter: 0 },
  { name: "read-to-smoke", pauseAfter: 0 },
  { name: "smoke", pauseAfter: 0 },
  { name: "smoke-to-sleep", pauseAfter: 0 },
  { name: "sleep", pauseAfter: 0 },
  { name: "sleep-to-idle", pauseAfter: 0 }
];

function applyLanguage() {
  document.documentElement.lang = state.lang;
  document.querySelectorAll("[data-i18n]").forEach(element => { element.textContent = t(element.dataset.i18n); });
  document.querySelectorAll("[data-lang]").forEach(element => element.classList.toggle("active", element.dataset.lang === state.lang));
  updatePetState();
}

function decay() {
  const hours = Math.min(72, (Date.now() - state.lastSeen) / 36e5);
  state.buttProgress = (state.buttProgress || 0) + hours / 3;
  const addedButts = Math.floor(state.buttProgress);
  if (addedButts) {
    state.butts = Math.min(14, (state.butts || 0) + addedButts);
    state.buttProgress -= addedButts;
  }
  state.hunger = clamp(state.hunger - hours * 1.7);
  state.moisture = clamp(state.moisture - hours * (1.2 + state.butts * 0.03));
  state.mood = clamp(state.mood - hours * (3 + state.butts * 0.06));
  if (state.mood < 25 || state.hunger < 15 || state.moisture < 20) state.health = clamp(state.health - hours * 1.5);
  if (state.butts >= 8) state.health = clamp(state.health - hours * 0.45);
  state.lastSeen = Date.now();
  return addedButts;
}

function updatePetState() {
  const element = document.getElementById("petStateText");
  element.textContent = state.mood < 20 ? t("stateCritical") : state.mood < 50 ? t("stateLow") : t("stateGood");
  document.querySelector('[data-stat="mood"]').classList.toggle("danger", state.mood < 30);
}

function save() { localStorage.setItem("tinyTerrarium", JSON.stringify(state)); }

function renderAshtray() {
  const pile = document.getElementById("ashtrayPile");
  pile.replaceChildren();
  pile.dataset.label = `${t("traces")}: ${state.butts}`;
  pile.setAttribute("aria-label", pile.dataset.label);
  for (let i = 0; i < state.butts; i++) {
    const butt = document.createElement("i");
    butt.className = "cigarette-butt";
    butt.style.setProperty("--x", 10 + (i * 19) % 78);
    butt.style.setProperty("--y", 19 + (i * 13) % 34);
    butt.style.setProperty("--r", -38 + (i * 29) % 76);
    butt.style.zIndex = i + 1;
    pile.appendChild(butt);
  }
  for (let i = 0; i < Math.min(9, state.butts); i++) {
    const ash = document.createElement("i");
    ash.className = "ash-speck";
    ash.style.setProperty("--x", 15 + (i * 23) % 85);
    ash.style.setProperty("--y", 25 + (i * 17) % 32);
    pile.appendChild(ash);
  }
}

function render() {
  ["hunger", "moisture", "mood", "health"].forEach(key => {
    const value = Math.round(state[key]);
    document.getElementById(`${key}Value`).textContent = value;
    document.getElementById(`${key}Meter`).style.width = `${value}%`;
  });
  document.getElementById("level").textContent = state.level;
  document.getElementById("coins").textContent = state.coins;
  updatePetState();
  renderAshtray();
  save();
}

function notify(message) {
  const element = document.getElementById("toast");
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove("show"), 2200);
  tg?.HapticFeedback?.impactOccurred("light");
}

function stopSpriteFrames() {
  clearInterval(spriteFrameTimer);
  spriteFrameTimer = null;
  activeSheetImages = [];
  spritePlaybackToken += 1;
}

function startSpriteFrames(name) {
  const sheets = stateSheets[name];
  const playbackToken = spritePlaybackToken;
  let frame = 0;
  const drawFrame = () => {
    const sheetIndex = Math.floor(frame / 14);
    const frameInSheet = frame % 14;
    sprite.style.backgroundImage = `url("${sheets[sheetIndex]}")`;
    sprite.style.backgroundSize = "1400% 100%";
    sprite.style.backgroundPosition = `${(frameInSheet / 13) * 100}% 0`;
    frame = (frame + 1) % 56;
  };
  const beginPlayback = () => {
    if (playbackToken !== spritePlaybackToken || spriteFrameTimer) return;
    drawFrame();
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      spriteFrameTimer = setInterval(drawFrame, 1000 / 24);
    }
  };
  activeSheetImages = sheets.map(src => {
    const image = new Image();
    image.src = src;
    return image;
  });
  if (activeSheetImages[0].complete) beginPlayback();
  else activeSheetImages[0].addEventListener("load", beginPlayback, { once: true });
}

function setSpriteAnimation(name = "idle") {
  stopSpriteFrames();
  sprite.className = "pet-sprite";
  sprite.style.backgroundImage = "";
  sprite.style.backgroundSize = "";
  sprite.style.backgroundPosition = "";
  void sprite.offsetWidth;
  sprite.classList.add(`anim-${name}`);
  if (stateNames.has(name)) startSpriteFrames(name);
}

function runNextAnimation() {
  if (animationRunning) return;
  const next = animationQueue.shift();
  if (!next) { setSpriteAnimation("idle"); return; }
  animationRunning = true;
  currentAnimation = next.name;
  setSpriteAnimation(next.name);
  animationTimer = setTimeout(() => {
    animationRunning = false;
    currentAnimation = null;
    next.onComplete?.();
    runNextAnimation();
  }, animationDurations[next.name]);
}

function queueAnimation(name, onComplete) {
  if (!animationDurations[name] || animationQueue.length >= 5) return;
  animationQueue.push({ name, onComplete });
  runNextAnimation();
}

function cancelAnimation(name) {
  animationQueue = animationQueue.filter(item => item.name !== name);
  if (currentAnimation !== name) return;
  clearTimeout(animationTimer);
  animationRunning = false;
  currentAnimation = null;
  runNextAnimation();
}

function cancelAllAnimations() {
  clearTimeout(animationTimer);
  animationQueue = [];
  animationRunning = false;
  currentAnimation = null;
  setSpriteAnimation("idle");
}

const actions = {
  feed() {
    state.hunger = clamp(state.hunger + 20);
    notify(t("fed"));
  },
  water() {
    state.moisture = clamp(state.moisture + 18);
    notify(t("watered"));
  },
  play() {
    state.mood = clamp(state.mood + 28);
    state.hunger = clamp(state.hunger - 3);
    notify(t("played"));
  },
  clean() {
    state.butts = 0;
    state.buttProgress = 0;
    state.health = clamp(state.health + 8);
    state.mood = clamp(state.mood + 4);
    notify(t("cleaned"));
  }
};

function handleAction(action) {
  actions[action]();
  render();
}

function playNextSequenceStep() {
  const homeIsVisible = document.getElementById("homeScreen").classList.contains("active");
  if (document.hidden || !homeIsVisible || animationRunning || animationQueue.length) {
    scheduleNextSequenceStep(1200);
    return;
  }
  const step = autonomousSequence[sequenceIndex];
  sequenceIndex = (sequenceIndex + 1) % autonomousSequence.length;
  queueAnimation(step.name, () => {
    if (step.pauseAfter) scheduleNextSequenceStep(step.pauseAfter);
    else playNextSequenceStep();
  });
}

function scheduleNextSequenceStep(delay = 2600) {
  clearTimeout(sequenceTimer);
  sequenceTimer = setTimeout(playNextSequenceStep, delay);
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(screen => screen.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  document.querySelectorAll("[data-screen]").forEach(button => button.classList.toggle("active", button.dataset.screen === id));
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (id === "homeScreen") scheduleNextSequenceStep(900);
  else clearTimeout(sequenceTimer);
}

document.querySelectorAll("[data-action]").forEach(button => button.addEventListener("click", () => handleAction(button.dataset.action)));
document.querySelectorAll("[data-screen]").forEach(button => button.addEventListener("click", () => showScreen(button.dataset.screen)));
document.querySelector("[data-open-settings]").addEventListener("click", () => showScreen("settingsScreen"));
document.querySelectorAll("[data-lang]").forEach(button => button.addEventListener("click", () => {
  state.lang = button.dataset.lang;
  applyLanguage();
  render();
}));

document.getElementById("resetProgress").addEventListener("click", () => {
  const lang = state.lang;
  state = { ...defaults, lang, lastSeen: Date.now() };
  cancelAllAnimations();
  sequenceIndex = 0;
  applyLanguage();
  render();
  notify(t("resetDone"));
  scheduleNextSequenceStep(1200);
});

const buyEffects = {
  larva: () => state.hunger = clamp(state.hunger + 30),
  cricket: () => state.hunger = clamp(state.hunger + 45),
  moss: () => state.mood = clamp(state.mood + 20),
  mister: () => state.moisture = clamp(state.moisture + 35)
};

document.querySelectorAll("[data-buy]").forEach(button => button.addEventListener("click", () => {
  const price = Number(button.dataset.price);
  if (state.coins < price) { notify(t("noCoins")); return; }
  state.coins -= price;
  buyEffects[button.dataset.buy]();
  notify(t("bought"));
  render();
}));

decay();
applyLanguage();
render();
setSpriteAnimation("idle");
scheduleNextSequenceStep(1800);

if (tg?.initData) {
  fetch("/api/visit", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ initData: tg.initData })
  }).catch(() => {});
}
