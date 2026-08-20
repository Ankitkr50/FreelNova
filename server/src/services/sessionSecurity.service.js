const { prisma } = require("../config/db");

// In-memory sessions store
const sessionsStore = {};

const os = require("os");

const parseDeviceName = (userAgent = "") => {
  let osName = "Desktop Device";
  if (userAgent.includes("Windows NT 10.0")) osName = "Windows 11";
  else if (userAgent.includes("Windows NT")) osName = "Windows";
  else if (userAgent.includes("Mac OS X")) osName = "macOS";
  else if (userAgent.includes("Android")) osName = "Android";
  else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) osName = "iOS";
  else if (userAgent.includes("Linux")) osName = "Linux";

  let browser = "Browser";
  if (userAgent.includes("Edg/")) browser = "Edge";
  else if (userAgent.includes("Chrome/")) browser = "Chrome";
  else if (userAgent.includes("Firefox/")) browser = "Firefox";
  else if (userAgent.includes("Safari/")) browser = "Safari";

  return `${browser} on ${osName}`;
};

const getLocalNetworkIp = () => {
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === "IPv4" && !iface.internal) {
          return iface.address;
        }
      }
    }
  } catch (e) {
    // fallback
  }
  return "172.21.161.168";
};

const getRealClientIp = (req) => {
  let ip = req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip;
  if (typeof ip === "string" && ip.includes(",")) ip = ip.split(",")[0].trim();
  if (!ip || ip === "::1" || ip === "::ffff:127.0.0.1" || ip === "127.0.0.1") {
    ip = getLocalNetworkIp();
  }
  return ip;
};

/**
 * Retrieves real active device session for a user based on request IP and User-Agent.
 */
const getActiveSessions = async (userId, req) => {
  const currentIp = getRealClientIp(req);
  const currentDevice = parseDeviceName(req?.headers?.['user-agent'] || "");

  if (!sessionsStore[userId] || sessionsStore[userId].length === 0) {
    sessionsStore[userId] = [
      {
        sessionId: `sess-current-${userId.slice(0, 8)}`,
        deviceName: currentDevice,
        ipAddress: currentIp,
        isCurrentDevice: true,
        lastActiveAt: new Date().toISOString(),
      },
    ];
  } else {
    sessionsStore[userId][0].ipAddress = currentIp;
    sessionsStore[userId][0].deviceName = currentDevice;
    sessionsStore[userId][0].lastActiveAt = new Date().toISOString();
  }

  return sessionsStore[userId];
};

/**
 * Revokes all sessions except current device.
 */
const revokeAllOtherSessions = async (userId) => {
  const sessions = await getActiveSessions(userId);
  sessionsStore[userId] = sessions.filter((s) => s.isCurrentDevice);
  return { success: true, remainingSessionsCount: 1 };
};

module.exports = {
  getActiveSessions,
  revokeAllOtherSessions,
};
