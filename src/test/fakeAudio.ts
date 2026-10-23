/**
 * A minimal stand-in for the Web Audio API, enough to drive the audio engine
 * and the torch sound in jsdom. Nodes record what was done to them; the
 * context's clock and autoplay policy are under the test's control.
 */

export class FakeAudioParam {
  value = 1
  curves: Array<{ curve: Float32Array; at: number; duration: number }> = []
  targets: Array<{ value: number; at: number; timeConstant: number }> = []
  setValueCurveAtTime(curve: Float32Array, at: number, duration: number) {
    this.curves.push({ curve, at, duration })
    return this
  }
  setValueAtTime(value: number) {
    this.value = value
    return this
  }
  setTargetAtTime(value: number, at: number, timeConstant: number) {
    this.targets.push({ value, at, timeConstant })
    this.value = value
    return this
  }
}

export class FakeNode {
  gain = new FakeAudioParam()
  connections: FakeNode[] = []
  disconnected = false
  connect(node: FakeNode) {
    this.connections.push(node)
    return node
  }
  disconnect() {
    this.disconnected = true
  }
}

export class FakeSource extends FakeNode {
  buffer: unknown = null
  onended: (() => void) | null = null
  started?: { at: number; offset: number; duration: number }
  stopped = false
  start(at: number, offset: number, duration: number) {
    this.started = { at, offset, duration }
  }
  stop() {
    this.stopped = true
  }
}

export class FakeAudioContext extends EventTarget {
  /** Whether resume() is allowed to succeed without a gesture. */
  allowed = true
  state: AudioContextState = 'suspended'
  currentTime = 0
  destination = new FakeNode()
  gains: FakeNode[] = []
  sources: FakeSource[] = []
  decoded: ArrayBuffer[] = []
  closed = false

  createGain() {
    const node = new FakeNode()
    this.gains.push(node)
    return node
  }
  createBufferSource() {
    const source = new FakeSource()
    this.sources.push(source)
    return source
  }
  decodeAudioData(bytes: ArrayBuffer) {
    this.decoded.push(bytes)
    return Promise.resolve({ duration: 13, byteLength: bytes.byteLength })
  }
  resume() {
    if (this.allowed && this.state !== 'running') {
      this.state = 'running'
      this.dispatchEvent(new Event('statechange'))
    }
    return Promise.resolve()
  }
  close() {
    this.closed = true
    this.state = 'closed'
    return Promise.resolve()
  }
}

/** Build a FakeAudioContext constructor and remember the instances it makes. */
export function fakeAudioContextClass() {
  const instances: FakeAudioContext[] = []
  class Ctx extends FakeAudioContext {
    constructor() {
      super()
      instances.push(this)
    }
  }
  return { Ctx: Ctx as unknown as typeof AudioContext, instances }
}

/** A fetch stub that serves a small buffer for any URL, or fails with `status`. */
export function fakeFetch(status = 200) {
  return () =>
    Promise.resolve({
      ok: status < 400,
      status,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    } as Response)
}
