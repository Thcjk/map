import { describe, expect, it } from 'vitest'
import { fitSize } from './image'

describe('fitSize', () => {
  it('verkleinert auf die längste Kante und vergrössert nie', () => {
    expect(fitSize(4000, 3000, 1600)).toEqual([1600, 1200])
    expect(fitSize(900, 1800, 1600)).toEqual([800, 1600])
    expect(fitSize(800, 600, 1600)).toEqual([800, 600])
  })
})
