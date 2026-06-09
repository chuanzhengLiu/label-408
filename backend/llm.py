import os
from openai import OpenAI
from typing import List, Dict, Generator
from dotenv import load_dotenv

load_dotenv()

class DeepSeekClient:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("DEEPSEEK_API_KEY")
        if not self.api_key:
            raise ValueError("DEEPSEEK_API_KEY environment variable is not set")
        self.client = OpenAI(
            api_key=self.api_key,
            base_url="https://api.deepseek.com", # Standard DeepSeek Base URL
        )
        self.model = "deepseek-chat"

    def chat_completion(self, messages: List[Dict[str, str]], stream: bool = False, model: str = None):
        try:
            target_model = model or self.model
            response = self.client.chat.completions.create(
                model=target_model,
                messages=messages,
                stream=stream
            )
            if stream:
                return response
            
            msg = response.choices[0].message
            reasoning = getattr(msg, 'reasoning_content', None)
            return {
                "content": msg.content,
                "reasoning": reasoning
            }
        except Exception as e:
            print(f"Error calling DeepSeek API: {e}")
            raise e

    def stream_chat_completion(self, messages: List[Dict[str, str]], model: str = "deepseek-reasoner"):
        """Yields dictionaries with 'content' and 'reasoning' updates."""
        try:
            response = self.client.chat.completions.create(
                model=model,
                messages=messages,
                stream=True
            )
            for chunk in response:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta
                content = getattr(delta, 'content', None)
                reasoning = getattr(delta, 'reasoning_content', None)
                if content or reasoning:
                    yield {
                        "content": content,
                        "reasoning": reasoning
                    }
        except Exception as e:
            print(f"Error in streaming DeepSeek API: {e}")
            raise e

# Singleton instance
deepseek_client = DeepSeekClient()
