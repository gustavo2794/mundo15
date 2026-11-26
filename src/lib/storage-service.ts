import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { storage } from '@/lib/firebase';
import type { MediaAsset } from '@/lib/types';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'];

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_BYTES = 60 * 1024 * 1024; // 60 MB

function sanitizeFilename(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 80);
}

export function getMediaTypeFromFile(file: File): 'image' | 'video' | null {
  if (ALLOWED_IMAGE_TYPES.includes(file.type) || file.type.startsWith('image/')) {
    return 'image';
  }
  if (ALLOWED_VIDEO_TYPES.includes(file.type) || file.type.startsWith('video/')) {
    return 'video';
  }
  return null;
}

export function validateMediaFile(
  file: File,
  allowVideos = true
): { valid: boolean; type?: 'image' | 'video'; error?: string } {
  const mediaType = getMediaTypeFromFile(file);
  if (!mediaType) {
    return {
      valid: false,
      error: 'Formato no soportado. Usa imágenes (JPG, PNG, WEBP) o videos (MP4, WEBM, MOV).',
    };
  }
  if (mediaType === 'video' && !allowVideos) {
    return {
      valid: false,
      error: 'Solo se permiten imágenes en esta sección.',
    };
  }
  if (mediaType === 'image' && file.size > MAX_IMAGE_BYTES) {
    return {
      valid: false,
      error: 'La imagen es demasiado grande. El límite máximo es de 10 MB.',
    };
  }
  if (mediaType === 'video' && file.size > MAX_VIDEO_BYTES) {
    return {
      valid: false,
      error: 'El video es demasiado grande. El límite máximo es de 60 MB.',
    };
  }
  return { valid: true, type: mediaType };
}

export function uploadMediaFile(
  file: File,
  folderPath: string,
  onProgress?: (percent: number) => void,
  customTitle?: string
): Promise<MediaAsset> {
  return new Promise((resolve, reject) => {
    const check = validateMediaFile(file, true);
    if (!check.valid || !check.type) {
      reject(new Error(check.error || 'Archivo inválido.'));
      return;
    }

    const mediaType = check.type;
    const uniqueId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const cleanName = sanitizeFilename(file.name || `archivo_${uniqueId}`);
    const storagePath = `${folderPath}/${uniqueId}_${cleanName}`;
    const storageRef = ref(storage, storagePath);

    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
    });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (snapshot.totalBytes > 0 && onProgress) {
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onProgress(pct);
        }
      },
      (error) => {
        console.error('Error al subir archivo a Firebase Storage:', error);
        const code = (error as { code?: string })?.code;
        if (code === 'storage/unauthorized') {
          reject(
            new Error(
              'No tienes permiso en Firebase Storage para subir archivos. Verifica las reglas de Storage en Firebase Console.'
            )
          );
        } else if (code === 'storage/canceled') {
          reject(new Error('La carga del archivo fue cancelada.'));
        } else if (code === 'storage/quota-exceeded') {
          reject(new Error('Se superó la cuota de almacenamiento de Firebase Storage.'));
        } else {
          reject(new Error('No se pudo subir el archivo. Verifica tu conexión o configuración de Storage.'));
        }
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            id: uniqueId,
            url: downloadUrl,
            type: mediaType,
            title: (customTitle || file.name.replace(/\.[^/.]+$/, '')).slice(0, 120),
            storagePath,
            createdAt: new Date().toISOString(),
          });
        } catch (urlError) {
          console.error('Error al obtener URL de descarga en Storage:', urlError);
          reject(new Error('El archivo se subió, pero no se pudo obtener la URL pública.'));
        }
      }
    );
  });
}

export async function deleteMediaFile(storagePath?: string): Promise<void> {
  if (!storagePath?.trim()) return;
  try {
    const fileRef = ref(storage, storagePath);
    await deleteObject(fileRef);
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code !== 'storage/object-not-found') {
      console.error('Error al eliminar archivo de Firebase Storage:', error);
    }
  }
}
