'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { updateUserProfile } from '@/lib/firestore-service';
import { deleteMediaFile, validateMediaFile } from '@/lib/storage-service';
import {
  createMediaAssetFromUrl,
  getStoredCloudinarySettings,
  isCloudinaryConfigured,
  saveStoredCloudinarySettings,
  testCloudinaryConnection,
  uploadUnifiedMedia,
} from '@/lib/cloudinary-service';
import type { MediaAsset } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  Camera,
  CheckCircle2,
  Cloud,
  Eye,
  Film,
  HelpCircle,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  Play,
  Settings,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

/* =========================================================================
 * Cloudinary Configuration & Assistant Modal
 * ========================================================================= */
export function CloudinaryConfigModal({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}) {
  const { toast } = useToast();
  const [cloudName, setCloudName] = useState('');
  const [uploadPreset, setUploadPreset] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (open) {
      const current = getStoredCloudinarySettings();
      setCloudName(current.cloudName);
      setUploadPreset(current.uploadPreset);
      setTestResult(null);
    }
  }, [open]);

  const handleTestConnection = async () => {
    if (!cloudName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Cloud Name requerido',
        description: 'Escribe tu Cloud Name antes de probar.',
      });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testCloudinaryConnection(cloudName.trim(), uploadPreset.trim());
      setTestResult(result);
      if (result.success) {
        toast({
          title: '¡Conexión verificada con éxito!',
          description: result.message,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Verificación fallida',
          description: result.message,
        });
      }
    } finally {
      setTesting(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoredCloudinarySettings({
      cloudName: cloudName.trim(),
      uploadPreset: uploadPreset.trim(),
    });
    toast({
      title: 'Configuración guardada',
      description: cloudName.trim()
        ? `Cloudinary (${cloudName.trim()}) listo para subir fotos y videos.`
        : 'Configuración restablecida.',
    });
    if (onSaved) onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl flex items-center gap-2">
            <Cloud className="h-5 w-5 text-primary" />
            Conectar Cloudinary para Fotos y Videos
          </DialogTitle>
          <DialogDescription className="text-xs">
            Almacena fotos HD y videos para tu perfil o empresa con CDN global y optimización automática.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 pt-2">
          {/* Quick 3-Step Guide */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs space-y-2">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-amber-500" />
              ¿Cómo obtener tu Cloud Name gratis en 2 minutos?
            </p>
            <ol className="list-decimal pl-4 space-y-1 text-muted-foreground text-[11px] leading-relaxed">
              <li>
                Crea tu cuenta gratis en{' '}
                <a
                  href="https://cloudinary.com/users/register_free"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-primary underline"
                >
                  cloudinary.com
                </a>{' '}
                (incluye 25 GB gratis al mes).
              </li>
              <li>
                Copia tu <strong>Cloud Name</strong> que aparece en el Dashboard principal.
              </li>
              <li>
                En <strong>Settings (engrane) → Upload → Upload Presets</strong>, haz clic en{' '}
                <strong>Add Upload Preset</strong>, escribe un nombre y en <strong>Signing Mode</strong> selecciona{' '}
                <strong>Unsigned</strong>.
              </li>
            </ol>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cName" className="text-xs font-semibold">
              Cloud Name *
            </Label>
            <Input
              id="cName"
              placeholder="Ej: mi-quinceanera o tu_empresa"
              value={cloudName}
              onChange={(e) => {
                setCloudName(e.target.value);
                setTestResult(null);
              }}
              className="text-xs font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              El identificador de tu nube en Cloudinary (Dashboard).
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cPreset" className="text-xs font-semibold">
              Upload Preset (Modo Unsigned)
            </Label>
            <Input
              id="cPreset"
              placeholder="Ej: ml_default o mundo15_preset"
              value={uploadPreset}
              onChange={(e) => {
                setUploadPreset(e.target.value);
                setTestResult(null);
              }}
              className="text-xs font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              Preset con modo &quot;Unsigned&quot; para permitir subida directa de archivos desde el navegador o celular.
            </p>
          </div>

          {/* Test connection result badge */}
          {testResult && (
            <div
              className={`rounded-lg p-2.5 text-xs flex items-center gap-2 ${
                testResult.success
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-destructive/10 text-destructive border border-destructive/20'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <X className="h-4 w-4 shrink-0" />
              )}
              <span className="text-[11px] leading-tight">{testResult.message}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={testing || !cloudName.trim()}
              onClick={handleTestConnection}
              className="w-full sm:w-auto text-xs gap-1.5"
            >
              {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Probar Conexión
            </Button>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs"
              >
                Cerrar
              </Button>
              <Button type="submit" size="sm" className="gap-1.5 text-xs min-h-[38px]">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Guardar Conexión
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================================
 * Avatar Uploader (Quinceañera / Empresa)
 * Supports both direct device upload via Cloudinary AND direct URL pasting!
 * ========================================================================= */
type AvatarUploaderProps = {
  uid: string;
  currentPhotoUrl?: string | null;
  displayName?: string | null;
  initials: string;
  onUploaded?: (newUrl: string) => Promise<void> | void;
};

export function AvatarUploader({
  uid,
  currentPhotoUrl,
  displayName,
  initials,
  onUploaded,
}: AvatarUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleApplyUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setUploading(true);
    try {
      const cleanUrl = urlInput.trim();
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: cleanUrl });
      }
      await updateUserProfile(uid, { photoURL: cleanUrl });

      if (onUploaded) {
        await onUploaded(cleanUrl);
      }

      toast({
        title: 'Foto de perfil actualizada',
        description: 'Tu nueva imagen se guardó correctamente.',
      });
      setUrlInput('');
      setDialogOpen(false);
    } catch (error) {
      console.error('Error al guardar foto por URL:', error);
      toast({
        variant: 'destructive',
        title: 'No se pudo guardar la foto',
        description: error instanceof Error ? error.message : 'Intenta nuevamente.',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const check = validateMediaFile(file, false);
    if (!check.valid) {
      toast({
        variant: 'destructive',
        title: 'Archivo no válido',
        description: check.error,
      });
      return;
    }

    if (!isCloudinaryConfigured()) {
      setConfigOpen(true);
      toast({
        title: 'Conecta Cloudinary o pega una URL',
        description:
          'Para subir archivos directamente desde tu dispositivo, ingresa tu Cloud Name o usa la pestaña "Pegar Enlace (URL)".',
      });
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      const uploaded = await uploadUnifiedMedia(
        file,
        `users/${uid}/avatar`,
        (pct) => setProgress(pct),
        'Foto de perfil'
      );

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: uploaded.url });
      }
      await updateUserProfile(uid, { photoURL: uploaded.url });

      if (onUploaded) {
        await onUploaded(uploaded.url);
      }

      toast({
        title: 'Foto de perfil actualizada',
        description: 'Tu imagen ya se encuentra visible en tu perfil.',
      });
      setDialogOpen(false);
    } catch (error) {
      console.error('Error al subir foto de perfil:', error);
      toast({
        variant: 'destructive',
        title: 'No se pudo subir la foto',
        description: error instanceof Error ? error.message : 'Intenta nuevamente.',
      });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <>
      <div className="relative group shrink-0">
        <Avatar className="h-28 w-28 border-4 border-background shadow-xl ring-2 ring-primary/30">
          <AvatarImage
            src={currentPhotoUrl || undefined}
            alt={displayName || 'Usuario'}
            referrerPolicy="no-referrer"
          />
          <AvatarFallback className="text-3xl font-headline bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-amber-500/20 text-primary font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>

        <button
          type="button"
          disabled={uploading}
          onClick={() => setDialogOpen(true)}
          title="Cambiar foto de perfil (Subir archivo o pegar URL)"
          aria-label="Cambiar foto de perfil"
          className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-md transition-transform hover:scale-110 disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
        </button>

        {uploading && (
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 w-24">
            <Progress value={progress} className="h-1.5" />
          </div>
        )}
      </div>

      {/* Avatar Change Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-headline text-xl flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              Actualizar Foto de Perfil
            </DialogTitle>
            <DialogDescription className="text-xs">
              Sube una foto desde tu dispositivo o pega directamente un enlace de internet.
            </DialogDescription>
          </DialogHeader>

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 rounded-xl bg-muted/60 p-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`rounded-lg py-2 transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'upload'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Upload className="h-3.5 w-3.5" />
              Subir Archivo
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('url')}
              className={`rounded-lg py-2 transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'url'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LinkIcon className="h-3.5 w-3.5" />
              Pegar Enlace (URL)
            </button>
          </div>

          {activeTab === 'upload' ? (
            <div className="space-y-4 pt-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                className="hidden"
                onChange={handleFileSelect}
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/80 bg-muted/20 p-8 text-center cursor-pointer hover:border-primary/60 hover:bg-muted/40 transition-all"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
                  <Upload className="h-6 w-6" />
                </div>
                <p className="text-xs font-semibold text-foreground">
                  Haz clic para seleccionar tu foto
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  JPG, PNG o WEBP (máximo 10 MB)
                </p>
              </div>

              {uploading && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span>Subiendo imagen...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              <div className="flex items-center justify-between text-xs pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfigOpen(true)}
                  className="gap-1.5 text-[11px] text-muted-foreground hover:text-primary h-8 px-2"
                >
                  <Settings className="h-3 w-3" />
                  Ajustes de Cloudinary
                </Button>

                <Button
                  type="button"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs"
                >
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                  Explorar Archivos
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleApplyUrl} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="avatarUrlInput" className="text-xs font-semibold">
                  Enlace directo de la foto (URL) *
                </Label>
                <Input
                  id="avatarUrlInput"
                  placeholder="https://images.unsplash.com/... o enlace de tu foto"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  required
                  className="text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  Pega cualquier enlace público de imagen (Instagram, Pinterest, Google Fotos, Unsplash, Imgur, etc.).
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={uploading || !urlInput.trim()}
                  className="gap-1.5"
                >
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Guardar Foto
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <CloudinaryConfigModal
        open={configOpen}
        onOpenChange={setConfigOpen}
      />
    </>
  );
}

/* =========================================================================
 * Cover Image Uploader (Empresas / Academias)
 * Supports upload via Cloudinary + direct URL paste
 * ========================================================================= */
type CoverImageUploaderProps = {
  currentUrl?: string;
  fallbackUrl?: string;
  folderPath: string;
  label?: string;
  onUploaded: (url: string) => Promise<void> | void;
};

export function CoverImageUploader({
  currentUrl,
  fallbackUrl,
  folderPath,
  label = 'Imagen de Portada Principal',
  onUploaded,
}: CoverImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [urlDialogOpen, setUrlDialogOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [configOpen, setConfigOpen] = useState(false);

  const previewUrl = currentUrl || fallbackUrl;

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const check = validateMediaFile(file, false);
    if (!check.valid) {
      toast({
        variant: 'destructive',
        title: 'Imagen inválida',
        description: check.error,
      });
      return;
    }

    if (!isCloudinaryConfigured()) {
      setConfigOpen(true);
      toast({
        title: 'Conecta Cloudinary o pega una URL',
        description:
          'Para subir archivos directamente desde tu equipo, conecta tu Cloud Name o usa el botón "Pegar Enlace (URL)".',
      });
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      const asset = await uploadUnifiedMedia(
        file,
        folderPath,
        (pct) => setProgress(pct),
        'Portada'
      );
      await onUploaded(asset.url);
      toast({
        title: 'Portada actualizada',
        description: 'La imagen principal de tu negocio fue actualizada con éxito.',
      });
    } catch (error) {
      console.error('Error al subir imagen de portada:', error);
      toast({
        variant: 'destructive',
        title: 'Error al subir portada',
        description: error instanceof Error ? error.message : 'Intenta nuevamente.',
      });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleApplyUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setUploading(true);
    try {
      await onUploaded(urlInput.trim());
      toast({
        title: 'Portada actualizada',
        description: 'El enlace de portada fue aplicado exitosamente.',
      });
      setUrlInput('');
      setUrlDialogOpen(false);
    } catch (error) {
      console.error('Error al aplicar URL de portada:', error);
      toast({
        variant: 'destructive',
        title: 'Error al actualizar portada',
        description: 'No se pudo guardar la imagen.',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
            {label}
          </p>
          <p className="text-xs text-muted-foreground">
            Foto en formato panorámico que atrae a las quinceañeras en el catálogo principal.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            className="hidden"
            onChange={handleSelect}
          />
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="gap-1.5 text-xs shadow-sm"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Subir Archivo
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => setUrlDialogOpen(true)}
            className="gap-1.5 text-xs"
          >
            <LinkIcon className="h-3.5 w-3.5" />
            Pegar URL
          </Button>

          {currentUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={uploading}
              onClick={() => onUploaded('')}
              className="text-destructive hover:text-destructive gap-1 text-xs"
            >
              <X className="h-4 w-4" />
              Quitar
            </Button>
          )}
        </div>
      </div>

      <div className="relative aspect-video max-h-72 w-full overflow-hidden rounded-2xl border bg-muted/40 shadow-inner group">
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt="Portada de la empresa"
            fill
            referrerPolicy="no-referrer"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center text-muted-foreground p-6 text-center">
            <ImageIcon className="h-12 w-12 mb-2 opacity-50 text-primary" />
            <span className="text-xs font-medium">Sin imagen de portada personalizada</span>
            <span className="text-[11px] text-muted-foreground mt-1">
              Haz clic en &quot;Subir Archivo&quot; o &quot;Pegar URL&quot; para publicar una foto de tu salón o coreografía.
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
        {currentUrl && (
          <div className="absolute bottom-3 left-3 pointer-events-none">
            <Badge variant="secondary" className="gap-1 bg-black/60 text-white backdrop-blur-md text-[10px]">
              <Sparkles className="h-3 w-3 text-amber-400" />
              Portada Activa
            </Badge>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-background/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <Progress value={progress} className="w-56 h-2" />
            <span className="text-xs font-semibold">Guardando portada... {progress}%</span>
          </div>
        )}
      </div>

      {/* Paste URL Dialog for Cover */}
      <Dialog open={urlDialogOpen} onOpenChange={setUrlDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-headline text-lg flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-primary" />
              Pegar Enlace Directo de Portada
            </DialogTitle>
            <DialogDescription className="text-xs">
              Pega la URL de una foto panorámica de tu negocio alojada en internet.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleApplyUrl} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="coverUrlInput" className="text-xs font-semibold">
                URL de la Imagen *
              </Label>
              <Input
                id="coverUrlInput"
                placeholder="https://images.unsplash.com/... o enlace de tu foto"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                required
                className="text-xs"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setUrlDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={uploading || !urlInput.trim()}>
                Guardar Portada
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <CloudinaryConfigModal
        open={configOpen}
        onOpenChange={setConfigOpen}
      />
    </div>
  );
}

/* =========================================================================
 * Comprehensive Media Manager (Photos & Videos + Cloudinary + Direct URL)
 * ========================================================================= */
type MediaManagerProps = {
  items: MediaAsset[];
  folderPath: string;
  maxItems?: number;
  allowVideos?: boolean;
  onChange: (updated: MediaAsset[]) => Promise<void> | void;
  emptyTitle?: string;
  emptyDescription?: string;
};

export function MediaManager({
  items,
  folderPath,
  maxItems = 30,
  allowVideos = true,
  onChange,
  emptyTitle = 'Tu galería multimedia está vacía',
  emptyDescription = 'Sube fotos y videos para mostrar tus mejores momentos o trabajos a las Quinceañeras.',
}: MediaManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [isDragging, setIsDragging] = useState(false);
  const [uploadingName, setUploadingName] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [captionInput, setCaptionInput] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video'>('all');
  const [previewItem, setPreviewItem] = useState<MediaAsset | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [cloudinaryActive, setCloudinaryActive] = useState(false);

  // URL dialog state
  const [urlModalOpen, setUrlModalOpen] = useState(false);
  const [directUrl, setDirectUrl] = useState('');
  const [directTitle, setDirectTitle] = useState('');
  const [directType, setDirectType] = useState<'image' | 'video'>('image');

  useEffect(() => {
    setCloudinaryActive(isCloudinaryConfigured());
  }, []);

  const acceptAttr = allowVideos
    ? 'image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime'
    : 'image/jpeg,image/png,image/webp,image/gif,image/avif';

  const processFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const remainingSlots = maxItems - items.length;
    if (remainingSlots <= 0) {
      toast({
        variant: 'destructive',
        title: 'Límite alcanzado',
        description: `Puedes tener hasta ${maxItems} archivos multimedia en esta galería.`,
      });
      return;
    }

    if (!isCloudinaryConfigured()) {
      setConfigOpen(true);
      toast({
        title: 'Conecta Cloudinary o utiliza "Pegar Enlace Directo"',
        description:
          'Para subir fotos y videos desde tus carpetas, configura tu Cloud Name en la ventana o usa "Pegar Enlace (URL)" para agregar archivos de internet.',
      });
      return;
    }

    const filesToUpload = files.slice(0, remainingSlots);
    let currentItems = [...items];
    let uploadedCount = 0;

    for (const file of filesToUpload) {
      const check = validateMediaFile(file, allowVideos);
      if (!check.valid) {
        toast({
          variant: 'destructive',
          title: `Archivo omitido: ${file.name}`,
          description: check.error,
        });
        continue;
      }

      setUploadingName(file.name);
      setUploadProgress(0);
      try {
        const asset = await uploadUnifiedMedia(
          file,
          folderPath,
          (pct) => setUploadProgress(pct),
          captionInput.trim() || undefined
        );
        currentItems = [asset, ...currentItems];
        uploadedCount++;
      } catch (error) {
        console.error('Error al subir archivo multimedia:', error);
        toast({
          variant: 'destructive',
          title: `Error al subir ${file.name}`,
          description: error instanceof Error ? error.message : 'Intenta nuevamente.',
        });
      }
    }

    setUploadingName(null);
    setUploadProgress(0);

    if (uploadedCount > 0) {
      setCaptionInput('');
      await onChange(currentItems);
      toast({
        title: uploadedCount === 1 ? 'Archivo subido' : `${uploadedCount} archivos subidos`,
        description: 'La galería fue actualizada y guardada correctamente.',
      });
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      void processFiles(e.target.files);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      void processFiles(e.dataTransfer.files);
    }
  };

  const handleAddDirectUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directUrl.trim()) return;

    if (items.length >= maxItems) {
      toast({
        variant: 'destructive',
        title: 'Límite alcanzado',
        description: `Máximo ${maxItems} elementos permitidos.`,
      });
      return;
    }

    const newAsset = createMediaAssetFromUrl(
      directUrl.trim(),
      directType,
      directTitle.trim() || undefined
    );

    const updated = [newAsset, ...items];
    await onChange(updated);

    toast({
      title: 'Elemento agregado',
      description: 'La foto o video fue añadida a tu galería.',
    });

    setDirectUrl('');
    setDirectTitle('');
    setUrlModalOpen(false);
  };

  const handleDeleteItem = async (item: MediaAsset) => {
    setDeletingId(item.id);
    try {
      if (item.storagePath && !item.url.includes('cloudinary.com')) {
        await deleteMediaFile(item.storagePath);
      }
      const updated = items.filter((entry) => entry.id !== item.id);
      await onChange(updated);
      if (previewItem?.id === item.id) {
        setPreviewItem(null);
      }
      toast({ title: 'Archivo eliminado' });
    } catch (error) {
      console.error('Error al eliminar multimedia:', error);
      toast({
        variant: 'destructive',
        title: 'No se pudo eliminar',
        description: 'Ocurrió un error al actualizar la galería.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const photoCount = items.filter((i) => i.type === 'image').length;
  const videoCount = items.filter((i) => i.type === 'video').length;

  const visibleItems = items.filter((item) => {
    if (filterType === 'all') return true;
    return item.type === filterType;
  });

  return (
    <div className="space-y-6">
      {/* Cloudinary Status Bar & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-amber-500/10 p-3.5 rounded-xl border">
        <div className="flex items-center gap-2">
          <Badge
            variant={cloudinaryActive ? 'default' : 'outline'}
            className="gap-1.5 text-xs py-1 px-2.5 shadow-sm"
          >
            <Cloud className="h-3.5 w-3.5" />
            {cloudinaryActive ? 'Cloudinary CDN Conectado' : 'Cloudinary No Configurado'}
          </Badge>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {cloudinaryActive
              ? 'Tus fotos y videos se optimizan a máxima velocidad'
              : 'Conéctalo para subir archivos desde tu equipo o usa "Pegar Enlace"'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setUrlModalOpen(true)}
            className="gap-1.5 text-xs h-8"
          >
            <LinkIcon className="h-3.5 w-3.5" />
            Pegar Enlace (URL)
          </Button>

          <Button
            type="button"
            variant={cloudinaryActive ? 'outline' : 'default'}
            size="sm"
            onClick={() => setConfigOpen(true)}
            className="gap-1.5 text-xs h-8"
          >
            <Settings className="h-3.5 w-3.5" />
            {cloudinaryActive ? 'Ajustes' : 'Conectar Cloudinary'}
          </Button>
        </div>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`rounded-2xl border-2 border-dashed p-6 transition-all ${
          isDragging
            ? 'border-primary bg-primary/10 shadow-lg scale-[1.01]'
            : 'border-border/80 bg-card/60 hover:border-primary/50 hover:bg-card/90 shadow-sm'
        }`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Upload className="h-4 w-4 text-primary" />
              Subir Fotos {allowVideos ? 'y Videos' : ''} a tu Galería
            </p>
            <p className="text-xs text-muted-foreground">
              Arrastra archivos aquí o haz clic para explorar tus carpetas (JPG, PNG, WEBP hasta 10MB
              {allowVideos ? ' · MP4, WEBM, MOV hasta 60MB' : ''}).
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <Input
              placeholder="Título descriptivo del archivo..."
              value={captionInput}
              onChange={(e) => setCaptionInput(e.target.value)}
              className="h-9 text-xs sm:w-56 bg-background"
              disabled={!!uploadingName}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptAttr}
              multiple
              className="hidden"
              onChange={handleFileInputChange}
            />
            <Button
              type="button"
              size="sm"
              disabled={!!uploadingName || items.length >= maxItems}
              onClick={() => fileInputRef.current?.click()}
              className="gap-1.5 shrink-0 shadow-sm"
            >
              {uploadingName ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Seleccionar Archivos
            </Button>
          </div>
        </div>

        {uploadingName && (
          <div className="mt-4 space-y-2 rounded-xl border bg-background/95 p-4 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium truncate max-w-[70%] flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                Subiendo archivo: <strong>{uploadingName}</strong>
              </span>
              <span className="font-bold text-primary">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}
      </div>

      {/* Filter and Count Bar */}
      {items.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="inline-flex rounded-xl border bg-muted/40 p-1 shadow-inner">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                filterType === 'all'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Todos ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('image')}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                filterType === 'image'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Fotos ({photoCount})
            </button>
            {allowVideos && (
              <button
                type="button"
                onClick={() => setFilterType('video')}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                  filterType === 'video'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Videos ({videoCount})
              </button>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {items.length} de {maxItems} elementos publicados
          </span>
        </div>
      )}

      {/* Media Cards Grid */}
      {visibleItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card/40 p-12 text-center backdrop-blur-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3 shadow-sm">
            {filterType === 'video' ? (
              <Film className="h-7 w-7" />
            ) : (
              <ImageIcon className="h-7 w-7" />
            )}
          </div>
          <h4 className="font-headline text-lg font-semibold">{emptyTitle}</h4>
          <p className="mt-1 max-w-md text-xs text-muted-foreground">{emptyDescription}</p>
          <div className="mt-4 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setUrlModalOpen(true)}
              className="gap-1.5 text-xs"
            >
              <LinkIcon className="h-3.5 w-3.5" />
              Pegar Enlace Directo
            </Button>
            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="gap-1.5 text-xs"
            >
              <Upload className="h-3.5 w-3.5" />
              Subir Archivos
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleItems.map((item) => (
            <div
              key={item.id}
              className="group relative overflow-hidden rounded-2xl border bg-card/90 shadow-sm transition-all hover:shadow-xl hover:border-primary/40 backdrop-blur-sm"
            >
              <div
                onClick={() => setPreviewItem(item)}
                className="relative aspect-video w-full cursor-pointer overflow-hidden bg-black/10"
              >
                {item.type === 'image' ? (
                  <Image
                    src={item.url}
                    alt={item.title || 'Foto'}
                    fill
                    referrerPolicy="no-referrer"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <>
                    <video
                      src={item.url}
                      muted
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/20 transition-colors">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95 text-primary shadow-lg transition-transform group-hover:scale-110">
                        <Play className="h-5 w-5 fill-current ml-0.5" />
                      </div>
                    </div>
                  </>
                )}

                <div className="absolute left-2.5 top-2.5">
                  <Badge variant="secondary" className="gap-1 bg-black/60 text-white text-[10px] backdrop-blur-md border-0">
                    {item.type === 'video' ? (
                      <>
                        <Film className="h-3 w-3 text-pink-400" />
                        Video
                      </>
                    ) : (
                      <>
                        <ImageIcon className="h-3 w-3 text-amber-400" />
                        Foto
                      </>
                    )}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 p-3.5">
                <p className="truncate text-xs font-medium text-foreground">
                  {item.title || (item.type === 'video' ? 'Video' : 'Fotografía')}
                </p>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                    onClick={() => setPreviewItem(item)}
                    title="Reproducir / Ver completo"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={deletingId === item.id}
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteItem(item)}
                    title="Eliminar de la galería"
                  >
                    {deletingId === item.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Direct URL Add Dialog */}
      <Dialog open={urlModalOpen} onOpenChange={setUrlModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-headline text-xl flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-primary" />
              Pegar Enlace Directo (URL)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Agrega una foto o video disponible en internet sin necesidad de configuraciones.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddDirectUrl} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tipo de Multimedia *</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDirectType('image')}
                  className={`rounded-lg border p-2 text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                    directType === 'image'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  <ImageIcon className="h-4 w-4" />
                  Foto / Imagen
                </button>
                <button
                  type="button"
                  onClick={() => setDirectType('video')}
                  className={`rounded-lg border p-2 text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                    directType === 'video'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  <Film className="h-4 w-4" />
                  Video (MP4 / Web)
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="directUrlInput" className="text-xs font-semibold">
                Enlace Directo (URL) *
              </Label>
              <Input
                id="directUrlInput"
                placeholder={
                  directType === 'image'
                    ? 'https://ejemplo.com/foto.jpg o enlace de Unsplash / Imgur'
                    : 'https://ejemplo.com/video.mp4 o enlace web'
                }
                value={directUrl}
                onChange={(e) => setDirectUrl(e.target.value)}
                required
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="directTitleInput" className="text-xs font-semibold">
                Título o Momento (Opcional)
              </Label>
              <Input
                id="directTitleInput"
                placeholder="Ej: Vals de Apertura, Baile Sorpresa con Chambelanes"
                value={directTitle}
                onChange={(e) => setDirectTitle(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setUrlModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={!directUrl.trim()} className="gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Agregar a Galería
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Preview / Video Player Modal */}
      <Dialog open={!!previewItem} onOpenChange={(open) => !open && setPreviewItem(null)}>
        <DialogContent className="max-w-4xl p-3 sm:p-5">
          <DialogHeader>
            <DialogTitle className="font-headline text-lg truncate pr-6">
              {previewItem?.title ||
                (previewItem?.type === 'video'
                  ? 'Reproducción de video'
                  : 'Vista previa')}
            </DialogTitle>
          </DialogHeader>
          {previewItem && (
            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black shadow-2xl">
              {previewItem.type === 'image' ? (
                <Image
                  src={previewItem.url}
                  alt={previewItem.title || 'Vista previa'}
                  fill
                  referrerPolicy="no-referrer"
                  className="object-contain"
                />
              ) : (
                <video
                  src={previewItem.url}
                  controls
                  autoPlay
                  playsInline
                  className="h-full w-full"
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cloudinary Settings Modal */}
      <CloudinaryConfigModal
        open={configOpen}
        onOpenChange={setConfigOpen}
        onSaved={() => setCloudinaryActive(isCloudinaryConfigured())}
      />
    </div>
  );
}
