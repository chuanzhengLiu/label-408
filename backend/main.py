from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import os
import io
from datetime import datetime
from urllib.parse import quote
from typing import List, Optional

app = FastAPI(title="Novel Gen Brain")

# CORS for Tauri (usually runs on localhost:1420 or similar, but allow all for local dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class HealthResponse(BaseModel):
    status: str
    message: str

from sqlalchemy.orm import Session
from fastapi import Depends
from .database import SessionLocal, init_db, Novel, Chapter
from .services.workflow import NovelService

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.on_event("startup")
def on_startup():
    init_db()

from .database import KnowledgeEntry, Volume

class NovelSettings(BaseModel):
    title: str
    genre: str
    style_tags: str
    target_audience: str
    total_words: int
    min_chapter_words: int
    background_setting: str
    chapter_title_format: Optional[str] = "第{chapter_number}章"
    chapter_title_max_length: Optional[int] = 20

class KnowledgeEntryCreate(BaseModel):
    category: str
    title: str
    content: str

class KnowledgeEntryUpdate(BaseModel):
    category: Optional[str] = None
    title: Optional[str] = None
    content: Optional[str] = None

@app.post("/novels/")
def create_novel_endpoint(settings: NovelSettings, db: Session = Depends(get_db)):
    service = NovelService(db)
    return service.create_novel(settings.model_dump())

@app.post("/novels/{novel_id}/outline")
def generate_outline_endpoint(novel_id: int, db: Session = Depends(get_db)):
    service = NovelService(db)
    return {"outline": service.generate_outline(novel_id)}

class NovelUpdate(BaseModel):
    title: Optional[str] = None
    genre: Optional[str] = None
    style_tags: Optional[str] = None
    target_audience: Optional[str] = None
    background_setting: Optional[str] = None

@app.put("/novels/{novel_id}")
def update_novel_endpoint(novel_id: int, update: NovelUpdate, db: Session = Depends(get_db)):
    novel = db.query(Novel).filter(Novel.id == novel_id).first()
    if not novel:
        return {"error": "Novel not found"}
    if update.title is not None: novel.title = update.title
    if update.genre is not None: novel.genre = update.genre
    if update.style_tags is not None: novel.style_tags = update.style_tags
    if update.target_audience is not None: novel.target_audience = update.target_audience
    if update.background_setting is not None: novel.background_setting = update.background_setting
    db.commit()
    return {"status": "success"}

class OutlineUpdate(BaseModel):
    content: str

@app.put("/novels/{novel_id}/outline")
def update_outline_endpoint(novel_id: int, update: OutlineUpdate, db: Session = Depends(get_db)):
    service = NovelService(db)
    return service.update_outline(novel_id, update.content)

@app.post("/novels/{novel_id}/titles")
def generate_titles_endpoint(novel_id: int, db: Session = Depends(get_db)):
    service = NovelService(db)
    return {"titles": service.generate_titles(novel_id)}

@app.post("/novels/{novel_id}/plan_volume")
def plan_volume_endpoint(novel_id: int, db: Session = Depends(get_db)):
    service = NovelService(db)
    return {"plan": service.plan_volume(novel_id)}


@app.get("/novels/")
def list_novels_endpoint(db: Session = Depends(get_db)):
    novels = db.query(Novel).order_by(Novel.created_at.desc()).all()
    result = []
    for novel in novels:
        total_words = sum(len(c.content or "") for v in novel.volumes for c in v.chapters)
        total_chapters = sum(len(v.chapters) for v in novel.volumes)
        result.append({
            "id": novel.id,
            "title": novel.title,
            "genre": novel.genre,
            "created_at": novel.created_at.isoformat(),
            "total_words": total_words,
            "total_chapters": total_chapters,
            "status": "连载中" if total_chapters > 0 else "筹备中"
        })
    return result

@app.get("/novels/{novel_id}")
def get_novel_endpoint(novel_id: int, db: Session = Depends(get_db)):
    novel = db.query(Novel).filter(Novel.id == novel_id).first()
    if not novel:
        return {"error": "Novel not found"}
    return {
        "id": novel.id,
        "title": novel.title,
        "genre": novel.genre,
        "style_tags": novel.style_tags,
        "target_audience": novel.target_audience,
        "background_setting": novel.background_setting,
        "outline": {"content": novel.outline.content} if novel.outline else None
    }

