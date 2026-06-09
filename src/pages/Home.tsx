import { Link } from 'react-router-dom';
import { BookOpen, Plus, Zap, Clock, MoreHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const fetchNovels = async () => {
    const res = await axios.get('http://127.0.0.1:8000/novels/');
    return res.data;
};

const Home = () => {
    const { data: novels, isLoading } = useQuery({
        queryKey: ['novels'],
        queryFn: fetchNovels
    });

    return (
        <div className="min-h-screen bg-surface-50 p-8">
            <header className="flex justify-between items-center mb-10">
                <div className="flex items-center space-x-3">
                    <div className="bg-primary-600 p-2 rounded-lg shadow-lg shadow-primary-500/30">
                        <Zap className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-surface-900 tracking-tight">智作 AI</h1>
                        <p className="text-xs text-surface-500 font-medium">智能创作伴侣</p>
                    </div>
                </div>
                <div className="flex items-center space-x-4">
                     <div className="bg-white px-4 py-2 rounded-full border border-surface-200 text-sm font-medium text-surface-600 shadow-sm flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span>DeepSeek 大脑已连接</span>
                     </div>
                    <button className="w-10 h-10 rounded-full bg-white border border-surface-200 flex items-center justify-center hover:bg-surface-50 transition">
                        <span className="sr-only">Settings</span>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-400 to-secondary-500" />
                    </button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto">
                <section className="mb-12">
                     <div className="bg-gradient-to-r from-primary-600 to-secondary-600 rounded-2xl p-8 text-white shadow-xl shadow-primary-900/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                        <div className="relative z-10">
                            <h2 className="text-3xl font-bold mb-4">开始新的创作旅程</h2>
                            <p className="text-primary-100 mb-8 max-w-lg">
                                利用 DeepSeek 多智能体矩阵，从一个灵感孵化出千万字神作。
                            </p>
                            <Link to="/create">
                                <motion.button 
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="bg-white text-primary-700 px-6 py-3 rounded-lg font-bold shadow-lg flex items-center space-x-2 hover:bg-surface-50 transition"
                                >
                                    <Plus className="w-5 h-5" />
                                    <span>新建作品</span>
                                </motion.button>
                            </Link>
                        </div>
                     </div>
                </section>

                <section>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-surface-800 flex items-center">
                            <Clock className="w-5 h-5 mr-2 text-primary-500" />
                            近期项目
                        </h2>
                    </div>

                    {isLoading ? (
                        <div className="text-center py-12">
                            <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-surface-600">加载中...</p>
                        </div>
                    ) : !novels || novels.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-2xl border border-surface-200">
                            <BookOpen className="w-16 h-16 text-surface-300 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-surface-900 mb-2">暂无作品</h3>
                            <p className="text-surface-500 mb-6">开始创作您的第一部作品吧</p>
                            <Link to="/create">
                                <button className="bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 transition">
                                    新建作品
                                </button>
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {novels.map((novel: any) => (
                            <Link to={`/workspace/${novel.id}`} key={novel.id}>
                                <motion.div 
                                    whileHover={{ y: -4 }}
                                    className="glass-card p-6 rounded-xl cursor-pointer group"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-secondary-50 rounded-lg group-hover:bg-secondary-100 transition-colors">
                                            <BookOpen className="w-6 h-6 text-secondary-600" />
                                        </div>
                                        <button className="text-surface-400 hover:text-surface-600">
                                            <MoreHorizontal className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <h3 className="text-lg font-bold text-surface-900 mb-1 group-hover:text-primary-600 transition-colors">{novel.title}</h3>
                                    <p className="text-sm text-surface-500 mb-4">最后编辑: {new Date(novel.created_at).toLocaleDateString()}</p>

                                    <div className="flex items-center justify-between pt-4 border-t border-surface-100">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                            novel.status === '已完结' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                        }`}>
                                            {novel.status}
                                        </span>
                                        <span className="text-xs text-surface-400 font-medium">{novel.total_words > 0 ? `${(novel.total_words / 10000).toFixed(1)}万字` : '0字'}</span>
                                    </div>
                                </motion.div>
                            </Link>
                        ))}
                    </div>
                    )}
                </section>
            </main>
        </div>
    );
};

export default Home;
