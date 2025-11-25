# Lab MVP: Chat UI + RAG + Agent Kernel

This repository provides an end-to-end local lab environment for experimenting with LLM-powered agents on a single GPU workstation. It covers:

1.  **Model Serving** – Run a vLLM OpenAI-compatible endpoint on `http://localhost:8080/v1` (Default: Llama 3.1 8B Instruct AWQ with Marlin kernel)
2.  **Chat UI** – Minimal Next.js interface targeting the local agent
3.  **Agent Kernel** – LangGraph "ReAct" loop with tool calling, RAG, and MCP servers (FastAPI on `http://localhost:8000`)
4.  **RAG** – LlamaIndex over a sandboxed document directory
5.  **MCP** – Filesystem + Fetch servers scoped to the sandbox
6.  **Observability** – OpenTelemetry traces (Jaeger on `http://localhost:16686`) and Prometheus metrics from vLLM and the collector

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
docker compose up vllm otel-collector prometheus jaeger -d
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
docker compose up vllm otel-collector prometheus jaeger -d
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

### AWQ Marlin Optimization
The project uses AWQ Marlin quantization, which provides faster inference compared to standard AWQ. Marlin is an optimized kernel for running 4-bit AWQ quantized models on NVIDIA GPUs. This is configured in `docker-compose.yml` with the `--quantization awq_marlin` flag.

### Troubleshooting
-   **vLLM OOM**: If you run out of GPU memory, try reducing `--max-model-len` in `docker-compose.yml` or use a smaller model (quantized versions).
-   **Connection Refused**: Ensure vLLM is fully ready (health check `http://localhost:8080/health`) before starting the Agent Kernel.

---

## Observability & Monitoring

### Distributed Tracing with Jaeger

The lab includes **Jaeger** for distributed tracing, which captures detailed request flows through your Agent Kernel.

**Access Jaeger UI:** `http://localhost:16686`

**View traces:**
1. Open Jaeger UI in your browser
2. From the dropdown, select your Agent Kernel service (e.g., `agent-kernel`)
3. Click "Find Traces"
4. You'll see all recent requests with:
   - Total request duration
   - Individual span durations (breakdown of time spent in each operation)
   - Error details and stack traces (if any)
   - Request/response metadata

**Understanding trace spans:**
- **Span** = A single operation (e.g., "process_message", "call_vllm")
- **Trace** = Collection of spans for one complete request
- **Duration** = How long each span took (useful for identifying bottlenecks)

### Metrics with Prometheus

The lab exports metrics from vLLM and the OpenTelemetry Collector to **Prometheus**.

**Access Prometheus UI:** `http://localhost:9090`

**View metrics:**
1. Open Prometheus UI
2. Click "Graph" tab
3. Use the query box to search for metrics:
   - `otel_*` — OpenTelemetry collector metrics
   - `vllm_*` — vLLM model serving metrics (token throughput, generation time, etc.)

**Example queries:**
```promql
# vLLM generation throughput (tokens/second)
rate(vllm_num_generation_tokens[1m])

# vLLM request latency
vllm_request_duration_seconds

# OpenTelemetry trace processing
rate(otel_traces_in_total[5m])
```

### Real-time Log Monitoring

Monitor otel-collector logs to see traces as they're processed:

```powershell
docker compose logs -f otel-collector
```

You'll see output like:
```
lab-otel-collector | info TracesExporter {"kind": "exporter", "data_type": "traces", "resource spans": 1, "spans": 5}
```

This shows spans are being received and exported to Jaeger in real-time.

### Observability Stack Components

| Component | URL | Purpose |
|-----------|-----|---------|
| **Jaeger** | `http://localhost:16686` | Distributed tracing & request waterfall visualization |
| **Prometheus** | `http://localhost:9090` | Metrics scraping & time-series queries |
| **OpenTelemetry Collector** | `localhost:4317`, `localhost:4318` | Receives OTLP traces/metrics from Agent Kernel |
| **vLLM Metrics** | `http://localhost:8000/metrics` | Raw Prometheus metrics from vLLM |

### Enabling Instrumentation in Agent Kernel

The Agent Kernel is pre-configured to send traces to the OpenTelemetry Collector. To verify traces are being sent:

1. Make a chat request through the UI
2. Check Jaeger UI (should see new traces)
3. Check otel-collector logs: `docker compose logs otel-collector`

If no traces appear, ensure your Agent Kernel is running with OTLP export enabled (see `agent-kernel/instrumentation.ts`).

---

## Quick Links

Once everything is running, you can access:

| Service | URL | Purpose |
|---------|-----|---------|
| **Chat UI** | `http://localhost:3000` | Chat interface |
| **vLLM API** | `http://localhost:8080/v1` | OpenAI-compatible LLM API |
| **Agent Kernel** | `http://localhost:8001` | Agent backend API |
| **Jaeger** | `http://localhost:16686` | Distributed trace visualization |
| **Prometheus** | `http://localhost:9090` | Metrics dashboard & queries |
| **vLLM Metrics** | `http://localhost:8080/metrics` | Raw vLLM Prometheus metrics |
