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
  GalleryHorizontal,
  Contact,
  Megaphone,
} from 'lucide-react';
import { Logo } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { StylistsProvider } from '@/hooks/use-stylists';
import { ServicesProvider } from '@/hooks/use-services';
import { GalleryProvider } from '@/hooks/use-gallery';

function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Logo />
            <div className="flex flex-col">
              <h2 className="font-headline text-lg font-semibold leading-tight tracking-tight">
                Divas A&amp;A
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
                isActive={pathname.startsWith('/dashboard/customers')}
                tooltip={{ children: 'Clientes' }}
              >
                <Link href="/dashboard/customers">
                  <Contact />
                  <span>Clientes</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === '/dashboard/marketing'}
                tooltip={{ children: 'Marketing IA' }}
              >
                <Link href="/dashboard/marketing">
                  <Megaphone />
                  <span>Marketing IA</span>
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
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === '/dashboard/gallery'}
                tooltip={{ children: 'Galería' }}
              >
                <Link href="/dashboard/gallery">
                  <GalleryHorizontal />
                  <span>Galería</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
           <div className="flex items-center gap-3">
              <Avatar className="size-8">
                <AvatarImage src={"https://picsum.photos/seed/admin/100/100"} alt={user?.email || 'Admin'} data-ai-hint="woman portrait" />
                <AvatarFallback>{user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                <p className="text-sm font-medium text-sidebar-foreground">{user?.displayName || 'Administrador'}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <Button variant="ghost" size="icon" className="ml-auto group-data-[collapsible=icon]:hidden" onClick={logout}>
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

function LoadingScreen({ message }: { message: string }) {
    return (
        <div className="flex min-h-screen w-full">
            <div className="hidden md:block border-r border-border p-2">
                <div className="flex flex-col h-full w-[16rem]">
                    <div className="flex items-center gap-2 p-2">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-[120px]" />
                            <Skeleton className="h-3 w-[80px]" />
                        </div>
                    </div>
                    <div className="flex-1 p-2 mt-4 space-y-2">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                    </div>
                    <div className="p-2">
                        <Skeleton className="h-12 w-full" />
                    </div>
                </div>
            </div>
            <div className="flex-1 flex flex-col">
                <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6">
                    <Skeleton className="h-8 w-8 md:hidden" />
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-8 w-32 ml-auto" />
                </header>
                <main className="flex-1 flex items-center justify-center p-4 lg:p-6">
                    <div className="text-center text-muted-foreground">
                        <p>{message}</p>
                    </div>
                </main>
            </div>
        </div>
    );
}

function ProtectedDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAdmin, isAuthLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!isAuthLoading) {
      if (!user) {
        // If not loading and no user, redirect to login
        router.replace('/login');
      } else if (!isAdmin) {
        // If not loading, user exists, but is not an admin
        console.warn("Acceso denegado: El usuario no es administrador.");
        router.replace('/login?error=access-denied');
      }
    }
  }, [user, isAuthLoading, isAdmin, router]);

  // While authentication is loading, show a full-page loader
  if (isAuthLoading) {
    return <LoadingScreen message="Verificando permisos..." />;
  }

  // If after loading, there's still no user or they aren't an admin,
  // show a redirecting message while router does its job.
  if (!user || !isAdmin) {
    return <LoadingScreen message="Acceso denegado. Redirigiendo..." />;
  }

  // If everything is fine, render the actual dashboard layout
  return <DashboardLayoutContent>{children}</DashboardLayoutContent>;
}


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StylistsProvider>
      <ServicesProvider>
        <GalleryProvider>
          <ProtectedDashboardLayout>{children}</ProtectedDashboardLayout>
        </GalleryProvider>
      </ServicesProvider>
    </StylistsProvider>
  )
}


function getPageTitle(pathname: string): string {
  if (pathname.includes('/appointments')) return 'Gestión de Citas';
  if (pathname.includes('/customers')) return 'Gestión de Clientes';
  if (pathname.includes('/marketing')) return 'Asistente de Marketing IA';
  if (pathname.includes('/services')) return 'Nuestros Servicios';
  if (pathname.includes('/stylists')) return 'Equipo de Estilistas';
  if (pathname.includes('/gallery')) return 'Gestión de Galería';
  return 'Bienvenida, Admin!';
}
