'use server';

/**
 * @fileOverview A flow to handle appointment cancellations securely.
 *
 * - cancelAppointment - A function that cancels an appointment across all necessary collections.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getFirestore } from 'firebase-admin/firestore';
import {initializeApp, getApps, App} from 'firebase-admin/app';
import { firebaseConfig } from '@/firebase/config';

// Initialize Firebase Admin SDK if not already initialized
function getFirebaseAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }
  return initializeApp({
    credential: undefined, // Assumes running in a Google Cloud environment
    ...firebaseConfig
  });
}

const CancelAppointmentInputSchema = z.object({
  appointmentId: z.string().describe('The unique identifier of the appointment to cancel.'),
  customerId: z.string().describe('The UID of the customer cancelling the appointment.'),
  stylistId: z.string().describe('The ID of the stylist for the appointment.'),
});
export type CancelAppointmentInput = z.infer<typeof CancelAppointmentInputSchema>;

const CancelAppointmentOutputSchema = z.object({
  success: z.boolean().describe('Whether the cancellation was successful.'),
  message: z.string().describe('A message indicating the result of the operation.'),
});
export type CancelAppointmentOutput = z.infer<typeof CancelAppointmentOutputSchema>;


export async function cancelAppointment(input: CancelAppointmentInput): Promise<CancelAppointmentOutput> {
  return cancelAppointmentFlow(input);
}


const cancelAppointmentFlow = ai.defineFlow(
  {
    name: 'cancelAppointmentFlow',
    inputSchema: CancelAppointmentInputSchema,
    outputSchema: CancelAppointmentOutputSchema,
  },
  async (input) => {
    try {
      getFirebaseAdminApp();
      const firestore = getFirestore();
      const { appointmentId, customerId, stylistId } = input;

      const batch = firestore.batch();

      // 1. Update admin_appointments collection
      const adminAppointmentRef = firestore.doc(`admin_appointments/${appointmentId}`);
      batch.update(adminAppointmentRef, { status: 'cancelled' });

      // 2. Update stylist's subcollection
      const stylistAppointmentRef = firestore.doc(`stylists/${stylistId}/appointments/${appointmentId}`);
      batch.update(stylistAppointmentRef, { status: 'cancelled' });

      // 3. Update customer's subcollection
      const customerAppointmentRef = firestore.doc(`customers/${customerId}/appointments/${appointmentId}`);
      batch.update(customerAppointmentRef, { status: 'cancelled' });

      await batch.commit();
      
      return {
        success: true,
        message: 'Appointment cancelled successfully.',
      };

    } catch (error) {
      console.error("Error in cancelAppointmentFlow: ", error);
      // It's crucial to return a structured error that the client can handle
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'An unknown error occurred during cancellation.' };
    }
  }
);
