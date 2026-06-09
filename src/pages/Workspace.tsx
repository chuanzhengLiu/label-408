import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { FileText, List, Mic2, Save, RefreshCw, ChevronLeft, Layout, Zap, PenTool, Type, Sparkles as SparklesIcon, CheckCircle2, Library, Plus, Trash2, User, MapPin, Sword, Info, Download, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toastConfig } from '../utils/toast';
import AgentProgress from '../components/AgentProgress';

// API Functions
const getNovel = async (id: string) => {
    const res = await api.get(`/novels/${id}`);
    return res.data;
};

const generateOutline = async (id: string) => {
    const res = await api.post(`/novels/${id}/outline`);
    return res.data;
};

const planVolume = async (id: string) => {
    const res = await api.post(`/novels/${id}/plan_volume`);
    return res.data;
};

const generateTitles = async (id: string) => {
    const res = await api.post(`/novels/${id}/titles`);
    return res.data;
};

const getChapters = async (id: string) => {
    const res = await api.get(`/novels/${id}/chapters`);
    return res.data;
};

const saveOutlineContent = async ({ id, content }: { id: string, content: string }) => {
    const res = await api.put(`/novels/${id}/outline`, { content });
    return res.data;
};

const getKnowledge = async (novelId: string) => {
    const res = await api.get(`/novels/${novelId}/knowledge`);
    return res.data;
};

const createKnowledge = async ({ novelId, entry }: { novelId: string, entry: any }) => {
    const res = await api.post(`/novels/${novelId}/knowledge`, entry);
    return res.data;
};

const deleteKnowledge = async (entryId: number) => {
    const res = await api.delete(`/knowledge/${entryId}`);
    return res.data;
};

const getVolumes = async (id: string) => {
    const res = await api.get(`/novels/${id}/volumes`);
    return res.data;
};

