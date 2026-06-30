"use client"

import { useEffect, type ReactNode } from "react"
import { I18nextProvider, useTranslation } from "react-i18next"

import "@/styles/shadcn.css"

import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import i18n from "@/i18n/i18n"

/** A labelled landmark with a stable English name, so Playwright can scope the
 * region regardless of which language the content inside is showing. */
function Demo({ name, children }: { name: string; children: ReactNode }) {
  return (
    <section aria-label={name} className="grid gap-3 rounded-lg border p-4">
      <div>{children}</div>
    </section>
  )
}

function LanguageSwitch() {
  const { i18n: instance } = useTranslation()
  // Endonyms ("English", "Français") are stable handles: they read the same
  // whatever the active language is, so the switch never loses its own labels.
  return (
    <div role="group" aria-label="Language" className="flex gap-2">
      <Button
        type="button"
        size="sm"
        variant={instance.language === "en" ? "default" : "outline"}
        aria-pressed={instance.language === "en"}
        onClick={() => instance.changeLanguage("en")}
      >
        English
      </Button>
      <Button
        type="button"
        size="sm"
        variant={instance.language === "fr" ? "default" : "outline"}
        aria-pressed={instance.language === "fr"}
        onClick={() => instance.changeLanguage("fr")}
      >
        Français
      </Button>
    </div>
  )
}

function Storefront() {
  // Every string below flows through the typed t(). A key that is not in the
  // JSON is a compile error (see apps/web/src/i18n), so the copy the test reads
  // and the copy the user sees come from one source.
  const { t } = useTranslation()
  return (
    <div className="grid max-w-sm gap-4">
      <p role="status">{t("greeting", { name: "Jag" })}</p>

      <nav aria-label={t("sidebar.home", { ns: "navigation" })}>
        <ul className="flex gap-4 text-sm">
          <li>
            <a href="#home">{t("sidebar.home", { ns: "navigation" })}</a>
          </li>
          <li>
            <a href="#orders">{t("sidebar.orders", { ns: "navigation" })}</a>
          </li>
        </ul>
      </nav>

      <form role="search">
        <Field>
          <FieldLabel htmlFor="i18n-search" className="sr-only">
            {t("search.label")}
          </FieldLabel>
          <Input
            id="i18n-search"
            type="search"
            placeholder={t("search.placeholder")}
          />
        </Field>
      </form>

      <div className="flex gap-2">
        <Button type="button" variant="outline">
          {t("addToBasket")}
        </Button>
        <Button type="button">{t("checkout")}</Button>
      </div>
    </div>
  )
}

export default function Card41I18n() {
  // Hydration sentinel: the language switch is a client interaction, so the spec
  // waits for this before clicking (a click would otherwise race client:load).
  useEffect(() => {
    document.documentElement.setAttribute("data-card41-hydrated", "true")
  }, [])

  return (
    <I18nextProvider i18n={i18n}>
      <div className="shadcn-demo grid gap-4 text-foreground">
        <Demo name="language switch">
          <LanguageSwitch />
        </Demo>
        <Demo name="localized storefront">
          <Storefront />
        </Demo>
      </div>
    </I18nextProvider>
  )
}
