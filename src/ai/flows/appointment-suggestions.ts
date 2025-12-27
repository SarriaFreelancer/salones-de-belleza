
'use server';

/**
 * @fileOverview An AI flow to calculate and suggest available appointment slots.
 * - suggestAppointments - A function that suggests available appointment times.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { AppointmentSuggestionsInputSchema, AppointmentSuggestionsOutputSchema } from '@/lib/types';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { serviceAccount } from '@/firebase/service-account';
import { parse, add, set, getDay } from 'date-fns';
import type { Stylist, Service, Appointment, DayOfWeek } from '@/lib/types';
import { Credential } from 'firebase-admin/app';


// Initialize Firebase Admin SDK if not already initialized
function getFirebaseAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }
  return initializeApp({
    credential: serviceAccount as Credential,
  });
}

function getDayOfWeek(date: Date): DayOfWeek {
    const dayIndex = date.getDay();
    const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[dayIndex];
}

const suggestAppointmentsFlow = ai.defineFlow(
  {
    name: 'suggestAppointmentsFlow',
    inputSchema: AppointmentSuggestionsInputSchema,
    outputSchema: AppointmentSuggestionsOutputSchema,
  },
  async (input) => {
    getFirebaseAdminApp();
    const firestore = getFirestore();

    const { serviceId, stylistId, preferredDate: preferredDateStr } = input;
    const preferredDate = new Date(preferredDateStr);
    
    // Fetch Service
    const serviceDoc = await firestore.collection('services').doc(serviceId).get();
    if (!serviceDoc.exists) throw new Error("Service not found");
    const service = serviceDoc.data() as Service;

    // Fetch Stylist
    const stylistDoc = await firestore.collection('stylists').doc(stylistId).get();
    if (!stylistDoc.exists) throw new Error("Stylist not found");
    const stylist = stylistDoc.data() as Stylist;
    
    // Determine availability for the selected day
    const dayOfWeek = getDayOfWeek(preferredDate);
    const availabilityForDay = stylist.availability[dayOfWeek] || [];
    
    // Fetch existing appointments for the stylist on that day
    const startOfDay = set(preferredDate, { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 });
    const endOfDay = set(preferredDate, { hours: 23, minutes: 59, seconds: 59, milliseconds: 999 });

    const appointmentsSnapshot = await firestore.collection('admin_appointments')
        .where('stylistId', '==', stylistId)
        .where('start', '>=', startOfDay)
        .where('start', '<=', endOfDay)
        .get();

    const existingAppointments = appointmentsSnapshot.docs
      .map(doc => doc.data() as Appointment)
      .filter(app => app.status !== 'cancelled');

    const slots: string[] = [];
    const serviceDuration = service.duration;

    availabilityForDay.forEach((availSlot) => {
      let baseDate = new Date(preferredDate);
      baseDate = set(baseDate, { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 });

      let currentTime = parse(availSlot.start, 'HH:mm', baseDate);
      const endTime = parse(availSlot.end, 'HH:mm', baseDate);
      
      while (add(currentTime, { minutes: serviceDuration }) <= endTime) {
        const proposedEndTime = add(currentTime, { minutes: serviceDuration });

        const isOverlapping = existingAppointments.some((existingApp) => {
            const existingStart = (existingApp.start as any).toDate();
            const existingEnd = (existingApp.end as any).toDate();
            return currentTime < existingEnd && proposedEndTime > existingStart;
        });

        if (!isOverlapping) {
          slots.push(currentTime.toISOString());
        }

        currentTime = add(currentTime, { minutes: 15 }); // Check every 15 minutes
      }
    });

    return {
      suggestions: slots.map(slot => ({ startTime: slot }))
    };
  }
);


export async function suggestAppointments(input: z.infer<typeof AppointmentSuggestionsInputSchema>) {
    return await suggestAppointmentsFlow(input);
}

    