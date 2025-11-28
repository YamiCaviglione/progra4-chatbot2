import { NextRequest } from "next/server";
import { z } from "zod";

const schema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages } = schema.parse(body);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "anthropic/claude-3-haiku",
        messages,
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      return new Response("Error en la API de OpenRouter", { status: 500 });
    }

    // Creamos un stream nuevo para enviar texto limpio al cliente
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const readable = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk
              .split("\n")
              .filter((line) => line.trim().startsWith("data: "));

            for (const line of lines) {
              if (line.includes("[DONE]")) {
                controller.close();
                return;
              }

              try {
                const json = JSON.parse(line.replace(/^data: /, ""));
                const content = json?.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(encoder.encode(content));
                }
              } catch {
                // Ignorar líneas que no sean JSON
              }
            }
          }
        } catch (err) {
          console.error("Error procesando el stream:", err);
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error: any) {
    console.error("Error general:", error);
    return new Response(
      JSON.stringify({ error: "Error al procesar la solicitud" }),
      { status: 400 }
    );
  }
}
