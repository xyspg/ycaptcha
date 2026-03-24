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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
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
            <Label htmlFor="domain">Domain</Label>
            <Input id="domain" name="domain" placeholder="example.com" defaultValue={state?.values?.domain} required />
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
  const [deleteOpen, setDeleteOpen] = useState(false)

  const handleDelete = async () => {
    const fd = new FormData()
    fd.set("siteId", s.id)
    await deleteSite(null, fd)
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <Link href={`/dashboard/sites/${s.id}`}>
            <Card className="transition-colors hover:bg-accent/50 dark:hover:bg-accent/30">
              <CardHeader>
                <CardTitle className="text-base">{s.name}</CardTitle>
                {s.domain && <CardDescription>{s.domain}</CardDescription>}
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                  <span className="truncate">{s.siteKey}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-3.5" />
            Delete Site
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Site"
        description="This will permanently delete this site and all its puzzles. This action cannot be undone."
        confirmText={s.name}
        onConfirm={handleDelete}
      />
    </>
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
