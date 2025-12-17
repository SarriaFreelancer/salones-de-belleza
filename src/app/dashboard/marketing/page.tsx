'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useServices } from '@/hooks/use-services';
import { generatePost } from '@/ai/flows/marketing-assistant-flow';
import { Loader2, Sparkles, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';

const formSchema = z.object({
  serviceName: z.string().min(1, 'Debes seleccionar un servicio.'),
  offer: z.string().optional(),
  tone: z
    .string({ required_error: 'Debes seleccionar un tono.' })
    .min(1, 'Debes seleccionar un tono.'),
});

type FormValues = z.infer<typeof formSchema>;

export default function MarketingPage() {
  const { services, isLoading: isLoadingServices } = useServices();
  const [isLoading, setIsLoading] = React.useState(false);
  const [generatedPost, setGeneratedPost] = React.useState('');
  const { toast } = useToast();
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serviceName: '',
      offer: '',
      tone: 'friendly',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    setGeneratedPost('');
    try {
      const result = await generatePost({
        ...values,
        tone: values.tone as 'professional' | 'friendly' | 'elegant' | 'energetic',
      });
      setGeneratedPost(result.postContent);
    } catch (error) {
      console.error('Error generating post:', error);
      toast({
        variant: 'destructive',
        title: 'Error de la IA',
        description: 'No se pudo generar la publicación. Inténtalo de nuevo.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedPost);
      toast({
        title: '¡Copiado!',
        description: 'La publicación ha sido copiada al portapapeles.',
      });
    } catch (err) {
       console.error('Failed to copy text: ', err);
       toast({
        variant: 'destructive',
        title: 'Error al Copiar',
        description: 'Tu navegador bloqueó la copia automática. Por favor, copia el texto manualmente.',
      });
    }
  };

  if (!isClient || isLoadingServices) {
    return (
        <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-1 space-y-4">
                 <Skeleton className="h-8 w-3/4" />
                 <Skeleton className="h-4 w-full" />
                 <div className="space-y-6 pt-4">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                     <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                     <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <Skeleton className="h-10 w-full" />
                 </div>
            </div>
            <div className="md:col-span-2">
                <Skeleton className="h-96 w-full" />
            </div>
        </div>
    )
  }

  return (
    <div className="grid md:grid-cols-3 gap-8">
      <div className="md:col-span-1">
        <h2 className="text-2xl font-headline font-semibold">
          Generador de Publicaciones
        </h2>
        <p className="mt-2 text-muted-foreground">
          Crea contenido para tus redes sociales en segundos. Elige un servicio,
          añade una oferta y deja que la IA haga la magia.
        </p>
        <Card className="mt-6">
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="serviceName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Servicio a Promocionar</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Elige un servicio" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {services.map((service) => (
                            <SelectItem key={service.id} value={service.name}>
                              {service.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="offer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Oferta Especial (Opcional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej: 20% de descuento los miércoles"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tono de la Publicación</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Elige un tono" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="professional">
                            Profesional
                          </SelectItem>
                          <SelectItem value="friendly">Amigable</SelectItem>
                          <SelectItem value="elegant">Elegante</SelectItem>
                          <SelectItem value="energetic">Enérgico</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Generar Publicación
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
      <div className="md:col-span-2">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Publicación Generada</CardTitle>
            <CardDescription>
              Aquí tienes el contenido generado por la IA. Puedes copiarlo y
              pegarlo en tus redes sociales.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/6" />
                 <Skeleton className="h-4 w-full mt-4" />
              </div>
            ) : generatedPost ? (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-0 right-0 h-8 w-8"
                  onClick={copyToClipboard}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Textarea
                  readOnly
                  value={generatedPost}
                  className="h-96 w-full text-base whitespace-pre-wrap bg-muted/50"
                />
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-border text-center">
                <p className="text-muted-foreground">
                  El contenido de la publicación aparecerá aquí.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

    