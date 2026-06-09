from ..llm import deepseek_client
from typing import List, Dict

class BaseAgent:
    def __init__(self, name: str, role_instruction: str):
        self.name = name
        self.role_instruction = role_instruction
        self.history: List[Dict[str, str]] = [
            {"role": "system", "content": role_instruction}
        ]

    def add_user_message(self, content: str):
        self.history.append({"role": "user", "content": content})

    def add_assistant_message(self, content: str):
        self.history.append({"role": "assistant", "content": content})

    def run(self, user_input: str = None, model: str = "deepseek-reasoner", **kwargs) -> Dict[str, str]:
        """
        Main execution method for the agent. Returns {"content": ..., "reasoning": ...}
        """
        if user_input:
            self.add_user_message(user_input)
        
        response = deepseek_client.chat_completion(self.history, stream=False, model=model)
        if response["content"]:
            self.add_assistant_message(response["content"])
        return response

    def stream_run(self, user_input: str = None, model: str = "deepseek-reasoner", **kwargs):
        """Yields chunks of {"content": ..., "reasoning": ...}"""
        if user_input:
            self.add_user_message(user_input)
        
        full_content = ""
        for chunk in deepseek_client.stream_chat_completion(self.history, model=model):
            if chunk.get("content"):
                full_content += chunk["content"]
            yield chunk
        
        if full_content:
            self.add_assistant_message(full_content)

    def clear_history(self):
        self.history = [
            {"role": "system", "content": self.role_instruction}
        ]
