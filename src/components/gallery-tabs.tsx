
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Image as ImageIcon, Play, Video } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ImagePlaceholder } from '@/lib/placeholder-images';
import type { MediaAsset } from '@/lib/types';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

type MediaItem = {
  type: 'image' | 'video';
  src: string;
  alt: string;
  hint?: string;
};

const MediaPreview = ({
  item,
  onSelect,
}: {
  item: MediaItem;
  onSelect: (item: MediaItem) => void;
}) => {
  return (
    <div
      className="relative aspect-video w-full cursor-pointer overflow-hidden rounded-lg bg-black/10"
      onClick={() => onSelect(item)}
    >
      {item.type === 'image' ? (
        <Image
          src={item.src}
          alt={item.alt}
          data-ai-hint={item.hint}
          fill
          referrerPolicy="no-referrer"
          className="object-cover transition-transform duration-300 hover:scale-105"
        />
      ) : (
        <>
          <video
            src={item.src}
            muted
            playsInline
            preload="metadata"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/25">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-primary shadow-md">
              <Play className="h-6 w-6 fill-current ml-0.5" />
            </div>
          </div>
        </>
      )}
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity hover:opacity-100">
        {item.type === 'image' ? (
          <ImageIcon className="h-8 w-8 text-white" />
        ) : (
          <Play className="h-10 w-10 text-white" />
        )}
      </div>
    </div>
  );
};

const MediaModal = ({
  item,
  open,
  onOpenChange,
}: {
  item: MediaItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-2 sm:p-4">
        <DialogTitle className="sr-only">{item.alt}</DialogTitle>
        <div className="relative aspect-video w-full overflow-hidden rounded-md bg-black">
          {item.type === 'image' ? (
            <Image
              src={item.src}
              alt={item.alt}
              fill
              referrerPolicy="no-referrer"
              className="object-contain"
            />
          ) : (
            <video src={item.src} controls autoPlay playsInline className="h-full w-full" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

type GalleryTabsProps = {
  galleryImages: ImagePlaceholder[];
  uploadedMedia?: MediaAsset[];
};

export function GalleryTabs({ galleryImages, uploadedMedia = [] }: GalleryTabsProps) {
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);

  const uploadedPhotos: MediaItem[] = uploadedMedia
    .filter((m) => m.type === 'image')
    .map((m) => ({
      type: 'image',
      src: m.url,
      alt: m.title || 'Fotografía de la empresa',
    }));

  const placeholderItems: MediaItem[] = galleryImages.map((img) => ({
    type: 'image',
    src: img.imageUrl,
    alt: img.description,
    hint: img.imageHint,
  }));

  const imageMediaItems: MediaItem[] =
    uploadedPhotos.length > 0 ? uploadedPhotos : placeholderItems;

  const videoMediaItems: MediaItem[] = uploadedMedia
    .filter((m) => m.type === 'video')
    .map((m) => ({
      type: 'video',
      src: m.url,
      alt: m.title || 'Video de presentación',
    }));

  const handleSelectMedia = (item: MediaItem) => {
    setSelectedMedia(item);
  };

  const handleCloseModal = () => {
    setSelectedMedia(null);
  };

  return (
    <>
      <Tabs defaultValue="photos" className="mt-8">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="photos">
            <ImageIcon className="mr-2 h-4 w-4" />
            Galería Fotográfica ({imageMediaItems.length})
          </TabsTrigger>
          <TabsTrigger value="videos">
            <Video className="mr-2 h-4 w-4" />
            Videos ({videoMediaItems.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="photos">
          <Card className="shadow-lg">
            <CardContent className="p-6">
              {imageMediaItems.length > 0 ? (
                <Carousel className="w-full">
                  <CarouselContent>
                    {imageMediaItems.map((item, index) => (
                      <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                        <MediaPreview item={item} onSelect={handleSelectMedia} />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="ml-16" />
                  <CarouselNext className="mr-16" />
                </Carousel>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <ImageIcon className="h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 font-headline text-xl font-semibold">No hay fotos</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Esta galería aún no tiene imágenes.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="videos">
          <Card className="shadow-lg">
            <CardContent className="p-6">
              {videoMediaItems.length > 0 ? (
                <Carousel className="w-full">
                  <CarouselContent>
                    {videoMediaItems.map((item, index) => (
                      <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                        <MediaPreview item={item} onSelect={handleSelectMedia} />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="ml-16" />
                  <CarouselNext className="mr-16" />
                </Carousel>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <Video className="h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 font-headline text-xl font-semibold">Sin videos por ahora</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Esta empresa aún no ha subido videos de sus coreografías o servicios.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <MediaModal
        item={selectedMedia}
        open={!!selectedMedia}
        onOpenChange={(open) => !open && handleCloseModal()}
      />
    </>
  );
}
