'use client';

import * as React from 'react';
import { stylists as initialStylists, appointments, services } from '@/lib/data';
import type { Stylist } from '@/lib/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, CalendarCog } from 'lucide-react';
import { format } from 'date-fns';
import AvailabilityEditor from '@/components/dashboard/availability-editor';

function StylistsPage() {
  const [today] = React.useState<Date>(new Date());
  const [stylists, setStylists] = React.useState<Stylist[]>(initialStylists);
  const [editingStylist, setEditingStylist] = React.useState<Stylist | null>(null);

  const handleSaveAvailability = (updatedStylist: Stylist) => {
    setStylists(currentStylists =>
      currentStylists.map(s => s.id === updatedStylist.id ? updatedStylist : s)
    );
    setEditingStylist(null);
    // Here you would typically make an API call to save the changes to your backend
  };

  return (
    <>
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
              <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-4">
                <Avatar className="h-16 w-16 border-2 border-primary">
                  <AvatarImage src={stylist.avatarUrl} alt={stylist.name} data-ai-hint="woman portrait" />
                  <AvatarFallback>{stylist.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="grid gap-1">
                  <CardTitle className="font-headline text-xl">{stylist.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                 <Dialog onOpenChange={(open) => !open && setEditingStylist(null)}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="w-full mb-4" onClick={() => setEditingStylist(stylist)}>
                            <CalendarCog className="mr-2 h-4 w-4" />
                            Gestionar Horario
                        </Button>
                    </DialogTrigger>
                    {editingStylist && editingStylist.id === stylist.id && (
                        <DialogContent className="max-w-2xl">
                           <AvailabilityEditor 
                                stylist={editingStylist} 
                                onSave={handleSaveAvailability} 
                            />
                        </DialogContent>
                    )}
                </Dialog>
                
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
    </>
  );
}

export default StylistsPage;