@app.get("/novels/{novel_id}/chapters")
def get_chapters_endpoint(novel_id: int, db: Session = Depends(get_db)):
    service = NovelService(db)
    return service.get_chapters(novel_id)

@app.get("/chapters/{chapter_id}")
def get_chapter_endpoint(chapter_id: int, db: Session = Depends(get_db)):
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        return {"error": "Chapter not found"}
    return {
        "id": chapter.id,
        "title": chapter.title,
        "chapter_number": chapter.chapter_number,
        "content": chapter.content or "",
        "outline_content": chapter.outline_content or "",
        "detail_outline_content": chapter.detail_outline_content or "",
        "status": chapter.status,
        "novel_id": chapter.volume.novel_id
    }

class ChapterUpdate(BaseModel):
    content: Optional[str] = None
    outline_content: Optional[str] = None
    detail_outline_content: Optional[str] = None
    status: Optional[str] = None

@app.put("/chapters/{chapter_id}")
def update_chapter_endpoint(chapter_id: int, update: ChapterUpdate, db: Session = Depends(get_db)):
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        return {"error": "Chapter not found"}
    if update.content is not None: chapter.content = update.content
    if update.outline_content is not None: chapter.outline_content = update.outline_content
    if update.detail_outline_content is not None: chapter.detail_outline_content = update.detail_outline_content
    if update.status is not None: chapter.status = update.status
    db.commit()
    return {"status": "success"}

@app.post("/chapters/{chapter_id}/outline")
def generate_chapter_outline_endpoint(chapter_id: int, db: Session = Depends(get_db)):
    service = NovelService(db)
    return {"outline": service.generate_chapter_outline(chapter_id)}

@app.post("/chapters/{chapter_id}/fine_outline")
def generate_chapter_fine_outline_endpoint(chapter_id: int, db: Session = Depends(get_db)):
    service = NovelService(db)
    return {"fine_outline": service.generate_chapter_fine_outline(chapter_id)}

@app.post("/chapters/{chapter_id}/generate")
def generate_chapter_endpoint(chapter_id: int, db: Session = Depends(get_db)):
    service = NovelService(db)
    return {"content": service.generate_chapter_content(chapter_id)}

@app.get("/novels/{novel_id}/tasks")
def list_tasks_endpoint(novel_id: int, db: Session = Depends(get_db)):
    service = NovelService(db)
    return service.get_tasks(novel_id)

@app.post("/tasks/{task_id}/pause")
def pause_task_endpoint(task_id: int, db: Session = Depends(get_db)):
    service = NovelService(db)
    return service.pause_task(task_id)

@app.post("/tasks/{task_id}/resume")
def resume_task_endpoint(task_id: int, db: Session = Depends(get_db)):
    service = NovelService(db)
    return service.resume_task(task_id)

@app.post("/tasks/{task_id}/cancel")
def cancel_task_endpoint(task_id: int, db: Session = Depends(get_db)):
    service = NovelService(db)
    return service.cancel_task(task_id)

# --- Knowledge Base Endpoints ---

@app.get("/novels/{novel_id}/knowledge")
def get_knowledge_endpoint(novel_id: int, db: Session = Depends(get_db)):
    entries = db.query(KnowledgeEntry).filter(KnowledgeEntry.novel_id == novel_id).all()
    return entries

@app.post("/novels/{novel_id}/knowledge")
def create_knowledge_endpoint(novel_id: int, entry: KnowledgeEntryCreate, db: Session = Depends(get_db)):
    db_entry = KnowledgeEntry(
        novel_id=novel_id,
        category=entry.category,
        title=entry.title,
        content=entry.content
    )
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry

@app.put("/knowledge/{entry_id}")
def update_knowledge_endpoint(entry_id: int, entry: KnowledgeEntryUpdate, db: Session = Depends(get_db)):
    db_entry = db.query(KnowledgeEntry).filter(KnowledgeEntry.id == entry_id).first()
    if not db_entry:
        return {"error": "Entry not found"}
    
    if entry.category is not None: db_entry.category = entry.category
    if entry.title is not None: db_entry.title = entry.title
    if entry.content is not None: db_entry.content = entry.content
    
    db.commit()
    return db_entry

