// api/openrouter.js
// Vercel Serverless Function to proxy OpenRouter API calls
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Ensure the environment variable is present
  const apiKey = process.env.VITE_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error: OpenRouter API Key missing.' });
  }

  try {
    const { model, messages } = req.body;

    if (!model || !messages) {
      return res.status(400).json({ error: 'Bad Request: model and messages are required.' });
    }

    // Pass the host URL as HTTP-Referer as required by OpenRouter
    const referer = req.headers.referer || req.headers.host || 'https://sami-lexmark.vercel.app';

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": referer,
        "X-Title": "SAMI-Lexmark"
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `Upstream error: ${errorText}` });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('[Proxy Error] OpenRouter:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
