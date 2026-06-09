from sqlalchemy import create_engine, Column, Integer, String, Text, ForeignKey, JSON, DateTime
from sqlalchemy.orm import sessionmaker, declarative_base, relationship
from datetime import datetime

Base = declarative_base()

class Novel(Base):
    __tablename__ = 'novels'

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, default="Untitled")
    genre = Column(String) # JSON or Comma Sep
    style_tags = Column(String) # JSON or Comma Sep
    target_audience = Column(String)
    total_words_target = Column(Integer)
    min_chapter_words = Column(Integer)
    background_setting = Column(Text)
    chapter_title_format = Column(String, default="第{chapter_number}章") # 章节标题格式
    chapter_title_max_length = Column(Integer, default=20) # 章节标题最大长度

    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    volumes = relationship("Volume", back_populates="novel", cascade="all, delete-orphan")
    knowledge_entries = relationship("KnowledgeEntry", back_populates="novel", cascade="all, delete-orphan")
    outline = relationship("Outline", back_populates="novel", uselist=False, cascade="all, delete-orphan")

class KnowledgeEntry(Base):
    __tablename__ = 'knowledge_entries'
    
    id = Column(Integer, primary_key=True, index=True)
    novel_id = Column(Integer, ForeignKey('novels.id'))
    category = Column(String) # Character, Location, Item, Lore
    title = Column(String)
    content = Column(Text)
    
    novel = relationship("Novel", back_populates="knowledge_entries")

class Outline(Base):
    __tablename__ = 'outlines'
    
    id = Column(Integer, primary_key=True, index=True)
    novel_id = Column(Integer, ForeignKey('novels.id'))
    content = Column(Text) # The generated outline text
    
    novel = relationship("Novel", back_populates="outline")

class Volume(Base):
    __tablename__ = 'volumes'
    
    id = Column(Integer, primary_key=True, index=True)
    novel_id = Column(Integer, ForeignKey('novels.id'))
    volume_number = Column(Integer)
    title = Column(String)
    
    novel = relationship("Novel", back_populates="volumes")
    chapters = relationship("Chapter", back_populates="volume", cascade="all, delete-orphan")

class Chapter(Base):
    __tablename__ = 'chapters'
    
    id = Column(Integer, primary_key=True, index=True)
    volume_id = Column(Integer, ForeignKey('volumes.id'))
    chapter_number = Column(Integer)
    title = Column(String)
    
    outline_content = Column(Text) # Chapter Outline
    detail_outline_content = Column(Text) # Chapter Fine Outline (Xi Gang)
    content = Column(Text) # Actual Story Content
    
    status = Column(String, default="pending") # pending, generating, completed, error
    
    volume = relationship("Volume", back_populates="chapters")

class GenerationTask(Base):
    __tablename__ = 'generation_tasks'
    
    id = Column(Integer, primary_key=True, index=True)
    novel_id = Column(Integer, ForeignKey('novels.id'))
    entity_type = Column(String) # outline, titles, structure, chapter_outline, chapter_fine_outline, chapter_content
    entity_id = Column(Integer, nullable=True) # id of outline, volume, or chapter
    
    status = Column(String, default="queued") # queued, running, paused, cancelled, completed, failed
    progress = Column(Integer, default=0) # 0-100
    
    agent_name = Column(String)
    thought_log = Column(Text, default="") # Logs of thinking process
    result = Column(Text, nullable=True) # Final output content
    error_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Database Setup
DATABASE_URL = "sqlite:///./novel_brain.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)
