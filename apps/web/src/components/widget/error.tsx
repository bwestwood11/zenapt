"use client";

import { AlertCircle, CircleAlert, Home, Mail, RefreshCcw } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Button, buttonVariants } from "../ui/button";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";

import Link from "next/link";

type ErrorMessage = {
  description: string,
}

class ErrorEvent {
  private listeners = new Set<(v: ErrorMessage) => void>()

  subscribe(callback: (v: ErrorMessage) => void) {
    this.listeners.add(callback)

    return () => void this.listeners.delete(callback)
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
    <div className="absolute flex bottom-[110%] w-full justify-center">
    <div className="bg-red-500/10 flex p-4 text-red-500 w-[95%] h-full rounded-lg">
      <div className="px-4 my-auto">
        <CircleAlert />
      </div>
      <div className="flex-1">        <span>{error.description}</span>
      </div>
    </div>
  </div>
  )
}


const Error = () => {
  const router = useRouter();
  const util = useQueryClient();

  return (
    <div className="flex items-center justify-center px-6 w-full h-full">
      <div className="text-center space-y-6 max-w-lg">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-6">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Something went wrong
          </h1>
          <p className="text-lg text-muted-foreground text-balance">
            We encountered an unexpected error. Don't worry, it's not your
            fault.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4 ">
          <Button
            onClick={() => {
              util.refetchQueries();
            }}
            type="button"
            size="lg"
            className="gap-2"
          >
            <RefreshCcw className="h-4 w-4" />
            Try again
          </Button>

          <Link
            className={buttonVariants({
              variant: "outline",
              size: "lg",
              className: "gap-2",
            })}
            href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL}`}
          >
            <Mail className="h-4 w-4" />
            Send Us An Email
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Error;
