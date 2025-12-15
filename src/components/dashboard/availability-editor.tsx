'use client';

import React, { useState } from 'react';
import type { Stylist, DayOfWeek, AvailabilitySlot } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useToast } from '@/hooks/use-toast';

interface AvailabilityEditorProps {
  stylist: Stylist;
  onSave: (updatedStylist: Stylist) => void;
}

const daysOfWeek: { key: DayOfWeek; label: string }[] = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

export default function AvailabilityEditor({ stylist, onSave }: AvailabilityEditorProps) {
  const [availability, setAvailability] = useState(stylist.availability);
  const { toast } = useToast();

  const handleTimeChange = (
    day: DayOfWeek,
    index: number,
    field: 'start' | 'end',
    value: string
  ) => {
    const newAvailability = { ...availability };
    if (newAvailability[day]) {
      const updatedSlots = [...(newAvailability[day] as AvailabilitySlot[])];
      updatedSlots[index] = { ...updatedSlots[index], [field]: value };
      newAvailability[day] = updatedSlots;
      setAvailability(newAvailability);
    }
  };

  const addSlot = (day: DayOfWeek) => {
    const newAvailability = { ...availability };
    const daySlots = newAvailability[day] || [];
    newAvailability[day] = [...daySlots, { start: '09:00', end: '17:00' }];
    setAvailability(newAvailability);
  };

  const removeSlot = (day: DayOfWeek, index: number) => {
    const newAvailability = { ...availability };
    if (newAvailability[day]) {
      const updatedSlots = [...(newAvailability[day] as AvailabilitySlot[])];
      updatedSlots.splice(index, 1);
      newAvailability[day] = updatedSlots;
      setAvailability(newAvailability);
    }
  };

  const handleSave = () => {
    onSave({ ...stylist, availability });
    toast({
        title: "Horario Guardado",
        description: `Se ha actualizado el horario de ${stylist.name}.`
    })
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Editando Horario de {stylist.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {daysOfWeek.map(({ key, label }) => (
          <div key={key} className="space-y-2">
            <h4 className="font-semibold">{label}</h4>
            <div className="space-y-2">
              {(availability[key] || []).map((slot, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={slot.start}
                    onChange={(e) => handleTimeChange(key, index, 'start', e.target.value)}
                    className="w-full"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    type="time"
                    value={slot.end}
                    onChange={(e) => handleTimeChange(key, index, 'end', e.target.value)}
                    className="w-full"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSlot(key, index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addSlot(key)}
              className="mt-2"
            >
              <Plus className="mr-2 h-4 w-4" />
              Añadir Turno
            </Button>
          </div>
        ))}
        <Button onClick={handleSave}>Guardar Cambios</Button>
      </CardContent>
    </Card>
  );
}
