const { prisma } = require("../config/db");
const env = require("../config/env");
const { sendEmail, buildFreelNovaEmailHtml } = require("./email.service");

// Helper to validate UUIDs
const isValidUuid = (id) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

const dispatchNotification = async ({
  recipientIds = [],
  type,
  title,
  message,
  entityType = "",
  entityId = null,
  metadata = {},
}) => {
  // Strip duplicate ids and ensure they are valid UUID strings
  const uniqueRecipientIds = [...new Set(recipientIds.map((id) => String(id)).filter(id => isValidUuid(id)))];
  if (!uniqueRecipientIds.length) {
    return [];
  }

  const docs = uniqueRecipientIds.map((recipientId) => ({
    recipientId,
    type,
    title,
    message,
    entityType,
    entityId: entityId && isValidUuid(String(entityId)) ? String(entityId) : null,
    metadata: metadata || {},
  }));

  // Create notifications in database
  await prisma.notification.createMany({
    data: docs,
  });

  // Fetch the created notifications to return them
  const createdNotifications = await prisma.notification.findMany({
    where: {
      recipientId: { in: uniqueRecipientIds },
      type,
      title,
      message,
    },
    orderBy: { createdAt: "desc" },
    take: uniqueRecipientIds.length,
  });

  if (env.notificationsEmailEnabled) {
    const recipients = await prisma.user.findMany({
      where: { id: { in: uniqueRecipientIds } },
      select: { email: true, name: true },
    });

    await Promise.all(
      recipients.map(async (user) => {
        if (!user.email) return;
        try {
          await sendEmail({
            to: user.email,
            subject: title,
            text: message,
            html: buildFreelNovaEmailHtml({
              headline: title,
              recipientName: user.name || "FreelNova User",
              introText: message,
              codeValue: "",
              whatsNextText: "Log in to your FreelNova dashboard to view details and manage your account.",
            }),
          });
        } catch (error) {
          console.error(`Notification email failed for ${user.email}:`, error.message);
        }
      })
    );
  }

  return createdNotifications;
};

module.exports = {
  dispatchNotification,
};
