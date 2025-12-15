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
  })).describe('A list of suggested appointment times and stylist assignments.'),
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

  Given the following information, suggest up to 5 optimal appointment times and stylist assignments, considering service duration and stylist availability. Ensure no scheduling conflicts occur with existing appointments.

  Service: {{{service}}}
  Duration: {{{duration}}} minutes
  Preferred Date: {{{preferredDate}}}

  Stylist Availability for the preferred date:
  {{#each stylistAvailability}}
    {{#if availableTimes}}
      Stylist ID: {{{stylistId}}}
      Available Times:
      {{#each availableTimes}}
        Start: {{{start}}}, End: {{{end}}}
      {{/each}}
    {{/if}}
  {{/each}}

  Existing Appointments on the preferred date:
  {{#each existingAppointments}}
  Stylist ID: {{{stylistId}}}, Start: {{{start}}}, End: {{{end}}}
  {{/each}}

  Suggest appointment times and stylist assignments that fit within the available time slots and avoid conflicts with existing appointments.
  Return the suggestions in the format specified in the output schema. If no slots are available, return an empty array of suggestions.
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
    return output!;
  }
);
