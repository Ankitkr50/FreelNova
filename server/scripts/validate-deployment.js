/* eslint-disable no-console */
const crypto = require("crypto");

const cfg = {
  baseUrl: process.env.VALIDATE_BASE_URL || "",
  corsOrigin: process.env.VALIDATE_CORS_ORIGIN || "",
  recruiterEmail: process.env.VALIDATE_RECRUITER_EMAIL || "",
  recruiterPassword: process.env.VALIDATE_RECRUITER_PASSWORD || "",
  freelancerEmail: process.env.VALIDATE_FREELANCER_EMAIL || "",
  freelancerPassword: process.env.VALIDATE_FREELANCER_PASSWORD || "",
  adminEmail: process.env.VALIDATE_ADMIN_EMAIL || "",
  adminPassword: process.env.VALIDATE_ADMIN_PASSWORD || "",
  openProjectId: process.env.VALIDATE_OPEN_PROJECT_ID || "",
  applyProjectId: process.env.VALIDATE_APPLY_PROJECT_ID || "",
  selectableProjectId: process.env.VALIDATE_SELECTABLE_PROJECT_ID || "",
  selectFreelancerId: process.env.VALIDATE_SELECT_FREELANCER_ID || "",
  paymentId: process.env.VALIDATE_PAYMENT_ID || "",
  paymentProjectId: process.env.VALIDATE_PAYMENT_PROJECT_ID || "",
  paymentAmount: Number(process.env.VALIDATE_PAYMENT_AMOUNT || 0),
  paymentCurrency: process.env.VALIDATE_PAYMENT_CURRENCY || "INR",
  webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || "",
  paymentGatewayOrderId: process.env.VALIDATE_PAYMENT_GATEWAY_ORDER_ID || "",
};

if (!cfg.baseUrl) {
  console.error("Missing VALIDATE_BASE_URL");
  process.exit(1);
}

const stripSlash = (url) => url.replace(/\/+$/, "");
const apiBase = stripSlash(cfg.baseUrl);

const state = {
  recruiterToken: "",
  freelancerToken: "",
  adminToken: "",
  passed: 0,
  failed: 0,
  skipped: 0,
};

const now = () => new Date().toISOString();
const line = (status, label, extra = "") => {
  const symbol = status === "PASS" ? "OK" : status === "SKIP" ? "--" : "XX";
  console.log(`[${now()}] [${symbol}] ${label}${extra ? ` | ${extra}` : ""}`);
};

