"use client";

import { CircleAlert } from "lucide-react";
import React, { useEffect, useState } from "react";

type ErrorMessage = {
  description: string,
}

class ErrorEvent {
  private readonly listeners = new Set<(v: ErrorMessage) => void>()

  subscribe(callback: (v: ErrorMessage) => void) {
    this.listeners.add(callback)

    return () => {
      this.listeners.delete(callback)
    }
  }

  emit(data: ErrorMessage) {
    this.listeners.forEach((cb) => cb(data))
  }
}

export const errors = new ErrorEvent()


export const ErrorWidget = () => {
  const [error, setError] = useState<ErrorMessage | null>(null)
  useEffect(() => {
    const unsub = errors.subscribe((m) => {
      setError(m)
      setTimeout(() => setError(null), 2500) 
    })

    return unsub
  }, [])

  if (!error) return null

  return (
    <div className="absolute flex bottom-[110%] w-full justify-center animate-in slide-in-from-bottom-2 fade-in duration-300">
      <div className="bg-destructive/10 backdrop-blur-sm flex items-center gap-3 p-4 text-destructive w-[95%] rounded-xl border border-destructive/20 shadow-lg">
        <div className="flex-shrink-0">
          <CircleAlert className="h-5 w-5" />
      </div>
      <div className="flex-1">        <span>{error.description}</span>
      </div>
    </div>
  </div>
  )
}
