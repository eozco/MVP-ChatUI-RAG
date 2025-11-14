"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Send, Bot, User, RefreshCw } from "lucide-react";
import clsx from "clsx";

interface ChatMessage {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
}

const DEFAULT_SYSTEM_PROMPT =
  "You are Lab Assistant, a helpful operator for the local vLLM endpoint. Keep replies concise.";

export default function HomePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: crypto.randomUUID(),
      role: "system",
      content: DEFAULT_SYSTEM_PROMPT,
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!input.trim() || isSending) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setIsSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages
            .filter((msg) => msg.role !== "system")
            .map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.reply ?? "(Empty response)",
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `⚠️ Error contacting model: ${error instanceof Error ? error.message : String(error)}`,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsSending(false);
    }
  };

  const handleReset = () => {
    setMessages([
      {
        id: crypto.randomUUID(),
        role: "system",
        content: DEFAULT_SYSTEM_PROMPT,
      },
    ]);
    setInput("");
  };

  return (
    <main className="app-shell">
      <section className="sidebar">
        <div>
          <p className="eyebrow">Lab Workspace</p>
          <h1>Local Chat Sandbox</h1>
          <p>
            Talk to the locally hosted 7B–14B model running on vLLM. Messages never leave your
            workstation.
          </p>
        </div>
        <div className="sidebar-card">
          <p className="muted">Status</p>
          <ul>
            <li>
              <span className="dot online" /> vLLM @ <code>localhost:8080/v1</code>
            </li>
            <li>
              <span className="dot online" /> Metrics @ <code>localhost:8000/metrics</code>
            </li>
            <li>
              <span className="dot" /> RAG + Agents TBD
            </li>
          </ul>
        </div>
        <button className="secondary" onClick={handleReset} disabled={isSending}>
          <RefreshCw size={16} /> Start fresh
        </button>
      </section>

      <section className="chat-window">
        <div className="messages" ref={scrollRef}>
          {messages
            .filter((msg) => msg.role !== "system")
            .map((msg) => (
              <article
                key={msg.id}
                className={clsx("message", {
                  user: msg.role === "user",
                  assistant: msg.role === "assistant",
                })}
              >
                <span className="avatar" aria-hidden>
                  {msg.role === "assistant" ? <Bot size={16} /> : <User size={16} />}
                </span>
                <p>{msg.content}</p>
              </article>
            ))}
          {!messages.some((msg) => msg.role === "assistant") && (
            <div className="empty-state">
              <p>Ask anything about the sandbox environment or paste context to summarize.</p>
            </div>
          )}
        </div>

        <form className="composer" onSubmit={handleSubmit}>
          <textarea
            placeholder="Type your message..."
            value={input}
            onChange={(event) => setInput(event.target.value)}
            disabled={isSending}
            rows={3}
          />
          <button type="submit" disabled={isSending || !input.trim()}>
            {isSending ? "Sending..." : <Send size={18} />}
          </button>
        </form>
      </section>
    </main>
  );
}
