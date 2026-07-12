const crypto = require("node:crypto");

const USERS_HASH = "tgmini:users";
const USERS_INDEX = "tgmini:users:last_seen";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { ok: false, error: "Method not allowed" });
  }

  try {
    const botToken = requireEnv("BOT_TOKEN");
    const body = await readJsonBody(req);
    const initData = String(body?.initData || "");

    if (!initData) {
      return json(res, 400, { ok: false, error: "Missing Telegram initData" });
    }

    const result = verifyTelegramInitData(initData, botToken);

    if (!result.ok) {
      return json(res, 401, { ok: false, error: result.error });
    }

    if (!result.user?.id) {
      return json(res, 400, { ok: false, error: "Telegram user is missing" });
    }

    const now = new Date();
    const id = String(result.user.id);
    const name = [result.user.first_name, result.user.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() || "Unknown";

    const record = {
      name,
      last_seen: now.toISOString()
    };

    await redisCommand(["HSET", USERS_HASH, id, JSON.stringify(record)]);
    await redisCommand(["ZADD", USERS_INDEX, String(now.getTime()), id]);

    return json(res, 200, { ok: true, user: record });
  } catch (error) {
    console.error(error);
    return json(res, 500, { ok: false, error: "Server error" });
  }
};

function verifyTelegramInitData(initData, botToken) {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");

  if (!hash) {
    return { ok: false, error: "Missing hash" };
  }

  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const calculatedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (!safeEqual(hash, calculatedHash)) {
    return { ok: false, error: "Invalid Telegram signature" };
  }

  const maxAge = Number(process.env.INIT_DATA_MAX_AGE_SECONDS || 86400);
  const authDate = Number(params.get("auth_date") || 0);
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (maxAge > 0 && authDate > 0 && nowSeconds - authDate > maxAge) {
    return { ok: false, error: "Telegram initData expired" };
  }

  try {
    return {
      ok: true,
      user: JSON.parse(params.get("user") || "null")
    };
  } catch {
    return { ok: false, error: "Invalid Telegram user data" };
  }
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

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} env var is missing`);
  }

  return value;
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function json(res, status, payload) {
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(payload);
}
