import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Menu, Settings } from 'lucide-react';

const getChapter = async (id: string) => {
    const res = await axios.get(`http://127.0.0.1:8000/chapters/${id}`);
    return res.data;
};

const Reader = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const fontSize = 20;
    const theme = 'sepia';

    const { data: chapter, isLoading } = useQuery({
        queryKey: ['chapter', id],
        queryFn: () => getChapter(id!),
        enabled: !!id
    });

    if (isLoading) return <div className="h-screen flex items-center justify-center bg-surface-50 text-surface-400">加载中...</div>;

    const themeColors = {
        light: 'bg-white text-surface-900',
        sepia: 'bg-[#f4ecd8] text-[#5b4636]',
        dark: 'bg-surface-900 text-surface-300'
    };

    return (
        <div className={`min-h-screen transition-colors duration-500 ${themeColors[theme as keyof typeof themeColors]}`}>
            <header className="fixed top-0 left-0 right-0 h-14 bg-black/5 backdrop-blur-md flex items-center px-6 justify-between z-30">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-black/5 rounded-full">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="font-bold truncate max-w-[200px]">{chapter?.title}</div>
                <div className="flex items-center space-x-2">
                    <button className="p-2 hover:bg-black/5 rounded-full"><Settings className="w-5 h-5" /></button>
                </div>
            </header>

            <main className="max-w-3xl mx-auto pt-24 pb-32 px-6">
                <h1 className="text-3xl font-bold mb-12 text-center">{chapter?.title}</h1>
                <div 
                    className="leading-loose font-serif whitespace-pre-wrap"
                    style={{ fontSize: `${fontSize}px` }}
                >
                    {chapter?.content || "暂无正文内容"}
                </div>
            </main>

            <footer className="fixed bottom-0 left-0 right-0 h-16 bg-black/5 backdrop-blur-md flex items-center justify-around z-30">
                <button className="flex flex-col items-center p-2 opacity-60 hover:opacity-100">
                    <ChevronLeft className="w-5 h-5" />
                    <span className="text-[10px] mt-1">上一章</span>
                </button>
                <button className="flex flex-col items-center p-2 opacity-60 hover:opacity-100">
                    <Menu className="w-5 h-5" />
                    <span className="text-[10px] mt-1">目录</span>
                </button>
                <button className="flex flex-col items-center p-2 opacity-60 hover:opacity-100">
                    <ChevronRight className="w-5 h-5" />
                    <span className="text-[10px] mt-1">下一章</span>
                </button>
            </footer>
        </div>
    );
};

export default Reader;
