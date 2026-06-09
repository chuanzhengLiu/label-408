import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../services/api';
import { ArrowLeft, Sparkles, Wand2 } from 'lucide-react';
import { toastConfig } from '../utils/toast';

const CreateNovel = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        genre: '仙侠',
        style_tags: ['热血', '系统', '无敌流'],
        target_audience: '男频',
        total_words: 1000000,
        min_chapter_words: 3000,
        background_setting: ''
    });

    const AVAILABLE_TAGS = [
        "热血", "系统", "无敌流", "养成", "凡人流", "穿越", "重生", "爽文", "搞笑", 
        "职场", "官场", "硬核", "星际", "赛博朋克", "末世", "权谋", "慢热", "单女主"
    ];

    const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);

    const toggleTag = (tag: string) => {
        setFormData(prev => {
            const currentTags = prev.style_tags as string[];
            const newTags = currentTags.includes(tag)
                ? currentTags.filter(t => t !== tag)
                : [...currentTags, tag];
            return { ...prev, style_tags: newTags };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...formData,
                style_tags: (formData.style_tags as string[]).join(', ')
            };
            const response = await api.post('/novels/', payload);
            const novelId = response.data.id;
            toastConfig.success('作品创建成功！');
            navigate(`/workspace/${novelId}`);
        } catch (error) {
            console.error("创建失败", error);
            toastConfig.error('创建失败，请检查后端服务是否启动');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="min-h-screen bg-surface-50 flex flex-col">
            <header className="bg-white border-b border-surface-200 px-8 py-4 flex items-center">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-surface-100 rounded-full transition mr-4">
                    <ArrowLeft className="w-5 h-5 text-surface-600" />
                </button>
                <h1 className="text-lg font-bold text-surface-800">创建新作品</h1>
            </header>

            <main className="flex-1 flex justify-center py-12 px-4">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-3xl glass-card rounded-2xl p-10 bg-white"
                >
                    <div className="text-center mb-10">
                        <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Wand2 className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-surface-900">定义世界观</h2>
                        <p className="text-surface-500 mt-2">告诉 DeepSeek 你的构想，让 AI 为你构建宏大世界。</p>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-surface-700">作品标题</label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                className="w-full p-3 bg-surface-50 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none font-medium text-surface-800 transition shadow-sm"
                                placeholder="输入标题或稍后使用 AI 生成"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-surface-700">小说类型</label>
                                <div className="relative">
                                    <select 
                                        name="genre" 
                                        value={formData.genre} 
                                        onChange={handleChange}
                                        className="w-full p-3 bg-surface-50 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none appearance-none font-medium text-surface-800 transition shadow-sm"
                                    >
                                        <option value="玄幻">玄幻</option>
                                        <option value="仙侠">仙侠</option>
                                        <option value="都市">都市</option>
                                        <option value="科幻">科幻</option>
                                        <option value="历史">历史</option>
                                        <option value="游戏">游戏</option>
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-surface-400">▼</div>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-surface-700">目标读者</label>
                                <div className="relative">
                                    <select 
                                        name="target_audience" 
                                        value={formData.target_audience} 
                                        onChange={handleChange}
                                        className="w-full p-3 bg-surface-50 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none appearance-none font-medium text-surface-800 transition shadow-sm"
                                    >
                                        <option value="男频">男频 (热血/爽文)</option>
                                        <option value="女频">女频 (言情/纯爱)</option>
                                        <option value="大众">大众向</option>
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-surface-400">▼</div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-sm font-semibold text-surface-700">风格标签</label>
                            
                            <div className="relative">
                                {/* Selected Tag Chips */}
                                <div 
                                    onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
                                    className="min-h-14 p-2 bg-surface-50 border border-surface-200 rounded-xl focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent cursor-pointer flex flex-wrap gap-2 transition shadow-sm"
                                >
                                    {(formData.style_tags as string[]).map(tag => (
                                        <motion.span 
                                            key={tag}
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            className="inline-flex items-center px-3 py-1 bg-primary-100 text-primary-700 rounded-lg text-sm font-medium"
                                        >
                                            {tag}
                                            <button 
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleTag(tag);
                                                }}
                                                className="ml-2 hover:text-primary-900"
                                            >
                                                ×
                                            </button>
                                        </motion.span>
                                    ))}
                                    {(formData.style_tags as string[]).length === 0 && (
                                        <span className="text-surface-400 p-2">请选择或搜索标签</span>
                                    )}
                                </div>

                                {/* Dropdown */}
                                {isTagDropdownOpen && (
                                    <>
                                        <div 
                                            className="fixed inset-0 z-10" 
                                            onClick={() => setIsTagDropdownOpen(false)} 
                                        />
                                        <motion.div 
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="absolute z-20 top-full left-0 right-0 mt-2 p-4 bg-white border border-surface-200 rounded-xl shadow-xl grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2"
                                        >
                                            {AVAILABLE_TAGS.map(tag => {
                                                const isSelected = (formData.style_tags as string[]).includes(tag);
                                                return (
                                                    <button
                                                        key={tag}
                                                        type="button"
                                                        onClick={() => toggleTag(tag)}
                                                        className={`px-3 py-2 text-sm rounded-lg transition text-center ${
                                                            isSelected 
                                                            ? 'bg-primary-600 text-white shadow-md' 
                                                            : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                                                        }`}
                                                    >
                                                        {tag}
                                                    </button>
                                                );
                                            })}
                                        </motion.div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-surface-700">预估总字数</label>
                                <input 
                                    type="number" 
                                    name="total_words" 
                                    value={formData.total_words} 
                                    onChange={handleChange}
                                    className="w-full p-3 bg-surface-50 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none font-medium text-surface-800 transition shadow-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-surface-700">单章最少字数</label>
                                <input 
                                    type="number" 
                                    name="min_chapter_words" 
                                    value={formData.min_chapter_words} 
                                    onChange={handleChange}
                                    className="w-full p-3 bg-surface-50 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none font-medium text-surface-800 transition shadow-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-surface-700">背景设定与核心梗</label>
                            <textarea 
                                name="background_setting" 
                                value={formData.background_setting} 
                                onChange={handleChange}
                                rows={6}
                                className="w-full p-4 bg-surface-50 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-surface-800 transition shadow-sm resize-none"
                                placeholder="描述这个世界的基本规则、主角的金手指、开局场景..."
                            />
                        </div>

                        <div className="pt-6">
                            <button 
                                type="submit" 
                                disabled={loading}
                                className="w-full bg-primary-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-primary-700 transition shadow-lg shadow-primary-500/30 flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <Sparkles className="w-5 h-5 animate-spin" />
                                        <span>构建世界中...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5" />
                                        <span>启动创世引擎</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </main>
        </div>
    );
};

export default CreateNovel;
