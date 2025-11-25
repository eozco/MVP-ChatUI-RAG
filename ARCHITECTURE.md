# System Architecture

## Overview

This document describes the MVP Chat UI + RAG + Agent Kernel system architecture at different levels, current capabilities, and disabled features.

---

## Level 1: User Interface Layer

```
┌─────────────────────────────────────┐
│        Chat UI (Next.js)            │
│  • React frontend on :3000          │
│  • Sends messages to /api/chat      │
│  • Displays streamed responses      │
└────────────────┬────────────────────┘
                 │ HTTP POST
                 ▼
```

**Responsibilities:**
- Display conversation interface
- Accept user input
- Stream and display model responses
- Handle UI state management

---

## Level 2: API Gateway Layer

```
┌─────────────────────────────────────┐
│    Chat UI Backend (Next.js API)    │
│  • Route: /api/chat                 │
│  • Forwards requests to Agent       │
│  • Error handling & response format │
│  • Port: :3000                      │
└────────────────┬────────────────────┘
                 │ HTTP POST to :8001
                 ▼
```

**Responsibilities:**
- Validate incoming chat requests
- Forward to Agent Kernel
- Handle errors and timeouts
- Format responses for frontend

---

## Level 3: Agent Kernel (Currently Simple)

```
┌─────────────────────────────────────┐
│    Agent Kernel (FastAPI)           │
│  • Port: :8001                      │
│  • Current: BYPASS AGENT (disabled) │
│  • Direct pass-through to vLLM      │
│                                     │
│  ❌ Disabled Features:              │
│  • LangGraph ReAct loop             │
│  • Tool calling (rag_search)        │
│  • Tool calling (fetch_web)         │
│  • Agent decision making            │
│  • Multi-step reasoning             │
└────────────────┬────────────────────┘
                 │ Direct pass-through
                 ▼
```

**Current Implementation:**
- Simple FastAPI server
- Routes: `/health`, `/v1/chat/completions`
- Directly forwards requests to vLLM
- No intermediate processing or reasoning

**Disabled Components:**
- LangGraph ReAct agent loop
- Tool invocation system
- Multi-step reasoning
- Complex request orchestration

---

## Level 4: LLM Inference Layer

```
┌─────────────────────────────────────┐
│      vLLM (Model Server)            │
│  • Port: :8080                      │
│  • Model: Llama 3.1 8B Instruct     │
│  • Quantization: AWQ Marlin         │
│  • Max tokens: 8192                 │
│  • Tensor parallel: 1 GPU           │
│                                     │
│  Processing:                        │
│  1. Receives prompt                 │
│  2. Tokenizes                       │
│  3. Generates tokens (GPU)          │
│  4. Returns completion              │
└─────────────────────────────────────┘
```

**Key Features:**
- OpenAI-compatible API
- AWQ Marlin quantization (optimized kernel)
- Supports chat completions
- Configurable generation parameters
- Prometheus metrics endpoint on :8080

**Model Specs:**
- **Base Model:** Meta Llama 3.1 8B Instruct
- **Quantization:** 4-bit AWQ with Marlin kernel
- **Context Length:** 8,192 tokens
- **GPU Requirement:** 1x GPU with 10GB+ VRAM

---

## Level 5: Observability Layer

```
┌─────────────────────────────────────────────────────┐
│           Telemetry Collection & Analysis           │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐                │
│  │  Jaeger      │  │ Prometheus   │                │
│  │  :16686      │  │ :9090        │                │
│  │              │  │              │                │
│  │ Traces       │  │ Metrics      │                │
│  │ Spans        │  │ Time-series  │                │
│  │ Latency      │  │ Throughput   │                │
│  └──────────────┘  └──────────────┘                │
│         ▲                  ▲                        │
│         │                  │                        │
│  ┌──────┴──────────────────┴──────┐                │
│  │  OpenTelemetry Collector       │                │
│  │  Port: :4317 (gRPC)            │                │
│  │         :4318 (HTTP)           │                │
│  │         :9091 (metrics export) │                │
│  └───────────────────────────────┘                 │
│         ▲                                          │
│         │                                          │
│  Receives telemetry from Agent Kernel             │
└─────────────────────────────────────────────────────┘
```

### OpenTelemetry Collector
- **Role:** Central hub for all telemetry data
- **Input Ports:** 4317 (gRPC), 4318 (HTTP)
- **Output Port:** 9091 (Prometheus metrics)
- **Functions:**
  - Receives traces from Agent Kernel
  - Batches data for efficiency
  - Exports to Jaeger and Prometheus

### Jaeger (Distributed Tracing)
- **URL:** `http://localhost:16686`
- **Purpose:** Visual trace exploration
- **Provides:**
  - Request waterfall diagrams
  - Span duration breakdowns
  - Error tracking and stack traces
  - Performance bottleneck identification

