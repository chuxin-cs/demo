import { NextResponse } from 'next/server'

type OpenAIChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
  error?: {
    message?: string
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { prompt?: string; context?: string }
    const prompt = (body.prompt || '').trim()
    const context = (body.context || '').trim()

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      const text =
        `（示例）基于你的指令：${prompt}\n\n` +
        (context
          ? `（示例）我已读取上下文片段，建议你把段落拆成要点，并按“结论-依据-行动”结构重写。`
          : `（示例）请提供一些上下文内容，我会更准确地生成。`)
      return NextResponse.json({ text })
    }

    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              'You are an assistant inside a Notion-like editor. Write concise, well-structured Chinese output unless user asks otherwise.',
          },
          context
            ? { role: 'user', content: `上下文：\n${context}\n\n指令：${prompt}` }
            : { role: 'user', content: prompt },
        ],
        temperature: 0.4,
      }),
    })

    const data = (await res.json()) as OpenAIChatCompletionResponse
    if (!res.ok) {
      const msg =
        (typeof data?.error?.message === 'string' && data.error.message) ||
        'OpenAI request failed'
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    const text = data?.choices?.[0]?.message?.content
    if (typeof text !== 'string') {
      return NextResponse.json({ error: 'Invalid AI response' }, { status: 500 })
    }

    return NextResponse.json({ text })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
