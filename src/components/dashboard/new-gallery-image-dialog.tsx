'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import type { GalleryImage } from '@/lib/types';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  src: z.string().url('Debe ser una URL de imagen válida.'),
  alt: z.string().min(3, 'El texto alternativo debe tener al menos 3 caracteres.'),
  hint: z.string().min(3, 'La pista de IA debe tener al menos 3 caracteres.'),
});

interface NewGalleryImageDialogProps {
  onImageCreated: (image: GalleryImage) => void;
  imageToEdit?: GalleryImage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NewGalleryImageDialog({
  onImageCreated,
  imageToEdit,
  open,
  onOpenChange,
}: NewGalleryImageDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();
  const isEditMode = !!imageToEdit;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      src: '',
      alt: '',
      hint: '',
    },
  });

  React.useEffect(() => {
    if (open && imageToEdit) {
      form.reset(imageToEdit);
    } else if (open && !imageToEdit) {
      form.reset({
        src: `https://picsum.photos/seed/gallery${Date.now()}/600/400`,
        alt: '',
        hint: '',
      });
    }
  }, [imageToEdit, open, form]);

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      form.reset();
    }
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      const imageData: GalleryImage = {
        id: isEditMode && imageToEdit ? imageToEdit.id : String(Date.now()),
        ...values,
      };

      onImageCreated(imageData);
      toast({
        title: isEditMode ? '¡Imagen Actualizada!' : '¡Imagen Añadida!',
        description: `La imagen ha sido ${isEditMode ? 'actualizada' : 'añadida'} correctamente.`,
      });

      setIsLoading(false);
      handleOpenChange(false);
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Editar Imagen' : 'Añadir Nueva Imagen'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Modifica los detalles de la imagen.' : 'Completa los detalles para añadir una nueva imagen.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="src"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL de la Imagen</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/image.jpg" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="alt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Texto Alternativo (Alt)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Manicura elegante" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="hint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pista para IA</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: nail art" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  isEditMode ? 'Guardar Cambios' : 'Guardar Imagen'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
