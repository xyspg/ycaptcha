"use client";

import { Globe, Images, KeyRound, LogOut, Settings } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth/client";

const navItems = [
  { title: "Sites", href: "/dashboard/sites", icon: Globe },
  { title: "Puzzles", href: "/dashboard/puzzles", icon: KeyRound },
  { title: "Image Sets", href: "/dashboard/image-sets", icon: Images },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  return (
    <Sidebar>
      <SidebarHeader>
        <Link href="/dashboard" className="flex justify-center py-1">
          <Image src="/ycaptcha.webp" alt="yCAPTCHA" width={160} height={48} style={{ height: 'auto' }} priority />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Manage</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname.startsWith(item.href)}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/settings")}>
              <Link href="/dashboard/settings">
                <Settings />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <div className="flex items-center gap-3 px-2 py-1.5">
              {isPending ? (
                <>
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex flex-1 flex-col gap-1">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </>
              ) : (
                <>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={session?.user.image ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {session?.user.name?.charAt(0).toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-1 flex-col overflow-hidden">
                    <span className="truncate text-sm font-medium">{session?.user.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{session?.user.email}</span>
                  </div>
                  <button
                    onClick={() => authClient.signOut({ fetchOptions: { onSuccess: () => router.push("/login") } })}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
