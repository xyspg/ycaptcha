import { Button } from "@/components/ui/button";
import { config } from "@/lib/config";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">
        The page you're looking for doesn't exist.
      </p>
      <Button asChild>
        <a href={config.getAppUrl("/dashboard")}>Back to Dashboard</a>
      </Button>
    </div>
  );
}
