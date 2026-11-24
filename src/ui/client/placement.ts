import type { ContextSettings } from './settings'
import type { DefaultPlacement } from '../shared/types'

export function placementVisible(placement: DefaultPlacement): boolean {
  return placement === 'show'
}

export function watchPlacement(settings: ContextSettings, mount: () => unknown): () => void {
  let dispose: (() => void) | undefined
  let mounted = false
  const apply = (placement: DefaultPlacement): void => {
    const want = placementVisible(placement)
    if (want && !mounted) {
      const result: unknown = mount()
      dispose = typeof result === 'function' ? result as () => void : undefined
      mounted = true
    }
    if (!want && mounted) {
      dispose?.()
      dispose = undefined
      mounted = false
    }
  }
  apply(settings.defaultPlacement())
  const unsubscribe = settings.store.subscribe(() => { apply(settings.defaultPlacement()) })
  return () => {
    unsubscribe()
    dispose?.()
    dispose = undefined
    mounted = false
  }
}
