from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import uvicorn
from contextlib import asynccontextmanager

# Placeholder for agent import
from agent_kernel.agent import run_agent

app = FastAPI(title="Agent Kernel", version="0.1.0")

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    stream: bool = False

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/v1/chat/completions")
async def chat_completions(request: ChatRequest):
    # Connect to LangGraph agent
    user_message = request.messages[-1].content
    response_content = await run_agent(user_message)
    
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

if __name__ == "__main__":
    uvicorn.run("agent_kernel.main:app", host="0.0.0.0", port=8000, reload=True)
