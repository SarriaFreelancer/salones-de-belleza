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
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Service } from '@/lib/types';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres.'),
  price: z.coerce.number().min(0, 'El precio debe ser un número positivo.'),
  duration: z.coerce.number().int().min(5, 'La duración debe ser de al menos 5 minutos.'),
});

interface NewServiceDialogProps {
  onServiceSaved: (service: Service | Omit<Service, 'id'>) => void;
  serviceToEdit?: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NewServiceDialog({
  onServiceSaved,
  serviceToEdit,
  open,
  onOpenChange,
}: NewServiceDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const isEditMode = !!serviceToEdit;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      duration: 30,
    },
  });

  React.useEffect(() => {
    if (open && serviceToEdit) {
      form.reset(serviceToEdit);
    } else if (open && !serviceToEdit) {
      form.reset({
        name: '',
        description: '',
        price: 0,
        duration: 30,
      });
    }
  }, [serviceToEdit, open, form]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);

    const serviceData = {
      id: isEditMode && serviceToEdit ? serviceToEdit.id : String(Date.now()),
      ...values,
    };
    
    onServiceSaved(isEditMode ? serviceData : values);

    setTimeout(() => {
      setIsLoading(false);
      onOpenChange(false);
    }, 500);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Editar Servicio' : 'Añadir Nuevo Servicio'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Modifica los detalles del servicio.' : 'Completa los detalles para crear un nuevo servicio.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Servicio</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Corte de Cabello Moderno" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Una breve descripción del servicio..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Precio ($)</FormLabel>
                    <FormControl>
                        <Input type="number" step="0.01" placeholder="25.00" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Duración (min)</FormLabel>
                    <FormControl>
                        <Input type="number" step="5" placeholder="60" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
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
                  isEditMode ? 'Guardar Cambios' : 'Guardar Servicio'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
