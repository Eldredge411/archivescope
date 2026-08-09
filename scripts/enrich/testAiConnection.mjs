import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");
const envPath = path.join(projectRoot, ".env.local");

const requiredEnvKeys = ["AI_API_KEY", "AI_BASE_URL", "AI_MODEL"];

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
    const content = await readFile(envPath, "utf8");

    return parseEnvFile(content);
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

function buildChatCompletionsUrl(baseUrl) {
  const trimmedBaseUrl = baseUrl.trim().replace(/\/+$/, "");

  if (trimmedBaseUrl.endsWith("/chat/completions")) {
    return trimmedBaseUrl;
  }

  return `${trimmedBaseUrl}/chat/completions`;
}

function printPossibleCauses() {
  console.log("可能原因：");
  console.log("- AI_API_KEY 无效或权限不足。");
  console.log("- AI_BASE_URL 不是 OpenAI-compatible /v1 地址。");
  console.log("- AI_MODEL 模型名称不被当前平台支持。");
  console.log("- 当前网络环境无法访问该第三方平台。");
}

async function main() {
  console.log("正在读取 AI API 连接配置……");

  const localEnv = await loadLocalEnv();
  const config = Object.fromEntries(
    requiredEnvKeys.map((key) => [key, getEnvValue(localEnv, key)]),
  );
  const missingKeys = requiredEnvKeys.filter((key) => !config[key]);

  if (missingKeys.length > 0) {
    console.error("AI API 连接测试缺少必要环境变量：");

    for (const key of missingKeys) {
      console.error(`- ${key}`);
    }

    console.error(`请在 ${envPath} 中配置后重试。`);
    process.exitCode = 1;
    return;
  }

  const endpoint = buildChatCompletionsUrl(config.AI_BASE_URL);

  console.log(`使用的 baseUrl：${config.AI_BASE_URL}`);
  console.log(`使用的 model：${config.AI_MODEL}`);
  console.log(`请求地址：${endpoint}`);
  console.log("正在调用 AI Chat Completions 接口……");

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.AI_MODEL,
        messages: [
          {
            role: "system",
            content: "你是 ArchiveScope 的资料整理助手。",
          },
          {
            role: "user",
            content: "请用一句中文回复：AI 连接测试成功。",
          },
        ],
        temperature: 0.2,
      }),
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error(`AI API 请求失败，HTTP 状态码：${response.status}`);
      console.error("响应内容：");
      console.error(responseText || "(空响应)");
      printPossibleCauses();
      process.exitCode = 1;
      return;
    }

    let responseJson;

    try {
      responseJson = JSON.parse(responseText);
    } catch (error) {
      console.error("AI API 返回内容不是合法 JSON。");
      console.error("响应内容：");
      console.error(responseText || "(空响应)");
      console.error(`解析错误：${error.message}`);
      printPossibleCauses();
      process.exitCode = 1;
      return;
    }

    const message = responseJson?.choices?.[0]?.message;
    const content =
      typeof message?.content === "string" && message.content.trim()
        ? message.content
        : typeof message?.reasoning_content === "string" &&
            message.reasoning_content.trim()
          ? message.reasoning_content
          : "";

    if (content.trim()) {
      console.log("AI 返回内容：");
      console.log(content.trim());
      return;
    }

    console.log(
      "AI API 已返回 JSON，但没有找到 choices[0].message.content 或 reasoning_content：",
    );
    console.log(JSON.stringify(responseJson, null, 2));
  } catch (error) {
    console.error("AI API 请求过程中发生错误。");
    console.error(`错误信息：${error?.message ?? String(error)}`);
    printPossibleCauses();
    process.exitCode = 1;
  }
}

main();
