'use client';

import * as React from 'react';
import { useStylists } from '@/hooks/use-stylists';
import type { Stylist, DayOfWeek, AvailabilitySlot } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const daysOfWeek: { key: DayOfWeek; label: string }[] = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

export default function SchedulesPage() {
  const { stylists, updateStylist, isLoading: isLoadingStylists } = useStylists();
  const { toast } = useToast();
  
  const [selectedStylists, setSelectedStylists] = React.useState<string[]>([]);
  const [selectedDays, setSelectedDays] = React.useState<DayOfWeek[]>([]);
  const [startTime, setStartTime] = React.useState('09:00');
  const [endTime, setEndTime] = React.useState('17:00');
  const [isAssigning, setIsAssigning] = React.useState(false);
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const handleStylistToggle = (stylistId: string) => {
    setSelectedStylists((prev) =>
      prev.includes(stylistId)
        ? prev.filter((id) => id !== stylistId)
        : [...prev, stylistId]
    );
  };

  const handleSelectAllStylists = () => {
    if (selectedStylists.length === stylists.length) {
      setSelectedStylists([]);
    } else {
      setSelectedStylists(stylists.map(s => s.id));
    }
  };

  const handleDayToggle = (day: DayOfWeek) => {
    setSelectedDays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day]
    );
  };
  
  const handleSelectAllDays = () => {
    if (selectedDays.length === daysOfWeek.length) {
      setSelectedDays([]);
    } else {
      setSelectedDays(daysOfWeek.map(d => d.key));
    }
  };

  const handleAssignShift = async () => {
    if (selectedStylists.length === 0 || selectedDays.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Faltan datos',
        description: 'Debes seleccionar al menos un estilista y un día.',
      });
      return;
    }

    setIsAssigning(true);
    try {
      const newSlot: AvailabilitySlot = { start: startTime, end: endTime };
      
      const updatePromises = selectedStylists.map(stylistId => {
        const stylist = stylists.find(s => s.id === stylistId);
        if (!stylist) return Promise.resolve();

        const newAvailability = { ...stylist.availability };

        selectedDays.forEach(day => {
          const daySlots = newAvailability[day] || [];
          // Avoid adding duplicate slots
          if (!daySlots.some(slot => slot.start === newSlot.start && slot.end === newSlot.end)) {
             newAvailability[day] = [...daySlots, newSlot].sort((a, b) => a.start.localeCompare(b.start));
          }
        });
        
        return updateStylist({ ...stylist, availability: newAvailability });
      });

      await Promise.all(updatePromises);

      toast({
        title: '¡Horarios Asignados!',
        description: `Se asignó el turno de ${startTime} a ${endTime} a ${selectedStylists.length} estilista(s) en los días seleccionados.`,
      });
      
      setSelectedStylists([]);
      setSelectedDays([]);

    } catch (error) {
      console.error("Error assigning shifts:", error);
      toast({
        variant: 'destructive',
        title: 'Error al Asignar',
        description: 'Hubo un problema al guardar los horarios. Inténtalo de nuevo.',
      });
    } finally {
      setIsAssigning(false);
    }
  };

  if (!isClient || isLoadingStylists) {
    return (
      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-4">
             <Skeleton className="h-10 w-full" />
             <div className="space-y-2">
                {Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
             </div>
          </CardContent>
        </Card>
        <Card>
           <CardHeader>
            <Skeleton className="h-6 w-1/2" />
          </CardHeader>
           <CardContent className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
             <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-8 items-start">
      <Card>
        <CardHeader>
          <CardTitle>Paso 1: Seleccionar Estilistas</CardTitle>
           <CardDescription>
            Elige los estilistas a los que quieres asignar un nuevo turno.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
             <div className="flex items-center space-x-2 rounded-md border p-3">
                <Checkbox
                    id="select-all-stylists"
                    checked={selectedStylists.length === stylists.length && stylists.length > 0}
                    onCheckedChange={handleSelectAllStylists}
                />
                <Label htmlFor="select-all-stylists" className="font-semibold text-base">
                    Seleccionar Todos
                </Label>
             </div>
            {stylists.map((stylist) => (
              <div
                key={stylist.id}
                className="flex items-center space-x-2 rounded-md border p-3 transition-colors hover:bg-accent"
              >
                <Checkbox
                  id={stylist.id}
                  checked={selectedStylists.includes(stylist.id)}
                  onCheckedChange={() => handleStylistToggle(stylist.id)}
                />
                <Label htmlFor={stylist.id} className="w-full text-base">
                  {stylist.name}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Paso 2: Definir y Asignar Turno</CardTitle>
          <CardDescription>
            Define el horario y los días para los estilistas seleccionados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-semibold mb-3">Días de la Semana</h4>
             <div className="space-y-2">
                <div className="flex items-center space-x-2 rounded-md border p-3">
                    <Checkbox
                        id="select-all-days"
                        checked={selectedDays.length === daysOfWeek.length}
                        onCheckedChange={handleSelectAllDays}
                    />
                    <Label htmlFor="select-all-days" className="font-semibold text-base">
                        Seleccionar Todos
                    </Label>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {daysOfWeek.map((day) => (
                    <div key={day.key} className="flex items-center space-x-2 rounded-md border p-3">
                      <Checkbox
                        id={day.key}
                        checked={selectedDays.includes(day.key)}
                        onCheckedChange={() => handleDayToggle(day.key)}
                      />
                      <Label htmlFor={day.key}>{day.label}</Label>
                    </div>
                  ))}
                </div>
            </div>
          </div>
          
          <div>
             <h4 className="font-semibold mb-3">Horario del Turno</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-time">Hora de Inicio</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="end-time">Hora de Fin</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          </div>

          <Button
            className="w-full"
            onClick={handleAssignShift}
            disabled={isAssigning || selectedStylists.length === 0 || selectedDays.length === 0}
          >
            {isAssigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Asignar Turno a {selectedStylists.length > 0 ? `${selectedStylists.length} Estilista(s)` : '...'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
