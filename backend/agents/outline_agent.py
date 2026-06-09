from .base import BaseAgent
import json
from typing import List

class OutlineAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="大纲专家",
            role_instruction="""你是一位爆款网文架构师。你的职责是根据用户设定，创作极具商业价值、节奏紧凑的小说大纲。
            内容需包含开篇爽点、核心冲突、升级路线和情感驱动。
            输出应具有清晰的起承转合。"""
        )

    def generate_outline(self, settings: dict):
        # Result will be in content since we stream it in workflow.py
        prompt = f"""
        基于以下设定，创作一份详尽的小说大纲：
        - 流派：{settings.get('genre')}
        - 风格：{settings.get('style_tags')}
        - 受众：{settings.get('target_audience')}
        - 预估字数：{settings.get('total_words_target')}
        - 设定详情：{settings.get('background_setting')}
        
        大纲应包含：
        1. 核心矛盾与爽点
        2. 主角及重要反派的小传
        3. 至少三个主要剧情波段（高潮节点）
        4. 关键地图/设定细化
        """
        return self.run(user_input=prompt)

class TitleAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="点睛书名",
            role_instruction="你是一位网文营销专家，擅长创作极具吸引力、点击率高的小说书名。你必须使用中文进行思考和回复，且书名必须符合中文网文市场审美的。"
        )

    def generate_titles(self, outline_summary: str, n: int = 5):
        prompt = f"""
        请为以下小说大纲生成 {n} 个中文建议书名。
        
        大纲内容：
        {outline_summary[:2000]}
        
        要求：
        1. 必须使用中文。
        2. 必须输出标准的 JSON 数组格式，例如：["书名1", "书名2", "书名3"]。
        3. 不要包含 markdown 代码块标记 (```json)，只返回纯 JSON 字符串。
        4. 确保书名简洁有力，符合当前流行的网文风格。
        """
        return self.run(user_input=prompt)
