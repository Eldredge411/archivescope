import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");
const envPath = path.join(projectRoot, ".env.local");

const defaultFirecrawlBaseUrl = "https://api.firecrawl.dev";
const testUrl = "https://www.archives.gov/records-mgmt";

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

function buildFirecrawlScrapeUrl(baseUrl) {
  const trimmedBaseUrl = String(baseUrl || defaultFirecrawlBaseUrl)
    .trim()
    .replace(/\/+$/, "");

  if (trimmedBaseUrl.endsWith("/v2/scrape")) {
    return trimmedBaseUrl;
  }

  return `${trimmedBaseUrl}/v2/scrape`;
}

function pickFirstString(...values) {
  return values.find((value) => typeof value === "string" && value.trim()) ?? "";
}

function extractMarkdown(responseJson) {
  return pickFirstString(
    responseJson?.data?.markdown,
    responseJson?.markdown,
    responseJson?.data?.content,
    responseJson?.content,
  );
}

function printPossibleCauses() {
  console.log("可能原因：");
  console.log("- FIRECRAWL_API_KEY 无效或额度不足。");
  console.log("- FIRECRAWL_BASE_URL 不是 Firecrawl API 地址。");
  console.log("- 当前网络环境无法访问 Firecrawl。");
  console.log("- 目标网页暂时无法被 Firecrawl 抓取。");
}

async function main() {
  console.log("正在读取 Firecrawl 连接配置……");

  const localEnv = await loadLocalEnv();
  const apiKey = getEnvValue(localEnv, "FIRECRAWL_API_KEY");
  const baseUrl =
    getEnvValue(localEnv, "FIRECRAWL_BASE_URL") || defaultFirecrawlBaseUrl;

  if (!apiKey) {
    console.error("Firecrawl 连接测试缺少必要环境变量：");
    console.error("- FIRECRAWL_API_KEY");
    console.error(`请在 ${envPath} 中配置后重试。`);
    process.exitCode = 1;
    return;
  }

  const endpoint = buildFirecrawlScrapeUrl(baseUrl);

  console.log(`使用的 Firecrawl baseUrl：${baseUrl}`);
  console.log(`请求地址：${endpoint}`);
  console.log(`测试 URL：${testUrl}`);
  console.log("正在调用 Firecrawl Scrape API……");

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: testUrl,
        formats: ["markdown"],
        onlyMainContent: true,
      }),
    });
    const responseText = await response.text();

    if (!response.ok) {
      console.error(`Firecrawl 请求失败，HTTP 状态码：${response.status}`);
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
      console.error("Firecrawl 返回内容不是合法 JSON。");
      console.error("响应内容：");
      console.error(responseText || "(空响应)");
      console.error(`解析错误：${error.message}`);
      printPossibleCauses();
      process.exitCode = 1;
      return;
    }

    const markdown = extractMarkdown(responseJson);

    if (!markdown) {
      console.error("Firecrawl 已返回 JSON，但未找到 markdown 或 content 字段。");
      console.error("完整 JSON：");
      console.error(JSON.stringify(responseJson, null, 2));
      printPossibleCauses();
      process.exitCode = 1;
      return;
    }

    console.log("Firecrawl 连接成功。");
    console.log(`Markdown 字符数：${markdown.length}`);
    console.log("Markdown 前 1000 个字符：");
    console.log(markdown.slice(0, 1000));
  } catch (error) {
    console.error("Firecrawl 请求过程中发生错误。");
    console.error(`错误原因：${error?.message ?? String(error)}`);
    printPossibleCauses();
    process.exitCode = 1;
  }
}

main();
