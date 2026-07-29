import { useCallback } from "react"
import { toast as sonnerToast } from "sonner"

interface ToastOptions {
  title?: string
  description?: string
  variant?: "default" | "destructive"
  duration?: number
}

export function toast({ title, description, variant = "default", duration = 5000 }: ToastOptions) {
  if (variant === "destructive") {
    sonnerToast.error(title || "Error", {
      description,
      duration,
    })
  } else {
    sonnerToast.success(title || "Success", {
      description,
      duration,
    })
  }
}

export function useToast() {
  const toastFn = useCallback((options: ToastOptions) => {
    toast(options)
  }, [])

  return { toast: toastFn }
}
