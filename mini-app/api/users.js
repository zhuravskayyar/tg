const crypto = require("node:crypto");

const USERS_HASH = "tgmini:users";
const USERS_INDEX = "tgmini:users:last_seen";

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return json(res, 405, { ok: false, error: "Method not allowed" });
  }

  try {
    if (!isAdminRequest(req)) {
      return json(res, 401, { ok: false, error: "Unauthorized" });
    }

    const limit = clamp(Number(req.query?.limit || 100), 1, 500);
    const ids = await redisCommand(["ZREVRANGE", USERS_INDEX, "0", String(limit - 1)]);
    const users = [];

    for (const id of ids || []) {
      const raw = await redisCommand(["HGET", USERS_HASH, String(id)]);

      if (!raw) {
        continue;
      }

      try {
        const user = JSON.parse(raw);
        users.push({
          name: user.name || "Unknown",
          last_seen: user.last_seen
        });
      } catch {
        continue;
      }
    }

    return json(res, 200, { ok: true, users });
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

function clamp(value, min, max) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(Math.max(Math.floor(value), min), max);
}

function json(res, status, payload) {
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(payload);
}
