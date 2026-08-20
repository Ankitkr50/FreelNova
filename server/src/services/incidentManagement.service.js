// In-memory incidents store
const incidentsStore = [];

/**
 * Creates or updates a Security Incident workflow item.
 */
const reportSecurityIncident = async (payload) => {
  const { title, severity = "HIGH", affectedSystem, details } = payload;

  const incidentId = `inc-${Date.now()}`;
  const incident = {
    id: incidentId,
    title: title || "Security Alert: Suspicious Login Pattern Detected",
    severity, // LOW | MEDIUM | HIGH | CRITICAL
    affectedSystem: affectedSystem || "AUTH_SERVICE",
    details: details || "Multiple failed logins from new IP subnet.",
    status: "DETECTED", // DETECTED | TRIAGED | CONTAINED | RESOLVED
    createdAt: new Date().toISOString(),
  };

  incidentsStore.unshift(incident);
  return incident;
};

const listSecurityIncidents = async () => {
  if (incidentsStore.length === 0) {
    incidentsStore.push({
      id: "inc-sample-101",
      title: "Elevated Rate Limit Hits on Auth Endpoint",
      severity: "MEDIUM",
      affectedSystem: "RATE_LIMITER",
      details: "IP subnet 103.xx rate limited for 60 seconds.",
      status: "CONTAINED",
      createdAt: new Date().toISOString(),
    });
  }

  return incidentsStore;
};

module.exports = {
  reportSecurityIncident,
  listSecurityIncidents,
};
