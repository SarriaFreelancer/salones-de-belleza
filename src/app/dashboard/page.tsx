'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  Users,
  Calendar,
  CircleDollarSign,
  Clock,
} from 'lucide-react';
import { type Appointment } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useStylists } from '@/hooks/use-stylists';
import { useServices } from '@/hooks/use-services';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, Timestamp } from 'firebase/firestore';
import { useFirestore, useMemoFirebase } from '@/firebase';

const chartData = [
  { date: 'Lunes', appointments: 5 },
  { date: 'Martes', appointments: 8 },
  { date: 'Miércoles', appointments: 6 },
  { date: 'Jueves', appointments: 10 },
  { date: 'Viernes', appointments: 12 },
  { date: 'Sábado', appointments: 15 },
  { date: 'Domingo', appointments: 2 },
];

const chartConfig = {
  appointments: {
    label: 'Citas',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

function DashboardPage() {
  const [today, setToday] = React.useState<Date | null>(null);
  const { stylists } = useStylists();
  const { services } = useServices();
  const firestore = useFirestore();

  const appointmentsCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'admin/appointments/appointments');
  }, [firestore]);
  
  const { data: appointments } = useCollection<Appointment>(appointmentsCollection);

  React.useEffect(() => {
    setToday(new Date());
  }, []);

  if (!today || !appointments) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Cargando dashboard...</p>
      </div>
    );
  }

  const processedAppointments = (appointments || []).map(appointment => ({
      ...appointment,
      start: appointment.start instanceof Timestamp ? appointment.start.toDate() : new Date(appointment.start),
      end: appointment.end instanceof Timestamp ? appointment.end.toDate() : new Date(appointment.end),
  }));

  const todaysAppointments = processedAppointments.filter(
    (a) => (a.start as Date).toDateString() === today.toDateString() && a.status !== 'cancelled'
  );
  const dailyRevenue = todaysAppointments.reduce((total, app) => {
    const service = services.find((s) => s.id === app.serviceId);
    return total + (service ? service.price : 0);
  }, 0);

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ingresos de Hoy (Estimado)
            </CardTitle>
            <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${dailyRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Basado en citas confirmadas y agendadas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Citas para Hoy</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todaysAppointments.length}</div>
            <p className="text-xs text-muted-foreground">
              {processedAppointments.filter(a => a.status === 'confirmed').length} confirmadas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estilistas Activas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stylists.length}</div>
            <p className="text-xs text-muted-foreground">
              Disponibles para agendar
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="font-headline">Actividad de la Semana</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <BarChart accessibilityLayer data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => value.slice(0, 3)}
                />
                 <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                 <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="appointments"
                  fill="var(--color-appointments)"
                  radius={4}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="font-headline">Próximas Citas de Hoy</CardTitle>
            <CardDescription>
              {todaysAppointments.length > 0
                ? `Tienes ${todaysAppointments.length} citas restantes hoy.`
                : 'No hay más citas por hoy.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {todaysAppointments.length > 0 ? (
              <div className="space-y-4">
                {todaysAppointments
                  .sort((a, b) => (a.start as Date).getTime() - (b.start as Date).getTime())
                  .slice(0, 4)
                  .map((appointment) => {
                    const stylist = stylists.find(
                      (s) => s.id === appointment.stylistId
                    );
                    const service = services.find(
                      (s) => s.id === appointment.serviceId
                    );
                    return (
                      <div key={appointment.id} className="flex items-center">
                        <Avatar className="h-9 w-9">
                          <AvatarImage
                            src={stylist?.avatarUrl}
                            alt={stylist?.name}
                          />
                          <AvatarFallback>
                            {stylist?.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="ml-4 space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {appointment.customerName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {service?.name} con {stylist?.name}
                          </p>
                        </div>
                        <div className="ml-auto font-medium text-sm flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(appointment.start as Date, 'HH:mm')}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
               <div className="flex flex-col items-center justify-center h-full text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground/50"/>
                  <p className="mt-4 text-muted-foreground">Todo tranquilo por aquí.</p>
               </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


export default DashboardPage;
