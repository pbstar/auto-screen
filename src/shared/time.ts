/** 补零到两位，时间文本共用 */
const pad = (value: number) => String(value).padStart(2, '0')

/** 本地时间 HH:mm:ss；日志、提示词与等待工具共用这一套格式 */
export function clockText(date: Date = new Date()): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/** 本地日期时间 MM-DD HH:mm:ss，运行日志列表用 */
export function dateTimeText(ms: number): string {
  const date = new Date(ms)
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${clockText(date)}`
}

/** 毫秒写成 mm:ss，超过一小时写成 h:mm:ss */
export function durationText(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000))
  const hours = Math.floor(seconds / 3600)
  const minutes = pad(Math.floor((seconds % 3600) / 60))
  const rest = pad(seconds % 60)
  return hours > 0 ? `${hours}:${minutes}:${rest}` : `${minutes}:${rest}`
}
