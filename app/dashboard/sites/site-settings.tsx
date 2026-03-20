"use client"

import { useActionState, useState } from "react"
import { type InferSelectModel } from "drizzle-orm"
import Link from "next/link"
import { Globe, Plus, Trash2 } from "lucide-react"
import { site } from "@/lib/db/app-schema"
import { createSite, deleteSite, type ActionState } from "./actions"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { CopyButton } from "@/components/copy-button"

function CreateSiteSheet() {
  const [open, setOpen] = useState(false)

  const [state, formAction, isPending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await createSite(prev, formData)
      if (result?.success) setOpen(false)
      return result
    },
    null,
  )

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <Plus /> Add Site
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Create a new site</SheetTitle>
          <SheetDescription>
            Add a site to get your API keys for embedding the CAPTCHA widget.
          </SheetDescription>
        </SheetHeader>
        <form action={formAction} className="flex flex-col gap-4 px-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="My Website" defaultValue={state?.values?.name} required />
            {state?.errors?.name && (
              <p className="text-xs text-destructive">{state.errors.name[0]}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="domain">Domain (optional)</Label>
            <Input id="domain" name="domain" placeholder="example.com" defaultValue={state?.values?.domain} />
            {state?.errors?.domain && (
              <p className="text-xs text-destructive">{state.errors.domain[0]}</p>
            )}
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating..." : "Create Site"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function SiteCard({ s }: { s: InferSelectModel<typeof site> }) {
  const [, formAction, isPending] = useActionState(deleteSite, null)
  const [confirming, setConfirming] = useState(false)
  const [confirmName, setConfirmName] = useState("")

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Link
            href={`/dashboard/sites/${s.id}`}
            className="hover:underline"
          >
            {s.name}
          </Link>
        </CardTitle>
        {s.domain && <CardDescription>{s.domain}</CardDescription>}
        <CardAction>
          {!confirming ? (
            <Button variant="ghost" size="icon-xs" onClick={() => setConfirming(true)}>
              <Trash2 className="size-3" />
            </Button>
          ) : null}
        </CardAction>
      </CardHeader>
      {confirming ? (
        <CardContent className="flex flex-col gap-3 border-t border-destructive/30 bg-destructive/5 pt-3">
          <p className="text-xs text-destructive font-medium">
            Type <span className="font-bold">{s.name}</span> to confirm deletion. This will delete all puzzles on this site.
          </p>
          <Input
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={s.name}
            className="text-sm"
          />
          <div className="flex gap-2">
            <form action={formAction}>
              <input type="hidden" name="siteId" value={s.id} />
              <Button
                type="submit"
                variant="destructive"
                size="sm"
                disabled={confirmName !== s.name || isPending}
              >
                {isPending ? "Deleting..." : "Delete Site"}
              </Button>
            </form>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setConfirming(false); setConfirmName("") }}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      ) : (
        <CardContent>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <span className="truncate">{s.siteKey}</span>
            <CopyButton value={s.siteKey} />
          </div>
        </CardContent>
      )}
    </Card>
  )
}

export function SiteSettings({
  sites,
}: {
  sites: InferSelectModel<typeof site>[]
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sites</h1>
        <CreateSiteSheet />
      </div>

      {sites.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12">
          <Globe className="size-10 text-muted-foreground" />
          <p className="mt-4 text-lg font-medium">No sites yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first site to get started with yCAPTCHA.
          </p>
          <div className="mt-6">
            <CreateSiteSheet />
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sites.map((s) => (
            <SiteCard key={s.id} s={s} />
          ))}
        </div>
      )}
    </div>
  )
}
