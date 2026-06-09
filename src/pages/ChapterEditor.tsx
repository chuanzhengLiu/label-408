import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { ArrowLeft, Sparkles, Save, FileText, PenTool } from 'lucide-react';
import { toastConfig } from '../utils/toast';

// API Functions
const getChapter = async (id: string) => {
    const res = await api.get(`/chapters/${id}`);
    return res.data;
};

const generateChapterContent = async (id: string) => {
    const res = await api.post(`/chapters/${id}/generate`);
    return res.data;
};

const saveChapterContent = async ({ id, content, outline_content, detail_outline_content }: { id: string, content?: string, outline_content?: string, detail_outline_content?: string }) => {
    const res = await api.put(`/chapters/${id}`, { content, outline_content, detail_outline_content });
    return res.data;
};

const generateChapterOutline = async (id: string) => {
    const res = await api.post(`/chapters/${id}/outline`);
    return res.data;
};

const generateChapterFineOutline = async (id: string) => {
    const res = await api.post(`/chapters/${id}/fine_outline`);
    return res.data;
};

import AgentProgress from '../components/AgentProgress';

const ChapterEditor = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'outline' | 'fine_outline' | 'content'>('outline');
    const [content, setContent] = useState('');
    const [chapterOutline, setChapterOutline] = useState('');
    const [fineOutline, setFineOutline] = useState('');
    const [wordCount, setWordCount] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);

    // Fetch chapter data
    const { data: chapter, isLoading, refetch } = useQuery({
        queryKey: ['chapter', id],
        queryFn: () => getChapter(id!),
        staleTime: 30000,
        refetchOnWindowFocus: false,
        enabled: !!id
    });

    useEffect(() => {
        if (chapter) {
            setContent(chapter.content || '');
            setChapterOutline(chapter.outline_content || '');
            setFineOutline(chapter.detail_outline_content || '');
            setWordCount((chapter.content || '').length);
            
            // Auto switch to next stage if previous is filled
            if (chapter.content) setActiveTab('content');
            else if (chapter.detail_outline_content) setActiveTab('fine_outline');
            else setActiveTab('outline');
        }
    }, [chapter]);

    useEffect(() => {
        setWordCount(content.length);
    }, [content]);

    // Generate content mutation
    const outlineMutation = useMutation({
        mutationFn: () => generateChapterOutline(id!),
        onSuccess: () => {
            toastConfig.success('章节大纲生成已启动');
        }
    });

    const fineOutlineMutation = useMutation({
        mutationFn: () => generateChapterFineOutline(id!),
        onSuccess: () => {
            toastConfig.success('希纲生成已启动');
        }
    });

    const generateMutation = useMutation({
        mutationFn: () => generateChapterContent(id!),
        onSuccess: () => {
            toastConfig.success('正文生成已启动');
        }
    });

    const saveMutation = useMutation({
        mutationFn: () => saveChapterContent({ 
            id: id!, 
            content, 
            outline_content: chapterOutline, 
            detail_outline_content: fineOutline 
        }),
        onSuccess: () => toastConfig.success('保存成功！'),
    });

    const handleSave = () => {
        saveMutation.mutate();
    };

    const handleApplyResult = (task: any) => {
        const sourceText = task.result || task.thought_log;
        if (!sourceText) return;
        
        if (task.entity_type === 'chapter_outline') {
            setChapterOutline(sourceText);
            setActiveTab('outline');
            api.put(`/chapters/${id}`, { status: 'outline_completed' });
            toastConfig.success('章节大纲已加载');
        } else if (task.entity_type === 'chapter_fine_outline') {
            setFineOutline(sourceText);
            setActiveTab('fine_outline');
            api.put(`/chapters/${id}`, { status: 'fine_outline_completed' });
            toastConfig.success('希纲已加载');
        } else if (task.entity_type === 'chapter_content') {
            setContent(sourceText);
            setActiveTab('content');
            api.put(`/chapters/${id}`, { status: 'completed' });
            toastConfig.success('正文已加载');
        }
    };

    const handleTaskUpdate = useCallback((tasks: any[]) => {
        const activeTask = tasks.find(t => 
            t.entity_id === parseInt(id!) && 
            (t.status === 'running' || t.status === 'queued')
        );
        
        const wasRunning = isGenerating;
        const nowRunning = !!activeTask;
        
        if (wasRunning && !nowRunning) {
            // Task finished
            refetch();
        }
        setIsGenerating(nowRunning);
    }, [id, isGenerating, refetch]);

    const handleStageGenerate = () => {
        if (activeTab === 'outline') outlineMutation.mutate();
        if (activeTab === 'fine_outline') fineOutlineMutation.mutate();
        if (activeTab === 'content') generateMutation.mutate();
    };

    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-surface-50">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-surface-600">加载中...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-surface-50 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-surface-200 h-16 flex items-center px-6 justify-between">
                <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0 mr-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-surface-100 rounded-lg transition shrink-0"
                    >
                        <ArrowLeft className="w-5 h-5 text-surface-600" />
                    </button>
                    <div className="min-w-0">
                        <h1 className="text-base sm:text-lg font-bold text-surface-900 truncate">{chapter?.title || '章节编辑'}</h1>
                        <p className="text-[10px] sm:text-xs text-surface-500 whitespace-nowrap">第 {chapter?.chapter_number} 章</p>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    <button
                        onClick={handleStageGenerate}
                        disabled={outlineMutation.isPending || fineOutlineMutation.isPending || generateMutation.isPending}
                        className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg shadow-md hover:bg-primary-700 transition flex items-center disabled:opacity-50"
                    >
                        <Sparkles className="w-4 h-4 mr-2" />
                        生成当前步骤
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 text-sm font-medium text-surface-600 bg-white border border-surface-200 rounded-lg hover:bg-surface-50 transition flex items-center"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        保存
                    </button>
                </div>
            </header>

            <div className="flex bg-white border-b border-surface-200 px-6">
                {[
                    { id: 'outline', name: '章节大纲', icon: FileText },
                    { id: 'content', name: '章节正文', icon: PenTool },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-6 py-3 text-sm font-medium border-b-2 transition-all flex items-center space-x-2 ${
                            activeTab === tab.id 
                            ? 'border-primary-600 text-primary-600' 
                            : 'border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-200'
                        }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        <span>{tab.name}</span>
                    </button>
                ))}
            </div>

            <div className="flex-1 flex overflow-hidden">
                <main className="flex-1 overflow-y-auto p-8 lg:p-12 relative bg-surface-50">
                    <div className="max-w-4xl mx-auto">
                        {activeTab === 'outline' && (
                            <textarea
                                value={chapterOutline}
                                onChange={(e) => setChapterOutline(e.target.value)}
                                className="w-full h-[600px] p-10 bg-white rounded-2xl shadow-sm border border-surface-200 outline-none resize-none text-surface-800 text-lg leading-relaxed font-serif"
                                placeholder="输入或生成章节大纲..."
                            />
                        )}
                        {activeTab === 'fine_outline' && (
                            <textarea
                                value={fineOutline}
                                onChange={(e) => setFineOutline(e.target.value)}
                                className="w-full h-[600px] p-10 bg-white rounded-2xl shadow-sm border border-surface-200 outline-none resize-none text-surface-800 text-lg leading-relaxed font-serif"
                                placeholder="输入或生成章节细浓..."
                            />
                        )}
                        {activeTab === 'content' && (
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="w-full h-[800px] p-10 bg-white rounded-2xl shadow-sm border border-surface-200 outline-none resize-none text-surface-800 text-lg leading-relaxed font-serif"
                                placeholder="在此编辑章节正文..."
                            />
                        )}
                    </div>
                </main>
                <AgentProgress 
                    novelId={chapter?.novel_id?.toString() || ""} 
                    onTaskUpdate={handleTaskUpdate} 
                    onApplyResult={handleApplyResult}
                />
            </div>
            <footer className="footer-status p-2 bg-surface-100 border-t border-surface-200 text-xs text-surface-500 flex justify-between items-center px-6">
                <div>{wordCount.toLocaleString()} 字</div>
                <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span>DeepSeek Agent Connected</span>
                </div>
            </footer>
        </div>
    );
};

export default ChapterEditor;
