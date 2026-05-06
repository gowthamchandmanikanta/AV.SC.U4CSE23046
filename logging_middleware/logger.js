const axios = require("axios");

const LOG_API_URL = "http://20.207.122.201/evaluation-service/logs";

const allowedStacks = new Set(["backend", "frontend"]);
const allowedLevels = new Set(["debug", "info", "warn", "error", "fatal"]);
const allowedPackages = new Set([
  "cache",
  "controller",
  "cron_job",
  "db",
  "domain",
  "handler",
  "repository",
  "route",
  "service",
  "api",
  "component",
  "hook",
  "page",
  "state",
  "style",
  "auth",
  "config",
  "middleware",
  "utils",
]);

function validateLogInput(stack, level, packageName, message) {
  if (!allowedStacks.has(stack)) {
    throw new Error("Invalid stack. Use backend or frontend.");
  }

  if (!allowedLevels.has(level)) {
    throw new Error("Invalid level. Use debug, info, warn, error, or fatal.");
  }

  if (!allowedPackages.has(packageName)) {
    throw new Error("Invalid package name.");
  }

  if (typeof message !== "string" || message.trim() === "") {
    throw new Error("Message must be a non-empty string.");
  }
}

async function Log(stack, level, packageName, message) {
  validateLogInput(stack, level, packageName, message);

  const headers = {};
  if (process.env.LOG_ACCESS_TOKEN) {
    headers.Authorization = `Bearer ${process.env.LOG_ACCESS_TOKEN}`;
  }

  const response = await axios.post(
    LOG_API_URL,
    {
      stack,
      level,
      package: packageName,
      message,
    },
    { headers }
  );

  return response.data;
}

module.exports = Log;
