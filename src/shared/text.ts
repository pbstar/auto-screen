/** 把多行文本压成一行并截断，日志与手册写入共用 */
export function singleLine(text: string, max = 500): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, max)
}
