const dotenv = require("dotenv");

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN || "";
const WEBHOOK_URL = process.env.WEBHOOK_URL || "";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";

async function main() {
  if (!BOT_TOKEN) {
    throw new Error("Missing BOT_TOKEN in .env");
  }
  if (!WEBHOOK_URL) {
    throw new Error("Missing WEBHOOK_URL in .env");
  }
  if (!WEBHOOK_SECRET) {
    throw new Error("Missing WEBHOOK_SECRET in .env");
  }

  const url = `https://bot-api.zaloplatforms.com/bot${BOT_TOKEN}/setWebhook`;
  const payload = {
    url: WEBHOOK_URL,
    secret_token: WEBHOOK_SECRET
  };

  console.log("Setting webhook...");
  console.log(payload);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    console.error("Response:", data);
    process.exit(1);
  }

  console.log("Webhook set successfully:");
  console.log(JSON.stringify(data, null, 2));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