async function callApi({
  method = "GET",
  path,
  token = "",
  body,
  headers = {},
  rawBody = null,
}) {
  const finalHeaders = { ...headers };
  if (token) finalHeaders.Authorization = `Bearer ${token}`;
  const init = { method, headers: finalHeaders };

  if (rawBody !== null) {
    init.body = rawBody;
  } else if (body !== undefined) {
    finalHeaders["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  const response = await fetch(`${apiBase}${path}`, init);
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { response, json, text };
}

function pass(label, extra = "") {
  state.passed += 1;
  line("PASS", label, extra);
}

function fail(label, extra = "") {
  state.failed += 1;
  line("FAIL", label, extra);
}

function skip(label, extra = "") {
  state.skipped += 1;
  line("SKIP", label, extra);
}

async function checkHealth() {
  const { response } = await callApi({ path: "/api/health" });
  if (response.status === 200) pass("health endpoint");
  else fail("health endpoint", `status=${response.status}`);

  const ready = await callApi({ path: "/api/ready" });
  if (ready.response.status === 200) pass("readiness endpoint");
  else fail("readiness endpoint", `status=${ready.response.status}`);
}

async function checkCors() {
  if (!cfg.corsOrigin) {
    skip("cors preflight", "set VALIDATE_CORS_ORIGIN");
    return;
  }
  const { response } = await callApi({
    method: "OPTIONS",
    path: "/api/auth/login",
    headers: {
      Origin: cfg.corsOrigin,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type,authorization",
    },
  });

  const allowOrigin = response.headers.get("access-control-allow-origin");
  if (response.status < 500 && allowOrigin === cfg.corsOrigin) {
    pass("cors preflight", `allow-origin=${allowOrigin}`);
  } else {
    fail("cors preflight", `status=${response.status} allow-origin=${allowOrigin}`);
  }
}

async function loginRole(label, email, password, storeKey) {
  if (!email || !password) {
    skip(`${label} login`, "set credentials env");
    return;
  }
  const { response, json } = await callApi({
    method: "POST",
    path: "/api/auth/login",
    body: { email, password },
  });

  if (response.status !== 200 || !json?.data?.accessToken) {
    fail(`${label} login`, `status=${response.status}`);
    return;
  }
  state[storeKey] = json.data.accessToken;
  pass(`${label} login`);
}

async function authAndProfileChecks() {
  await loginRole("recruiter", cfg.recruiterEmail, cfg.recruiterPassword, "recruiterToken");
  await loginRole("freelancer", cfg.freelancerEmail, cfg.freelancerPassword, "freelancerToken");
  await loginRole("admin", cfg.adminEmail, cfg.adminPassword, "adminToken");

  if (state.recruiterToken) {
    const profile = await callApi({
      path: "/api/users/profile",
      token: state.recruiterToken,
    });
    if (profile.response.status === 200) pass("recruiter profile");
    else fail("recruiter profile", `status=${profile.response.status}`);
  }

  if (state.freelancerToken) {
    const resume = await callApi({
      method: "PUT",
      path: "/api/users/profile/resume",
      token: state.freelancerToken,
      body: {
        resumeUrl: "https://res.cloudinary.com/demo/raw/upload/v1/sample-resume.pdf",
        resumeName: "sample-resume.pdf",
        resumeMimeType: "application/pdf",
        resumeSize: 200000,
        resumePublicId: "sample-resume",
      },
    });
    if (resume.response.status === 200) pass("resume metadata update");
    else fail("resume metadata update", `status=${resume.response.status}`);
  }
}

async function projectFlowChecks() {
  if (!state.freelancerToken) {
    skip("projects list/apply", "missing freelancer token");
    return;
  }

  const list = await callApi({ path: "/api/projects", token: state.freelancerToken });
  if (list.response.status === 200) pass("projects list");
  else fail("projects list", `status=${list.response.status}`);

  if (cfg.openProjectId) {
    const details = await callApi({
      path: `/api/projects/${cfg.openProjectId}`,
      token: state.freelancerToken,
    });
    if (details.response.status === 200) pass("project details");
    else fail("project details", `status=${details.response.status}`);
  } else {
    skip("project details", "set VALIDATE_OPEN_PROJECT_ID");
  }

  if (cfg.applyProjectId) {
    const apply = await callApi({
      method: "POST",
      path: `/api/projects/${cfg.applyProjectId}/apply`,
      token: state.freelancerToken,
      body: {
        proposal:
          "Production validation apply flow. I can deliver this project with secure API standards.",
        bidAmount: 500,
        deliveryDays: 10,
      },
    });
    if (apply.response.status === 201 || apply.response.status === 409) {
      pass("project apply flow", `status=${apply.response.status}`);
    } else {
      fail("project apply flow", `status=${apply.response.status}`);
    }
  } else {
    skip("project apply flow", "set VALIDATE_APPLY_PROJECT_ID");
  }

  if (state.recruiterToken && cfg.selectableProjectId && cfg.selectFreelancerId) {
    const select = await callApi({
      method: "POST",
      path: `/api/projects/${cfg.selectableProjectId}/select`,
      token: state.recruiterToken,
      body: {
        freelancerId: cfg.selectFreelancerId,
        startNow: true,
      },
    });
    if (select.response.status === 200 || select.response.status === 409) {
      pass("project select flow", `status=${select.response.status}`);
    } else {
      fail("project select flow", `status=${select.response.status}`);
    }
  } else {
    skip(
      "project select flow",
      "set recruiter creds + VALIDATE_SELECTABLE_PROJECT_ID + VALIDATE_SELECT_FREELANCER_ID"
    );
  }
}

async function paymentAndWebhookChecks() {
  if (state.recruiterToken && cfg.paymentProjectId && cfg.paymentAmount > 0) {
    const paymentCreate = await callApi({
      method: "POST",
      path: "/api/payments/create",
      token: state.recruiterToken,
      headers: { "x-idempotency-key": `validate-${Date.now()}` },
      body: {
        projectId: cfg.paymentProjectId,
        amount: cfg.paymentAmount,
        currency: cfg.paymentCurrency,
      },
    });
    if ([200, 201, 400, 403].includes(paymentCreate.response.status)) {
      pass("payment create endpoint reachable", `status=${paymentCreate.response.status}`);
    } else {
      fail("payment create endpoint reachable", `status=${paymentCreate.response.status}`);
    }
  } else {
    skip("payment create", "set recruiter creds + VALIDATE_PAYMENT_PROJECT_ID + VALIDATE_PAYMENT_AMOUNT");
  }

  if (state.recruiterToken && cfg.paymentId) {
    const release = await callApi({
      method: "POST",
      path: "/api/payments/release",
      token: state.recruiterToken,
      body: {
        paymentId: cfg.paymentId,
        forceRelease: false,
        releaseNote: "Deployment validation release check",
      },
    });
    if ([200, 400, 403].includes(release.response.status)) {
      pass("payment release endpoint reachable", `status=${release.response.status}`);
    } else {
      fail("payment release endpoint reachable", `status=${release.response.status}`);
    }
  } else {
    skip("payment release", "set recruiter creds + VALIDATE_PAYMENT_ID");
  }

  if (!cfg.webhookSecret || !cfg.paymentGatewayOrderId) {
    skip("webhook validation", "set RAZORPAY_WEBHOOK_SECRET + VALIDATE_PAYMENT_GATEWAY_ORDER_ID");
    return;
  }

  const payload = {
    event: "payment.captured",
    created_at: Math.floor(Date.now() / 1000),
    payload: {
      payment: {
        entity: {
          id: `pay_validate_${Date.now()}`,
          order_id: cfg.paymentGatewayOrderId,
        },
      },
    },
  };

  const raw = Buffer.from(JSON.stringify(payload));
  const signature = crypto
    .createHmac("sha256", cfg.webhookSecret)
    .update(raw)
    .digest("hex");

  const webhook = await callApi({
    method: "POST",
    path: "/api/payments/webhook",
    headers: {
      "Content-Type": "application/json",
      "x-razorpay-signature": signature,
      "x-razorpay-event-id": `evt_validate_${Date.now()}`,
    },
    rawBody: raw,
  });

  if (webhook.response.status === 200) {
    pass("webhook signature + processing");
  } else {
    fail("webhook signature + processing", `status=${webhook.response.status}`);
  }
}

async function notificationsAndAdminChecks() {
  if (state.adminToken) {
    const adminUsers = await callApi({
      path: "/api/admin/users?limit=5",
      token: state.adminToken,
    });
    if (adminUsers.response.status === 200) pass("admin list users");
    else fail("admin list users", `status=${adminUsers.response.status}`);
  } else {
    skip("admin checks", "set admin credentials env");
  }

  if (state.recruiterToken) {
    const notifications = await callApi({
      path: "/api/notifications?limit=5",
      token: state.recruiterToken,
    });
    if (notifications.response.status === 200) pass("notifications list");
    else fail("notifications list", `status=${notifications.response.status}`);
  } else {
    skip("notifications list", "missing recruiter token");
  }
}

async function main() {
  console.log(`\nValidation target: ${apiBase}\n`);
  await checkHealth();
  await checkCors();
  await authAndProfileChecks();
  await projectFlowChecks();
  await paymentAndWebhookChecks();
  await notificationsAndAdminChecks();

  console.log("\nSummary");
  console.log(`Passed: ${state.passed}`);
  console.log(`Failed: ${state.failed}`);
  console.log(`Skipped: ${state.skipped}`);

  if (state.failed > 0) {
    process.exit(1);
  }
}

const { cleanTestData } = require("./clean-test-data");

main()
  .catch((error) => {
    console.error("Validation runner failed:", error.message);
    process.exit(1);
  })
  .finally(async () => {
    console.log("\n🧹 Automatically purging deployment validation test data...");
    await cleanTestData();
  });


