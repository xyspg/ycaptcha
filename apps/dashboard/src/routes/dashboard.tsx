import { Trans } from "@lingui/react/macro";
import {
  createFileRoute,
  Outlet,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { authClient, useSession } from "@/lib/auth-client";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ to: "/login" });
    }
  },
  component: DashboardLayout,
});

function DashboardLayout() {
  const { data: session } = useSession();
  const navigate = useNavigate();

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr" }}>
      <aside style={{ borderRight: "1px solid #ddd", padding: 16 }}>
        <strong>yCAPTCHA</strong>
        <nav style={{ marginTop: 16, display: "grid", gap: 8 }}>
          {session?.user && (
            <p style={{ fontSize: 12, opacity: 0.7 }}>{session.user.email}</p>
          )}
          <button
            type="button"
            onClick={async () => {
              await authClient.signOut();
              navigate({ to: "/login" });
            }}
          >
            <Trans>Sign out</Trans>
          </button>
        </nav>
      </aside>
      <main style={{ padding: 24 }}>
        <Outlet />
      </main>
    </div>
  );
}
