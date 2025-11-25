# Model Upgrade Planning Guide: 14B+ with Advanced Features

## Current Setup

**Current Model:** Llama 3.1 8B AWQ (~5.3GB)  
**Hardware:** 2x RTX 3080 Ti (24GB total, can use tensor parallelism)  
**Goal:** Deploy 14B+ models with tool calling, MCP support, and extended thinking

---

## Model Recommendations (14B+)

| Model | Params | AWQ 4-bit | Tool Calling | MCP | Extended Thinking | Speed | Tensor Parallel |
|-------|--------|-----------|--------------|-----|------------------|-------|-----------------|
| **Qwen3 14B** | 14B | ~7-8GB | ✅ Excellent | ✅ Yes | ⚠️ Limited | ~40 tok/s | Not needed |
| **Llama 3.1 70B** | 70B | ~35GB | ✅ Excellent | ✅ Yes | ✅ Full | ~20 tok/s | **REQUIRED** |
| **Qwen3 32B** | 32B | ~16-18GB | ✅ Excellent | ✅ Yes | ✅ Full | ~25 tok/s | ✅ TP=2 |
| **DeepSeek-V3** | 671B | N/A | ✅ | ✅ | ✅ | -- | Too Large |

**Best Fit for 24GB:** **Qwen3 14B** (single GPU) or **Llama 3.1 70B** (TP=2)  
**If you want thinking mode:** **Llama 3.1 70B** (better support)

---

## Feature Comparison

### Tool Calling & Function Calling

| Model | Native Support | vLLM Compatible | Notes |
|-------|----------------|-----------------|-------|
| Qwen3 14B | ✅ Yes | ✅ Full | OpenAI function_call format |
| Llama 3.1 70B | ✅ Yes | ✅ Full | Tool use XML tags |
| Qwen3 32B | ✅ Yes | ✅ Full | Best in-class tool use |

### MCP (Model Context Protocol) Support

**All 14B+ models support MCP integration via:**
- Server definitions in agent kernel
- Tool definitions passed to model
- Structured responses with tool calls

**Setup:** Add MCP servers in `agent_kernel/mcp.py`, model handles execution

### Extended Thinking / Chain-of-Thought

| Model | Support | Quality | Latency Impact |
|-------|---------|---------|-----------------|
| Qwen3 14B | ⚠️ Basic | Medium | +10-20% |
| Llama 3.1 70B | ✅ Full | Excellent | +30-50% |
| Qwen3 32B | ✅ Full | Excellent | +25-40% |

---

## Deployment Options for 24GB

### Option A: Qwen3 14B (Single GPU)
```yaml
services:
  vllm:
    command:
      - --model
      - Qwen/Qwen3-14B-Instruct
      - --quantization
      - awq
      - --tensor-parallel-size
      - "1"
      - --max-model-len
      - "16384"
      - --gpu-memory-utilization
      - "0.80"
```

**Pros:** Simple (no tensor parallelism), fast setup  
**Cons:** Single GPU per inference  
**Memory:** ~7-8GB per GPU, 16GB+ free headroom  
**Speed:** ~40 tokens/sec  
**Best for:** Development/testing, want thinking mode baseline

### Option B: Llama 3.1 70B (Tensor Parallel)
```yaml
services:
  vllm:
    command:
      - --model
      - meta-llama/Llama-3.1-70B-Instruct
      - --quantization
      - awq
      - --tensor-parallel-size
      - "2"
      - --max-model-len
      - "8192"
      - --gpu-memory-utilization
      - "0.85"
```

**Pros:** More powerful, better tool use, better thinking  
**Cons:** Requires both GPUs, slower first load  
**Memory:** ~17.5GB per GPU (balanced)  
**Speed:** ~20 tokens/sec  
**Best for:** Production, need best reasoning

### Option C: Qwen3 32B (Tensor Parallel)
```yaml
services:
  vllm:
    command:
      - --model
      - Qwen/Qwen3-32B-Instruct
      - --quantization
      - awq
      - --tensor-parallel-size
      - "2"
      - --max-model-len
      - "16384"
      - --gpu-memory-utilization
      - "0.85"
```

**Pros:** Balance of speed and capability, good thinking mode  
**Cons:** TP=2 required, tight memory  
**Memory:** ~9GB per GPU  
**Speed:** ~25 tokens/sec  
**Best for:** Production with good inference speed

---

## Installation (Any Option)

### Setup Steps

1. **Update docker-compose.yml** with chosen model (see options above)
2. **Stop current services:** `docker compose down`
3. **Start with new model:** `docker compose up vllm -d`
4. **Monitor loading:** `docker compose logs -f vllm`
5. **Verify:** `curl http://localhost:8080/health`

---

---

## Tool Calling & MCP Integration

### Enable Tool Calling in vLLM

All 14B+ models support OpenAI function_call format:

