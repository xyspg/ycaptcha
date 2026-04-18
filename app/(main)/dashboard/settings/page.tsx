import { StorageUsageCard } from "@/components/storage-usage-card";
import { requireSession } from "@/lib/auth/session";
import { getUserStorageUsage } from "@/lib/storage-quota";
import { SettingsSections } from "./settings-sections";

export default async function Page() {
  const session = await requireSession();
  const usage = await getUserStorageUsage(session.user.id);

  return <SettingsSections storageCard={<StorageUsageCard usage={usage} />} />;
}
