import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { fileUrl } = await request.json()

  if (!fileUrl) {
    return NextResponse.json({ error: 'No file URL provided' }, { status: 400 })
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Look at this document and extract the following fields as JSON: document_type, employee (name if visible), expiration_date (YYYY-MM-DD format if possible), issuing_authority, document_number (if relevant), and confidence (a number 0 to 1 for how sure you are). If a field is not visible, use null.',
            },
            {
              type: 'image_url',
              image_url: { url: fileUrl },
            },
          ],
        },
      ],
    }),
  })

  const data = await response.json()

 if (!response.ok) {
    return NextResponse.json({ error: data.error?.message || 'AI request failed' }, { status: 500 })
  }

  const extracted = JSON.parse(data.choices[0].message.content)
  return NextResponse.json(extracted)
}
