
'use client';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardDescription, CardFooter, CardTitle } from '@/components/ui/card';
import { useServices } from '@/hooks/use-services';
import { useStylists } from '@/hooks/use-stylists';
import { useGallery } from '@/hooks/use-gallery';
import { Flower2, Phone, Mail, MapPin } from 'lucide-react';
import Image from 'next/image';
import { Logo } from '@/components/icons';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import PublicBookingForm from '@/components/public/public-booking-form';


export default function HomePage() {
    const { services } = useServices();
    const { stylists } = useStylists();
    const { galleryImages } = useGallery();

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
          <Link href="#equipo" className="text-foreground/70 transition-colors hover:text-foreground">
            Equipo
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
            Agenda tu Cita
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

        <section id="equipo" className="w-full bg-muted/40 py-12 md:py-24 lg:py-32">
            <div className="container px-4 md:px-6">
                <div className="mx-auto flex max-w-5xl flex-col items-center justify-center space-y-4 text-center">
                    <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                        Conoce a Nuestro Equipo
                    </h2>
                    <p className="text-foreground/80 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                        Manos expertas dedicadas a realzar tu belleza.
                    </p>
                </div>
                <div className="mx-auto mt-12 grid grid-cols-2 gap-6 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4">
                    {stylists.map((stylist) => (
                        <div key={stylist.id} className="group relative flex flex-col items-center text-center">
                            <Avatar className="h-40 w-40 border-4 border-background shadow-lg transition-transform group-hover:scale-105">
                                <AvatarImage src={stylist.avatarUrl} alt={stylist.name} data-ai-hint="woman portrait" />
                                <AvatarFallback>{stylist.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <h3 className="font-headline mt-4 text-xl font-semibold">{stylist.name}</h3>
                            <p className="text-sm text-muted-foreground">Estilista Experta</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        <section id="galeria" className="w-full py-12 md:py-24 lg:py-32">
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
                    <Image 
                        key={img.id}
                        src={img.src} 
                        alt={img.alt} 
                        width={600} 
                        height={400} 
                        className="overflow-hidden rounded-lg h-full w-full object-cover transition-transform hover:scale-110"
                        data-ai-hint={img.hint}
                    />
                ))}
            </div>
          </div>
        </section>

        <section id="agendar" className="w-full bg-muted/40 py-12 md:py-24 lg:py-32">
            <div className="container px-4 md:px-6">
                 <PublicBookingForm />
            </div>
        </section>

        <section id="contacto" className="w-full border-t bg-card py-12 md:py-24 lg:py-32">
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
      <footer className="w-full shrink-0 border-t py-6 px-4 md:px-6">
        <div className="flex flex-col items-center justify-center gap-2 sm:flex-row sm:justify-between">
          <p className="flex-1 text-center text-xs text-muted-foreground">
            &copy; 2024 Divas AyA. Todos los derechos reservados.
          </p>
          <nav className="flex gap-4 sm:gap-6">
            <Button variant="outline" size="sm" asChild>
              <Link href="/login">Admin Login</Link>
            </Button>
          </nav>
        </div>
      </footer>
    </div>
  );
}
