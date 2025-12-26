'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import type { Customer } from '@/lib/types';
import { Loader2 } from 'lucide-react';

const profileSchema = z.object({
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres.'),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres.'),
  phone: z.string().min(7, 'El teléfono debe tener al menos 7 dígitos.'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface EditProfileFormProps {
  customer: Customer;
  onUpdate: () => void;
}

export default function EditProfileForm({ customer, onUpdate }: EditProfileFormProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: customer.firstName || '',
      lastName: customer.lastName || '',
      phone: customer.phone || '',
    },
  });
  
  React.useEffect(() => {
    form.reset({
      firstName: customer.firstName || '',
      lastName: customer.lastName || '',
      phone: customer.phone || '',
    })
  }, [customer, form]);

  const onSubmit = async (values: ProfileFormValues) => {
    if (!firestore) return;
    setIsLoading(true);

    try {
      const customerRef = doc(firestore, 'customers', customer.id);
      await updateDoc(customerRef, {
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
      });
      toast({
        title: '¡Perfil Actualizado!',
        description: 'Tu información ha sido guardada correctamente.',
      });
      onUpdate();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo actualizar tu perfil. Inténtalo de nuevo.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                    <Input {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Apellido</FormLabel>
                <FormControl>
                    <Input {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Teléfono</FormLabel>
              <FormControl>
                <Input type="tel" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="text-sm text-muted-foreground">
            <p><strong>Correo Electrónico:</strong> {customer.email} (no se puede cambiar).</p>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Cambios
          </Button>
        </div>
      </form>
    </Form>
  );
}
