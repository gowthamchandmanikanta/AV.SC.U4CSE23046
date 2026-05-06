const express = require("express");
const axios = require("axios");
const Log = require("../logging_middleware/logger");
const { getPriorityNotifications } = require("./priority");

const app = express();
const port = process.env.NOTIFICATION_PORT || 3002;
const NOTIFICATIONS_URL = "http://20.207.122.201/evaluation-service/notifications";

function authHeaders() {
  if (!process.env.LOG_ACCESS_TOKEN) {
    throw new Error("LOG_ACCESS_TOKEN is required");
  }

  return {
    Authorization: `Bearer ${process.env.LOG_ACCESS_TOKEN}`,
  };
}

app.get("/priority-notifications", async (req, res) => {
  try {
    const limit = req.query.limit || 10;
    await Log("backend", "info", "route", "priority notification request received");

    const response = await axios.get(NOTIFICATIONS_URL, {
      headers: authHeaders(),
    });

    await Log("backend", "info", "service", "notifications fetched for priority inbox");

    const notifications = getPriorityNotifications(response.data, limit);

    await Log("backend", "info", "service", "priority notifications generated");

    res.json({ notifications });
  } catch (error) {
    await Log(
      "backend",
      "error",
      "handler",
      `priority notification generation failed: ${error.message}`
    ).catch(() => {});

    res.status(error.response?.status || 500).json({
      message: "priority notification generation failed",
      error: error.response?.data || error.message,
    });
  }
});

if (require.main === module) {
  app.listen(port);
}

module.exports = app;
