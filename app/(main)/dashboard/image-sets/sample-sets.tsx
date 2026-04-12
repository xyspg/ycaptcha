"use client";

import { Download } from "lucide-react";
import { useTransition } from "react";
import { ImageSetThumbnail } from "@/components/image-set-thumbnail";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SAMPLE_SETS, type SampleSet } from "@/lib/samples";
import { importSampleSet } from "./actions";

function SampleSetCard({ sample }: { sample: SampleSet }) {
  const [isPending, startTransition] = useTransition();

  const handleImport = () => {
    startTransition(() => importSampleSet(sample.slug));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{sample.displayName}</CardTitle>
        <CardDescription>{sample.images.length} images</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ImageSetThumbnail images={sample.images} />
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={handleImport}
        >
          <Download className="size-3.5" />
          {isPending ? "Importing..." : "Import"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function SampleSets() {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-medium">Sample Image Sets</h2>
        <p className="text-sm text-muted-foreground">
          Import a pre-built image set to get started quickly.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SAMPLE_SETS.map((sample) => (
          <SampleSetCard key={sample.slug} sample={sample} />
        ))}
      </div>
    </div>
  );
}
