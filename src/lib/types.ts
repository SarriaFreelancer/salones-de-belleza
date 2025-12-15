export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number; // in minutes
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface AvailabilitySlot {
  start: string; // "HH:mm"
  end: string;   // "HH:mm"
}

export interface Stylist {
  id: string;
  name: string;
  avatarUrl: string;
  availability: Partial<Record<DayOfWeek, AvailabilitySlot[]>>;
}

export interface Appointment {
  id: string;
  customerName: string;
  serviceId: string;
  stylistId: string;
  start: Date;
  end: Date;
  status: 'scheduled' | 'confirmed' | 'cancelled';
}
