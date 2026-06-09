import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { Download, BookOpen, Library, ChevronDown } from 'lucide-react';
import { toastConfig } from '../utils/toast';

interface ExportMenuProps {
    novelId: string;
    novelTitle?: string;
    className?: string;
}

interface VolumeItem {
    id: number;
    volume_number: number;
    title: string;
    chapter_count: number;
}

const fetchVolumes = async (novelId: string): Promise<VolumeItem[]> => {
    const res = await api.get(`/novels/${novelId}/volumes`);
    if (Array.isArray(res.data)) return res.data;
    return [];
};

const parseFilenameFromHeader = (header: string | undefined, fallback: string): string => {
    if (!header) return fallback;
    const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match) {
        try { return decodeURIComponent(utf8Match[1]); } catch { /* ignore */ }
    }
    const plainMatch = header.match(/filename="?([^";]+)"?/i);
    if (plainMatch) {
        try { return decodeURIComponent(plainMatch[1]); } catch { return plainMatch[1]; }
    }
    return fallback;
};

const triggerBrowserDownload = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
};

const ExportMenu: React.FC<ExportMenuProps> = ({ novelId, novelTitle, className }) => {
    const [open, setOpen] = useState(false);
    const [exporting, setExporting] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const { data: volumes = [] } = useQuery({
        queryKey: ['volumes', novelId],
        queryFn: () => fetchVolumes(novelId),
        enabled: !!novelId && open,
        staleTime: 30000,
    });

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        if (open) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    const downloadFromUrl = async (url: string, fallbackName: string) => {
        setExporting(true);
        try {
            const res = await api.get(url, { responseType: 'blob' });
            const filename = parseFilenameFromHeader(
                res.headers?.['content-disposition'] as string | undefined,
                fallbackName
            );
            triggerBrowserDownload(res.data as Blob, filename);
            toastConfig.success('导出成功');
        } catch (e) {
            console.error('Export error', e);
            toastConfig.error('导出失败，请重试');
        } finally {
            setExporting(false);
            setOpen(false);
        }
    };

    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const safeTitle = (novelTitle || 'novel').replace(/[<>:"/\\|?*\n\r\t]/g, '').trim() || 'novel';

    const handleExportAll = () => {
        downloadFromUrl(`/novels/${novelId}/export`, `${safeTitle}_全本_${dateStr}.txt`);
    };

    const handleExportVolume = (vol: VolumeItem) => {
        const volName = (vol.title || `第${vol.volume_number}卷`).replace(/[<>:"/\\|?*\n\r\t]/g, '').trim();
        downloadFromUrl(
            `/novels/${novelId}/volumes/${vol.id}/export`,
            `${safeTitle}_${volName}_${dateStr}.txt`
        );
    };

    return (
        <div ref={containerRef} className={`relative ${className || ''}`}>
            <button
                onClick={() => setOpen(v => !v)}
                disabled={exporting}
                className="px-4 py-2 text-sm font-medium text-surface-600 bg-white border border-surface-200 rounded-lg shadow-sm hover:bg-surface-50 transition flex items-center disabled:opacity-50"
            >
                <Download className="w-4 h-4 mr-2" />
                {exporting ? '导出中...' : '导出'}
                <ChevronDown className="w-3 h-3 ml-1.5 text-surface-400" />
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-surface-200 rounded-xl shadow-xl z-50 overflow-hidden">
                    <button
                        onClick={handleExportAll}
                        disabled={exporting}
                        className="w-full flex items-center px-4 py-3 text-sm text-surface-700 hover:bg-surface-50 transition disabled:opacity-50"
                    >
                        <BookOpen className="w-4 h-4 mr-2 text-primary-600" />
                        <span className="font-medium">导出全本</span>
                    </button>

                    <div className="border-t border-surface-100" />

                    <div className="px-4 py-2 text-xs text-surface-400 uppercase tracking-wider flex items-center">
                        <Library className="w-3 h-3 mr-1.5" />
                        按卷导出
                    </div>

                    {volumes.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-surface-400">暂无分卷</div>
                    ) : (
                        <div className="max-h-64 overflow-y-auto">
                            {volumes.map(vol => (
                                <button
                                    key={vol.id}
                                    onClick={() => handleExportVolume(vol)}
                                    disabled={exporting}
                                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-surface-700 hover:bg-surface-50 transition disabled:opacity-50"
                                >
                                    <span className="truncate mr-2">{vol.title || `第${vol.volume_number}卷`}</span>
                                    <span className="text-xs text-surface-400 shrink-0">{vol.chapter_count} 章</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ExportMenu;
