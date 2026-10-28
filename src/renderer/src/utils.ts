/** 把 IPC 错误或运行时异常统一转成一句可展示的话 */
export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
