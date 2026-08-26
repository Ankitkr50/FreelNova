const https = require("https");

function callClean() {
  https.get("https://freelnova.onrender.com/api/clean-ankit-user", (res) => {
    let data = "";
    res.on("data", (chunk) => (data += chunk));
    res.on("end", () => {
      console.log("\n=== CLEANUP ENDPOINT RESPONSE FROM RENDER ===");
      console.log("Status:", res.statusCode);
      console.log("Response:", data);
      console.log("============================================\n");
    });
  }).on("error", (err) => {
    console.error("Clean error:", err.message);
  });
}

callClean();
