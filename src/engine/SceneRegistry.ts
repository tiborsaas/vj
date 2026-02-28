import type { SceneDescriptor } from '../types'

/**
 * SceneRegistry — Central registry for all visual scenes.
 * Scenes self-register at module scope via registerScene().
 */
class SceneRegistryImpl {
  private scenes = new Map<string, SceneDescriptor>()
  private order: string[] = []

  register(descriptor: SceneDescriptor): void {
    if (this.scenes.has(descriptor.id)) {
      console.warn(`Scene "${descriptor.id}" already registered, overwriting.`)
    }
    this.scenes.set(descriptor.id, descriptor)
    if (!this.order.includes(descriptor.id)) {
      this.order.push(descriptor.id)
    }
  }

  get(id: string): SceneDescriptor | undefined {
    return this.scenes.get(id)
  }

  getAll(): SceneDescriptor[] {
    return this.order.map((id) => this.scenes.get(id)!).filter(Boolean)
  }

  getIds(): string[] {
    return [...this.order]
  }

  getByIndex(index: number): SceneDescriptor | undefined {
    const id = this.order[index]
    return id ? this.scenes.get(id) : undefined
  }

  getIndex(id: string): number {
    return this.order.indexOf(id)
  }

  count(): number {
    return this.scenes.size
  }
}

export const sceneRegistry = new SceneRegistryImpl()

export function registerScene(descriptor: SceneDescriptor): void {
  sceneRegistry.register(descriptor)
}
