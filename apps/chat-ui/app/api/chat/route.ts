import { NextResponse } from "next/server";

const DEFAULT_ENDPOINT = "http://localhost:8000/v1";
const DEFAULT_MODEL = "lab-mistral";

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "messages array is required" },
        { status: 400 }
      );
    }

    const endpoint = process.env.LLM_ENDPOINT ?? DEFAULT_ENDPOINT;
    const model = process.env.LLM_MODEL ?? DEFAULT_MODEL;
    const apiKey = process.env.LLM_API_KEY;

    const response = await fetch(`${endpoint}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Upstream error (${response.status}): ${errorText}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();

    return NextResponse.json({ reply: reply ?? "" });
  } catch (error) {
    console.error("/api/chat error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
