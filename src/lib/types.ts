import { z } from 'zod';
import type { Timestamp } from 'firebase/firestore';

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
  name:string;
  avatarUrl: string;
  availability: Partial<Record<DayOfWeek, AvailabilitySlot[]>>;
}

export interface Appointment {
  id: string;
  customerName: string;
  serviceId: string;
  stylistId: string;
  start: Date | Timestamp;
  end: Date | Timestamp;
  status: 'scheduled' | 'confirmed' | 'cancelled';
}

export interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  hint: string;
}


export const AppointmentSuggestionsInputSchema = z.object({
  service: z.string().describe('The name of the service to be booked.'),
  duration: z.number().describe('The duration of the service in minutes.'),
  preferredDate: z.string().describe('The preferred date for the appointment in ISO format (YYYY-MM-DD).'),
  stylistAvailability: z.array(z.object({
    stylistId: z.string().describe('The unique identifier of the stylist.'),
    availableTimes: z.array(z.object({
      start: z.string().describe('The start time of the availability slot in HH:mm format.'),
      end: z.string().describe('The end time of the availability slot in HH:mm format.'),
    })).describe('The available time slots for the stylist on the preferred date.'),
  })).describe('The availability of stylists on the preferred date.'),
  existingAppointments: z.array(z.object({
    stylistId: z.string().describe('The unique identifier of the stylist.'),
    start: z.string().describe('The start time of the existing appointment in HH:mm format.'),
    end: z.string().describe('The end time of the existing appointment in HH:mm format.'),
  })).describe('The existing appointments scheduled for stylists on the preferred date.'),
});
export type AppointmentSuggestionsInput = z.infer<typeof AppointmentSuggestionsInputSchema>;

export const AppointmentSuggestionsOutputSchema = z.object({
  suggestions: z.array(z.object({
    stylistId: z.string().describe('The unique identifier of the suggested stylist.'),
    startTime: z.string().describe('The suggested start time for the appointment in HH:mm format.'),
    endTime: z.string().describe('The suggested end time for the appointment in HH:mm format.'),
  })).describe('A list of suggested appointment times and stylist assignments. This should be an empty array if no slots are available.'),
});
export type AppointmentSuggestionsOutput = z.infer<typeof AppointmentSuggestionsOutputSchema>;