### Prometheus (Metrics)
- **URL:** `http://localhost:9090`
- **Purpose:** Time-series metrics and alerting
- **Scrapes:**
  - vLLM metrics (port 8080)
  - OpenTelemetry collector metrics (port 9091)
- **Provides:**
  - Historical trend analysis
  - Real-time performance dashboards
  - Query language (PromQL)

---

## Level 6: Data & Knowledge Layer

```
┌─────────────────────────────────────┐
│    RAG System (Currently Disabled)   │
│                                     │
│  📁 Sandbox Directory:              │
│  └─ /sandbox/documents/             │
│                                     │
│  ❌ Disabled because:               │
│  • Agent not calling tools          │
│  • LangGraph ReAct disabled         │
│  • Complex reasoning not active     │
│                                     │
│  When enabled, would:               │
│  1. Load docs from sandbox          │
│  2. Embed with HuggingFace model   │
│  3. Build vector index              │
│  4. Answer based on documents      │
└─────────────────────────────────────┘
```

**Components:**
- **LlamaIndex:** Vector database and indexing
- **HuggingFace Embeddings:** BAAI/bge-small-en-v1.5
- **Document Storage:** /sandbox/documents/
- **Index Type:** Vector store (in-memory)

**When Enabled:**
- Documents loaded from sandbox directory
- Converted to embeddings using HuggingFace model
- Indexed in vector database
- Available as tool for agent to call

---

## Current System Flow (Simplified)

```
User Input
    │
    ▼
Chat UI (Next.js)
    │
    ▼
Agent Kernel (FastAPI)
    │
    └──────────────────────┐
                           │ BYPASS (no agent logic)
                           ▼
                    vLLM (Direct pass)
                           │
                           ▼
                    Generate Response
                           │
                           ▼
                    Return to User
```

---

## Detailed System Flow (When Agent Enabled)

```
User Input
    │
    ▼
Chat UI (Next.js)
    │
    ▼
Agent Kernel (FastAPI)
    │
    ▼
LangGraph ReAct Loop
    │
    ├─► Agent Decides
    │   ├─► Need RAG? → Query Vector Store
    │   ├─► Need Web?  → Call MCP Fetch
    │   └─► Direct Answer? → Continue
    │
    ▼
vLLM (Call for Generation/Reasoning)
    │
    ▼
Return Decision/Result
    │
    ▼
User Interface
```

---

## Disabled Features & Why

| Feature | Status | Why Disabled | Requirements |
|---------|--------|-------------|--------------|
| **LangGraph ReAct** | ❌ Disabled | Complex reasoning requires strong model | Llama 3.1 70B or stronger |
| **Tool Calling** | ❌ Disabled | Tool decision-making needs better LLM | GPT-4 level or larger model |
| **RAG Search** | ❌ Disabled | Requires agent to invoke tools | Agent loop needed |
| **Web Fetch (MCP)** | ❌ Disabled | Requires agent decision making | Agent loop needed |
| **Multi-step Reasoning** | ❌ Disabled | 8B model too small for complex tasks | Minimum 13-20B model |

---

## Why System is "Basic"

### Hardware Constraints

**Current Setup:**
- 8B parameter model (Llama 3.1 8B)
- Single GPU (RTX 3080 Ti / 4090 / A100)
- 4-bit quantization (AWQ Marlin)

**Limitations:**
- 8B model is optimized for **single-turn, straightforward Q&A**
- Not designed for **agentic multi-step reasoning**
- AWQ quantization (4-bit) reduces reasoning capability slightly
- Single GPU limits parallelization

### Model Capabilities

**What 8B Llama CAN do well:**
- ✅ Answer direct questions
- ✅ Summarization
- ✅ Basic code generation
- ✅ Simple context understanding
- ✅ Language understanding and translation

**What 8B Llama STRUGGLES with:**
- ❌ Complex multi-step reasoning
- ❌ Tool use and planning
- ❌ Nuanced decision-making
- ❌ Long context understanding (8K tokens is limiting)
- ❌ Mathematical reasoning
- ❌ Complex logical deduction

---

## To Enable Advanced Features

### 1. Stronger Model

Replace Llama 3.1 8B with a more capable model:

```yaml
# In docker-compose.yml, change:
- --model
- hugging-quants/Meta-Llama-3.1-70B-Instruct-AWQ-INT4
```

**Options:**
- Llama 3.1 70B (requires 40GB VRAM)
- Mixtral 8x22B (requires 48GB VRAM)
- Llama 2 70B (requires 40GB VRAM)
- Or use OpenAI API / Claude API (no hardware needed)

### 2. More GPU Memory

**For 70B models:**
- 2x RTX 4090 (48GB total)
- Single H100 (80GB)
- 2x A100 80GB
- 2x A6000 (48GB total)

**Configuration:**
```yaml
# Enable tensor parallelism in docker-compose.yml:
- --tensor-parallel-size
- "2"  # For 2 GPUs
```

### 3. Enable Agent in main.py

Replace the current bypass with LangGraph initialization:

