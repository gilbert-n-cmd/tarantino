/* ============================================
   Serverless AI Proxy — Vercel / Netlify
   Endpoint: POST /api/chat
   Body: { message: string, history: array }
   ============================================ */

const SYSTEM_PROMPT = `
You are a helpful assistant for Bishop Angelo Tarantino Memorial Secondary School
in Fort Portal, Uganda.

When a user asks for something, reply with a short helpful message and include
the EXACT page link.

Available pages:
- A-Level admission: https://gilbert-n-cmd.github.io/tarantino/a-level.html
- O-Level admission: https://gilbert-n-cmd.github.io/tarantino/o-level.html
- General admissions: https://gilbert-n-cmd.github.io/tarantino/admissions.html
- Fees: https://gilbert-n-cmd.github.io/tarantino/fees.html
- Departments: https://gilbert-n-cmd.github.io/tarantino/departments.html
- Facilities: https://gilbert-n-cmd.github.io/tarantino/facilities.html
- Alumni: https://gilbert-n-cmd.github.io/tarantino/alumni.html
- About: https://gilbert-n-cmd.github.io/tarantino/about.html
- Contact: https://gilbert-n-cmd.github.io/tarantino/contact.html

Rules:
1. Always include a full clickable link (HTML anchor tag is fine).
2. Keep replies under 3 sentences.
3. Be warm, welcoming, and use simple English.
4. If unsure, suggest contacting the school on WhatsApp.
5. Never invent pages or URLs that aren't in the list above.
`;

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { message, history = [] } = req.body || {};
    if (!message) return res.status(400).json({ error: "Missing message" });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Server not configured" });

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.slice(-6),
      { role: "user", content: message }
    ];

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.4,
        max_tokens: 250
      })
    });

    if (!openaiRes.ok) {
      const err = await openaiRes.text();
      console.error("OpenAI error:", err);
      return res.status(500).json({ error: "AI service error" });
    }

    const data = await openaiRes.json();
    const reply = data.choices?.[0]?.message?.content || "Sorry, I couldn't answer that.";

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}

