"use server"

import { z } from "zod"
import { nanoid } from "nanoid"
import { revalidatePath } from "next/cache"
import { requireSession } from "@/lib/auth/session"
import { db } from "@/lib/db"
import { site } from "@/lib/db/app-schema"
import { and, eq } from "drizzle-orm"

const createSiteSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  domain: z.string().max(253, "Domain is too long").optional().transform(v => v || undefined),
})

export type ActionState = {
  errors?: Record<string, string[]>
  message?: string
  success?: boolean
} | null

export async function createSite(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession()

  const parsed = createSiteSchema.safeParse({
    name: formData.get("name"),
    domain: formData.get("domain"),
  })

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  await db.insert(site).values({
    userId: session.user.id,
    name: parsed.data.name,
    domain: parsed.data.domain,
  })

  revalidatePath("/dashboard/sites")
  return { success: true, message: "Site created" }
}

export async function deleteSite(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession()

  const siteId = formData.get("siteId")
  if (typeof siteId !== "string") {
    return { errors: { siteId: ["Invalid site ID"] } }
  }

  const result = await db
    .delete(site)
    .where(and(eq(site.id, siteId), eq(site.userId, session.user.id)))
    .returning()

  if (result.length === 0) {
    return { errors: { siteId: ["Site not found"] } }
  }

  revalidatePath("/dashboard/sites")
  return { success: true, message: "Site deleted" }
}

const updateSiteSchema = z.object({
  siteId: z.string().min(1),
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  domain: z.string().max(253, "Domain is too long").optional().transform(v => v || undefined),
})

export async function updateSite(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession()

  const parsed = updateSiteSchema.safeParse({
    siteId: formData.get("siteId"),
    name: formData.get("name"),
    domain: formData.get("domain"),
  })

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const result = await db
    .update(site)
    .set({ name: parsed.data.name, domain: parsed.data.domain })
    .where(and(eq(site.id, parsed.data.siteId), eq(site.userId, session.user.id)))
    .returning()

  if (result.length === 0) {
    return { errors: { siteId: ["Site not found"] } }
  }

  revalidatePath(`/dashboard/sites/${parsed.data.siteId}`)
  return { success: true, message: "Site updated" }
}

export async function regenerateKeys(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession()

  const siteId = formData.get("siteId")
  if (typeof siteId !== "string") {
    return { errors: { siteId: ["Invalid site ID"] } }
  }

  const result = await db
    .update(site)
    .set({
      siteKey: `pk_${nanoid(32)}`,
      secretKey: `sk_${nanoid(32)}`,
    })
    .where(and(eq(site.id, siteId), eq(site.userId, session.user.id)))
    .returning()

  if (result.length === 0) {
    return { errors: { siteId: ["Site not found"] } }
  }

  revalidatePath(`/dashboard/sites/${siteId}`)
  return { success: true, message: "Keys regenerated" }
}
