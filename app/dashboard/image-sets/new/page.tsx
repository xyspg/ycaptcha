"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createImageSet, type ActionState } from "../actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Page() {
  const [state, formAction, isPending] = useActionState(createImageSet, null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/dashboard/image-sets">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">Create Image Set</h1>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>New Image Set</CardTitle>
          <CardDescription>
            Give your image set a name. You can upload images after creating it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g. NYC Subway Signs"
                required
              />
              {state?.errors?.name && (
                <p className="text-xs text-destructive">
                  {state.errors.name[0]}
                </p>
              )}
            </div>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create Image Set"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
