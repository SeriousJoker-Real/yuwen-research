// 全局配置
// 部署时根据实际情况修改 API_BASE

// 方式一：同域名部署（后端和前端在同一个域名下）
// const API_BASE = '/api';

// 方式二：跨域部署（前端在 Coze Pages，后端在 Vercel）
// 把下面的地址改成你的后端地址
const API_BASE = (typeof window !== 'undefined' && window.__API_BASE__) || '/api';

// 如果是 file:// 协议打开（纯前端模式），使用 localStorage 模拟
const IS_LOCAL_FILE = typeof window !== 'undefined' && window.location.protocol === 'file:';

window.APP_CONFIG = {
  API_BASE: API_BASE,
  IS_LOCAL_FILE: IS_LOCAL_FILE
};
