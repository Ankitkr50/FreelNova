const https = require("https");

function sendPost(path, body) {
  return new Promise((resolve) => {
    const payload = JSON.stringify(body);
    const req = https.request(
      {
        hostname: "freelnova.onrender.com",
        path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      }
    );
    req.on("error", (e) => resolve({ error: e.message }));
    req.write(payload);
    req.end();
  });
}

async function debugAllFlows() {
  console.log("\n=======================================================");
  console.log("🔍 TESTING ALL AUTH FLOWS FOR ankitkumar829301@gmail.com");
  console.log("=======================================================\n");

  console.log("1. Testing REGISTER (POST /api/auth/register)...");
  const regRes = await sendPost("/api/auth/register", {
    name: "Ankit Kumar",
    email: "ankitkumar829301@gmail.com",
    password: "Password123!",
    role: "freelancer",
  });
  console.log("   -> Register HTTP Status:", regRes.status);
  console.log("   -> Register Response:", JSON.stringify(regRes.data));

  console.log("\n2. Testing LOGIN (POST /api/auth/login)...");
  const loginRes = await sendPost("/api/auth/login", {
    email: "ankitkumar829301@gmail.com",
    password: "Password123!",
    role: "freelancer",
  });
  console.log("   -> Login HTTP Status:", loginRes.status);
  console.log("   -> Login Response:", JSON.stringify(loginRes.data));

  console.log("\n=======================================================\n");
}

debugAllFlows();
