import { stylists, appointments, services } from '@/lib/data';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function StylistsPage() {
  const today = new Date();

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {stylists.map((stylist) => {
        const todaysAppointments = appointments.filter(
          (a) =>
            a.stylistId === stylist.id &&
            a.start.toDateString() === today.toDateString() &&
            a.status !== 'cancelled'
        ).sort((a,b) => a.start.getTime() - b.start.getTime());

        return (
          <Card key={stylist.id}>
            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
              <Avatar className="h-16 w-16 border-2 border-primary">
                <AvatarImage src={stylist.avatarUrl} alt={stylist.name} data-ai-hint="woman portrait" />
                <AvatarFallback>{stylist.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="grid gap-1">
                <CardTitle className="font-headline text-xl">{stylist.name}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <h4 className="mb-2 font-semibold">Citas para Hoy</h4>
              {todaysAppointments.length > 0 ? (
                <div className="space-y-2">
                  {todaysAppointments.map((appointment) => {
                    const service = services.find(
                      (s) => s.id === appointment.serviceId
                    );
                    return (
                      <div
                        key={appointment.id}
                        className="text-sm text-muted-foreground"
                      >
                        <div className="flex items-center justify-between">
                            <span className="font-medium text-foreground">{appointment.customerName}</span>
                            <Badge variant="secondary">{service?.name}</Badge>
                        </div>
                        <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>
                            {format(appointment.start, 'HH:mm')} - {format(appointment.end, 'HH:mm')}
                            </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No hay citas agendadas para hoy.
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
