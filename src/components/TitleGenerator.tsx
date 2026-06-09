import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../services/api';
import { Sparkles, RefreshCw, Check } from 'lucide-react';
import { motion } from 'framer-motion';

interface TitleGeneratorProps {
    novelId: string;
    onSelectTitle: (title: string) => void;
}

const generateTitles = async (novelId: string) => {
    const res = await api.post(`/novels/${novelId}/titles`);
    return res.data;
};

const TitleGenerator: React.FC<TitleGeneratorProps> = ({ novelId, onSelectTitle }) => {
    const [titles, setTitles] = useState<string[]>([]);
    const [selectedTitle, setSelectedTitle] = useState<string>('');

    const titleMutation = useMutation({
        mutationFn: () => generateTitles(novelId),
        onSuccess: (data) => {
            // Parse titles from response (assuming numbered list format)
            const titleList = data.titles
                .split('\n')
                .filter((line: string) => line.trim())
                .map((line: string) => line.replace(/^\d+\.\s*/, '').trim())
                .filter((title: string) => title.length > 0);
            setTitles(titleList);
        },
        onError: (e) => {
            console.error(e);
        }
    });

    const handleSelect = (title: string) => {
        setSelectedTitle(title);
        onSelectTitle(title);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-surface-900">AI 标题建议</h3>
                <button
                    onClick={() => titleMutation.mutate()}
                    disabled={titleMutation.isPending}
                    className="px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition flex items-center disabled:opacity-50"
                >
                    {titleMutation.isPending ? (
                        <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            生成中...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            生成标题
                        </>
                    )}
                </button>
            </div>

            {titles.length > 0 && (
                <div className="space-y-2">
                    {titles.map((title, index) => (
                        <motion.button
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            onClick={() => handleSelect(title)}
                            className={`w-full p-4 text-left rounded-xl border-2 transition-all ${
                                selectedTitle === title
                                    ? 'border-primary-500 bg-primary-50'
                                    : 'border-surface-200 bg-white hover:border-primary-300'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="font-medium text-surface-900">{title}</span>
                                {selectedTitle === title && (
                                    <Check className="w-5 h-5 text-primary-600" />
                                )}
                            </div>
                        </motion.button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TitleGenerator;
