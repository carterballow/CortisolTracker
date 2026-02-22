import {
  consumeStream,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";

export const runtime = "nodejs";
export const maxDuration = 30;

function toPrompt(messages: any[]): string {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const c = lastUser?.content;

  if (typeof c === "string") return c;
  if (Array.isArray(c)) return c.map((p: any) => p?.text ?? "").join("");
  if (Array.isArray(lastUser?.parts)) return lastUser.parts.map((p: any) => p?.text ?? "").join("");

  return "";
}

export async function POST(req: Request) {
  const body = await req.json();
  const messages = (body.messages ?? []) as any[];

  const prompt = toPrompt(messages);

  // Call your FastAPI backend (non-stream)
  const r = await fetch("http://127.0.0.1:8000/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  const raw = await r.text();
  if (!r.ok) return new Response(raw, { status: 500 });

  const data = JSON.parse(raw) as { text: string };
  const answer = data.text ?? "";

  // ✅ Return in the exact streaming format the AI SDK UI expects
  return createUIMessageStreamResponse({
    consumeSseStream: consumeStream,
    stream: createUIMessageStream({
      execute({ writer }) {
        const id = "assistant-text";

        writer.write({ type: "text-start", id });
        writer.write({ type: "text-delta", id, delta: answer });
        writer.write({ type: "text-end", id });
      },
    }),
  });
}