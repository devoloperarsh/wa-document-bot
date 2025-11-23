export default async function handler(req, res) {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "arshath0818";
  const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
  const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

  // --- CHECK IF TOKEN IS MISSING ---
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    console.error("❌ Missing WHATSAPP_TOKEN or PHONE_NUMBER_ID");
    return res.status(500).json({ error: "Missing environment variables" });
  }

  // --- VERIFY WEBHOOK ---
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    } else {
      return res.status(403).send("Verification failed");
    }
  }

  // --- HANDLE INCOMING MESSAGES ---
  if (req.method === "POST") {
    try {
      const entry = req.body.entry?.[0]?.changes?.[0]?.value;
      const message = entry?.messages?.[0];

      if (!message) return res.sendStatus(200);

      const from = message.from;
      const incoming_text = message.text?.body || "";

      console.log("📩 New message:", incoming_text);

      // ---- SEND REPLY ----
      const url = `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`;

      const payload = {
        messaging_product: "whatsapp",
        to: from,
        type: "text",
        text: { body: `You said: ${incoming_text}` },
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log("📤 WhatsApp API response:", data);

      return res.sendStatus(200);
    } catch (err) {
      console.error("❌ ERROR:", err);
      return res.sendStatus(500);
    }
  }

  return res.status(405).send("Method Not Allowed");
}

