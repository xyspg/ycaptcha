import { getTranslations } from "next-intl/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { StorageUsage } from "@/lib/storage-quota";
import { cn, formatBytes } from "@/lib/utils";

interface StorageUsageCardProps {
  usage: StorageUsage;
}

export async function StorageUsageCard({ usage }: StorageUsageCardProps) {
  const t = await getTranslations("settings.storage");

  const barColor =
    usage.percent >= 95
      ? "bg-destructive"
      : usage.percent >= 80
        ? "bg-yellow-500"
        : "bg-primary";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>
          {t("description", { quota: formatBytes(usage.quotaBytes) })}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {t("used", {
                used: formatBytes(usage.totalBytes),
                quota: formatBytes(usage.quotaBytes),
                percent: usage.percent,
              })}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full transition-all", barColor)}
              style={{ width: `${usage.percent}%` }}
            />
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">{t("imageBytes")}</dt>
            <dd className="font-medium tabular-nums">
              {formatBytes(usage.imageBytes)}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">{t("audioBytes")}</dt>
            <dd className="font-medium tabular-nums">
              {formatBytes(usage.audioBytes)}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
