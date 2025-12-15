import BookingForm from '@/components/public/booking-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import ClientOnly from '@/components/client-only';

export default function BookingPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex items-center justify-center rounded-full bg-primary/10 p-3">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="font-headline text-3xl">Agende su Cita</CardTitle>
        <CardDescription>
          Utilice nuestro asistente de IA para encontrar el momento perfecto para su próximo tratamiento.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ClientOnly>
          <BookingForm />
        </ClientOnly>
      </CardContent>
    </Card>
  );
}