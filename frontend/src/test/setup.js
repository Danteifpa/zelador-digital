// IndexedDB em memória (o happy-dom não traz um).
import 'fake-indexeddb/auto'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
  globalThis.localStorage?.clear()
})