const exportNovel = async (novelId: string, volumeId?: number) => {
    const params = volumeId !== undefined ? { volume_id: volumeId } : {};
    const res = await api.get(`/novels/${novelId}/export`, { params, responseType: 'blob' });
    const blob = new Blob([res.data], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const disposition = res.headers['content-disposition'];
    let filename = `export_${novelId}.txt`;
    if (disposition) {
        const match = disposition.match(/filename\*=UTF-8''(.+)/);
        if (match) filename = decodeURIComponent(match[1]);
    }
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
};

const Workspace = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'outline' | 'titles' | 'chapters' | 'knowledge'>('outline');
    const [outlineText, setOutlineText] = useState('');
    const [isOutlineTaskRunning, setIsOutlineTaskRunning] = useState(false);
    const [chapters, setChapters] = useState<any[]>([]);
    const [titles, setTitles] = useState<string[]>([]);
    const [lastCompletedCount, setLastCompletedCount] = useState(0);
    const [isAddKnowledgeOpen, setIsAddKnowledgeOpen] = useState(false);
    const [newEntry, setNewEntry] = useState({ category: '角色', title: '', content: '' });
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // Fetch Novel Data
    const { data: novel, isLoading: novelLoading } = useQuery({
        queryKey: ['novel', id],
        queryFn: () => getNovel(id!),
        enabled: !!id,
        staleTime: 30000, // 30 seconds stale time
        refetchOnWindowFocus: false
    });

    // Fetch Chapters Query
    const { data: chaptersData, refetch: refetchChapters } = useQuery({
        queryKey: ['chapters', id],
        queryFn: () => getChapters(id!),
        enabled: activeTab === 'chapters',
        staleTime: 30000,
        refetchOnWindowFocus: false
    });

    // Fetch Knowledge Query
    const { data: knowledgeData } = useQuery({
        queryKey: ['knowledge', id],
        queryFn: () => getKnowledge(id!),
        enabled: activeTab === 'knowledge',
        staleTime: 60000,
        refetchOnWindowFocus: false
    });

    const { data: volumesData } = useQuery({
        queryKey: ['volumes', id],
        queryFn: () => getVolumes(id!),
        enabled: !!id,
        staleTime: 60000,
        refetchOnWindowFocus: false
    });

    React.useEffect(() => {
        if (chaptersData) {
            setChapters(chaptersData);
        }
    }, [chaptersData]);

    React.useEffect(() => {
        if (novel?.outline?.content) {
            setOutlineText(novel.outline.content);
        }
    }, [novel]);

    // Initial load
    React.useEffect(() => {
        if(activeTab === 'chapters') {
            refetchChapters();
        }
    }, [activeTab]);

    const outlineMutation = useMutation({
        mutationFn: () => generateOutline(id!),
        onSuccess: () => {
            toastConfig.success('大纲生成任务已启动');
        },
        onError: (e) => {
            console.error(e);
            toastConfig.error('大纲生成失败，请检查后端服务');
        }
    });

    const saveMutation = useMutation({
        mutationFn: () => saveOutlineContent({ id: id!, content: outlineText }),
        onSuccess: () => {
            toastConfig.success('保存成功！');
        },
        onError: (e) => {
            console.error(e);
            toastConfig.error('保存失败，请重试');
        }
    });

    const planVolumeMutation = useMutation({
        mutationFn: () => planVolume(id!),
        onSuccess: () => {
            toastConfig.success('章节规划已启动');
            queryClient.invalidateQueries({ queryKey: ['chapters', id] });
        },
        onError: () => toastConfig.error('规划失败')
    });

    const createKnowledgeMutation = useMutation({
        mutationFn: (entry: any) => createKnowledge({ novelId: id!, entry }),
        onSuccess: () => {
            toastConfig.success('设定已添加');
            queryClient.invalidateQueries({ queryKey: ['knowledge', id] });
        }
    });

    const deleteKnowledgeMutation = useMutation({
        mutationFn: (entryId: number) => deleteKnowledge(entryId),
        onSuccess: () => {
            toastConfig.success('设定已删除');
            queryClient.invalidateQueries({ queryKey: ['knowledge', id] });
        }
    });

    const titleMutation = useMutation({
        mutationFn: () => {
            if (!novel?.outline?.content && !outlineText) {
                toastConfig.error('请先生成或编写大纲再生成书名');
                throw new Error('Missing outline');
            }
            return generateTitles(id!);
        },
        onSuccess: () => {
            toastConfig.success('书名生成任务已启动');
        }
    });

    const [isBatching, setIsBatching] = useState(false);

    const useTitleMutation = useMutation({
        mutationFn: (newTitle: string) => api.put(`/novels/${id}`, { title: newTitle }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['novel', id] });
            toastConfig.success('小说书名已更新！');
        }
    });

    const handleUseTitle = (title: string) => {
        useTitleMutation.mutate(title);
    };

    const handleBatchGenerate = async () => {
        if (!chapters.length) return;
        setIsBatching(true);
        try {
            for (const chapter of chapters) {
                // Determine next step
                if (!chapter.outline_content) {
                    await api.post(`/chapters/${chapter.id}/outline`);
                } else if (!chapter.detail_outline_content) {
                    await api.post(`/chapters/${chapter.id}/fine_outline`);
                } else if (chapter.status !== 'completed') {
                    await api.post(`/chapters/${chapter.id}/generate`);
                }
                // Wait a bit to show progress and avoid rate limits
                await new Promise(r => setTimeout(r, 2000));
                refetchChapters();
            }
            toastConfig.success('批量生成已排入队列');
        } catch (e) {
            console.error("Batch error", e);
            toastConfig.error('批量生成过程中出错');
        } finally {
            setIsBatching(false);
        }
    };

    const handleSave = () => {
        saveMutation.mutate();
    };

    const parseTitles = (text: string) => {
        // 1. Try to find JSON array anywhere in the text
        const jsonMatch = text.match(/\[\s*["'「].*?["'」]\s*(?:,\s*["'「].*?["'」]\s*)*\]/s);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0].replace(/「|」/g, '"'));
                if (Array.isArray(parsed)) return parsed.map(t => String(t).trim());
            } catch (e) {
                console.warn("JSON parse failed, falling back", e);
            }
        }

        // 2. Fallback: Look for numbered list format (e.g., 1. 《Title》)
        const lines = text.split('\n');
        const titleCandidates: string[] = [];
        
        // Regex for common list patterns in LLM outputs
        // Matches: 1. Title, 1, Title, - Title, * Title, etc.
        const listRegex = /^(?:\d+[\.\、\:\s]\s*|[\-\*\•]\s*)(.+)$/;
        
        for (let line of lines) {
            line = line.trim();
            if (!line) continue;
            
            const match = line.match(listRegex);
            if (match) {
                let candidate = match[1].trim();
                // Remove surrounding quotes, brackets, or bolding
                candidate = candidate.replace(/^["'「《\*\*]+|["'」》\*\*]+$/g, '').trim();
                if (candidate.length > 1 && candidate.length < 50) {
                    titleCandidates.push(candidate);
                }
            } else {
                // Also look for quotes "Title" or 「Title」 or 《Title》 on a line by itself
                const quoteMatch = line.match(/^["'「《](.+?)["'」》]$/);
                if (quoteMatch) {
                    titleCandidates.push(quoteMatch[1].trim());
                }
            }
        }

        // 3. Last resort: just return non-empty lines if we found anything resembling a list
        if (titleCandidates.length > 0) return titleCandidates;

        return lines
            .map(l => l.trim())
            .filter(l => l.length > 2 && l.length < 50)
            .slice(-10); // Maybe the titles are at the end
    };

    const handleApplyResult = (task: any) => {
        const sourceText = task.result || task.thought_log;
        if (!sourceText) return;
        
        if (task.entity_type === 'outline') {
            setOutlineText(sourceText);
            toastConfig.success('大纲已加载到编辑器');
        } else if (task.entity_type === 'titles') {
            const lines = parseTitles(sourceText);
            if (lines.length > 0) {
                setTitles(lines);
                setActiveTab('titles');
                toastConfig.success('书名建议已加载');
            } else {
                toastConfig.error('无法解析生成的结果，请尝试重新生成或查看日志');
            }
        } else if (task.entity_type === 'chapter_outline' || task.entity_type === 'chapter_fine_outline' || task.entity_type === 'chapter_content') {
            const statusMap: Record<string, string> = {
                'chapter_outline': 'outline_completed',
                'chapter_fine_outline': 'fine_outline_completed',
                'chapter_content': 'completed'
            };
            
            const newStatus = statusMap[task.entity_type];
            
            // Explicitly tell the backend to update the status to ensure it's synced
            if (task.entity_id) {
                api.put(`/chapters/${task.entity_id}`, { 
                    status: newStatus 
                }).then(() => {
                    queryClient.invalidateQueries({ queryKey: ['chapters', id] });
                    refetchChapters();
                    toastConfig.success('章节数据已同步');
                }).catch(err => {
                    console.error("Sync error", err);
                    toastConfig.error('同步状态失败，但数据可能已加载');
                });
            }
        }
    };

    const handleTaskUpdate = React.useCallback((tasks: any[]) => {
        const runningTasks = tasks.filter(t => t.status === 'running' || t.status === 'queued');
        const wasRunning = isOutlineTaskRunning;
        const anyRunning = runningTasks.length > 0;
        
        // Track completed task count to detect if any task just finished
        const completedCount = tasks.filter(t => t.status === 'completed').length;

        if (completedCount > lastCompletedCount || (wasRunning && !anyRunning)) {
            // Something finished or everything finished
            queryClient.invalidateQueries({ queryKey: ['novel', id] });
            refetchChapters();
            setLastCompletedCount(completedCount);
            
            // Check for newly completed titles
            const completedTitleTask = tasks.find(t => t.entity_type === 'titles' && t.status === 'completed');
            if (completedTitleTask && completedTitleTask.result && titles.length === 0) {
                const lines = parseTitles(completedTitleTask.result);
                if (lines.length > 0) setTitles(lines);
            }
        }
        setIsOutlineTaskRunning(anyRunning);
    }, [id, lastCompletedCount, isOutlineTaskRunning, titles.length, queryClient, refetchChapters]);

    const handleContinue = () => {
        handleSave();
        if (titles.length === 0) setActiveTab('titles');
        else setActiveTab('chapters');
    };

    const handleExport = async (volumeId?: number) => {
        if (!id) return;
        setIsExporting(true);
        setIsExportMenuOpen(false);
        try {
            await exportNovel(id, volumeId);
            toastConfig.success(volumeId ? '按卷导出成功' : '整本导出成功');
        } catch (e) {
            console.error(e);
            toastConfig.error('导出失败，请重试');
        } finally {
            setIsExporting(false);
        }
    };


    if (novelLoading) {
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
        <div className="h-screen bg-surface-50 flex overflow-hidden">
            {/* Sidebar */}
            <aside className="w-20 lg:w-64 bg-white border-r border-surface-200 flex flex-col z-20">
                <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-surface-100">
                    <Link to="/" className="text-surface-400 hover:text-primary-600 transition">
                         <div className="p-2 rounded-lg hover:bg-surface-50">
                            <ChevronLeft className="w-6 h-6" />
                         </div>
                    </Link>
                    <span className="hidden lg:block ml-2 font-bold text-lg text-surface-800 tracking-tight">智作工坊</span>
                </div>
                
                <nav className="flex-1 p-4 space-y-2">
                    <button 
                        onClick={() => setActiveTab('outline')}
                        className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 group relative ${activeTab === 'outline' ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-surface-500 hover:bg-surface-50 hover:text-surface-900'}`}
                    >
                        <Layout className={`w-6 h-6 lg:mr-3 ${activeTab === 'outline' ? 'text-primary-600' : 'text-surface-400 group-hover:text-surface-600'}`} />
                        <span className="hidden lg:block">大纲编排</span>
                        {activeTab === 'outline' && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-500 rounded-l-full" />}
                    </button>

                    <button 
                        onClick={() => setActiveTab('titles')}
                        className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 group relative ${activeTab === 'titles' ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-surface-500 hover:bg-surface-50 hover:text-surface-900'}`}
                    >
                        <Type className={`w-6 h-6 lg:mr-3 ${activeTab === 'titles' ? 'text-primary-600' : 'text-surface-400 group-hover:text-surface-600'}`} />
                        <span className="hidden lg:block">书名挑选</span>
                        {activeTab === 'titles' && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-500 rounded-l-full" />}
                    </button>

                    <button 
                        onClick={() => setActiveTab('chapters')}
                        className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 group relative ${activeTab === 'chapters' ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-surface-500 hover:bg-surface-50 hover:text-surface-900'}`}
                    >
                        <List className={`w-6 h-6 lg:mr-3 ${activeTab === 'chapters' ? 'text-primary-600' : 'text-surface-400 group-hover:text-surface-600'}`} />
                        <span className="hidden lg:block">章节管理</span>
                        {activeTab === 'chapters' && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-500 rounded-l-full" />}
                    </button>

                    <button 
                        onClick={() => setActiveTab('knowledge')}
                        className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 group relative ${activeTab === 'knowledge' ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-surface-500 hover:bg-surface-50 hover:text-surface-900'}`}
                    >
                        <Library className={`w-6 h-6 lg:mr-3 ${activeTab === 'knowledge' ? 'text-primary-600' : 'text-surface-400 group-hover:text-surface-600'}`} />
                        <span className="hidden lg:block">设定知识库</span>
                        {activeTab === 'knowledge' && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-500 rounded-l-full" />}
                    </button>
                </nav>

                <div className="p-4 border-t border-surface-100 hidden lg:block">
                    <div className="bg-gradient-to-br from-surface-900 to-surface-800 p-4 rounded-xl text-white shadow-lg">
                        <div className="flex items-center space-x-2 mb-2">
                           <Zap className="w-4 h-4 text-yellow-400" />
                           <span className="text-xs font-bold uppercase tracking-wider">DeepSeek Agent</span>
                        </div>
                        <p className="text-xs text-surface-300 leading-relaxed">
                            多智能体系统正在待命，准备辅助您的创作。
                        </p>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Header */}
                <header className="bg-white/80 backdrop-blur-md border-b border-surface-200 h-16 flex items-center px-4 sm:px-8 justify-between z-10 sticky top-0">
                    <div className="flex-1 min-w-0 mr-4">
                        <h2 className="text-lg sm:text-xl font-bold text-surface-900 flex items-center min-w-0">
                            <span className="truncate">{novel?.title || '未命名作品'}</span>
                            <span className="ml-3 px-2 py-0.5 rounded-md bg-surface-100 text-surface-500 text-[10px] sm:text-xs border border-surface-200 shrink-0">{novel?.genre || '未分类'}</span>
                        </h2>
                    </div>
                    
                    <div className="flex space-x-3">
                        <div className="relative">
                            <button 
                                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                                disabled={isExporting}
                                className="px-4 py-2 text-sm font-medium text-surface-600 bg-white border border-surface-200 rounded-lg shadow-sm hover:bg-surface-50 transition flex items-center disabled:opacity-50"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                {isExporting ? '导出中...' : '导出'}
                                <ChevronDown className="w-3 h-3 ml-1" />
                            </button>
                            {isExportMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-30" onClick={() => setIsExportMenuOpen(false)} />
                                    <div className="absolute right-0 mt-2 w-48 bg-white border border-surface-200 rounded-lg shadow-lg z-40 py-1">
                                        <button
                                            onClick={() => handleExport()}
                                            className="w-full text-left px-4 py-2 text-sm text-surface-700 hover:bg-surface-50 flex items-center"
                                        >
                                            <Download className="w-4 h-4 mr-2 text-surface-400" />
                                            整本导出
                                        </button>
                                        {volumesData?.length > 0 && (
                                            <>
                                                <div className="border-t border-surface-100 my-1" />
                                                {volumesData.map((vol: any) => (
                                                    <button
                                                        key={vol.id}
                                                        onClick={() => handleExport(vol.id)}
                                                        className="w-full text-left px-4 py-2 text-sm text-surface-700 hover:bg-surface-50 flex items-center"
                                                    >
                                                        <FileText className="w-4 h-4 mr-2 text-surface-400" />
                                                        {vol.title}
                                                    </button>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                        <button 
                            onClick={handleSave}
                            disabled={saveMutation.isPending}
                            className="px-4 py-2 text-sm font-medium text-surface-600 bg-white border border-surface-200 rounded-lg shadow-sm hover:bg-surface-50 transition flex items-center disabled:opacity-50"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {saveMutation.isPending ? '保存中...' : '保存草稿'}
                        </button>
                        <button 
                            onClick={handleContinue}
                            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg shadow-md shadow-primary-500/20 hover:bg-primary-700 transition flex items-center"
                        >
                            <PenTool className="w-4 h-4 mr-2" />
                            开始续写
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 lg:p-12 relative bg-surface-50">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

                    <div className="max-w-5xl mx-auto relative z-10">
                        <AnimatePresence mode="wait">
                            {activeTab === 'outline' && (
                                <motion.div 
                                    key="outline"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                >
                                    <div className="flex justify-between items-end mb-6">
                                        <div>
                                            <h3 className="text-2xl font-bold text-surface-800">全书大纲</h3>
                                            <p className="text-surface-500 mt-1">控制故事走向的核心蓝图</p>
                                        </div>
                                    </div>

                                    {!novel?.outline && !outlineMutation.isPending && !isOutlineTaskRunning && (
                                        <div className="bg-white rounded-2xl shadow-xl shadow-surface-200/50 border border-surface-100 min-h-[600px] flex flex-col overflow-hidden">
                                            <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                                                <div className="w-24 h-24 bg-surface-50 rounded-full flex items-center justify-center mb-6">
                                                    <FileText className="w-10 h-10 text-surface-300" />
                                                </div>
                                                <h4 className="text-xl font-bold text-surface-900 mb-2">暂无大纲</h4>
                                                <p className="text-surface-500 max-w-sm mb-8">
                                                    大纲是小说的骨架。召唤大纲智能体，基于您的设定自动生成结构严谨的故事大纲。
                                                </p>
                                                <button 
                                                    onClick={() => outlineMutation.mutate()}
                                                    className="bg-primary-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary-500/30 hover:bg-primary-700 hover:scale-105 transition-all flex items-center space-x-2"
                                                >
                                                    <Mic2 className="w-5 h-5" />
                                                    <span>召唤大纲智能体</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {(outlineMutation.isPending || isOutlineTaskRunning) && (
                                        <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white rounded-3xl shadow-sm border border-surface-100 min-h-[600px] relative overflow-hidden">
                                            {/* Background Decoration */}
                                            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-primary-100/30 rounded-full blur-3xl" />
                                            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-surface-100/50 rounded-full blur-3xl" />
                                            <div className="flex flex-col items-center justify-center space-y-6 relative z-10">
                                                <div className="relative">
                                                    <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <SparklesLoader className="w-6 h-6 text-primary-600" />
                                                    </div>
                                                </div>
                                                <p className="text-lg font-medium text-surface-600 animate-pulse">DeepSeek 正在构建世界观...</p>
                                            </div>
                                        </div>
                                    )}

                                    {novel?.outline && !outlineMutation.isPending && !isOutlineTaskRunning && (
                                        <div className="bg-white rounded-2xl shadow-xl shadow-surface-200/50 border border-surface-100 min-h-[600px] flex flex-col overflow-hidden">
                                            <textarea
                                                className="w-full h-full min-h-[600px] outline-none resize-none p-10 text-surface-800 text-lg leading-relaxed font-serif bg-transparent"
                                                value={outlineText || novel.outline.content}
                                                onChange={(e) => setOutlineText(e.target.value)}
                                                placeholder="在此编辑大纲..."
                                            />
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {activeTab === 'titles' && (
                                <motion.div 
                                    key="titles"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                >
                                    <div className="flex justify-between items-end mb-6">
                                        <div>
                                            <h3 className="text-2xl font-bold text-surface-800">书名建议</h3>
                                            <p className="text-surface-500 mt-1">从多个爆款建议中挑选最心仪的一个</p>
                                        </div>
                                        <button 
                                            onClick={() => titleMutation.mutate()}
                                            disabled={titleMutation.isPending}
                                            className="bg-primary-600 text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-primary-700 transition flex items-center space-x-2 disabled:opacity-50"
                                        >
                                            {titleMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mic2 className="w-4 h-4" />}
                                            <span>重新生成建议</span>
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        {titles.length === 0 && !titleMutation.isPending ? (
                                            <div className="bg-white rounded-2xl shadow-sm border border-surface-100 p-12 flex flex-col items-center justify-center text-center">
                                                <div className="w-20 h-20 bg-surface-50 rounded-full flex items-center justify-center mb-6">
                                                    <Type className="w-10 h-10 text-surface-300" />
                                                </div>
                                                <h4 className="text-xl font-bold text-surface-900 mb-2">尚未生成书名</h4>
                                                <button 
                                                    onClick={() => titleMutation.mutate()}
                                                    className="mt-4 bg-primary-600 text-white px-8 py-3 rounded-xl font-bold"
                                                >
                                                    立即生成
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {titles.map((titleSuggestion, idx) => (
                                                    <motion.button 
                                                        key={idx}
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        onClick={() => handleUseTitle(titleSuggestion)}
                                                        className={`p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden group ${
                                                            novel?.title === titleSuggestion 
                                                            ? 'bg-primary-50 border-primary-500 shadow-md ring-2 ring-primary-200' 
                                                            : 'bg-white border-surface-200 hover:border-primary-400 hover:shadow-lg'
                                                        }`}
                                                    >
                                                        <div className="flex justify-between items-center relative z-10">
                                                            <span className={`text-lg font-bold ${
                                                                novel?.title === titleSuggestion ? 'text-primary-900' : 'text-surface-700 group-hover:text-primary-800'
                                                            }`}>
                                                                {titleSuggestion}
                                                            </span>
                                                            {novel?.title === titleSuggestion ? (
                                                                <CheckCircle2 className="w-6 h-6 text-primary-600" />
                                                            ) : (
                                                                <div className="opacity-0 group-hover:opacity-100 bg-primary-600 text-white text-xs px-2 py-1 rounded font-bold transition-opacity">
                                                                    选用
                                                                </div>
                                                            )}
                                                        </div>
                                                    </motion.button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                            
                            {activeTab === 'chapters' && (
                                 <motion.div 
                                    key="chapters"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="pb-20"
                                >
                                    <div className="flex justify-between items-end mb-6">
                                        <div>
                                            <h3 className="text-2xl font-bold text-surface-800">章节管理</h3>
                                            <p className="text-surface-500 mt-1">智能规划分卷与章节结构</p>
                                        </div>
                                        <div className="flex space-x-2">
                                            <button 
                                                onClick={handleBatchGenerate}
                                                disabled={isBatching || chapters.length === 0}
                                                className="bg-white border border-primary-200 text-primary-600 px-4 py-2 rounded-lg font-medium hover:bg-primary-50 transition flex items-center space-x-2 disabled:opacity-50"
                                            >
                                                {isBatching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <SparklesIcon className="w-4 h-4" />}
                                                <span>{isBatching ? '正在批量生成...' : '批量生成正文'}</span>
                                            </button>
                                            <button 
                                                onClick={() => planVolumeMutation.mutate()}
                                                disabled={planVolumeMutation.isPending}
                                                className="bg-primary-600 text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-primary-700 transition flex items-center space-x-2 disabled:opacity-50"
                                            >
                                                {planVolumeMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <List className="w-4 h-4" />}
                                                <span>{planVolumeMutation.isPending ? '规划中...' : '规划新分卷'}</span>
                                            </button>
                                        </div>
                                    </div>

                                    {chapters.length === 0 && !planVolumeMutation.isPending ? (
                                        <div className="bg-white rounded-2xl shadow-sm border border-surface-100 p-12 flex flex-col items-center justify-center text-center">
                                            <div className="w-20 h-20 bg-surface-50 rounded-full flex items-center justify-center mb-6">
                                                <List className="w-10 h-10 text-surface-300" />
                                            </div>
                                            <h4 className="text-xl font-bold text-surface-900 mb-2">暂无章节</h4>
                                            <p className="text-surface-500 max-w-sm mb-6">点击上方按钮，让 AI 根据大纲自动规划第一卷的章节内容。</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {chapters.map((chapter) => (
                                                <div key={chapter.id} className="bg-white rounded-xl shadow-sm border border-surface-200 p-5 hover:shadow-md transition flex items-center justify-between group">
                                                    <div className="flex items-center space-x-4">
                                                        <div className="w-10 h-10 rounded-full bg-surface-50 flex items-center justify-center text-surface-400 font-bold text-sm">
                                                            {chapter.chapter_number}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center space-x-3">
                                                                <h4 className="text-lg font-bold text-surface-800">{chapter.title}</h4>
                                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium 
                                                                        ${chapter.status === 'completed' ? 'bg-green-100 text-green-700' : 
                                                                        chapter.status === 'generating' ? 'bg-blue-100 text-blue-700' : 
                                                                        chapter.status === 'outline_completed' || chapter.status === 'fine_outline_completed' ? 'bg-indigo-100 text-indigo-700' :
                                                                        chapter.status === 'error' ? 'bg-red-100 text-red-700' :
                                                                        'bg-surface-100 text-surface-500'}`}>
                                                                        {chapter.status === 'completed' ? '正文已完成' : 
                                                                         chapter.status === 'generating' ? '生成中...' : 
                                                                         chapter.status === 'outline_completed' ? '大纲已完成' :
                                                                         chapter.status === 'fine_outline_completed' ? '希纲已完成' :
                                                                         chapter.status === 'error' ? '生成失败' : 
                                                                         '待生成'}
                                                                    </span>
                                                            </div>
                                                            <p className="text-sm text-surface-400 mt-1 line-clamp-1">{chapter.volume_title}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition">
                                                        <button
                                                            onClick={() => navigate(`/chapter/${chapter.id}`)}
                                                            className="p-2 hover:bg-surface-50 rounded-lg text-primary-600 transition"
                                                            title="编辑章节"
                                                        >
                                                            <PenTool className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {activeTab === 'knowledge' && (
                                <motion.div 
                                    key="knowledge"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-6"
                                >
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                                        <div>
                                            <h3 className="text-2xl font-bold text-surface-900 tracking-tight">设定知识库</h3>
                                            <p className="text-surface-500 mt-1 max-w-xl">管理小说核心设定。AI 将在生成大纲、分卷及章节内容时，严格遵循您在此定义的规则与细节。</p>
                                        </div>
                                        <button 
                                            onClick={() => setIsAddKnowledgeOpen(true)}
                                            className="bg-primary-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-primary-200 hover:bg-primary-700 hover:shadow-primary-300 transition-all active:scale-95 flex items-center space-x-2 whitespace-nowrap flex-shrink-0"
                                        >
                                            <Plus className="w-5 h-5" />
                                            <span>添加新设定</span>
                                        </button>
                                    </div>

                                    {isAddKnowledgeOpen && (
                                        <motion.div 
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="bg-white rounded-2xl p-6 border-2 border-primary-100 shadow-sm space-y-4"
                                        >
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-semibold text-surface-700">类别</label>
                                                    <select 
                                                        value={newEntry.category}
                                                        onChange={(e) => setNewEntry({...newEntry, category: e.target.value})}
                                                        className="w-full p-2 bg-surface-50 border border-surface-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                                                    >
                                                        <option value="角色">角色 (Character)</option>
                                                        <option value="地理">地理 (Location)</option>
                                                        <option value="道具">道具 (Item)</option>
                                                        <option value="设定">设定 (Lore)</option>
                                                    </select>
                                                </div>
                                                <div className="md:col-span-2 space-y-2">
                                                    <label className="text-sm font-semibold text-surface-700">名称/标题</label>
                                                    <input 
                                                        type="text"
                                                        value={newEntry.title}
                                                        onChange={(e) => setNewEntry({...newEntry, title: e.target.value})}
                                                        className="w-full p-2 bg-surface-50 border border-surface-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                                                        placeholder="例如：林惊羽、青云门、诛仙剑..."
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-surface-700">详细描述</label>
                                                <textarea 
                                                    value={newEntry.content}
                                                    onChange={(e) => setNewEntry({...newEntry, content: e.target.value})}
                                                    className="w-full p-3 bg-surface-50 border border-surface-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 min-h-[100px] resize-none"
                                                    placeholder="输入详细的设定信息，AI 将会学习并引用..."
                                                />
                                            </div>
                                            <div className="flex justify-end space-x-3">
                                                <button 
                                                    onClick={() => setIsAddKnowledgeOpen(false)}
                                                    className="px-4 py-2 text-surface-500 hover:text-surface-700 font-medium"
                                                >
                                                    取消
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        if (newEntry.title && newEntry.content) {
                                                            createKnowledgeMutation.mutate(newEntry);
                                                            setNewEntry({ category: '角色', title: '', content: '' });
                                                            setIsAddKnowledgeOpen(false);
                                                        } else {
                                                            toastConfig.error('请填写标题和内容');
                                                        }
                                                    }}
                                                    className="bg-primary-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-primary-700 transition"
                                                >
                                                    确认保存
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {knowledgeData?.length === 0 ? (
                                            <div className="md:col-span-2 bg-white rounded-2xl border border-surface-100 p-12 flex flex-col items-center justify-center text-center">
                                                <Library className="w-12 h-12 text-surface-200 mb-4" />
                                                <h4 className="text-lg font-bold text-surface-400">设定库空空如也</h4>
                                                <p className="text-surface-400 mt-2">添加您的第一个角色或世界观设定吧</p>
                                            </div>
                                        ) : (
                                            knowledgeData?.map((entry: any) => (
                                                <div key={entry.id} className="bg-white rounded-2xl shadow-sm border border-surface-100 p-6 hover:shadow-md hover:border-primary-100 transition-all group relative overflow-hidden">
                                                    {/* Decorative side accent */}
                                                    <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                                                        entry.category === '角色' ? 'bg-blue-500' :
                                                        entry.category === '地理' ? 'bg-green-500' :
                                                        entry.category === '道具' ? 'bg-purple-500' :
                                                        'bg-amber-500'
                                                    }`} />
                                                    
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="flex items-center space-x-3">
                                                            <div className={`p-2.5 rounded-xl shadow-sm ${
                                                                entry.category === '角色' ? 'bg-blue-50 text-blue-600' :
                                                                entry.category === '地理' ? 'bg-green-50 text-green-600' :
                                                                entry.category === '道具' ? 'bg-purple-50 text-purple-600' :
                                                                'bg-amber-50 text-amber-600'
                                                            }`}>
                                                                {entry.category === '角色' ? <User className="w-5 h-5" /> :
                                                                 entry.category === '地理' ? <MapPin className="w-5 h-5" /> :
                                                                 entry.category === '道具' ? <Sword className="w-5 h-5" /> :
                                                                 <Info className="w-5 h-5" />}
                                                            </div>
                                                            <div>
                                                                <h4 className="text-lg font-bold text-surface-900">{entry.title}</h4>
                                                                <span className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${
                                                                    entry.category === '角色' ? 'bg-blue-100 text-blue-700' :
                                                                    entry.category === '地理' ? 'bg-green-100 text-green-700' :
                                                                    entry.category === '道具' ? 'bg-purple-100 text-purple-700' :
                                                                    'bg-amber-100 text-amber-700'
                                                                }`}>{entry.category}</span>
                                                            </div>
                                                        </div>
                                                        <button 
                                                            onClick={() => deleteKnowledgeMutation.mutate(entry.id)}
                                                            className="opacity-0 group-hover:opacity-100 p-2 text-surface-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    <p className="text-sm text-surface-600 whitespace-pre-wrap leading-relaxed line-clamp-4 font-medium">
                                                        {entry.content}
                                                    </p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </main>
            
            {/* Right Progress Sidebar */}
            <AgentProgress 
                novelId={id!} 
                onTaskUpdate={handleTaskUpdate} 
                onApplyResult={handleApplyResult}
            />
        </div>
    );
};

// Helper component for loading
const SparklesLoader = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M9 3v4"/><path d="M5 17v4"/><path d="M9 17v4"/></svg>
);

export default Workspace;
