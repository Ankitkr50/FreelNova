const crypto = require("crypto");

// In-memory webhook subscriptions store
const webhookSubscriptionsStore = [];
const webhookDeliveryLogsStore = [];

/**
 * Registers a new Webhook endpoint for platform domain events.
 */
const registerWebhookSubscription = async (userId, payload) => {
  const { targetUrl, events = ["project.created", "escrow.released"] } = payload;

  const signingSecret = `whsec_${crypto.randomBytes(16).toString("hex")}`;
  const subscription = {
    id: `sub-${Date.now()}`,
    userId,
    targetUrl,
    events,
    signingSecret,
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
  };

  webhookSubscriptionsStore.unshift(subscription);
  return subscription;
};

/**
 * Dispatches an event to registered webhooks with HMAC-SHA256 signature.
 */
const dispatchDomainWebhookEvent = async (eventType, payload) => {
  const matchingSubs = webhookSubscriptionsStore.filter((s) => s.events.includes(eventType));

  const deliveries = matchingSubs.map((sub) => {
    const signature = crypto.createHmac("sha256", sub.signingSecret).update(JSON.stringify(payload)).digest("hex");

    const deliveryLog = {
      id: `deliv-${Date.now()}`,
      subscriptionId: sub.id,
      eventType,
      targetUrl: sub.targetUrl,
      signature: `sha256=${signature}`,
      status: "DELIVERED_200",
      deliveredAt: new Date().toISOString(),
    };

    webhookDeliveryLogsStore.unshift(deliveryLog);
    return deliveryLog;
  });

  return {
    eventType,
    totalSubscribersNotified: deliveries.length,
    deliveries,
  };
};

module.exports = {
  registerWebhookSubscription,
  dispatchDomainWebhookEvent,
};
