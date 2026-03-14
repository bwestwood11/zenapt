"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({
  children,
  ...props
}: Readonly<React.ComponentProps<typeof NextThemesProvider>>) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const hasCompatibleLocalStorage =
    typeof globalThis !== "undefined" &&
    "localStorage" in globalThis &&
    typeof globalThis.localStorage?.getItem === "function" &&
    typeof globalThis.localStorage?.setItem === "function"

  if (!mounted || !hasCompatibleLocalStorage) {
    return <>{children}</>
  }

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
