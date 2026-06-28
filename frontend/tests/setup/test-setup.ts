import { test as base } from '@playwright/test'

export const test = base.extend({
  storageState: () => {
    return process.env.STORAGE_STATE_PATH
      ? { cookies: [], origins: [] }
      : undefined
  },
})

export { expect } from '@playwright/test'
