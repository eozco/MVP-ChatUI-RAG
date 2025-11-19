from typing import Annotated, Literal, TypedDict, Union
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, BaseMessage
import operator

from agent_kernel.rag import query_rag
from agent_kernel.mcp import mcp_client

# Define Tools
@tool
def rag_search(query: str) -> str:
    """Search the local knowledge base (sandbox) for information."""
    return query_rag(query)

@tool
async def fetch_web_content(url: str) -> str:
    """Fetch content from a URL using MCP."""
    return await mcp_client.fetch_url(url)

tools = [rag_search, fetch_web_content]

# Define State
class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], operator.add]

# Define Agent
# Connect to local vLLM
llm = ChatOpenAI(
    base_url="http://localhost:8080/v1",
    api_key="EMPTY",
    model="lab-qwen3",
    temperature=0
)

model_with_tools = llm.bind_tools(tools)

def call_model(state: AgentState):
    messages = state['messages']
    response = model_with_tools.invoke(messages)
    return {"messages": [response]}

def should_continue(state: AgentState) -> Literal["tools", "__end__"]:
    messages = state['messages']
    last_message = messages[-1]
    if last_message.tool_calls:
        return "tools"
    return "__end__"

# Build Graph
workflow = StateGraph(AgentState)

workflow.add_node("agent", call_model)
workflow.add_node("tools", ToolNode(tools))

workflow.set_entry_point("agent")

workflow.add_conditional_edges(
    "agent",
    should_continue,
)

workflow.add_edge("tools", "agent")

app = workflow.compile()

async def run_agent(user_input: str, chat_history: list = []):
    # Convert chat history to LangChain messages if needed
    # For now, we'll just take the user input
    inputs = {"messages": [HumanMessage(content=user_input)]}
    
    final_state = await app.ainvoke(inputs)
    return final_state["messages"][-1].content
