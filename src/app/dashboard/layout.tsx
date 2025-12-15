'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  LayoutDashboard,
  CalendarDays,
  Scissors,
  Users,
  LogOut,
  ExternalLink,
} from 'lucide-react';
import { Logo } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout, isUserLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };
  
  if (isUserLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Cargando y verificando autenticación...</p>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Logo />
            <div className="flex flex-col">
              <h2 className="font-headline text-lg font-semibold leading-tight tracking-tight">
                Divas AyA
              </h2>
              <p className="text-xs text-muted-foreground">Panel de Control</p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === '/dashboard'}
                tooltip={{ children: 'Dashboard' }}
              >
                <Link href="/dashboard">
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith('/dashboard/appointments')}
                tooltip={{ children: 'Citas' }}
              >
                <Link href="/dashboard/appointments">
                  <CalendarDays />
                  <span>Citas</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === '/dashboard/services'}
                tooltip={{ children: 'Servicios' }}
              >
                <Link href="/dashboard/services">
                  <Scissors />
                  <span>Servicios</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === '/dashboard/stylists'}
                tooltip={{ children: 'Estilistas' }}
              >
                <Link href="/dashboard/stylists">
                  <Users />
                  <span>Estilistas</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
           <div className="flex items-center gap-3">
              <Avatar className="size-8">
                <AvatarImage src={user.photoURL || "https://picsum.photos/seed/admin/100/100"} alt={user.email || 'Admin'} data-ai-hint="woman portrait" />
                <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                <p className="text-sm font-medium text-sidebar-foreground">{user.displayName || 'Administrador'}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <Button variant="ghost" size="icon" className="ml-auto group-data-[collapsible=icon]:hidden" onClick={handleLogout}>
                <LogOut />
              </Button>
            </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6">
          <SidebarTrigger className="md:hidden"/>
          <div className="w-full flex-1">
            <h1 className="font-headline text-lg font-semibold md:text-2xl">
              {getPageTitle(pathname)}
            </h1>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/">
              <ExternalLink className="mr-2 h-4 w-4" />
              Ver Sitio Público
            </Link>
          </Button>
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function getPageTitle(pathname: string): string {
  if (pathname.includes('/appointments')) return 'Gestión de Citas';
  if (pathname.includes('/services')) return 'Nuestros Servicios';
  if (pathname.includes('/stylists')) return 'Equipo de Estilistas';
  return 'Bienvenida, Admin!';
}
