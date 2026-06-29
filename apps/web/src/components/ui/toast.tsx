"use client"

import { Toast as ToastPrimitive } from "@base-ui/react/toast"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * ToastProvider wraps the surfaces that raise toasts and the <Toaster />.
 * base-ui keeps the toast queue in this provider's context.
 */
function ToastProvider({ ...props }: ToastPrimitive.Provider.Props) {
  return <ToastPrimitive.Provider {...props} />
}

/** Re-export the manager hook so a surface can call manager.add({ title, ... }). */
const useToastManager = ToastPrimitive.useToastManager

/**
 * Toaster renders the queue. base-ui gives the Viewport role="region" with a
 * default aria-label of "Notifications", and each Toast.Root role="dialog"
 * (role="alertdialog" when priority is high), named by its Title.
 */
function Toaster() {
  const { toasts } = useToastManager()
  return (
    <ToastPrimitive.Portal>
      <ToastPrimitive.Viewport
        data-shadcn-portal=""
        className="fixed right-4 bottom-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2 outline-none"
      >
        {toasts.map((toast) => (
          <ToastPrimitive.Root
            key={toast.id}
            toast={toast}
            className={cn(
              "relative grid gap-1 rounded-lg border bg-popover p-3 pr-8 text-sm text-popover-foreground shadow-md outline-none"
            )}
          >
            <ToastPrimitive.Title
              data-slot="toast-title"
              className="font-medium"
            />
            <ToastPrimitive.Description
              data-slot="toast-description"
              className="text-muted-foreground"
            />
            <ToastPrimitive.Close
              data-slot="toast-close"
              aria-label="Close"
              className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <XIcon className="size-4" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
      </ToastPrimitive.Viewport>
    </ToastPrimitive.Portal>
  )
}

export { ToastProvider, Toaster, useToastManager }
