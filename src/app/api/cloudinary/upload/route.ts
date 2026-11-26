import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'mundo15';
    const preset =
      (formData.get('upload_preset') as string) ||
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ||
      '';
    const cloudName =
      (formData.get('cloud_name') as string) ||
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
      process.env.CLOUDINARY_CLOUD_NAME ||
      '';

    if (!file) {
      return NextResponse.json(
        { error: 'No se envió ningún archivo para subir.' },
        { status: 400 }
      );
    }

    if (!cloudName) {
      return NextResponse.json(
        {
          error:
            'Cloudinary no está configurado aún. Configura NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME o introduce tu Cloud Name en ajustes.',
          unconfigured: true,
        },
        { status: 400 }
      );
    }

    const isVideo = file.type.startsWith('video/');
    const resourceType = isVideo ? 'video' : 'image';

    const cloudinaryFormData = new FormData();
    cloudinaryFormData.append('file', file);
    cloudinaryFormData.append('folder', folder);

    if (preset) {
      cloudinaryFormData.append('upload_preset', preset);
    }

    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (apiKey && apiSecret && !preset) {
      // Server-side signed upload using timestamp and signature
      const timestamp = Math.round(Date.now() / 1000).toString();
      cloudinaryFormData.append('timestamp', timestamp);
      cloudinaryFormData.append('api_key', apiKey);

      // Simple node crypto sha1 for signature
      const crypto = await import('crypto');
      const paramString = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
      const signature = crypto.createHash('sha1').update(paramString).digest('hex');
      cloudinaryFormData.append('signature', signature);
    }

    const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
    const res = await fetch(endpoint, {
      method: 'POST',
      body: cloudinaryFormData,
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Error devuelto por Cloudinary API:', data);
      return NextResponse.json(
        {
          error:
            data.error?.message ||
            'Error al procesar archivo en Cloudinary. Verifica que el Upload Preset sea unsigned.',
        },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      url: data.secure_url || data.url,
      publicId: data.public_id,
      format: data.format,
      resourceType: data.resource_type,
      width: data.width,
      height: data.height,
      duration: data.duration,
    });
  } catch (error) {
    console.error('Error en /api/cloudinary/upload:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al procesar archivo.' },
      { status: 500 }
    );
  }
}
