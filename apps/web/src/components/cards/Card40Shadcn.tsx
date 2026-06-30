"use client"

import { Trash2 } from "lucide-react"
import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react"

import "@/styles/shadcn.css"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Toaster, ToastProvider, useToastManager } from "@/components/ui/toast"

type Credentials = { email: string; password: string }

const COUNTRIES = [
  { label: "United Kingdom", value: "uk" },
  { label: "France", value: "fr" },
  { label: "Spain", value: "es" },
]

/** A labelled landmark so Playwright can scope queries with getByRole('region', { name }). */
function Demo({ name, children }: { name: string; children: ReactNode }) {
  return (
    <section aria-label={name} className="grid gap-3 rounded-lg border p-4">
      <h3 className="text-sm font-medium">{name}</h3>
      <div>{children}</div>
    </section>
  )
}

function Pair({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>
}

/* ----------------------------- Login ----------------------------- */

function LoginGood({ onSubmit }: { onSubmit?: (c: Credentials) => void }) {
  const [error, setError] = useState("")
  const emailId = useId()
  const passwordId = useId()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const email = String(data.get("email") ?? "")
    const password = String(data.get("password") ?? "")
    if (!email || !password) {
      setError("Enter your email and password.")
      return
    }
    setError("")
    onSubmit?.({ email, password })
  }

  return (
    <form aria-label="Sign in" onSubmit={handleSubmit} className="grid max-w-sm gap-3">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={emailId}>Email address</FieldLabel>
          <Input id={emailId} name="email" type="email" />
        </Field>
        <Field>
          <FieldLabel htmlFor={passwordId}>Password</FieldLabel>
          <Input id={passwordId} name="password" type="password" />
        </Field>
      </FieldGroup>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit">Sign in</Button>
    </form>
  )
}

function LoginBad({ onSubmit }: { onSubmit?: (c: Credentials) => void }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (email && password) onSubmit?.({ email, password })
  }

  return (
    <form
      data-testid="shadcn-login-form"
      aria-label="Sign in"
      onSubmit={handleSubmit}
      className="grid max-w-sm gap-3"
    >
      <FieldGroup>
        <Field>
          <Input
            data-testid="shadcn-email-input"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field>
          <Input
            data-testid="shadcn-password-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
      </FieldGroup>
      <Button data-testid="shadcn-login-submit" type="submit">
        Sign in
      </Button>
    </form>
  )
}

/* --------------------------- Icon button --------------------------- */

function IconButtonGood() {
  const [deleted, setDeleted] = useState(false)
  return (
    <div className="grid gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Delete item"
        onClick={() => setDeleted(true)}
      >
        <Trash2 data-icon="inline-start" aria-hidden="true" />
      </Button>
      {deleted ? <p role="status">Item deleted</p> : null}
    </div>
  )
}

function IconButtonBad() {
  const [deleted, setDeleted] = useState(false)
  return (
    <div className="grid gap-2">
      <Button
        data-testid="shadcn-delete-btn"
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setDeleted(true)}
      >
        <Trash2 data-icon="inline-start" aria-hidden="true" />
      </Button>
      {deleted ? <div data-testid="shadcn-delete-result">Item deleted</div> : null}
    </div>
  )
}

/* ----------------------------- Select ----------------------------- */

function SelectGood() {
  const id = useId()
  return (
    <Field className="max-w-xs">
      <FieldLabel htmlFor={id}>Country</FieldLabel>
      <Select items={COUNTRIES} defaultValue="uk">
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {COUNTRIES.map((c) => (
            <SelectItem key={c.value} value={c.value}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}

function SelectBad() {
  return (
    <div className="max-w-xs">
      {/* A real combobox, but no field label names it — only a test id reaches it. */}
      <Select items={COUNTRIES} defaultValue="uk">
        <SelectTrigger data-testid="shadcn-country-trigger">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {COUNTRIES.map((c) => (
            <SelectItem key={c.value} value={c.value}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/* ----------------------------- Dialog ----------------------------- */

function DialogGood() {
  return (
    <Dialog>
      <DialogTrigger render={<Button />}>Open widget</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Widget</DialogTitle>
          <DialogDescription>The widget is open.</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}

function DialogBad() {
  return (
    <Dialog>
      <DialogTrigger render={<Button />}>Open widget</DialogTrigger>
      <DialogContent>
        <p>The widget is open.</p>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------ Toast ------------------------------ */

function ToastGood() {
  const manager = useToastManager()
  return (
    <Button
      type="button"
      onClick={() =>
        manager.add({
          title: "Changes saved",
          description: "Your profile is up to date.",
        })
      }
    >
      Save changes
    </Button>
  )
}

function ToastBad() {
  const [shown, setShown] = useState(false)
  return (
    <div className="grid gap-2">
      <Button
        data-testid="shadcn-toast-trigger"
        type="button"
        onClick={() => setShown(true)}
      >
        Save changes
      </Button>
      {shown ? (
        <div
          data-testid="shadcn-toast"
          className="rounded-lg border bg-popover p-3 text-sm"
        >
          Changes saved
        </div>
      ) : null}
    </div>
  )
}

/* ------------------------------ Island ------------------------------ */

export default function Card40Shadcn() {
  // A hydration sentinel: this effect runs only after the island hydrates on the
  // client, so a Playwright test can wait for it before driving the components
  // (the first interaction would otherwise race client:load hydration).
  useEffect(() => {
    document.documentElement.setAttribute("data-card40-hydrated", "true")
  }, [])

  return (
    <ToastProvider>
      <div className="shadcn-demo grid gap-4 text-foreground">
        <Demo name="shadcn login (good)">
          <LoginGood />
        </Demo>
        <Demo name="shadcn login (bad)">
          <LoginBad />
        </Demo>

        <Pair>
          <Demo name="shadcn icon button (good)">
            <IconButtonGood />
          </Demo>
          <Demo name="shadcn icon button (bad)">
            <IconButtonBad />
          </Demo>
        </Pair>

        <Pair>
          <Demo name="shadcn select (good)">
            <SelectGood />
          </Demo>
          <Demo name="shadcn select (bad)">
            <SelectBad />
          </Demo>
        </Pair>

        <Pair>
          <Demo name="shadcn dialog (good)">
            <DialogGood />
          </Demo>
          <Demo name="shadcn dialog (bad)">
            <DialogBad />
          </Demo>
        </Pair>

        <Pair>
          <Demo name="shadcn toast (good)">
            <ToastGood />
          </Demo>
          <Demo name="shadcn toast (bad)">
            <ToastBad />
          </Demo>
        </Pair>
      </div>
      <Toaster />
    </ToastProvider>
  )
}
