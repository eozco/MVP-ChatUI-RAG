from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import uvicorn
from contextlib import asynccontextmanager
import logging
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Agent Kernel server...")
    logger.info("Server is ready to accept connections on http://localhost:8001")
    yield
    logger.info("Shutting down Agent Kernel server...")

app = FastAPI(title="Agent Kernel", version="0.1.0", lifespan=lifespan)

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    stream: bool = False
    model: Optional[str] = None
    temperature: Optional[float] = 0.7

@app.get("/health")
async def health():
    logger.info("Health check requested")
    return {"status": "ok"}

@app.post("/v1/chat/completions")
async def chat_completions(request: ChatRequest):
    try:
        logger.info(f"Received chat request with {len(request.messages)} messages")
        
        # For now, bypass the agent and call vLLM directly
        # This avoids tool calling issues until we can debug further
        import httpx
        
        user_message = request.messages[-1].content
        logger.info(f"Processing message: {user_message[:100]}...")
        
        # Call vLLM directly
        async with httpx.AsyncClient(timeout=300.0) as client:
            vllm_response = await client.post(
                "http://localhost:8080/v1/chat/completions",
                json={
                    "model": "lab-llama-3.1-8b-awq",
                    "messages": [{"role": msg.role, "content": msg.content} for msg in request.messages],
                    "temperature": request.temperature,
                    "stream": False
                }
            )
            
            if vllm_response.status_code != 200:
                logger.error(f"vLLM error: {vllm_response.status_code} - {vllm_response.text}")
                raise HTTPException(status_code=502, detail=f"vLLM error: {vllm_response.text}")
            
            vllm_data = vllm_response.json()
            response_content = vllm_data["choices"][0]["message"]["content"]
        
        logger.info(f"Generated response: {response_content[:100]}...")
        
        return {
            "choices": [
                {
                    "message": {
                        "role": "assistant",
                        "content": response_content
                    }
                }
            ]
        }
    except Exception as e:
        logger.error(f"Error processing chat request: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    logger.info("Starting uvicorn server...")
    uvicorn.run("agent_kernel.main:app", host="0.0.0.0", port=8001, reload=False, log_level="info")
