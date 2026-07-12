const crypto = require("node:crypto");

const USERS_INDEX = "tgmini:users:last_seen";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { ok: false, error: "Method not allowed" });
  }

  try {
    if (!isAdminRequest(req)) {
      return json(res, 401, { ok: false, error: "Unauthorized" });
    }

    const body = await readJsonBody(req);
    const message = String(body?.message || "").trim();

    if (!message) {
      return json(res, 400, { ok: false, error: "Message is required" });
    }

    if (message.length > 4096) {
      return json(res, 400, { ok: false, error: "Message is too long" });
    }

    const ids = await redisCommand(["ZREVRANGE", USERS_INDEX, "0", "999"]);
    const result = {
      total: ids?.length || 0,
      sent: 0,
      failed: 0
    };

    for (const id of ids || []) {
      const sent = await sendTelegramMessage(String(id), message);

      if (sent) {
        result.sent += 1;
      } else {
        result.failed += 1;
      }
    }

    return json(res, 200, { ok: true, result });
  } catch (error) {
    console.error(error);
    return json(res, 500, { ok: false, error: "Server error" });
  }
};

function isAdminRequest(req) {
  const expected = process.env.ADMIN_PASSWORD;
  const provided = req.headers["x-admin-password"];

  if (!expected || !provided || Array.isArray(provided)) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);

  return (
    expectedBuffer.length === providedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, providedBuffer)
  );
}

async function sendTelegramMessage(chatId, text) {
  const botToken = process.env.BOT_TOKEN;

  if (!botToken) {
    throw new Error("BOT_TOKEN env var is missing");
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true
    })
  });

  const data = await response.json().catch(() => null);

  return response.ok && data?.ok === true;
}

async function redisCommand(command) {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (!redisUrl || !redisToken) {
    throw new Error("Redis REST env vars are missing");
  }

  const response = await fetch(redisUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${redisToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(command)
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || data?.error) {
    throw new Error(data?.error || response.statusText || "Redis command failed");
  }

  return data?.result;
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }

  if (typeof req.body === "string" || Buffer.isBuffer(req.body)) {
    return JSON.parse(req.body.toString() || "{}");
  }

  const raw = await new Promise((resolve, reject) => {
    let data = "";

    req.on("data", (chunk) => {
      data += chunk;
    });

    req.on("end", () => resolve(data));
    req.on("error", reject);
  });

  return JSON.parse(raw || "{}");
}

function json(res, status, payload) {
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(payload);
}
