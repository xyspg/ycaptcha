"use server"

import { z } from "zod"
import { nanoid } from "nanoid"
import { revalidatePath } from "next/cache"
import { requireSession } from "@/lib/auth/session"
import { db } from "@/lib/db"
import { site, puzzle } from "@/lib/db/app-schema"
import { and, eq, inArray } from "drizzle-orm"
import { domainSchema } from "@/lib/validators"

const createSiteSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  domain: domainSchema,
})

export type { ActionState } from "@/lib/types"
import type { ActionState } from "@/lib/types"

export async function createSite(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession()

  const values = {
    name: formData.get("name") as string ?? "",
    domain: formData.get("domain") as string ?? "",
  }

  const parsed = createSiteSchema.safeParse(values)

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors, values }
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
  domain: domainSchema,
})

export async function updateSite(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession()

  const values = {
    siteId: formData.get("siteId") as string ?? "",
    name: formData.get("name") as string ?? "",
    domain: formData.get("domain") as string ?? "",
  }

  const parsed = updateSiteSchema.safeParse(values)

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors, values }
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

export async function deletePuzzleFromSite(puzzleId: string, siteId: string): Promise<void> {
  const session = await requireSession()

  // Delete with ownership check in a single query
  const result = await db
    .delete(puzzle)
    .where(
      and(
        eq(puzzle.id, puzzleId),
        inArray(
          puzzle.siteId,
          db.select({ id: site.id }).from(site).where(eq(site.userId, session.user.id)),
        ),
      ),
    )
    .returning({ id: puzzle.id })

  if (result.length === 0) throw new Error("Puzzle not found")

  revalidatePath(`/dashboard/sites/${siteId}`)
}
