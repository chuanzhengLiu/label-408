from ..database import Novel, Outline, Volume, Chapter, GenerationTask, SessionLocal
from ..agents.outline_agent import OutlineAgent, TitleAgent
from ..agents.chapter_agent import ChapterStructureAgent, ChapterWriterAgent, ChapterOutlineAgent, FineOutlineAgent
from sqlalchemy.orm import Session
import json
import threading
from datetime import datetime

class NovelService:
    def __init__(self, db: Session):
        self.db = db
        self.outline_agent = OutlineAgent()
        self.title_agent = TitleAgent()
        self.struct_agent = ChapterStructureAgent()
        self.chapter_outline_agent = ChapterOutlineAgent()
        self.fine_outline_agent = FineOutlineAgent()
        self.writer_agent = ChapterWriterAgent()

    def _get_db(self):
        return SessionLocal()

    def _run_async(self, task_id: int, target_func, *args, **kwargs):
        def wrapper():
            db = self._get_db()
            try:
                target_func(db, task_id, *args, **kwargs)
            except Exception as e:
                print(f"Async Task Error: {e}")
                task = db.query(GenerationTask).filter(GenerationTask.id == task_id).first()
                if task:
                    task.status = "failed"
                    task.error_message = str(e)
                    db.commit()
            finally:
                db.close()
        
        thread = threading.Thread(target=wrapper)
        thread.start()

    def _get_knowledge_context(self, db: Session, novel_id: int) -> str:
        from ..database import KnowledgeEntry
        entries = db.query(KnowledgeEntry).filter(KnowledgeEntry.novel_id == novel_id).all()
        if not entries: return ""
        
        context = "\n--- 知识库设定 ---\n"
        categories = {}
        for entry in entries:
            if entry.category not in categories:
                categories[entry.category] = []
            categories[entry.category].append(f"【{entry.title}】: {entry.content}")
        
        for cat, items in categories.items():
            context += f"\n[{cat}]:\n" + "\n".join(items) + "\n"
        return context

    # --- Task Management ---
    def create_task(self, novel_id: int, entity_type: str, entity_id: int = None, agent_name: str = "") -> GenerationTask:
        task = GenerationTask(
            novel_id=novel_id,
            entity_type=entity_type,
            entity_id=entity_id,
            agent_name=agent_name,
            status="queued"
        )
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        return task

    def update_task(self, task_id: int, **kwargs):
        task = self.db.query(GenerationTask).filter(GenerationTask.id == task_id).first()
        if task:
            for key, value in kwargs.items():
                setattr(task, key, value)
            self.db.commit()

    # --- Novel Management ---
    def create_novel(self, settings: dict) -> Novel:
        novel = Novel(
            title=settings.get('title', 'Untitled'),
            genre=settings.get('genre'),
            style_tags=settings.get('style_tags'),
            target_audience=settings.get('target_audience'),
            total_words_target=settings.get('total_words'),
            min_chapter_words=settings.get('min_chapter_words'),
            background_setting=settings.get('background_setting'),
            chapter_title_format=settings.get('chapter_title_format', '第{chapter_number}章'),
            chapter_title_max_length=settings.get('chapter_title_max_length', 20)
        )
        self.db.add(novel)
        self.db.commit()
        self.db.refresh(novel)
        return novel

    def generate_outline(self, novel_id: int):
        task = self.create_task(novel_id, "outline", agent_name="OutlineAgent")
        
        def task_impl(db: Session, task_id: int, novel_id: int):
            task = db.query(GenerationTask).filter(GenerationTask.id == task_id).first()
            novel = db.query(Novel).filter(Novel.id == novel_id).first()
            if not novel:
                task.status = "failed"
                task.error_message = "Novel not found"
                db.commit()
                return

            task.status = "running"
            task.progress = 10
            db.commit()

            knowledge_context = self._get_knowledge_context(db, novel_id)

            settings = {
                "genre": novel.genre,
                "style_tags": novel.style_tags,
                "target_audience": novel.target_audience,
                "total_words_target": novel.total_words_target,
                "background_setting": f"{novel.background_setting}\n{knowledge_context}",
                "outline": novel.outline.content if novel.outline else ""
            }

            try:
                full_content = ""
                full_thought = ""
                
                # Streaming outline generation
                for chunk in self.outline_agent.stream_run(
                    user_input=f"根据以下设定创作一份详细的小说大纲：{settings}"
                ):
                    if chunk.get("reasoning"):
                        full_thought += chunk["reasoning"]
                        task.thought_log = full_thought
                        db.commit()
                    if chunk.get("content"):
                        full_content += chunk["content"]
                
                # Save outline
                if novel.outline:
                    novel.outline.content = full_content
                else:
                    new_outline = Outline(novel_id=novel.id, content=full_content)
                    db.add(new_outline)
                    db.flush()
                    novel.outline = new_outline
                
                task.status = "completed"
                task.progress = 100
                task.result = full_content
                db.commit()
                
            except Exception as e:
                task.status = "failed"
                task.error_message = str(e)
                db.commit()
                raise e

        self._run_async(task.id, task_impl, novel_id)
        return {"task_id": task.id}

    def get_chapters(self, novel_id: int):
        novel = self.db.query(Novel).filter(Novel.id == novel_id).first()
        if not novel: return []
        chapters = []
        for vol in novel.volumes:
            for chap in vol.chapters:
                chapters.append({
                    "id": chap.id,
                    "volume_id": vol.id,
                    "volume_number": vol.volume_number,
                    "volume_title": vol.title,
                    "chapter_number": chap.chapter_number,
                    "title": chap.title,
                    "status": chap.status,
                    "words": len(chap.content) if chap.content else 0
                })
        return chapters

    def get_tasks(self, novel_id: int, entity_id: int = None):
        query = self.db.query(GenerationTask).filter(GenerationTask.novel_id == novel_id)
        if entity_id:
            query = query.filter(GenerationTask.entity_id == entity_id)
        tasks = query.order_by(GenerationTask.created_at.desc()).all()
        return [{
            "id": t.id,
            "entity_type": t.entity_type,
            "entity_id": t.entity_id,
            "status": t.status,
            "progress": t.progress,
            "agent_name": t.agent_name,
            "thought_log": t.thought_log,
            "result": t.result,
            "error": t.error_message,
            "updated_at": t.updated_at.isoformat()
        } for t in tasks]

    def pause_task(self, task_id: int):
        self.update_task(task_id, status="paused")
        return {"status": "paused"}

    def resume_task(self, task_id: int):
        self.update_task(task_id, status="running") # In a real system, would trigger the worker again
        return {"status": "resumed"}

    def cancel_task(self, task_id: int):
        self.update_task(task_id, status="cancelled")
        return {"status": "cancelled"}

    def update_outline(self, novel_id: int, content: str):
        novel = self.db.query(Novel).filter(Novel.id == novel_id).first()
        if not novel:
            raise ValueError("Novel not found")
            
        if novel.outline:
            novel.outline.content = content
        else:
            new_outline = Outline(novel_id=novel.id, content=content)
            self.db.add(new_outline)
            
        self.db.commit()
        return {"status": "success", "content": content}

    def generate_titles(self, novel_id: int):
        task = self.create_task(novel_id, "titles", agent_name="书名专家")
        
        def task_impl(db: Session, task_id: int, novel_id: int):
            task = db.query(GenerationTask).filter(GenerationTask.id == task_id).first()
            novel = db.query(Novel).filter(Novel.id == novel_id).first()
            if not novel or not novel.outline:
                task.status = "failed"
                task.error_message = "Novel or Outline not found"
                db.commit()
                return
            
            task.status = "running"
            db.commit()
            
            try:
                full_thought = ""
                full_content = ""
                knowledge_context = self._get_knowledge_context(db, novel_id)
                prompt = f"""
                请为这部小说生成 5 个中文建议书名。
                大纲：{novel.outline.content[:2000]}
                核心设定：{knowledge_context}
                要求：
                1. 必须使用中文。
                2. 必须输出标准的 JSON 数组格式，例如：["书名1", "书名2"]。
                3. 不要包含 markdown 标记，只返回 JSON 字符串。
                """
                for chunk in self.title_agent.stream_run(user_input=prompt):
                    if chunk.get("reasoning"):
                        full_thought += chunk["reasoning"]
                        task.thought_log = full_thought
                        db.commit()
                    if chunk.get("content"):
                        full_content += chunk["content"]
                
                task.status = "completed"
                task.progress = 100
                task.result = full_content
                db.commit()
            except Exception as e:
                task.status = "failed"
                task.error_message = str(e)
                db.commit()

        self._run_async(task.id, task_impl, novel_id)
        return {"task_id": task.id}

    def plan_volume(self, novel_id: int, volume_number: int = 1):
        task = self.create_task(novel_id, "structure", agent_name="章节规划师")
        
        def task_impl(db: Session, task_id: int, novel_id: int, volume_number: int):
            task = db.query(GenerationTask).filter(GenerationTask.id == task_id).first()
            novel = db.query(Novel).filter(Novel.id == novel_id).first()
            if not novel: return

            task.status = "running"
            db.commit()

            # Create Volume
            volume = Volume(novel_id=novel.id, volume_number=volume_number, title=f"第{volume_number}卷")
            db.add(volume)
            db.commit()

            try:
                full_thought = ""
                full_content = ""
                prompt = f"Plan chapters for Volume: '{volume.title}'. Goal: Setup world. Approx 10 chapters. Format: {novel.chapter_title_format}"
                
                novel_outline = novel.outline.content if novel.outline else ""
                knowledge_context = self._get_knowledge_context(db, novel_id)
                
                for chunk in self.struct_agent.stream_run(
                    user_input=f"为分卷 '{volume.title}' 规划章节，参考全书大纲：{novel_outline[:3000]}\n相关设定知识库：{knowledge_context}"
                ):
                    if chunk.get("reasoning"):
                        full_thought += chunk["reasoning"]
                        task.thought_log = full_thought
                        db.commit()
                    if chunk.get("content"):
                        full_content += chunk["content"]

                lines = full_content.strip().split('\n')
                current_chapter_num = 0
                for line in lines:
                    if line.strip() and (line[0].isdigit() or line.startswith('Chapter') or '章' in line):
                        current_chapter_num += 1
                        chapter_title = novel.chapter_title_format.format(chapter_number=current_chapter_num)
                        content_desc = line.strip()
                        if content_desc and content_desc[0].isdigit():
                            parts = content_desc.split('.', 1)
                            if len(parts) > 1: content_desc = parts[1].strip()
                        
                        chap = Chapter(volume_id=volume.id, chapter_number=current_chapter_num, title=chapter_title, outline_content=content_desc)
                        db.add(chap)
                
                task.status = "completed"
                task.progress = 100
                task.result = full_content
                db.commit()
            except Exception as e:
                task.status = "failed"
                task.error_message = str(e)
                db.commit()

        self._run_async(task.id, task_impl, novel_id, volume_number)
        return {"task_id": task.id}

    def generate_chapter_outline(self, chapter_id: int):
        chapter_row = self.db.query(Chapter).filter(Chapter.id == chapter_id).first()
        novel = chapter_row.volume.novel
        task = self.create_task(novel.id, "chapter_outline", entity_id=chapter_id, agent_name="章节细化师")
        
        def task_impl(db: Session, task_id: int, chapter_id: int):
            task = db.query(GenerationTask).filter(GenerationTask.id == task_id).first()
            chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
            novel = chapter.volume.novel
            
            task.status = "running"
            db.commit()

            try:
                full_thought = ""
                full_content = ""
                knowledge_context = self._get_knowledge_context(db, novel.id)
                for chunk in self.chapter_outline_agent.stream_run(
                    user_input=f"请将以下简介：'{chapter.outline_content}' 扩展为详细的章节大纲。全书背景：{novel.outline.content[:500]}\n知识库参考：{knowledge_context}"
                ):
                    if chunk.get("reasoning"):
                        full_thought += chunk["reasoning"]
                        task.thought_log = full_thought
                        db.commit()
                    if chunk.get("content"):
                        full_content += chunk["content"]
                
                chapter.outline_content = full_content
                chapter.status = "outline_completed"
                task.status = "completed"
                task.progress = 100
                task.result = full_content
                db.commit()
            except Exception as e:
                task.status = "failed"
                task.error_message = str(e)
                db.commit()

        self._run_async(task.id, task_impl, chapter_id)
        return {"task_id": task.id}

    def generate_chapter_fine_outline(self, chapter_id: int):
        chapter_row = self.db.query(Chapter).filter(Chapter.id == chapter_id).first()
        novel = chapter_row.volume.novel
        task = self.create_task(novel.id, "chapter_fine_outline", entity_id=chapter_id, agent_name="细纲导演")
        
        def task_impl(db: Session, task_id: int, chapter_id: int):
            task = db.query(GenerationTask).filter(GenerationTask.id == task_id).first()
            chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
            
            task.status = "running"
            db.commit()

            try:
                full_thought = ""
                full_content = ""
                knowledge_context = self._get_knowledge_context(db, novel.id)
                for chunk in self.fine_outline_agent.stream_run(user_input=f"将以下章节大纲拆解为具体的细纲场次：{chapter.outline_content[:2000]}\n相关设定知识库：{knowledge_context}"):
                    if chunk.get("reasoning"):
                        full_thought += chunk["reasoning"]
                        task.thought_log = full_thought
                        db.commit()
                    if chunk.get("content"):
                        full_content += chunk["content"]
                
                chapter.detail_outline_content = full_content
                chapter.status = "fine_outline_completed"
                task.status = "completed"
                task.progress = 100
                task.result = full_content
                db.commit()
            except Exception as e:
                task.status = "failed"
                task.error_message = str(e)
                db.commit()

        self._run_async(task.id, task_impl, chapter_id)
        return {"task_id": task.id}

    def generate_chapter_content(self, chapter_id: int):
        chapter_row = self.db.query(Chapter).filter(Chapter.id == chapter_id).first()
        novel = chapter_row.volume.novel
        task = self.create_task(novel.id, "chapter_content", entity_id=chapter_id, agent_name="笔杆主笔")
        
        def task_impl(db: Session, task_id: int, chapter_id: int):
            task = db.query(GenerationTask).filter(GenerationTask.id == task_id).first()
            chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
            
            task.status = "running"
            chapter.status = "generating"
            db.commit()

            try:
                full_thought = ""
                full_content = ""
                knowledge_context = self._get_knowledge_context(db, chapter.volume.novel_id)
                prompt = f"编写章节：{chapter.title}\n情节细纲：{chapter.detail_outline_content}\n知识库设定参考：{knowledge_context}"
                
                for chunk in self.writer_agent.stream_run(user_input=prompt):
                    if chunk.get("reasoning"):
                        full_thought += chunk["reasoning"]
                        task.thought_log = full_thought
                        db.commit()
                    if chunk.get("content"):
                        full_content += chunk["content"]
                
                chapter.content = full_content
                chapter.status = "completed"
                task.status = "completed"
                task.progress = 100
                task.result = full_content
                db.commit()
            except Exception as e:
                chapter.status = "error"
                task.status = "failed"
                task.error_message = str(e)
                db.commit()

        self._run_async(task.id, task_impl, chapter_id)
        return {"task_id": task.id}
