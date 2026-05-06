const axios = require("axios");
const Log = require("../logging_middleware/logger");

const BASE_URL = "http://20.207.122.201/evaluation-service";

function authHeaders() {
  if (!process.env.LOG_ACCESS_TOKEN) {
    throw new Error("LOG_ACCESS_TOKEN is required");
  }

  return {
    Authorization: `Bearer ${process.env.LOG_ACCESS_TOKEN}`,
  };
}

async function fetchDepots() {
  await Log("backend", "info", "service", "fetching depots for vehicle scheduling");

  const response = await axios.get(`${BASE_URL}/depots`, {
    headers: authHeaders(),
  });

  await Log("backend", "info", "service", "depots fetched for vehicle scheduling");
  return response.data;
}

async function fetchVehicles() {
  await Log("backend", "info", "service", "fetching vehicles for scheduling");

  const response = await axios.get(`${BASE_URL}/vehicles`, {
    headers: authHeaders(),
  });

  await Log("backend", "info", "service", "vehicles fetched for scheduling");
  return response.data;
}

module.exports = {
  fetchDepots,
  fetchVehicles,
};
