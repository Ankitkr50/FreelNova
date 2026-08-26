/**
 * Centralized utility for resolving uniform user handles and user codes across FreelNova.
 */

export function getDisplayUsername(user) {
  if (!user) return "user";

  if (user.email === "fn.freelnova@gmail.com" || user.role === "admin") {
    return "admin_freelnova";
  }

  if (user.username && !user.username.includes("@")) {
    return user.username;
  }

  if (user.username && user.username.includes("@")) {
    return user.username.split("@")[0];
  }

  if (user.email && user.email.includes("@")) {
    return user.email.split("@")[0];
  }

  return user.name ? user.name.toLowerCase().replace(/\s+/g, "") : "user";
}

export function getDisplayUserCode(user) {
  if (!user) return "FID00000001";

  if (user.email === "fn.freelnova@gmail.com" || user.role === "admin") {
    return user.userCode || "AID00000001";
  }

  return user.userCode || "FID00000001";
}
