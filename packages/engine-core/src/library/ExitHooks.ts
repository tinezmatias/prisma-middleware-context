import Debug from '@prisma/debug'

export type BeforeExitListener = () => unknown

const debug = Debug('prisma:client:libraryEngine:exitHooks')

export class ExitHooks {
  private beforeExitListeners: Map<unknown, BeforeExitListener> = new Map()
  private areHooksInstalled = false

  install() {
    if (this.areHooksInstalled) {
      return
    }

    this.installHook('beforeExit')
    this.installHook('exit')
    this.installHook('SIGINT', true)
    this.installHook('SIGUSR2', true)
    this.installHook('SIGTERM', true)
    this.areHooksInstalled = true
  }

  setListener(owner: unknown, listener: BeforeExitListener | undefined) {
    if (listener) {
      this.beforeExitListeners.set(owner, listener)
    } else {
      this.beforeExitListeners.delete(owner)
    }
  }

  getListener(owner: unknown): BeforeExitListener | undefined {
    return this.beforeExitListeners.get(owner)
  }

  private installHook(event: string, shouldExit = false) {
    process.once(event, async (code) => {
      debug(`exit event received: ${event}`)
      for (const listener of this.beforeExitListeners.values()) {
        await listener()
      }

      this.beforeExitListeners.clear()

      // only exit, if only we are listening
      // if there is another listener, that other listener is responsible
      if (shouldExit && process.listenerCount(event) === 0) {
        process.exit(code)
      }
    })
  }
}