```python
# Uncomment and enable:
from agent_kernel.agent import get_agent

agent = get_agent()
response = agent.invoke(...)
```

### 4. Add Documents to RAG

Place files in `/sandbox/documents/`:

```
/sandbox/documents/
├── document1.txt
├── document2.pdf
└── document3.md
```

RAG will automatically:
1. Load documents
2. Create embeddings
3. Index them
4. Make available to agent

---

## Component Interaction Map

```
┌──────────────┐
│   Chat UI    │
└──────┬───────┘
       │
       └─► Next.js API Route (/api/chat)
           │
           └─► Agent Kernel (Port 8001)
               │
               ├─► vLLM (Port 8080)
               │   └─► GPU Inference
               │
               ├─► RAG Module (disabled)
               │   └─► Vector Index
               │
               ├─► MCP Client (disabled)
               │   └─► Web Fetch
               │
               └─► OTLP Exporter
                   │
                   └─► OpenTelemetry Collector (Port 4317/4318)
                       │
                       ├─► Jaeger (Port 16686)
                       │
                       └─► Prometheus (Port 9091)
                           │
                           └─► Prometheus UI (Port 9090)
```

---

## Current System Status

```
┌─────────────────────────────────────┐
│   MVP WORKING STATE                 │
├─────────────────────────────────────┤
│ ✅ Chat interface functional        │
│ ✅ vLLM serving model               │
│ ✅ Basic Q&A working                │
│ ✅ Observability (traces/metrics)   │
│ ✅ AWQ Marlin quantization active   │
│ ✅ FastAPI backend running          │
│ ❌ Agent loop disabled              │
│ ❌ RAG disabled                     │
│ ❌ Tool calling disabled            │
│ ❌ MCP disabled                     │
│ ❌ Multi-step reasoning             │
└─────────────────────────────────────┘
```

---

## Key Metrics to Monitor

### In Jaeger (Distributed Tracing)

1. **Request Duration:** Total time from Chat UI to response
2. **vLLM Latency:** Time spent in model inference
3. **Bottlenecks:** Where requests spend the most time

### In Prometheus (Metrics)

1. **Token Throughput:** `rate(vllm_num_generation_tokens[1m])`
2. **Request Count:** `increase(vllm_request_total[5m])`
3. **Cache Performance:** Hit rates and memory usage
4. **Collector Health:** Traces received vs exported

---

## Next Steps for Enhancement

### Phase 1: Enable RAG (Current Hardware)
- Uncomment RAG module in Agent Kernel
- Add documents to `/sandbox/documents/`
- No additional hardware needed

### Phase 2: Enable Agent Loop (Current Hardware)
- Uncomment LangGraph initialization
- Test with simpler tasks first
- Monitor performance degradation

### Phase 3: Upgrade Model (New Hardware)
- Acquire 40GB+ GPU memory
- Deploy Llama 3.1 70B or stronger
- Enable full agentic capabilities

### Phase 4: Production Hardening
- Add request queuing
- Implement caching layer
- Add authentication/authorization
- Deploy with horizontal scaling

---

## Quick Reference

| Component | Port | URL | Purpose |
|-----------|------|-----|---------|
| Chat UI | 3000 | http://localhost:3000 | User interface |
| Agent Kernel | 8001 | http://localhost:8001 | API backend |
| vLLM API | 8080 | http://localhost:8080/v1 | Model serving |
| vLLM Metrics | 8080 | http://localhost:8080/metrics | Raw metrics |
| Jaeger | 16686 | http://localhost:16686 | Trace visualization |
| Prometheus | 9090 | http://localhost:9090 | Metrics dashboard |
| OTLP Collector | 4317/4318 | localhost | Telemetry receiver |
| Collector Metrics | 9091 | localhost | Metrics export |

---

## Troubleshooting

### Agent Not Responding

Check logs:
```bash
docker compose logs -f agent-kernel
```

Verify vLLM is ready:
```bash
curl http://localhost:8080/health
```

### No Traces Appearing

Verify OTLP is receiving data:
```bash
docker compose logs -f otel-collector
```

Check Agent Kernel is sending traces:
```bash
# In Agent Kernel code, verify:
# opentelemetry instrumentation is enabled
```

### vLLM OOM

Reduce context length in docker-compose.yml:
```yaml
- --max-model-len
- "4096"  # Reduce from 8192
```

Or reduce GPU memory utilization:
```yaml
- --gpu-memory-utilization
- "0.7"  # Reduce from 0.85
```

---

## Architecture Summary

This MVP system provides:

1. **Frontend:** Modern Next.js chat interface
2. **Backend:** FastAPI agent kernel (currently simplified)
3. **Inference:** Optimized vLLM with AWQ Marlin quantization
4. **Observability:** Complete tracing and metrics stack
5. **Extensibility:** Ready for RAG, agents, and tools

**Current Focus:** Solid foundation with working chat and observability
**Next Focus:** Enable agentic capabilities with stronger hardware

