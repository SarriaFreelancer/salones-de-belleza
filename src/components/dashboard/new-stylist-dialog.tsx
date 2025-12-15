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
import type { Stylist } from '@/lib/types';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
});

type FormValues = z.infer<typeof formSchema>;

interface NewStylistDialogProps {
  onStylistSaved: (stylist: Stylist | Omit<Stylist, 'id' | 'avatarUrl' | 'availability'>) => void;
  stylistToEdit?: Stylist | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NewStylistDialog({
  onStylistSaved,
  stylistToEdit,
  open,
  onOpenChange,
}: NewStylistDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const isEditMode = !!stylistToEdit;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
    },
  });

  React.useEffect(() => {
    if (open && stylistToEdit) {
      form.reset({
        name: stylistToEdit.name,
      });
    } else if (open && !isEditMode) {
      form.reset({
        name: '',
      });
    }
  }, [stylistToEdit, open, form, isEditMode]);

  const onSubmit = (values: FormValues) => {
    setIsLoading(true);
    
    if (isEditMode && stylistToEdit) {
      onStylistSaved({
        ...stylistToEdit,
        ...values,
      });
    } else {
      onStylistSaved(values);
    }

    setTimeout(() => {
      setIsLoading(false);
      onOpenChange(false);
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Editar Estilista' : 'Añadir Nuevo Estilista'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Modifica los detalles del estilista.' : 'Completa los detalles para crear un nuevo estilista.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Estilista</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Ana" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  isEditMode ? 'Guardar Cambios' : 'Guardar Estilista'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
