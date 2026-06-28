'use client'

import { useState } from 'react'

export function useScadaSocket() {
  const [isConnected] = useState(false)
  const [data] = useState(null)
  return { data, isConnected }
}
