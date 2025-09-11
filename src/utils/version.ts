// 动态获取应用版本号
export const getAppVersion = (): string => {
  // 从环境变量获取版本号，如果没有则使用默认值
  return (import.meta as any).env?.VITE_APP_VERSION || DEFAULT_VERSION;
};

// 默认版本号（作为fallback）
export const DEFAULT_VERSION = '';