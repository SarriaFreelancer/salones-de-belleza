
'use client';

import { useState, useEffect, useCallback } from 'react';
import { suggestAppointments, AppointmentSuggestionsInput, AppointmentSuggestionsOutput } from '@/ai/flows/appointment-suggestions';
import { useToast } from './use-toast';

interface UseSuggestionsProps extends AppointmentSuggestionsInput {
  enabled?: boolean;
}

// THIS HOOK IS DEPRECATED AND NOT IN USE
export function useMyAppointmentSuggestions({ serviceId, stylistId, preferredDate, enabled = true }: UseSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<AppointmentSuggestionsOutput['suggestions']>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchSuggestions = useCallback(async () => {
    if (!enabled || !serviceId || !stylistId || !preferredDate) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // THIS IS AN AI FLOW, WE ARE NOT USING IT ANYMORE
      // const result = await suggestAppointments({ serviceId, stylistId, preferredDate });
      // setSuggestions(result.suggestions);
       setSuggestions([]);
    } catch (err: any) {
      console.error('Error fetching appointment suggestions:', err);
      setError(err.message || 'Failed to fetch suggestions.');
      toast({
        variant: 'destructive',
        title: 'Error de la IA',
        description: 'No se pudieron calcular los horarios. Por favor, inténtalo de nuevo.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [serviceId, stylistId, preferredDate, enabled, toast]);

  useEffect(() => {
    if (enabled) {
      // fetchSuggestions();
    }
  }, [fetchSuggestions, enabled]);
  
  const refetch = () => {
      // fetchSuggestions();
  };

  return { suggestions, isLoading, error, refetch };
}

    