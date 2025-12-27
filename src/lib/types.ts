'use client';
import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

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
  id:string;
  customerName: string;
  customerId: string;
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

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}


export const AppointmentSuggestionsInputSchema = z.object({
  serviceId: z.string().describe("The ID of the service to be booked."),
  stylistId: z.string().describe("The ID of the stylist to book with."),
  preferredDate: z.string().describe("The preferred date for the appointment in ISO format (YYYY-MM-DD)."),
});
export type AppointmentSuggestionsInput = z.infer<typeof AppointmentSuggestionsInputSchema>;


export const AppointmentSuggestionsOutputSchema = z.object({
  suggestions: z.array(z.object({
    startTime: z.string().describe("The suggested start time for the appointment in ISO 8601 format."),
  })).describe("A list of suggested appointment start times. This should be an empty array if no slots are available."),
});
export type AppointmentSuggestionsOutput = z.infer<typeof AppointmentSuggestionsOutputSchema>;
