"use client"

import React, { useState, useMemo } from "react"
import { Tv, Zap, Phone, Wifi } from 'lucide-react'

export default function ServiceIcon({ serviceType }: { serviceType?: string }) {
  const [useFallback, setUseFallback] = useState(false)
  const key = (serviceType || '').toLowerCase()
  const src = useMemo(() => {
    if (key.includes('tv')) return '/tv.png'
    if (key.includes('electric')) return '/electricity.png'
    if (key.includes('data') || key.includes('internet')) return '/internet.png'
    if (key.includes('airtime') || key.includes('air')) return '/airtime.png'
    return '/airtime.png'
  }, [key])

  if (useFallback) {
    if (key.includes('tv')) return <Tv className="h-5 w-5 text-[#1437ff]" />
    if (key.includes('electric')) return <Zap className="h-5 w-5 text-[#1437ff]" />
    if (key.includes('data') || key.includes('internet')) return <Wifi className="h-5 w-5 text-[#1437ff]" />
    return <Phone className="h-5 w-5 text-[#1437ff]" />
  }

  return (
    <img
      src={src}
      alt={serviceType}
      className="h-5 w-5 object-contain"
      onError={() => setUseFallback(true)}
    />
  )
}
