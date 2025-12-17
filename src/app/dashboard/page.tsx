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
import { format, startOfWeek, endOfWeek, eachDayOfInterval, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useStylists } from '@/hooks/use-stylists';
import { useServices } from '@/hooks/use-services';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection } from 'firebase/firestore';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';

const chartConfig = {
  appointments: {
    label: 'Citas',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

function DashboardPage() {
  const [today, setToday] = React.useState<Date | undefined>(undefined);
  const { stylists, isLoading: isLoadingStylists } = useStylists();
  const { services, isLoading: isLoadingServices } = useServices();
  const firestore = useFirestore();
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
    setToday(new Date());
  }, []);

  const appointmentsCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'admin_appointments');
  }, [firestore]);
  
  const { data: appointments, isLoading: isLoadingAppointments } = useCollection<Appointment>(appointmentsCollection);

  const weeklyChartData = React.useMemo(() => {
    if (!appointments || !today) {
        // Provide a default structure for the skeleton loader
        const weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        return weekDays.map(day => ({ date: day, appointments: 0 }));
    }

    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Week starts on Monday
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    return weekDays.map(day => {
        const dayAppointments = appointments.filter(
            a => {
              const appointmentDate = a.start instanceof Date ? a.start : a.start.toDate();
              return appointmentDate.toDateString() === day.toDateString() && a.status !== 'cancelled'
            }
        ).length;
        
        // getDay() returns 0 for Sunday, 1 for Monday, etc.
        const dayIndex = getDay(day);
        
        return {
            date: dayNames[dayIndex],
            appointments: dayAppointments,
        };
    });
  }, [appointments, today]);


  if (!isClient || isLoadingStylists || isLoadingServices || isLoadingAppointments) {
    return (
      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card><CardHeader><Skeleton className="h-4 w-3/4" /></CardHeader><CardContent><Skeleton className="h-8 w-1/2" /><Skeleton className="h-4 w-full mt-2" /></CardContent></Card>
          <Card><CardHeader><Skeleton className="h-4 w-3/4" /></CardHeader><CardContent><Skeleton className="h-8 w-1/2" /><Skeleton className="h-4 w-full mt-2" /></CardContent></Card>
          <Card><CardHeader><Skeleton className="h-4 w-3/4" /></CardHeader><CardContent><Skeleton className="h-8 w-1/2" /><Skeleton className="h-4 w-full mt-2" /></CardContent></Card>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="lg:col-span-4"><CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent><Skeleton className="h-[250px] w-full" /></CardContent></Card>
            <Card className="lg:col-span-3"><CardHeader><Skeleton className="h-6 w-1/2" /><Skeleton className="h-4 w-3/4 mt-2" /></CardHeader><CardContent><Skeleton className="h-48 w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }

  const todaysAppointments = (appointments || []).filter(
    (a) => {
      const appointmentDate = a.start instanceof Date ? a.start : a.start.toDate();
      return today && appointmentDate.toDateString() === today.toDateString() && a.status !== 'cancelled'
    }
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
              {(appointments || []).filter(a => a.status === 'confirmed').length} confirmadas
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
              <BarChart accessibilityLayer data={weeklyChartData}>
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
                  allowDecimals={false}
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
                  .sort((a, b) => (a.start instanceof Date ? a.start.getTime() : a.start.toDate().getTime()) - (b.start instanceof Date ? b.start.getTime() : b.start.toDate().getTime()))
                  .slice(0, 4)
                  .map((appointment) => {
                    const stylist = stylists.find(
                      (s) => s.id === appointment.stylistId
                    );
                    const service = services.find(
                      (s) => s.id === appointment.serviceId
                    );
                    const appointmentDate = appointment.start instanceof Date ? appointment.start : appointment.start.toDate();
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
                          {format(appointmentDate, 'HH:mm')}
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

    