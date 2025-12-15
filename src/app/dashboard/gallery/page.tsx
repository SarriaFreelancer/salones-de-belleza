'use client';

import * as React from 'react';
import type { GalleryImage } from '@/lib/types';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreVertical, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useGallery } from '@/hooks/use-gallery';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import NewGalleryImageDialog from '@/components/dashboard/new-gallery-image-dialog';

type DialogState = 
  | { type: 'new' }
  | { type: 'edit'; image: GalleryImage }
  | { type: 'delete'; image: GalleryImage }
  | null;


export default function GalleryPage() {
  const { galleryImages, addImage, updateImage, deleteImage } = useGallery();
  const [dialogState, setDialogState] = React.useState<DialogState>(null);
  const { toast } = useToast();

  const handleAddImage = (image: GalleryImage) => {
    addImage(image);
    setDialogState(null);
  };

  const handleUpdateImage = (image: GalleryImage) => {
    updateImage(image);
    setDialogState(null);
  };
  
  const handleDeleteImage = () => {
    if (dialogState?.type === 'delete') {
      deleteImage(dialogState.image.id);
      toast({
        title: 'Imagen Eliminada',
        description: `La imagen ha sido eliminada de la galería.`,
      });
      setDialogState(null);
    }
  };

  const imageToEdit = dialogState?.type === 'edit' ? dialogState.image : null;
  const imageToDelete = dialogState?.type === 'delete' ? dialogState.image : null;

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-headline text-2xl">Imágenes de la Galería</h1>
           <Button onClick={() => setDialogState({ type: 'new' })}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Añadir Imagen
            </Button>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {galleryImages.map((image) => (
            <Card key={image.id} className="group relative overflow-hidden">
                <Image
                    src={image.src}
                    alt={image.alt}
                    width={400}
                    height={400}
                    className="h-full w-full object-cover transition-transform group-hover:scale-110"
                    data-ai-hint={image.hint}
                />
              <div className="absolute top-2 right-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setDialogState({ type: 'edit', image })}>
                      <Edit className="mr-2 h-4 w-4" />
                      <span>Editar</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDialogState({ type: 'delete', image })}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>Eliminar</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <p className="text-xs text-white truncate">{image.alt}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
      
      <NewGalleryImageDialog
        open={dialogState?.type === 'new' || dialogState?.type === 'edit'}
        onOpenChange={(isOpen) => !isOpen && setDialogState(null)}
        imageToEdit={imageToEdit}
        onImageCreated={dialogState?.type === 'edit' ? handleUpdateImage : handleAddImage}
      />

      <AlertDialog open={!!imageToDelete} onOpenChange={(isOpen) => !isOpen && setDialogState(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente la imagen de la galería.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDialogState(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteImage} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
