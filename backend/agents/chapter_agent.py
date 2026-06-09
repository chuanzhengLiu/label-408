from .base import BaseAgent

class ChapterStructureAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="章节规划师",
            role_instruction="你是一位资深的网络小说编辑，擅长将宏观的大纲拆解为具体、抓人的章节结构。"
        )

    def plan_volume(self, volume_title: str, volume_goal: str, chapter_count_approx: int, novel_outline: str = "", title_format: str = "第{chapter_number}章", max_length: int = 20):
        prompt = f"""
        请为小说卷：'{volume_title}' 规划章节结构。
        
        全书总大纲参考：
        {novel_outline[:3000]}

        本卷核心目标：{volume_goal}
        预计规划章节数量：{chapter_count_approx}

        章节标题格式规则：
        - 标题格式：{title_format}
        - 最大长度：{max_length}字符
        - 只需要提供章节内容概要，标题会自动按格式生成

        请按以下格式列出章节（每行一个，不要包含分卷名）：
        1. [章节内容概要：例如 少年林焰觉醒SSS级反弹天赋]
        2. [章节内容概要：例如 遭遇羞辱，强势反弹反杀]
        ...
        """
        return self.run(user_input=prompt)

class ChapterOutlineAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="章节细化师",
            role_instruction="你是一位故事咨询专家。你的任务是将章节的一句话简略概要扩展为详细的章节大纲，明确冲突、高潮和结局。"
        )

    def generate_chapter_outline(self, brief: str, full_outline: str):
        prompt = f"请将以下章节简介：'{brief}' 扩展为详细的章节大纲。参考全书大纲：{full_outline[:1000]}"
        return self.run(user_input=prompt)

class FineOutlineAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="细纲导演",
            role_instruction="你是一位画面导演。你的任务是根据章节大纲，将其拆解为10-20个具体的细纲（细化场景、动作和对白点）。"
        )

    def generate_fine_outline(self, chapter_outline: str):
        prompt = f"请将以下章节大纲拆解为具体的细纲场次（情节细分）：\n{chapter_outline}"
        return self.run(user_input=prompt)

class ChapterWriterAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="正文笔杆子",
            role_instruction="你是一位高产且优秀的神级网文作家。你擅长描写沉浸感强的场景，拒绝枯燥的叙述，多用动作、神态和对白推动情节。"
        )

    def write_chapter(self, chapter_title: str, fine_outline: str, previous_chapter_summary: str = "", style_guidelines: str = ""):
        prompt = f"编写章节：{chapter_title}\n基于以下情节细纲：\n{fine_outline}\n上下文背景：{previous_chapter_summary}\n写作风格建议：{style_guidelines}"
        return self.run(user_input=prompt)
