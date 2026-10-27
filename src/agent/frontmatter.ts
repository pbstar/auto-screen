/** frontmatter 只支持 `key: value` 单行，够写名字和描述，不引 YAML 依赖 */
export function parseFrontmatter(text: string): { meta: Record<string, string>; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text)
  if (!match) return { meta: {}, body: text.trim() }

  const meta: Record<string, string> = {}
  for (const line of match[1].split(/\r?\n/)) {
    const index = line.indexOf(':')
    if (index <= 0) continue
    const key = line.slice(0, index).trim()
    const value = line.slice(index + 1).trim()
    if (key && value) meta[key] = value
  }
  return { meta, body: text.slice(match[0].length).trim() }
}