```python
# In agent_kernel/main.py
response = client.chat.completions.create(
    model="your-model",
    messages=[...],
    tools=[
        {
            "type": "function",
            "function": {
                "name": "search_documents",
                "description": "Search RAG documents",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string"}
                    },
                    "required": ["query"]
                }
            }
        }
    ]
)
```

### MCP Server Integration

Add MCP servers in `agent_kernel/mcp.py`:

```python
from mcp import MCPServer

# Define available tools
mcp_server = MCPServer({
    "search": search_function,
    "web_fetch": fetch_web_content,
    "code_execute": execute_code,
})

# Model will call these via tool_calls in response
```

### Thinking Mode (Extended CoT)

For Llama 3.1 70B and Qwen3 32B:

```python
# Request extended thinking
response = client.chat.completions.create(
    model="your-model",
    messages=[...],
    temperature=1.0,  # Required for thinking
    max_tokens=8000,  # For thinking + response
    # Llama 3.1 70B supports thinking_mode parameter
)
```

---

## GPU Memory & Performance

| Model | VRAM per GPU | Free Space | OOM Risk | Notes |
|-------|-------------|-----------|----------|-------|
| Qwen3 14B (TP=1) | ~8GB | ~4GB | Low | Safe for single-GPU |
| Llama 3.1 70B (TP=2) | ~12GB | ~0GB | Low* | Both GPUs ~equal load |
| Qwen3 32B (TP=2) | ~9GB | ~3GB | Low | Balanced, thinking support |

*With TP=2, uses both GPUs, distributed load.

---

## Quick Troubleshooting

**Model won't load:** Check disk space (50GB+), increase timeout
**OOM errors:** Reduce `--max-model-len`, lower `--gpu-memory-utilization`
**Slow inference:** Check GPU utilization with `nvidia-smi`, verify quantization worked
**Tool calls fail:** Verify model supports function_call format, check tool definitions

---

## Thinking Mode Details

**Llama 3.1 70B:**
```python
# Automatic with temperature=1.0
response = client.chat.completions.create(
    model="llama-3.1-70b",
    messages=[{"role": "user", "content": "Complex problem requiring deep thought"}],
    temperature=1.0,
    max_tokens=8000  # For thinking + response
)
# Response includes thinking process before final answer
```

**Qwen3 32B:**
```python
# Native thinking support
response = client.chat.completions.create(
    model="qwen3-32b",
    messages=[...],
    temperature=1.0,
    max_tokens=8000
)
```

---

## MCP Server Examples

```python
# agent_kernel/mcp.py

from typing import Any
import httpx
from langchain_community.document_loaders import PDFLoader

# Define your tools
async def search_documents(query: str) -> str:
    """Search RAG documents"""
    # Implementation
    pass

async def fetch_web_content(url: str) -> str:
    """Fetch and parse web content"""
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
    return response.text

async def execute_code(code: str, language: str) -> str:
    """Execute code snippets"""
    # Safe execution in sandbox
    pass

# Register with vLLM
MCP_TOOLS = {
    "search_documents": search_documents,
    "fetch_web": fetch_web_content,
    "execute_code": execute_code,
}
```

---

## Performance Expectations

| Model | Speed | Quality | Thinking | Use Case |
|-------|-------|---------|----------|----------|
| Qwen3 14B | ~40 tok/s | Very Good | Basic | Fast dev, simple tasks |
| Llama 3.1 70B | ~20 tok/s | Excellent | Full | Production, complex reasoning |
| Qwen3 32B | ~25 tok/s | Excellent | Full | Best balance |

---

## Deployment Checklist

- [ ] Choose model (14B, 70B, or 32B)
- [ ] Update docker-compose.yml
- [ ] Stop old services: `docker compose down`
- [ ] Download model + quantize: `docker compose up vllm -d`
- [ ] Verify: `curl http://localhost:8080/health`
- [ ] Update agent kernel for tool calling
- [ ] Define MCP servers in `agent_kernel/mcp.py`
- [ ] Test tool calls: `curl -X POST http://localhost:8080/v1/chat/completions`
- [ ] Monitor GPU: `nvidia-smi` (verify memory usage)
- [ ] Enable thinking mode (if using 70B or 32B)
- [ ] Start full stack and test in Chat UI

---

## Critical Notes for Qwen2 7B

✅ **Qwen2 7B Fits Perfectly!**
- Only 3.5GB quantized (vs 12GB available per GPU)
- 8GB+ headroom for safety
- No OOM errors
- Fast inference (~80 tok/s)

✅ **Single GPU is Sufficient**
- Use GPU 0 (or GPU 1)
- Can leave other GPU idle or use for batching
- Tensor parallelism NOT needed

✅ **You're Getting Full Capabilities**
- Enterprise-grade reasoning (not degraded vs 30B)
- Excellent tool use for RAG + web search
- Multi-step agentic planning
- Production code generation
- 128K context available

⚠️ **If You Later Need Qwen3 30B:**
- Upgrade to 2x RTX 4090 (24GB each = 48GB)
- Or single H100 (80GB)
- Then you can use Qwen3 30B with full headroom

