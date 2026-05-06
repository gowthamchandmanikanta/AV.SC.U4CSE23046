function normalizeDepots(payload) {
  const depots = Array.isArray(payload) ? payload : payload.depots || [];

  return depots.map((depot) => ({
    id: depot.ID ?? depot.id,
    mechanicHours: Number(depot.MechanicHours ?? depot.mechanicHours),
  }));
}

function normalizeVehicles(payload) {
  const vehicles = Array.isArray(payload) ? payload : payload.vehicles || [];

  return vehicles.map((vehicle) => ({
    taskId: vehicle.TaskID ?? vehicle.taskId ?? vehicle.id,
    duration: Number(vehicle.Duration ?? vehicle.duration),
    impact: Number(vehicle.Impact ?? vehicle.impact),
  }));
}

function maximizeImpact(vehicles, availableHours) {
  const capacity = Math.max(0, Math.floor(availableHours));
  const dp = Array.from({ length: capacity + 1 }, () => ({
    totalImpact: 0,
    usedHours: 0,
    selectedVehicles: [],
  }));

  for (const vehicle of vehicles) {
    const duration = Math.floor(vehicle.duration);
    const impact = vehicle.impact;

    if (duration <= 0 || impact <= 0 || duration > capacity) {
      continue;
    }

    for (let hours = capacity; hours >= duration; hours -= 1) {
      const previous = dp[hours - duration];
      const candidate = {
        totalImpact: previous.totalImpact + impact,
        usedHours: previous.usedHours + duration,
        selectedVehicles: [...previous.selectedVehicles, vehicle],
      };

      if (
        candidate.totalImpact > dp[hours].totalImpact ||
        (candidate.totalImpact === dp[hours].totalImpact &&
          candidate.usedHours < dp[hours].usedHours)
      ) {
        dp[hours] = candidate;
      }
    }
  }

  return dp.reduce((best, current) => {
    if (current.totalImpact > best.totalImpact) {
      return current;
    }

    if (current.totalImpact === best.totalImpact && current.usedHours < best.usedHours) {
      return current;
    }

    return best;
  }, dp[0]);
}

function buildSchedules(depotsPayload, vehiclesPayload) {
  const depots = normalizeDepots(depotsPayload);
  const vehicles = normalizeVehicles(vehiclesPayload);

  return depots.map((depot) => {
    const best = maximizeImpact(vehicles, depot.mechanicHours);

    return {
      depotId: depot.id,
      mechanicHours: depot.mechanicHours,
      usedHours: best.usedHours,
      remainingHours: depot.mechanicHours - best.usedHours,
      totalImpact: best.totalImpact,
      selectedTaskIds: best.selectedVehicles.map((vehicle) => vehicle.taskId),
      selectedVehicles: best.selectedVehicles,
    };
  });
}

module.exports = {
  buildSchedules,
  maximizeImpact,
  normalizeDepots,
  normalizeVehicles,
};
