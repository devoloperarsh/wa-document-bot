export default async function handler(req, res) {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "my_verify_token";
  const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
  const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

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

  if (req.method === "POST") {
    try {
      const body = req.body;

      if (
        body.object === "whatsapp_business_account" &&
        body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
      ) {
        const message = body.entry[0].changes[0].value.messages[0];
        const from = message.from;

        if (message.type === "text") {
          const userText = message.text.body;

          const prompt = `
Write a professional Indian document for: "${userText}"
`;

          const aiText = await generateAI(OPENROUTER_API_KEY, prompt);

          await sendMessage(WHATSAPP_TOKEN, PHONE_NUMBER_ID, from, aiText);
        } else {
          await sendMessage(
            WHATSAPP_TOKEN,
            PHONE_NUMBER_ID,
            from,
            "Please send text only."
          );
        }
      }

      return res.status(200).end();
    } catch (e) {
      console.error("Error:", e);
      return res.status(500).end();
    }
  }

  return res.status(405).send("Method not allowed");
}

async function generateAI(apiKey, prompt) {
  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.0-flash-thinking-exp-1219:free",
      messages: [
        { role: "system", content: "You write clean Indian documents." },
        { role: "user", content: prompt },
      ],
    }),
  });

  const data = await resp.json();
  return (
    data.choices?.[0]?.message?.content ||
    "Sorry, I couldn't generate the document."
  );
}

async function sendMessage(token, phoneId, to, text) {
  await fetch(`https://graph.facebook.com/v24.0/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });
}
