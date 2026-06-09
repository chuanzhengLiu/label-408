import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Loader2, CheckCircle2, AlertCircle, XCircle, PauseCircle, PlayCircle, Terminal, ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface Task {
    id: number;
    entity_type: string;
    entity_id: number | null;
    status: string;
    progress: number;
    agent_name: string;
    thought_log: string;
    result: string | null;
    error: string | null;
    updated_at: string;
}

interface AgentProgressProps {
    novelId: string;
    onTaskUpdate?: (tasks: Task[]) => void;
    onApplyResult?: (task: Task) => void;
}

const agentNameMap: Record<string, string> = {
    'OutlineAgent': '大纲专家',
    'TitleAgent': '点睛书名',
    'ChapterStructureAgent': '章节规划师',
    'ChapterOutlineAgent': '章节细化师',
    'FineOutlineAgent': '细纲导演',
    'ChapterWriterAgent': '正文笔杆子',
    '书名专家': '点睛书名',
    '笔杆主笔': '正文笔杆子'
};

const entityTypeMap: Record<string, string> = {
    'outline': '全书大纲',
    'titles': '书名建议',
    'structure': '章节规划',
    'chapter_outline': '章节大纲',
    'chapter_fine_outline': '细纲策划',
    'chapter_content': '正文生成'
};

const getTasks = async (novelId: string) => {
    const res = await api.get(`/novels/${novelId}/tasks`);
    return res.data;
};

const AgentProgress: React.FC<AgentProgressProps> = ({ novelId, onTaskUpdate, onApplyResult }) => {
    const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
    const [isCollapsed, setIsCollapsed] = useState(false);

    const { data: tasksData, refetch: refetchTasks } = useQuery({
        queryKey: ['tasks', novelId],
        queryFn: () => getTasks(novelId),
        refetchInterval: 3000,
        refetchOnWindowFocus: false,
        enabled: !!novelId
    });

    const tasks: Task[] = tasksData || [];

    useEffect(() => {
        if (onTaskUpdate && tasksData) {
            onTaskUpdate(tasksData);
        }
    }, [tasksData, onTaskUpdate]);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) {
                setIsCollapsed(true);
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleAction = async (taskId: number, action: 'pause' | 'resume' | 'cancel') => {
        try {
            await api.post(`/tasks/${taskId}/${action}`);
            refetchTasks();
        } catch (e) {
            console.error(`Failed to ${action} task`, e);
        }
    };

    if (tasks.length === 0) return null;

    const anyRunning = tasks.some(t => t.status === 'running' || t.status === 'queued');

    return (
        <motion.div 
            animate={{ width: isCollapsed ? '64px' : '320px' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="bg-white border-l border-surface-200 flex flex-col h-full shadow-2xl relative overflow-hidden"
        >
            <div className={`border-b border-surface-200 flex transition-all ${isCollapsed ? 'flex-col items-center space-y-4 py-8 px-0' : 'flex-row items-center justify-between p-4 bg-surface-50'}`}>
                <div className={`flex items-center space-x-2 ${isCollapsed ? 'hidden' : 'flex'}`}>
                    <Brain className="w-5 h-5 text-primary-600" />
                    <span className="font-bold text-surface-900 whitespace-nowrap">智能体动态</span>
                </div>
                
                {isCollapsed && (
                    <motion.div 
                        whileHover={{ scale: 1.1 }}
                        className="cursor-pointer relative"
                        onClick={() => setIsCollapsed(false)}
                    >
                        <Brain className={`w-6 h-6 ${anyRunning ? 'text-primary-600 animate-pulse' : 'text-surface-400'}`} />
                        {anyRunning && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary-500 rounded-full border-2 border-white" />
                        )}
                    </motion.div>
                )}

                <button 
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={`p-2 hover:bg-surface-200 rounded-full text-surface-400 hover:text-primary-600 transition-all ${isCollapsed ? '' : 'bg-surface-100/50'}`}
                    title={isCollapsed ? "展开" : "折叠"}
                >
                    {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                </button>
            </div>

            {!isCollapsed && (
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    <AnimatePresence initial={false}>
                        {tasks.map((task) => (
                            <motion.div
                                key={task.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={`rounded-xl border transition-all overflow-hidden ${
                                    task.status === 'running' 
                                    ? 'border-primary-200 bg-primary-50/30' 
                                    : 'border-surface-100 bg-white'
                                }`}
                            >
                                <div 
                                    className="p-3 cursor-pointer flex items-center justify-between"
                                    onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                                >
                                    <div className="flex items-center space-x-3">
                                        <StatusIcon status={task.status} />
                                        <div>
                                            <div className="text-xs font-bold text-surface-900 uppercase">
                                                {agentNameMap[task.agent_name] || task.agent_name || '智能体'}
                                            </div>
                                            <div className="text-[10px] text-surface-500">
                                                {entityTypeMap[task.entity_type] || task.entity_type} {task.entity_id ? `#${task.entity_id}` : ''}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        {task.status === 'running' && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleAction(task.id, 'pause'); }}
                                                className="p-1 hover:bg-surface-200 rounded text-surface-500"
                                            >
                                                <PauseCircle className="w-4 h-4" />
                                            </button>
                                        )}
                                        {task.status === 'paused' && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleAction(task.id, 'resume'); }}
                                                className="p-1 hover:bg-surface-200 rounded text-surface-500"
                                            >
                                                <PlayCircle className="w-4 h-4" />
                                            </button>
                                        )}
                                        {(task.status === 'running' || task.status === 'queued' || task.status === 'paused') && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleAction(task.id, 'cancel'); }}
                                                className="p-1 hover:bg-surface-200 rounded text-surface-500"
                                            >
                                                <XCircle className="w-4 h-4" />
                                            </button>
                                        )}
                                        {task.status === 'completed' && task.result && onApplyResult && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onApplyResult(task); }}
                                                className="p-1 hover:bg-green-100 rounded text-green-600 flex items-center space-x-1"
                                                title="应用此结果"
                                            >
                                                <ArrowUpRight className="w-4 h-4" />
                                                <span className="text-[10px] font-bold">应用</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {expandedTaskId === task.id && (
                                    <motion.div 
                                        initial={{ height: 0 }}
                                        animate={{ height: 'auto' }}
                                        className="px-3 pb-3 border-t border-surface-100"
                                    >
                                        <div className="mt-3 bg-surface-900 rounded-lg p-3 text-[11px] font-mono text-surface-300 max-h-48 overflow-y-auto relative">
                                            <div className="flex items-center space-x-2 mb-2 text-surface-500 border-b border-surface-800 pb-1">
                                                <Terminal className="w-3 h-3" />
                                                <span>思考过程</span>
                                            </div>
                                            {task.thought_log || "正在思考..."}
                                            {task.status === 'running' && (
                                                <span className="inline-block w-1.5 h-3 bg-primary-500 animate-pulse ml-1 align-middle" />
                                            )}
                                            {task.error && (
                                                <div className="mt-2 text-red-400">
                                                    Error: {task.error}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </motion.div>
    );
};

const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
        case 'running': return <Loader2 className="w-4 h-4 text-primary-600 animate-spin" />;
        case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
        case 'failed': return <AlertCircle className="w-4 h-4 text-red-500" />;
        case 'cancelled': return <XCircle className="w-4 h-4 text-surface-400" />;
        case 'paused': return <PauseCircle className="w-4 h-4 text-orange-400" />;
        default: return <div className="w-4 h-4 rounded-full bg-surface-200" />;
    }
};

export default AgentProgress;
