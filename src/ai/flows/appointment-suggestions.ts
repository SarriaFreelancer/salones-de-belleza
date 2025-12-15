'use server';

/**
 * @fileOverview An AI-powered assistant that suggests optimal appointment times and stylist assignments.
 *
 * - suggestAppointment - A function that suggests appointment times and stylist assignments.
 * - AppointmentSuggestionsInput - The input type for the suggestAppointment function.
 * - AppointmentSuggestionsOutput - The return type for the suggestAppointment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AppointmentSuggestionsInputSchema = z.object({
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

const AppointmentSuggestionsOutputSchema = z.object({
  suggestions: z.array(z.object({
    stylistId: z.string().describe('The unique identifier of the suggested stylist.'),
    startTime: z.string().describe('The suggested start time for the appointment in HH:mm format.'),
    endTime: z.string().describe('The suggested end time for the appointment in HH:mm format.'),
  })).describe('A list of suggested appointment times and stylist assignments. This should be an empty array if no slots are available.'),
});
export type AppointmentSuggestionsOutput = z.infer<typeof AppointmentSuggestionsOutputSchema>;

export async function suggestAppointment(input: AppointmentSuggestionsInput): Promise<AppointmentSuggestionsOutput> {
  return suggestAppointmentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'appointmentSuggestionsPrompt',
  input: {schema: AppointmentSuggestionsInputSchema},
  output: {schema: AppointmentSuggestionsOutputSchema},
  prompt: `You are an AI assistant helping to schedule appointments for a beauty salon.

  Your task is to suggest up to 5 optimal appointment times and assign a suitable stylist based on their availability and existing schedule.

  You must adhere to the following constraints:
  1.  The suggested appointment must fit completely within a stylist's availability slot.
  2.  The suggested appointment must NOT overlap with any existing appointments for that stylist.
  3.  The appointment duration is fixed and cannot be changed.
  4.  Calculate the end time based on the start time and the duration.

  Here is the information for the appointment request:
  - Service: {{{service}}}
  - Duration: {{{duration}}} minutes
  - Preferred Date: {{{preferredDate}}}

  Here is the schedule information for the preferred date:

  Stylist Availability:
  {{#each stylistAvailability}}
    {{#if availableTimes}}
      - Stylist ID: {{{stylistId}}}
        Available Times for this day:
        {{#each availableTimes}}
          - From: {{{start}}} to {{{end}}}
        {{/each}}
    {{else}}
      - Stylist ID: {{{stylistId}}} is not available on this day.
    {{/if}}
  {{/each}}

  Existing Appointments (Booked Slots):
  {{#if existingAppointments}}
    {{#each existingAppointments}}
    - Stylist ID: {{{stylistId}}}, Booked from: {{{start}}} to {{{end}}}
    {{/each}}
  {{else}}
    - No appointments are currently booked for this day.
  {{/if}}

  Based on all this information, find available slots and suggest up to 5 valid appointment times. If there are no available slots that meet all the criteria, you MUST return an empty array for the suggestions field.
  `, 
});

const suggestAppointmentFlow = ai.defineFlow(
  {
    name: 'suggestAppointmentFlow',
    inputSchema: AppointmentSuggestionsInputSchema,
    outputSchema: AppointmentSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    // Ensure the output is never null, default to empty suggestions array
    return output ?? { suggestions: [] };
  }
);
