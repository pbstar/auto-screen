import type { AutoScreenApi } from '@shared/types'

declare global {
  interface Window {
    autoScreen: AutoScreenApi
  }
}

export {}
