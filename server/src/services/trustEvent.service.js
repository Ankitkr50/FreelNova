const { prisma } = require("../config/db");

// In-memory immutable trust event log
const trustEventsStore = [];

/**
 * Records an immutable platform trust event.
 */
const recordTrustEvent = async (userId, eventType, data = {}) => {
  const eventId = `tr-event-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const eventRecord = {
    id: eventId,
    userId,
    eventType, // CONTRACT_COMPLETED | MILESTONE_RELEASED | PAYMENT_RECEIVED | LATE_DELIVERY | DISPUTE_RAISED | REVIEW_LEFT
    data,
    timestamp: new Date().toISOString(),
  };

  trustEventsStore.unshift(eventRecord);
  return eventRecord;
};

/**
 * Retrieves audit history of trust events for a user.
 */
const getUserTrustEvents = async (userId) => {
  const events = trustEventsStore.filter((e) => e.userId === userId);

  return {
    userId,
    totalEvents: events.length,
    events: events.slice(0, 20),
  };
};

module.exports = {
  recordTrustEvent,
  getUserTrustEvents,
};
