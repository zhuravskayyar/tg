import { existsSync, readFileSync } from "node:fs";
import process from "node:process";

loadEnvFile(".env");

const botToken = process.env.BOT_TOKEN;
const webAppUrl = process.env.WEB_APP_URL;
const menuText = process.env.MENU_TEXT || "Open Mini App";

if (!botToken || botToken.includes("replace_with")) {
  fail("BOT_TOKEN is missing. Add it to .env first.");
}

if (!webAppUrl || webAppUrl.includes("your-vercel-app")) {
  fail("WEB_APP_URL is missing. Add the deployed Vercel URL to .env first.");
}

const parsedUrl = new URL(webAppUrl);

if (parsedUrl.protocol !== "https:") {
  fail("WEB_APP_URL must start with https:// for Telegram Mini Apps.");
}

const bot = await telegram("getMe");
const username = bot.result.username ? `@${bot.result.username}` : bot.result.first_name;

await telegram("setChatMenuButton", {
  menu_button: {
    type: "web_app",
    text: menuText,
    web_app: {
      url: webAppUrl
    }
  }
});

console.log(`Bot checked: ${username}`);
console.log(`Menu button updated: ${menuText} -> ${webAppUrl}`);

async function telegram(method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload ?? {})
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.ok) {
    const description = data?.description || response.statusText || "Unknown error";
    fail(`Telegram API error in ${method}: ${description}`);
  }

  return data;
}

function loadEnvFile(path) {
  if (!existsSync(path)) {
    return;
  }

  const lines = readFileSync(path, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");

    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
