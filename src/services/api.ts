import axios from 'axios';

// 从环境变量中获取 API 基础路径，如果没有则默认使用本地路径
// 注意：在 Vite 中使用 import.meta.env.VITE_XXX
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const api = axios.create({
    baseURL: API_BASE_URL,
});

export default api;
