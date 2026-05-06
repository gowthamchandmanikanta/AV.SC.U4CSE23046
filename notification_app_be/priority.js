const TYPE_PRIORITY = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

function normalizeNotifications(payload) {
  const notifications = Array.isArray(payload) ? payload : payload.notifications || [];

  return notifications.map((notification) => ({
    id: notification.ID ?? notification.id,
    type: notification.Type ?? notification.type,
    message: notification.Message ?? notification.message,
    timestamp: notification.Timestamp ?? notification.timestamp,
    priorityWeight: TYPE_PRIORITY[notification.Type ?? notification.type] || 0,
  }));
}

function getPriorityNotifications(payload, limit = 10) {
  const safeLimit = Number.isFinite(Number(limit)) ? Number(limit) : 10;

  return normalizeNotifications(payload)
    .sort((a, b) => {
      if (b.priorityWeight !== a.priorityWeight) {
        return b.priorityWeight - a.priorityWeight;
      }

      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    })
    .slice(0, safeLimit);
}

module.exports = {
  getPriorityNotifications,
  normalizeNotifications,
};
