interface NumberOptions {
  min?: number
  max?: number
  integer?: boolean
}

function toNumber(raw: unknown, key: string, options: NumberOptions): number {
  const value = Number(raw)
  if (!Number.isFinite(value)) {
    throw new Error(`参数 ${key} 必须是数字`)
  }
  let result = options.integer ? Math.round(value) : value
  if (options.min !== undefined) result = Math.max(options.min, result)
  if (options.max !== undefined) result = Math.min(options.max, result)
  return result
}

export function requireNumber(
  input: Record<string, unknown>,
  key: string,
  options: NumberOptions = {},
): number {
  if (input[key] === undefined || input[key] === null) {
    throw new Error(`缺少参数 ${key}`)
  }
  return toNumber(input[key], key, options)
}

export function optionalNumber(
  input: Record<string, unknown>,
  key: string,
  options: NumberOptions = {},
): number | undefined {
  if (input[key] === undefined || input[key] === null) return undefined
  return toNumber(input[key], key, options)
}

export function requireString(input: Record<string, unknown>, key: string): string {
  const value = input[key]
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`缺少参数 ${key}`)
  }
  return value
}

/** 对齐到 10px 网格并限制在截图范围内 */
export function gridValue(value: number, max: number, step = 10): number {
  return Math.min(max, Math.max(0, Math.round(value / step) * step))
}

function assertEnum<T extends string>(value: unknown, key: string, values: readonly T[]): T {
  if (typeof value === 'string' && (values as readonly string[]).includes(value)) {
    return value as T
  }
  throw new Error(`参数 ${key} 必须是 ${values.join(' / ')}`)
}

export function readEnum<T extends string>(
  input: Record<string, unknown>,
  key: string,
  values: readonly T[],
  fallback: T,
): T {
  const value = input[key]
  if (value === undefined || value === null) return fallback
  return assertEnum(value, key, values)
}

export function requireEnum<T extends string>(
  input: Record<string, unknown>,
  key: string,
  values: readonly T[],
): T {
  if (input[key] === undefined || input[key] === null) {
    throw new Error(`缺少参数 ${key}`)
  }
  return assertEnum(input[key], key, values)
}
