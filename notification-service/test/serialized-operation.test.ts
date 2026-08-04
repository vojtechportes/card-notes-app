import { describe, expect, it } from 'vitest'
import { SerializedOperationService } from '../src/services/serialized-operation.service'

describe('serialized relay operations', () => {
  it('does not start a second mutation while the first mutation is awaiting', async () => {
    const queue = new SerializedOperationService()
    const order: string[] = []
    let releaseFirst: (() => void) | undefined
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })

    const first = queue.run(async () => {
      order.push('first-start')
      await firstGate
      order.push('first-end')
    })
    const second = queue.run(async () => {
      order.push('second-start')
      order.push('second-end')
    })

    await Promise.resolve()

    expect(order).toEqual(['first-start'])

    releaseFirst?.()
    await Promise.all([first, second])

    expect(order).toEqual([
      'first-start',
      'first-end',
      'second-start',
      'second-end',
    ])
  })

  it('continues processing after a rejected operation', async () => {
    const queue = new SerializedOperationService()
    const failed = queue.run(async () => {
      throw new Error('expected failure')
    })
    const recovered = queue.run(async () => 'recovered')

    await expect(failed).rejects.toThrow('expected failure')
    await expect(recovered).resolves.toBe('recovered')
  })
})
