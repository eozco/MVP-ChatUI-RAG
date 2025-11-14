# Lab MVP: Chat UI + RAG + Agent Kernel

This repository provides an end-to-end local lab environment for experimenting with
LLM-powered agents on a single GPU workstation. It covers:

1. **Model Serving** – Run a vLLM OpenAI-compatible endpoint on `http://localhost:8080/v1`
2. **Chat UI** – Minimal Next.js interface targeting the local endpoint
3. **Agent Kernel** – LangGraph "ReAct" loop with tool calling, RAG, and MCP servers
4. **RAG** – LlamaIndex over a sandboxed document directory
5. **MCP** – Filesystem + Fetch servers scoped to the sandbox
6. **Observability** – OpenTelemetry traces from the agent and Prometheus metrics from vLLM

> ⚠️ This repo assumes a **single-user GPU box** with NVIDIA drivers, Docker, Node.js 18+, and Python 3.10+.

---

## Quick Start (<3 minutes after prerequisites)

1. **Clone** this repo and `cd` into it.
2. **Start vLLM + observability stack**
   ```powershell
   docker compose up vllm otel-collector -d
   ```
3. **Install chat UI deps & run dev server**
   ```powershell
   pushd apps\chat-ui
   pnpm install
   pnpm dev
   ```
4. **Install agent kernel deps & start the agent**
   ```powershell
   pushd agent-kernel
   uv sync
   uv run python -m agent_kernel.main
   ```
5. Visit `http://localhost:3000` to chat. Metrics at `http://localhost:8000/metrics`.

Details for each subsystem live in their respective READMEs.
