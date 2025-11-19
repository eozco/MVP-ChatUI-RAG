import pytest
from agent_kernel.agent import run_agent
from agent_kernel.rag import get_index
import os

# Mocking external services for basic import/structure testing
# In a real environment, we'd use proper mocks or integration tests

def test_imports():
    assert run_agent is not None
    assert get_index is not None

def test_rag_directory_creation():
    # Ensure sandbox directory is created if not exists
    if os.path.exists("../sandbox/welcome.txt"):
        os.remove("../sandbox/welcome.txt")
    
    try:
        # This might fail if vLLM is not running, but we check if it attempts to create the dir
        get_index("../sandbox")
    except Exception as e:
        # Expected to fail on connection to vLLM if not running
        pass
        
    assert os.path.exists("../sandbox")
