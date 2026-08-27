/**
 * Centralized utility for resolving uniform user handles and user codes across FreelNova.
 */

export function getDisplayUsername(user) {
  if (!user) return "";

  if (user.email === "fn.freelnova@gmail.com" || user.role === "admin") {
    return user.username || "admin_freelnova";
  }

  if (user.username && !user.username.toUpperCase().startsWith("FID") && !user.username.toUpperCase().startsWith("AID")) {
    return user.username.replace(/^@/, "");
  }

  if (user.email && user.email.includes("@")) {
    return user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9_-]/g, "");
  }

  return "";
}

export function getDisplayUserCode(user) {
  if (!user) return "FID00000001";

  if (user.email === "fn.freelnova@gmail.com" || user.role === "admin") {
    return user.userCode || "AID00000001";
  }

  return user.userCode || "FID00000001";
}
