const express = require("express");
const Log = require("../logging_middleware/logger");
const { fetchDepots, fetchVehicles } = require("./apiClient");
const { buildSchedules } = require("./scheduler");

const app = express();
const port = process.env.VEHICLE_PORT || 3001;

app.get("/schedule", async (req, res) => {
  try {
    await Log("backend", "info", "route", "vehicle scheduling request received");

    const [depots, vehicles] = await Promise.all([fetchDepots(), fetchVehicles()]);
    const schedules = buildSchedules(depots, vehicles);

    await Log("backend", "info", "service", "vehicle schedules generated");

    res.json({ schedules });
  } catch (error) {
    await Log("backend", "error", "handler", `vehicle scheduling failed: ${error.message}`).catch(
      () => {}
    );

    res.status(error.response?.status || 500).json({
      message: "vehicle scheduling failed",
      error: error.response?.data || error.message,
    });
  }
});

if (require.main === module) {
  app.listen(port);
}

module.exports = app;
