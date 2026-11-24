/** Horloge injectée dans les services (jamais `new Date()` en dur, CLAUDE.md par. 8). */
export type Clock = () => Date

export const systemClock: Clock = () => new Date()

/** Horloge figée/réglable, pour les tests. */
export function createFixedClock(start: Date): Clock & { set(date: Date): void } {
  let now = start
  const clock = (): Date => new Date(now)
  clock.set = (date: Date): void => {
    now = date
  }
  return clock
}
