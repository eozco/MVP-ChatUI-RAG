# Lab MVP: Chat UI + RAG + Agent Kernel

This repository provides an end-to-end local lab environment for experimenting with LLM-powered agents on a single GPU workstation. It covers:

1.  **Model Serving** – Run a vLLM OpenAI-compatible endpoint on `http://localhost:8080/v1`
2.  **Chat UI** – Minimal Next.js interface targeting the local agent
3.  **Agent Kernel** – LangGraph "ReAct" loop with tool calling, RAG, and MCP servers (FastAPI on `http://localhost:8000`)
4.  **RAG** – LlamaIndex over a sandboxed document directory
5.  **MCP** – Filesystem + Fetch servers scoped to the sandbox
6.  **Observability** – OpenTelemetry traces from the agent and Prometheus metrics from vLLM

> ⚠️ **Hardware Reference**: This lab is optimized for a workstation with **NVIDIA GPUs** (e.g., 2x RTX 3080 Ti), **16GB+ RAM**, and a modern CPU (e.g., Ryzen 5 3600X).

---

## Prerequisites

-   **NVIDIA Drivers**: Ensure your GPU drivers are up to date.
-   **Docker**: Installed with **NVIDIA Container Toolkit** support.
-   **Node.js**: Version 18+ (LTS recommended).
-   **Python**: Version 3.10+.
-   **Package Managers**:
    -   `pnpm` (for Chat UI): `npm install -g pnpm`
    -   `uv` (for Agent Kernel): `pip install uv` (or see [uv docs](https://github.com/astral-sh/uv))

---

## Running on Windows (PowerShell)

### 1. Start Infrastructure (vLLM + Observability)
```powershell
docker compose up vllm otel-collector -d
```
*Wait for the model to load. You can check logs with `docker compose logs -f vllm`.*

### 2. Start Agent Kernel
Open a new terminal:
```powershell
cd agent-kernel
uv sync
uv run python -m agent_kernel.main
```
*The agent server will start at `http://localhost:8000`.*

### 3. Start Chat UI
Open a new terminal:
```powershell
cd apps\chat-ui
pnpm install
pnpm dev
```
*The UI will be available at `http://localhost:3000`.*

---

## Running on Linux (Ubuntu)

### 1. Start Infrastructure (vLLM + Observability)
```bash
docker compose up vllm otel-collector -d
```
*Wait for the model to load. Check logs with `docker compose logs -f vllm`.*

### 2. Start Agent Kernel
Open a new terminal:
```bash
cd agent-kernel
uv sync
uv run python -m agent_kernel.main
```
*The agent server will start at `http://localhost:8000`.*

### 3. Start Chat UI
Open a new terminal:
```bash
cd apps/chat-ui
pnpm install
pnpm dev
```
*The UI will be available at `http://localhost:3000`.*

---

## Configuration & Tips

### Multi-GPU Setup
If you have multiple GPUs (e.g., 2x 3080 Ti), you can enable tensor parallelism to distribute the model load.
1.  Edit `docker-compose.yml`.
2.  Find the `vllm` service command.
3.  Change `--tensor-parallel-size` from `1` to `2` (or your number of GPUs).

### RAG Sandbox
Place your text documents in the `sandbox` directory at the root of the repo. The agent will automatically index them when queried.

### Troubleshooting
-   **vLLM OOM**: If you run out of GPU memory, try reducing `--max-model-len` in `docker-compose.yml` or use a smaller model (quantized versions).
-   **Connection Refused**: Ensure vLLM is fully ready (health check `http://localhost:8080/health`) before starting the Agent Kernel.
