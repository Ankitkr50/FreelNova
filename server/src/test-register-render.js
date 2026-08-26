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

async function testRegisterRender() {
  console.log("\n=== Testing Live Render Register API ===");
  const res = await sendPost("/api/auth/register", {
    name: "Ankit Test",
    email: "ankitkumar829301@gmail.com",
    password: "Password123!",
    role: "freelancer",
  });
  console.log("Status:", res.status, "Body:", res.data);
}

testRegisterRender();
