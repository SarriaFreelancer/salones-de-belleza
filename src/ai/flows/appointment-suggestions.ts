'use server';

/**
 * @fileOverview An AI-powered assistant that suggests optimal appointment times and stylist assignments.
 *
 * - suggestAppointment - A function that suggests appointment times and stylist assignments.
 */

import {ai} from '@/ai/genkit';
import { AppointmentSuggestionsInputSchema, AppointmentSuggestionsOutputSchema, type AppointmentSuggestionsInput, type AppointmentSuggestionsOutput } from '@/lib/types';


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
