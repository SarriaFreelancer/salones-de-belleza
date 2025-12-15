import { services } from '@/lib/data';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Flower2 } from 'lucide-react';

export default function ServicesPage() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {services.map((service) => (
        <Card key={service.id} className="flex flex-col">
          <CardHeader>
            <div className="flex items-start justify-between">
              <CardTitle className="font-headline text-xl">{service.name}</CardTitle>
              <Flower2 className="h-5 w-5 text-primary" />
            </div>
            <CardDescription>{service.duration} min</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <p className="text-sm text-muted-foreground">{service.description}</p>
          </CardContent>
          <CardFooter>
            <div className="text-lg font-semibold text-foreground">
              ${service.price.toFixed(2)}
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
