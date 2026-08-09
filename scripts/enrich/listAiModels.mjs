import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");
const envPath = path.join(projectRoot, ".env.local");

function parseEnvFile(content) {
  const env = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (!key) {
      continue;
    }

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

async function loadLocalEnv() {
  try {
    return parseEnvFile(await readFile(envPath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") {
      return {};
    }

    throw error;
  }
}

function getEnvValue(localEnv, key) {
  return String(localEnv[key] ?? process.env[key] ?? "").trim();
}

function buildModelsUrl(baseUrl) {
  const trimmedBaseUrl = baseUrl.trim().replace(/\/+$/, "");

  if (trimmedBaseUrl.endsWith("/models")) {
    return trimmedBaseUrl;
  }

  if (trimmedBaseUrl.endsWith("/chat/completions")) {
    return `${trimmedBaseUrl.slice(0, -"/chat/completions".length)}/models`;
  }

  if (trimmedBaseUrl.endsWith("/responses")) {
    return `${trimmedBaseUrl.slice(0, -"/responses".length)}/models`;
  }

  return `${trimmedBaseUrl}/models`;
}

function normalizeModels(responseJson) {
  if (Array.isArray(responseJson?.data)) {
    return responseJson.data;
  }

  if (Array.isArray(responseJson?.models)) {
    return responseJson.models;
  }

  if (Array.isArray(responseJson)) {
    return responseJson;
  }

  return [];
}

async function main() {
  console.log("正在读取 AI 平台可用模型列表……");

  const localEnv = await loadLocalEnv();
  const apiKey = getEnvValue(localEnv, "AI_API_KEY");
  const baseUrl = getEnvValue(localEnv, "AI_BASE_URL");

  if (!apiKey || !baseUrl) {
    console.error("缺少 AI_API_KEY 或 AI_BASE_URL，请先检查 .env.local。");
    process.exitCode = 1;
    return;
  }

  const endpoint = buildModelsUrl(baseUrl);

  console.log(`请求地址：${endpoint}`);

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });
    const responseText = await response.text();

    if (!response.ok) {
      console.error(`读取模型列表失败，HTTP 状态码：${response.status}`);
      console.error("响应内容：");
      console.error(responseText || "(空响应)");
      process.exitCode = 1;
      return;
    }

    let responseJson;

    try {
      responseJson = JSON.parse(responseText);
    } catch (error) {
      console.error("模型列表返回内容不是合法 JSON。");
      console.error(`解析错误：${error.message}`);
      console.error(responseText || "(空响应)");
      process.exitCode = 1;
      return;
    }

    const models = normalizeModels(responseJson);

    if (models.length === 0) {
      console.log("平台返回了 JSON，但没有找到 data/models 数组。原始返回如下：");
      console.log(JSON.stringify(responseJson, null, 2));
      return;
    }

    console.log(`可用模型数量：${models.length}`);
    console.log("请把下面某一行的 id 填入 .env.local 的 AI_MODEL：");

    for (const model of models) {
      const id =
        typeof model === "string"
          ? model
          : String(model?.id ?? model?.name ?? model?.model ?? "").trim();
      const owner =
        typeof model === "object" && model?.owned_by
          ? `，owned_by: ${model.owned_by}`
          : "";

      if (id) {
        console.log(`- ${id}${owner}`);
      }
    }
  } catch (error) {
    console.error("读取模型列表时发生错误。");
    console.error(`错误信息：${error?.message ?? String(error)}`);
    process.exitCode = 1;
  }
}

main();
