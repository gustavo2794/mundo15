'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Crown, Building2, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { Icons } from '@/components/icons';
import type { GoogleAuthOptions } from '@/hooks/use-auth';

interface GoogleRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (options: GoogleAuthOptions) => Promise<void>;
  isLoading: boolean;
}

export function GoogleRoleDialog({
  open,
  onOpenChange,
  onSelect,
  isLoading,
}: GoogleRoleDialogProps) {
  const [selectedRole, setSelectedRole] = useState<'quinceanera' | 'business'>('quinceanera');
  const [businessName, setBusinessName] = useState('');
  const [businessCategory, setBusinessCategory] = useState('');
  const [location, setLocation] = useState('');
  const [cost, setCost] = useState<'$' | '$$' | '$$$'>('$$');
  const [phone, setPhone] = useState('');
  const [formError, setFormError] = useState('');

  const handleContinue = async () => {
    setFormError('');
    if (selectedRole === 'business') {
      if (!businessName.trim()) {
        setFormError('Por favor ingresa el nombre de tu empresa o academia.');
        return;
      }
      if (!businessCategory.trim()) {
        setFormError('Por favor ingresa tu giro comercial o servicios.');
        return;
      }
      if (!location.trim()) {
        setFormError('Por favor ingresa tu ciudad o ubicación.');
        return;
      }
      await onSelect({
        userType: 'business',
        businessName: businessName.trim(),
        businessCategory: businessCategory.trim(),
        location: location.trim(),
        cost,
        phone: phone.trim(),
      });
    } else {
      await onSelect({
        userType: 'quinceanera',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <DialogTitle className="font-headline text-2xl md:text-3xl">
            ¿Cómo deseas ingresar a Mundo 15?
          </DialogTitle>
          <DialogDescription className="text-sm md:text-base">
            Selecciona tu perfil antes de continuar con Google. Esto asegurará que tengas las herramientas correctas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Role selection cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setSelectedRole('quinceanera')}
              className={`relative flex flex-col items-start p-4 rounded-xl border-2 text-left transition-all ${
                selectedRole === 'quinceanera'
                  ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20'
                  : 'border-border hover:border-primary/40 bg-card'
              }`}
            >
              {selectedRole === 'quinceanera' && (
                <div className="absolute top-3 right-3 text-primary">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              )}
              <div className="p-2.5 rounded-lg bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300 mb-3">
                <Crown className="h-6 w-6" />
              </div>
              <h3 className="font-headline text-lg font-bold">Soy Quinceañera</h3>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Organiza tu fiesta soñada: cuenta regresiva, presupuesto, corte de honor, vals, padrinos, mesas y cotizaciones con academias.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setSelectedRole('business')}
              className={`relative flex flex-col items-start p-4 rounded-xl border-2 text-left transition-all ${
                selectedRole === 'business'
                  ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20'
                  : 'border-border hover:border-primary/40 bg-card'
              }`}
            >
              {selectedRole === 'business' && (
                <div className="absolute top-3 right-3 text-primary">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              )}
              <div className="p-2.5 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 mb-3">
                <Building2 className="h-6 w-6" />
              </div>
              <h3 className="font-headline text-lg font-bold">Empresa / Academia</h3>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Promociona tus servicios (coreografías, vestidos, salón, foto/video, banquete) y aparece publicado en el menú principal.
              </p>
            </button>
          </div>

          {/* Business form fields if business is chosen */}
          {selectedRole === 'business' && (
            <div className="space-y-4 rounded-xl border p-4 bg-muted/30 animate-in fade-in-50 duration-200">
              <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                <Building2 className="h-4 w-4" />
                <span>Datos iniciales de tu Empresa o Academia</span>
              </div>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="diag-bname" className="text-xs font-medium">
                    Nombre comercial de la Empresa o Academia *
                  </Label>
                  <Input
                    id="diag-bname"
                    placeholder="Ej: Academia de Baile Imperial"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="diag-bcat" className="text-xs font-medium">
                    Giro Comercial / Servicios que ofreces *
                  </Label>
                  <Input
                    id="diag-bcat"
                    placeholder="Ej: Vals, Coreografía, Salón de Fiestas, Foto y Video"
                    value={businessCategory}
                    onChange={(e) => setBusinessCategory(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="diag-loc" className="text-xs font-medium">
                      Ubicación (Ciudad / Estado) *
                    </Label>
                    <Input
                      id="diag-loc"
                      placeholder="Ej: Ciudad de México"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="diag-cost" className="text-xs font-medium">
                      Rango de Precios
                    </Label>
                    <Select value={cost} onValueChange={(val: any) => setCost(val)}>
                      <SelectTrigger id="diag-cost" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="$">$ (Asequible)</SelectItem>
                        <SelectItem value="$$">$$ (Intermedio)</SelectItem>
                        <SelectItem value="$$$">$$$ (Premium)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="diag-phone" className="text-xs font-medium">
                    Teléfono de Contacto (Opcional)
                  </Label>
                  <Input
                    id="diag-phone"
                    placeholder="Ej: 5512345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          )}

          {formError && (
            <p className="text-xs font-medium text-destructive bg-destructive/10 p-2.5 rounded-md">
              {formError}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="sm:w-1/3"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleContinue}
              disabled={isLoading}
              className="sm:flex-1 gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Icons.google className="h-4 w-4" />
              )}
              {selectedRole === 'business'
                ? 'Continuar con Google como Empresa'
                : 'Continuar con Google como Quinceañera'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
