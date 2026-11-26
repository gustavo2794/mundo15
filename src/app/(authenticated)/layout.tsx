'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, Home, ShieldCheck, MailWarning, RefreshCw, Crown, Building2 } from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarSeparator,
  useSidebar,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Header } from '@/components/header';
import { FinderTool } from '@/components/finder-tool';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

function NavContent() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAdmin, profile } = useAuth();
  const [, setIsLoading] = useState(false);
  const { isMobile, setOpenMobile } = useSidebar();

  const handleNavigation = (path: string) => {
    if (isMobile) {
      setOpenMobile(false);
    }
    if (path === '/') {
      router.push('/academies');
    } else {
      router.push(path);
    }
  };

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    handleNavigation(href);
  };

  const handleResults = (results: string[] | null) => {
    setIsLoading(false);
    const params = new URLSearchParams();
    if (results) {
      params.set('academyNames', encodeURIComponent(JSON.stringify(results)));
    }
    router.push(`/academies?${params.toString()}`);
  };

  const isFinderVisible = pathname === '/academies' || pathname === '/';

  return (
    <>
      <SidebarGroup>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === '/academies' || pathname === '/'} size="lg">
              <Link href="/academies" onClick={(e) => handleLinkClick(e, '/')}>
                <Home />
                Inicio
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === '/profile'} size="lg">
              <Link href="/profile" onClick={(e) => handleLinkClick(e, '/profile')}>
                {profile?.userType === 'business' ? (
                  <>
                    <Building2 />
                    Mi Empresa / Publicidad
                  </>
                ) : (
                  <>
                    <Crown />
                    Mi Planeador de XV
                  </>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {isAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith('/admin')} size="lg">
                <Link href="/admin" onClick={(e) => handleLinkClick(e, '/admin')}>
                  <ShieldCheck />
                  Panel de Admin
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarGroup>
      {isFinderVisible && <SidebarSeparator />}
      {isFinderVisible && (
        <FinderTool
          onLoading={setIsLoading}
          onResults={handleResults}
          hasFilteredResults={pathname.includes('academyNames')}
        />
      )}
    </>
  );
}

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, resendVerificationEmail, refreshUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [sendingVerify, setSendingVerify] = useState(false);
  const [refreshingVerify, setRefreshingVerify] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleResend = async () => {
    setSendingVerify(true);
    try {
      const res = await resendVerificationEmail();
      if (res.success) {
        toast({
          title: 'Correo de verificación enviado',
          description: 'Revisa tu bandeja de entrada o spam y haz clic en el enlace.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'No se pudo enviar',
          description: res.error,
        });
      }
    } finally {
      setSendingVerify(false);
    }
  };

  const handleRefreshVerification = async () => {
    setRefreshingVerify(true);
    try {
      await refreshUser();
      toast({
        title: 'Estado actualizado',
        description: 'Verificamos el estado actual de tu cuenta.',
      });
    } finally {
      setRefreshingVerify(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="flex flex-1">
          <Sidebar>
            <SidebarHeader>
              <NavContent />
            </SidebarHeader>
          </Sidebar>
          <SidebarInset>
            <main className="flex-1">
              {!user.emailVerified && (
                <div className="border-b bg-amber-50 px-4 py-3 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                  <div className="container mx-auto flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <MailWarning className="h-4 w-4 shrink-0" />
                      <span>
                        Verifica tu correo ({user.email}) para guardar tus preferencias y solicitar cotizaciones.
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleResend}
                        disabled={sendingVerify}
                      >
                        {sendingVerify && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                        Reenviar correo
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleRefreshVerification}
                        disabled={refreshingVerify}
                      >
                        {refreshingVerify ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Ya verifiqué
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              {children}
            </main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
