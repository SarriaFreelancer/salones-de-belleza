import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ClientOnly from '@/components/client-only';
import BookingForm from '@/components/public/booking-form';
import { services } from '@/lib/data';
import { Sparkles, Flower2, Phone, Mail, MapPin } from 'lucide-react';
import Image from 'next/image';
import { Logo } from '@/components/icons';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const galleryImages = [
  { id: 1, src: 'https://picsum.photos/seed/gallery1/600/400', alt: 'Peinado profesional', hint: 'woman hairstyle' },
  { id: 2, src: 'https://picsum.photos/seed/gallery2/600/400', alt: 'Manicura detallada', hint: 'manicure nails' },
  { id: 3, src: 'https://picsum.photos/seed/gallery3/600/400', alt: 'Tratamiento facial relajante', hint: 'facial treatment' },
  { id: 4, src: 'https://picsum.photos/seed/gallery4/600/400', alt: 'Pedicura spa', hint: 'pedicure spa' },
  { id: 5, src: 'https://picsum.photos/seed/gallery5/600/400', alt: 'Corte de cabello moderno', hint: 'haircut style' },
  { id: 6, src: 'https://picsum.photos/seed/gallery6/600/400', alt: 'Diseño de uñas creativo', hint: 'nail art' },
];

function HomePageContent() {
  return (
    <div className="flex min-h-dvh w-full flex-col">
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
        <Link href="#" className="flex items-center gap-2 font-semibold">
          <Logo />
          <div className="flex flex-col">
            <h1 className="font-headline text-lg font-semibold leading-tight tracking-tight">
              Divas AyA
            </h1>
            <p className="text-xs text-muted-foreground">Salón de Belleza</p>
          </div>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          <Link href="#servicios" className="text-foreground/70 transition-colors hover:text-foreground">
            Servicios
          </Link>
          <Link href="#galeria" className="text-foreground/70 transition-colors hover:text-foreground">
            Galería
          </Link>
          <Link href="#contacto" className="text-foreground/70 transition-colors hover:text-foreground">
            Contacto
          </Link>
        </nav>
        <Button asChild>
            <Link href="#agendar">
              Agende su Cita
            </Link>
        </Button>
      </header>
      <main className="flex-1">
        <section id="hero" className="relative h-[60vh] w-full">
            <Image 
                src="https://picsum.photos/seed/hero/1200/800" 
                alt="Salón de belleza Divas AyA" 
                fill
                className="object-cover"
                data-ai-hint="beauty salon interior"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
            <div className="relative z-10 flex h-full flex-col items-center justify-center text-center">
                <h2 className="font-headline text-5xl font-bold tracking-tighter sm:text-6xl md:text-7xl">
                Realza tu Belleza Natural
                </h2>
                <p className="mx-auto max-w-[700px] text-foreground/80 md:text-xl">
                En Divas AyA, combinamos arte y experiencia para ofrecerte un servicio excepcional.
                </p>
                <Button asChild size="lg" className="mt-6">
                    <Link href="#agendar">
                        Reserva Ahora
                    </Link>
                </Button>
            </div>
        </section>

        <section id="servicios" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="mx-auto flex max-w-5xl flex-col items-center justify-center space-y-4 text-center">
              <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                Nuestros Servicios
              </h2>
              <p className="text-foreground/80 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Descubre la gama de tratamientos que hemos diseñado para ti.
              </p>
            </div>
            <div className="mx-auto mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <Card key={service.id} className="flex flex-col transition-transform hover:scale-105 hover:shadow-lg">
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
          </div>
        </section>

        <section id="galeria" className="w-full bg-muted/40 py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="mx-auto flex max-w-5xl flex-col items-center justify-center space-y-4 text-center">
              <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                Galería de Estilos
              </h2>
              <p className="text-foreground/80 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Inspírate con algunos de nuestros trabajos.
              </p>
            </div>
            <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {galleryImages.map(img => (
                    <div key={img.id} className="overflow-hidden rounded-lg">
                        <Image 
                            src={img.src} 
                            alt={img.alt} 
                            width={600} 
                            height={400} 
                            className="h-full w-full object-cover transition-transform hover:scale-110"
                            data-ai-hint={img.hint}
                        />
                    </div>
                ))}
            </div>
          </div>
        </section>

        <section id="agendar" className="w-full py-12 md:py-24 lg:py-32">
            <div className="container px-4 md:px-6">
                 <Card className="mx-auto max-w-2xl">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-2 flex items-center justify-center rounded-full bg-primary/10 p-3">
                        <Sparkles className="h-8 w-8 text-primary" />
                        </div>
                        <CardTitle className="font-headline text-3xl">Agende su Cita</CardTitle>
                        <CardDescription>
                        Utilice nuestro asistente de IA para encontrar el momento perfecto para su próximo tratamiento.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <BookingForm />
                    </CardContent>
                </Card>
            </div>
        </section>

        <section id="contacto" className="w-full border-t bg-muted/40 py-12 md:py-24 lg:py-32">
          <div className="container grid items-center justify-center gap-8 px-4 md:px-6 lg:grid-cols-2 lg:gap-16">
            <div className="space-y-4">
              <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                Ponte en Contacto
              </h2>
              <p className="max-w-[600px] text-foreground/80 md:text-xl/relaxed">
                ¿Tienes alguna pregunta? Envíanos un mensaje o llámanos. Estamos aquí para ayudarte.
              </p>
              <div className="space-y-4 pt-4">
                 <div className="flex items-center gap-4">
                    <div className="rounded-full bg-primary/10 p-3">
                        <Phone className="h-6 w-6 text-primary"/>
                    </div>
                    <div>
                        <h3 className="font-semibold">Teléfono</h3>
                        <p className="text-muted-foreground">+1 (555) 123-4567</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-4">
                    <div className="rounded-full bg-primary/10 p-3">
                        <Mail className="h-6 w-6 text-primary"/>
                    </div>
                    <div>
                        <h3 className="font-semibold">Correo Electrónico</h3>
                        <p className="text-muted-foreground">contacto@divasaya.com</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-4">
                    <div className="rounded-full bg-primary/10 p-3">
                        <MapPin className="h-6 w-6 text-primary"/>
                    </div>
                    <div>
                        <h3 className="font-semibold">Dirección</h3>
                        <p className="text-muted-foreground">123 Calle Belleza, Ciudad Hermosa, CP 12345</p>
                    </div>
                 </div>
              </div>
            </div>
            <div className="flex flex-col items-start space-y-4">
                <form className="w-full space-y-4">
                    <Input placeholder="Nombre" name="name" className="h-12"/>
                    <Input type="email" placeholder="Correo Electrónico" name="email" className="h-12"/>
                    <Textarea placeholder="Tu Mensaje" name="message" rows={5}/>
                    <Button type="submit" size="lg">Enviar Mensaje</Button>
                </form>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">&copy; 2024 Divas AyA. Todos los derechos reservados.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link href="/dashboard" className="text-xs hover:underline underline-offset-4 text-muted-foreground">
            Admin Login
          </Link>
        </nav>
      </footer>
    </div>
  );
}


export default function HomePage() {
  return (
    <ClientOnly>
      <HomePageContent />
    </ClientOnly>
  );
}