@app.delete("/knowledge/{entry_id}")
def delete_knowledge_endpoint(entry_id: int, db: Session = Depends(get_db)):
    db_entry = db.query(KnowledgeEntry).filter(KnowledgeEntry.id == entry_id).first()
    if not db_entry:
        return {"error": "Entry not found"}
    
    db.delete(db_entry)
    db.commit()
    return {"status": "success"}

# --- Export Endpoints ---

def _sanitize_filename(name: str) -> str:
    invalid = '<>:"/\\|?*\n\r\t'
    cleaned = "".join(c for c in (name or "") if c not in invalid).strip()
    return cleaned or "novel"

def _format_chapter_text(chapter: Chapter) -> str:
    title = chapter.title or f"第{chapter.chapter_number}章"
    body = (chapter.content or "").strip()
    separator = "=" * 40
    return f"{separator}\n{title}\n{separator}\n\n{body}\n\n"

def _build_export_text(novel: Novel, volumes: List[Volume]) -> str:
    header_separator = "*" * 50
    parts = [
        header_separator,
        f"作品名称：{novel.title or '未命名作品'}",
        f"题材：{novel.genre or '未分类'}",
        f"导出时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        header_separator,
        "",
        "",
    ]
    text = "\n".join(parts)
    for vol in sorted(volumes, key=lambda v: v.volume_number or 0):
        vol_title = vol.title or f"第{vol.volume_number}卷"
        text += f"\n【{vol_title}】\n\n"
        for chap in sorted(vol.chapters, key=lambda c: c.chapter_number or 0):
            text += _format_chapter_text(chap)
    return text

def _make_download_response(content: str, filename: str) -> StreamingResponse:
    buffer = io.BytesIO(content.encode("utf-8-sig"))
    encoded_name = quote(filename)
    headers = {
        "Content-Disposition": f"attachment; filename=\"{encoded_name}\"; filename*=UTF-8''{encoded_name}",
    }
    return StreamingResponse(buffer, media_type="text/plain; charset=utf-8", headers=headers)

@app.get("/novels/{novel_id}/volumes")
def list_volumes_endpoint(novel_id: int, db: Session = Depends(get_db)):
    novel = db.query(Novel).filter(Novel.id == novel_id).first()
    if not novel:
        return {"error": "Novel not found"}
    result = []
    for vol in sorted(novel.volumes, key=lambda v: v.volume_number or 0):
        result.append({
            "id": vol.id,
            "volume_number": vol.volume_number,
            "title": vol.title,
            "chapter_count": len(vol.chapters),
        })
    return result

@app.get("/novels/{novel_id}/export")
def export_novel_endpoint(novel_id: int, db: Session = Depends(get_db)):
    novel = db.query(Novel).filter(Novel.id == novel_id).first()
    if not novel:
        return {"error": "Novel not found"}
    text = _build_export_text(novel, list(novel.volumes))
    date_str = datetime.now().strftime("%Y%m%d")
    filename = f"{_sanitize_filename(novel.title)}_全本_{date_str}.txt"
    return _make_download_response(text, filename)

@app.get("/novels/{novel_id}/volumes/{volume_id}/export")
def export_volume_endpoint(novel_id: int, volume_id: int, db: Session = Depends(get_db)):
    novel = db.query(Novel).filter(Novel.id == novel_id).first()
    if not novel:
        return {"error": "Novel not found"}
    volume = db.query(Volume).filter(Volume.id == volume_id, Volume.novel_id == novel_id).first()
    if not volume:
        return {"error": "Volume not found"}
    text = _build_export_text(novel, [volume])
    date_str = datetime.now().strftime("%Y%m%d")
    vol_name = _sanitize_filename(volume.title or f"第{volume.volume_number}卷")
    filename = f"{_sanitize_filename(novel.title)}_{vol_name}_{date_str}.txt"
    return _make_download_response(text, filename)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
