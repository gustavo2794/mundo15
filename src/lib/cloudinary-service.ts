import type { MediaAsset } from '@/lib/types';
import { validateMediaFile } from '@/lib/storage-service';

const CLOUDINARY_CONFIG_KEY = 'mundo15_cloudinary_config';

export type CloudinarySettings = {
  cloudName: string;
  uploadPreset: string;
};

export function getStoredCloudinarySettings(): CloudinarySettings {
  if (typeof window === 'undefined') {
    return {
      cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '',
      uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '',
    };
  }

  try {
    const raw = window.localStorage.getItem(CLOUDINARY_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.cloudName) {
        return {
          cloudName: parsed.cloudName,
          uploadPreset: parsed.uploadPreset || '',
        };
      }
    }
  } catch (err) {
    console.error('Error al leer configuración de Cloudinary:', err);
  }

  return {
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '',
    uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '',
  };
}

export function saveStoredCloudinarySettings(settings: CloudinarySettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CLOUDINARY_CONFIG_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Error al guardar configuración de Cloudinary:', err);
  }
}

export function isCloudinaryConfigured(): boolean {
  const settings = getStoredCloudinarySettings();
  return Boolean(settings.cloudName.trim());
}

/**
 * Creates a valid MediaAsset directly from any web URL
 * (Instagram, Unsplash, Google Drive, Cloudinary, YouTube, etc.)
 * without requiring any cloud storage server setup.
 */
export function createMediaAssetFromUrl(
  url: string,
  type?: 'image' | 'video',
  title?: string
): MediaAsset {
  const trimmed = url.trim();
  const isVideo =
    type === 'video' ||
    Boolean(
      trimmed.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i) ||
      trimmed.includes('youtube.com') ||
      trimmed.includes('youtu.be') ||
      trimmed.includes('vimeo.com')
    );

  const detectedType: 'image' | 'video' = type || (isVideo ? 'video' : 'image');
  const id = `asset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  return {
    id,
    url: trimmed,
    type: detectedType,
    title: (title?.trim() || (detectedType === 'video' ? 'Video' : 'Fotografía')).slice(0, 120),
    createdAt: new Date().toISOString(),
  };
}

/**
 * Tests Cloudinary connection by uploading a 1x1 test pixel
 */
export async function testCloudinaryConnection(
  cloudName: string,
  uploadPreset: string
): Promise<{ success: boolean; message: string }> {
  if (!cloudName.trim()) {
    return { success: false, message: 'Ingresa un Cloud Name para probar la conexión.' };
  }

  try {
    const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(
      cloudName.trim()
    )}/image/upload`;

    // 1x1 transparent PNG data URL
    const testPixel =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

    const formData = new FormData();
    formData.append('file', testPixel);
    if (uploadPreset.trim()) {
      formData.append('upload_preset', uploadPreset.trim());
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (res.ok && data.secure_url) {
      return {
        success: true,
        message: `¡Conexión exitosa! Cloudinary (${cloudName.trim()}) está listo para recibir fotos y videos.`,
      };
    } else {
      const err =
        data.error?.message ||
        'No se pudo conectar. Verifica que el Cloud Name sea correcto y que el Upload Preset sea "Unsigned".';
      return { success: false, message: err };
    }
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Fallo de red al intentar conectar con Cloudinary.',
    };
  }
}

/**
 * Uploads an image or video directly to Cloudinary.
 * If Cloudinary is not yet configured, provides helpful guidance to configure
 * or use the Direct URL option.
 */
export async function uploadUnifiedMedia(
  file: File,
  folderPath: string,
  onProgress?: (percent: number) => void,
  customTitle?: string
): Promise<MediaAsset> {
  const validation = validateMediaFile(file, true);
  if (!validation.valid || !validation.type) {
    throw new Error(validation.error || 'Archivo multimedia no válido.');
  }

  const settings = getStoredCloudinarySettings();

  // 1. Direct client-side Cloudinary upload if configured
  if (settings.cloudName.trim()) {
    return await uploadDirectToCloudinary(
      file,
      folderPath,
      settings,
      onProgress,
      customTitle
    );
  }

  // 2. Server-side Cloudinary endpoint fallback (checks env vars)
  try {
    const asset = await uploadViaServerApi(file, folderPath, onProgress, customTitle);
    return asset;
  } catch (apiErr) {
    // If not configured, explain clearly
    throw new Error(
      'Cloudinary no está conectado aún. Abre "Ajustes de Cloudinary" para ingresar tu Cloud Name (ej: tu cuenta gratuita en cloudinary.com) o usa la opción "Pegar Enlace Directo (URL)" para agregar tus fotos sin esperas.'
    );
  }
}

function uploadDirectToCloudinary(
  file: File,
  folder: string,
  settings: CloudinarySettings,
  onProgress?: (percent: number) => void,
  customTitle?: string
): Promise<MediaAsset> {
  return new Promise((resolve, reject) => {
    const isVideo = file.type.startsWith('video/');
    const resourceType = isVideo ? 'video' : 'image';
    const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(
      settings.cloudName.trim()
    )}/${resourceType}/upload`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder.replace(/[^a-zA-Z0-9_/]/g, '_'));
    if (settings.uploadPreset.trim()) {
      formData.append('upload_preset', settings.uploadPreset.trim());
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint);

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const pct = Math.round((event.loaded / event.total) * 100);
          onProgress(pct);
        }
      };
    }

    xhr.onload = () => {
      try {
        const response = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && (response.secure_url || response.url)) {
          const uniqueId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          resolve({
            id: uniqueId,
            url: response.secure_url || response.url,
            type: resourceType,
            title: (customTitle || file.name.replace(/\.[^/.]+$/, '')).slice(0, 120),
            storagePath: response.public_id,
            createdAt: new Date().toISOString(),
          });
        } else {
          const errMsg = response.error?.message || `Error HTTP ${xhr.status} de Cloudinary`;
          reject(new Error(errMsg));
        }
      } catch (err) {
        reject(new Error('Respuesta inválida del servidor de Cloudinary'));
      }
    };

    xhr.onerror = () => reject(new Error('Fallo de red al conectar con Cloudinary'));
    xhr.send(formData);
  });
}

function uploadViaServerApi(
  file: File,
  folder: string,
  onProgress?: (percent: number) => void,
  customTitle?: string
): Promise<MediaAsset> {
  return new Promise((resolve, reject) => {
    const isVideo = file.type.startsWith('video/');
    const resourceType = isVideo ? 'video' : 'image';

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/cloudinary/upload');

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const pct = Math.round((event.loaded / event.total) * 100);
          onProgress(pct);
        }
      };
    }

    xhr.onload = () => {
      try {
        const response = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && response.url) {
          const uniqueId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          resolve({
            id: uniqueId,
            url: response.url,
            type: resourceType,
            title: (customTitle || file.name.replace(/\.[^/.]+$/, '')).slice(0, 120),
            storagePath: response.publicId,
            createdAt: new Date().toISOString(),
          });
        } else {
          reject(new Error(response.error || `Error HTTP ${xhr.status}`));
        }
      } catch (err) {
        reject(new Error('Error al procesar respuesta del servidor'));
      }
    };

    xhr.onerror = () => reject(new Error('Fallo de conexión con el servidor'));
    xhr.send(formData);
  });
}
