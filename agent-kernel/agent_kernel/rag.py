import os
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, Settings
from llama_index.llms.openai import OpenAI
from llama_index.embeddings.huggingface import HuggingFaceEmbedding

# Configure Settings
# We will use the local vLLM instance for generation and a local embedding model
# Note: vLLM must be running on localhost:8080

def get_index(data_dir: str = "../sandbox"):
    if not os.path.exists(data_dir):
        os.makedirs(data_dir, exist_ok=True)
        # Create a dummy file if empty so index creation doesn't fail
        with open(os.path.join(data_dir, "welcome.txt"), "w") as f:
            f.write("Welcome to the RAG sandbox! Put your documents here.")

    # Use a lightweight local embedding model
    Settings.embed_model = HuggingFaceEmbedding(
        model_name="BAAI/bge-small-en-v1.5"
    )
    
    # Configure LLM to point to local vLLM
    Settings.llm = OpenAI(
        api_key="EMPTY",
        api_base="http://localhost:8080/v1",
        model="lab-qwen3"
    )

    documents = SimpleDirectoryReader(data_dir).load_data()
    index = VectorStoreIndex.from_documents(documents)
    return index

def query_rag(query_text: str):
    index = get_index()
    query_engine = index.as_query_engine()
    response = query_engine.query(query_text)
    return str(response)
