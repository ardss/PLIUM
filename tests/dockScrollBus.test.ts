import { describe, expect, it } from 'vitest'
import { publishListScroll, subscribeListScroll, publishSliderDrag, subscribeSliderDrag } from '../src/lib/dockScrollBus'

describe('Dock scroll coupling', () => {
  it('restores the latest actual scroll position whenever the slider remounts', () => {
    publishListScroll(0.6)
    const readings: number[] = []
    const unsubscribe = subscribeListScroll((value) => readings.push(value))
    expect(readings).toEqual([0.6])
    publishListScroll(0.75)
    expect(readings).toEqual([0.6, 0.75])
    unsubscribe()
    publishListScroll(0.9)
    expect(readings).toEqual([0.6, 0.75])
  })

  it('passes pointer and keyboard drag requests to the current list only', () => {
    const commands: number[] = []
    const unsubscribe = subscribeSliderDrag((value) => commands.push(value))
    publishSliderDrag(0.4)
    expect(commands).toEqual([0.4])
    unsubscribe()
    publishSliderDrag(0.7)
    expect(commands).toEqual([0.4])
  })
})
