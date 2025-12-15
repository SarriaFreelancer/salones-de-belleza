import type { Service, Stylist, Appointment } from './types';

export const services: Service[] = [
  { id: '1', name: 'Corte Diva', description: 'Corte de cabello personalizado con lavado y secado.', price: 25.00, duration: 60 },
  { id: '2', name: 'Manicura Clásica', description: 'Limado, cutículas y esmaltado tradicional.', price: 15.00, duration: 30 },
  { id: '3', name: 'Pedicura Spa', description: 'Pedicura completa con exfoliación, masaje y esmaltado.', price: 30.00, duration: 60 },
  { id: '4', name: 'Tinte Completo', description: 'Aplicación de color en todo el cabello.', price: 50.00, duration: 120 },
  { id: '5', name: 'Mechas Balayage', description: 'Técnica de coloración a mano alzada para un look natural.', price: 75.00, duration: 180 },
  { id: '6', name: 'Facial Hidratante', description: 'Tratamiento facial para restaurar la hidratación de la piel.', price: 40.00, duration: 60 },
];

export const stylists: Stylist[] = [
  { 
    id: '1', 
    name: 'Ana', 
    avatarUrl: 'https://picsum.photos/seed/stylist1/100/100', 
    availability: {
      monday: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '18:00' }],
      tuesday: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '18:00' }],
      wednesday: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '18:00' }],
      thursday: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '18:00' }],
      friday: [{ start: '10:00', end: '19:00' }],
      saturday: [{ start: '10:00', end: '16:00' }],
    } 
  },
  { 
    id: '2', 
    name: 'Sofía', 
    avatarUrl: 'https://picsum.photos/seed/stylist2/100/100', 
    availability: {
      monday: [{ start: '09:00', end: '17:00' }],
      tuesday: [{ start: '09:00', end: '17:00' }],
      wednesday: [{ start: '09:00', end: '17:00' }],
      thursday: [{ start: '09:00', end: '17:00' }],
      friday: [{ start: '09:00', end: '17:00' }],
    } 
  },
  { 
    id: '3', 
    name: 'Carla', 
    avatarUrl: 'https://picsum.photos/seed/stylist3/100/100', 
    availability: {
      wednesday: [{ start: '10:00', end: '14:00' }, { start: '15:00', end: '19:00' }],
      thursday: [{ start: '10:00', end: '14:00' }, { start: '15:00', end: '19:00' }],
      friday: [{ start: '10:00', end: '14:00' }, { start: '15:00', end: '19:00' }],
      saturday: [{ start: '10:00', end: '18:00' }],
    } 
  },
  { 
    id: '4', 
    name: 'Lucía', 
    avatarUrl: 'https://picsum.photos/seed/stylist4/100/100', 
    availability: {
      monday: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '18:00' }],
      tuesday: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '18:00' }],
      saturday: [{ start: '09:00', end: '15:00' }],
    } 
  },
];

const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

const setTimeToDate = (date: Date, time: string) => {
  const newDate = new Date(date);
  const [hours, minutes] = time.split(':').map(Number);
  newDate.setHours(hours, minutes, 0, 0);
  return newDate;
}

export const appointments: Appointment[] = [
  { 
    id: '1', 
    customerName: 'Elena García', 
    serviceId: '1', 
    stylistId: '1', 
    start: setTimeToDate(today, '10:00'),
    end: setTimeToDate(today, '11:00'),
    status: 'confirmed' 
  },
  { 
    id: '2', 
    customerName: 'Laura Martínez', 
    serviceId: '2', 
    stylistId: '2', 
    start: setTimeToDate(today, '11:30'),
    end: setTimeToDate(today, '12:00'),
    status: 'confirmed' 
  },
  { 
    id: '3', 
    customerName: 'Isabel Sánchez', 
    serviceId: '5', 
    stylistId: '3', 
    start: setTimeToDate(today, '15:00'),
    end: setTimeToDate(today, '18:00'),
    status: 'scheduled' 
  },
  { 
    id: '4', 
    customerName: 'María Rodríguez', 
    serviceId: '3', 
    stylistId: '1', 
    start: setTimeToDate(tomorrow, '09:00'),
    end: setTimeToDate(tomorrow, '10:00'),
    status: 'confirmed' 
  },
    { 
    id: '5', 
    customerName: 'Carmen Lopez', 
    serviceId: '6', 
    stylistId: '4', 
    start: setTimeToDate(today, '14:00'),
    end: setTimeToDate(today, '15:00'),
    status: 'cancelled' 
  },
];
