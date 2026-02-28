export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const { image, mediaType } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType || 'image/jpeg',
                  data: image,
                },
              },
              {
                type: 'text',
                text: 'Analyze this receipt. Return ONLY valid JSON:\n{"vendor":"store name","description":"brief description of items","amount":0.00,"category":"one of: Materials, Labor, Equipment, Permits, Subcontractor, Transportation, Safety, Fuel, Rental, Other","date":"YYYY-MM-DD or empty if not visible"}',
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ error: data.error.message || 'API error' });
    }

    const text = data.content.map((i) => i.text || '').join('');
    const cleaned = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(cleaned);

    return res.status(200).json(result);
  } catch (error) {
    console.error('Scan error:', error);
    return res.status(500).json({ error: 'Failed to scan receipt' });
  }
}
