// api/gemini.js
// Vercel Serverless Function to proxy Gemini API calls
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Ensure the environment variable is present
  const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error: Gemini API Key missing.' });
  }

  try {
    const { model, parts } = req.body;

    if (!model || !parts) {
      return res.status(400).json({ error: 'Bad Request: model and parts are required.' });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const response = await fetch(url, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "x-goog-api-key": apiKey 
      },
      body: JSON.stringify({ contents: [{ parts }] })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `Upstream error: ${errorText}` });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('[Proxy Error] Gemini:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
