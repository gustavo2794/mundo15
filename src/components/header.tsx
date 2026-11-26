'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Crown, LogOut, ShieldCheck, User as UserIcon, Building2, Compass } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from './ui/button';
import { SidebarTrigger } from './ui/sidebar';
import { usePathname } from 'next/navigation';

export function Header() {
  const { user, profile, isAdmin, logout } = useAuth();
  const pathname = usePathname();

  const getInitials = (name: string | null | undefined, email?: string | null) => {
    if (name?.trim()) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return 'U';
  };

  const showSidebarTrigger = user && pathname !== '/login' && pathname !== '/signup';
  const avatarSrc = profile?.photoURL || user?.photoURL || undefined;
  const displayName = profile?.displayName || user?.displayName || 'Usuario';
  const isBusiness = profile?.userType === 'business';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-card/85 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          {showSidebarTrigger && <SidebarTrigger className="min-h-[40px] min-w-[40px]" />}
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Crown className="h-5 w-5" />
            </span>
            <div className="flex flex-col">
              <span className="font-headline text-xl md:text-2xl font-bold tracking-tight leading-none">
                Mundo 15
              </span>
              <span className="hidden sm:block text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-0.5">
                Portal &amp; Atelier XV
              </span>
            </div>
          </Link>
        </div>

        {user ? (
          <div className="flex items-center gap-2 sm:gap-4">
            <nav className="hidden md:flex items-center gap-1 text-sm">
              <Link
                href="/academies"
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
                  pathname.startsWith('/academies')
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
              >
                <Compass className="h-4 w-4" />
                Directorio
              </Link>
              <Link
                href="/profile"
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
                  pathname === '/profile'
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
              >
                {isBusiness ? <Building2 className="h-4 w-4" /> : <Crown className="h-4 w-4" />}
                {isBusiness ? 'Estudio Empresa' : 'Mi Planeador'}
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
                    pathname.startsWith('/admin')
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                >
                  <ShieldCheck className="h-4 w-4" />
                  Admin
                </Link>
              )}
            </nav>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full ring-1 ring-border hover:ring-primary/40 p-0"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={avatarSrc} alt={displayName} />
                    <AvatarFallback className="bg-secondary text-secondary-foreground font-semibold">
                      {getInitials(displayName, user.email)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-60" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold leading-none">{displayName}</p>
                    <p className="text-xs leading-none text-muted-foreground truncate">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/academies" className="cursor-pointer">
                    <Compass className="mr-2 h-4 w-4" />
                    <span>Explorar Directorio</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>{isBusiness ? 'Mi Estudio Comercial' : 'Mi Planeador de XV'}</span>
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="cursor-pointer">
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      <span>Panel de Admin</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <Button asChild variant="outline" className="min-h-[40px]">
            <Link href="/login">Iniciar Sesión</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
