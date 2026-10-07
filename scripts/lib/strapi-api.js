/**
 * Minimal Strapi REST client for the import scripts. Reads STRAPI_URL and
 * STRAPI_TOKEN from the environment, so the token never ends up in a file.
 */
const fs = require("fs");
const path = require("path");

const STRAPI_URL = (process.env.STRAPI_URL || "").replace(/\/+$/, "");
const STRAPI_TOKEN = process.env.STRAPI_TOKEN;

function assertConfigured() {
  if (!STRAPI_URL || !STRAPI_TOKEN) {
    throw new Error("Set STRAPI_URL (e.g. https://staging.usupport.online/cms) and STRAPI_TOKEN");
  }
}

async function api(method, route, { query, body, form } = {}) {
  const url = new URL(`${STRAPI_URL}/api${route}`);
  Object.entries(query || {}).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${STRAPI_TOKEN}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: form || (body ? JSON.stringify(body) : undefined),
  });

  const text = await response.text();
  const json = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`${method} ${route} failed (${response.status}): ${json?.error?.message || text}`);
  }
  return json;
}

/** First entry of a collection query, or null */
const findOne = async (route, query) => (await api("GET", route, { query })).data?.[0] || null;

/** All entries of a collection query (first page) */
const findMany = async (route, query) => (await api("GET", route, { query })).data || [];

/**
 * Upload a local file to the media library
 * @returns {Promise<number>} file id
 */
async function uploadFile(filePath) {
  const form = new FormData();
  form.append("files", new Blob([fs.readFileSync(filePath)]), path.basename(filePath));
  const [file] = await api("POST", "/upload", { form });
  return file.id;
}

module.exports = {
  STRAPI_URL,
  assertConfigured,
  api,
  findOne,
  findMany,
  uploadFile,
};
