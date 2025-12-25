'use client';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardDescription, CardFooter, CardTitle } from '@/components/ui/card';
import { Flower2, Phone, Mail, MapPin } from 'lucide-react';
import Image from 'next/image';
import { Logo } from '@/components/icons';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import PublicBookingForm from '@/components/public/public-booking-form';
import UserAuth from '@/components/public/user-auth';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection } from 'firebase/firestore';
import { useFirestore, useMemoFirebase } from '@/firebase';
import type { GalleryImage } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { ServicesProvider, useServices } from '@/hooks/use-services';
import { StylistsProvider, useStylists } from '@/hooks/use-stylists';

function HomePageContent() {
    const firestore = useFirestore();
    const { services, isLoading: isLoadingServices } = useServices();
    const { stylists, isLoading: isLoadingStylists } = useStylists();
    
    const galleryCollection = useMemoFirebase(() => firestore ? collection(firestore, 'gallery') : null, [firestore]);
    const { data: galleryImages, isLoading: isLoadingGallery } = useCollection<GalleryImage>(galleryCollection);

    const [isClient, setIsClient] = React.useState(false);

    React.useEffect(() => {
        setIsClient(true);
    }, []);

    const isLoading = isLoadingServices || isLoadingStylists || isLoadingGallery;

  return (
    <>
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
        <Link href="#" className="flex items-center gap-2 font-semibold">
          <Logo />
          <div className="flex flex-col">
            <h1 className="font-headline text-lg font-semibold leading-tight tracking-tight">
              Divas A&A
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
        {isClient ? <UserAuth services={services || []} stylists={stylists || []} /> : <Skeleton className="h-10 w-28" />}
      </header>
      <main>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <section id="hero" className="relative h-[60vh] w-full">
                <Image 
                    src="https://picsum.photos/seed/hero/1200/800" 
                    alt="Salón de belleza Divas A&A" 
                    fill
                    priority
                    className="object-cover"
                    data-ai-hint="beauty salon interior"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center">
                    <h2 className="font-headline text-5xl font-bold tracking-tighter sm:text-6xl md:text-7xl">
                    Realza tu Belleza Natural
                    </h2>
                    <p className="mx-auto max-w-[700px] text-foreground/80 md:text-xl">
                    En Divas A&A, combinamos arte y experiencia para ofrecerte un servicio excepcional.
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
                <div className="mx-auto max-w-3xl space-y-4 text-center">
                  <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                    Nuestros Servicios
                  </h2>
                  <p className="text-foreground/80 md:text-xl/relaxed">
                    Descubre la gama de tratamientos que hemos diseñado para ti.
                  </p>
                </div>
                <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {isLoading ? Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-60 w-full" />) : (services || []).map((service) => (
                    <Card key={service.id} className="flex flex-col text-left transition-transform hover:scale-105 hover:shadow-lg">
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
                    <div className="mx-auto max-w-3xl space-y-4 text-center">
                        <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                            Conoce a Nuestro Equipo
                        </h2>
                        <p className="text-foreground/80 md:text-xl/relaxed">
                            Manos expertas dedicadas a realzar tu belleza.
                        </p>
                    </div>
                    <div className="mx-auto mt-12 flex max-w-4xl flex-wrap justify-center gap-8">
                        {isLoading ? Array.from({length: 4}).map((_, i) => <div key={i} className="flex flex-col items-center gap-4"><Skeleton className="h-40 w-40 rounded-full" /><Skeleton className="h-6 w-24" /></div>) : (stylists || []).map((stylist) => (
                            <div key={stylist.id} className="group relative flex flex-col items-center text-center w-40">
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
                <div className="mx-auto max-w-3xl space-y-4 text-center">
                  <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                    Galería de Estilos
                  </h2>
                  <p className="text-foreground/80 md:text-xl/relaxed">
                    Inspírate con algunos de nuestros trabajos.
                  </p>
                </div>
                <div className="mx-auto mt-12 grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-3">
                    {isLoading ? Array.from({length: 6}).map((_, i) => <Skeleton key={i} className="aspect-video w-full rounded-lg" />) : (galleryImages || []).map(img => (
                        <div key={img.id} className="group relative rounded-lg group-hover:z-10">
                          <Image 
                              src={img.src} 
                              alt={img.alt} 
                              width={600} 
                              height={400} 
                              className="h-full w-full object-cover transition-transform group-hover:scale-110 rounded-lg aspect-video"
                              data-ai-hint={img.hint}
                          />
                        </div>
                    ))}
                </div>
              </div>
            </section>

            <section id="agendar" className="w-full bg-muted/40 py-12 md:py-24 lg:py-32">
                <div className="container px-4 md:px-6">
                    {isClient ? <PublicBookingForm services={services || []} stylists={stylists || []} /> : <Skeleton className="h-96 w-full" />}
                </div>
            </section>

            <section id="contacto" className="w-full border-t bg-card py-12 md:py-24 lg:py-32">
              <div className="container grid items-center gap-8 px-4 md:px-6 lg:grid-cols-2 lg:gap-16">
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
                            <p className="text-muted-foreground">contacto@divasA&A.com</p>
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
        </div>
      </main>
      <footer className="w-full shrink-0 border-t py-6 px-4 md:px-6">
        <div className="container flex flex-col items-center justify-center gap-2 sm:flex-row sm:justify-between">
          <p className="flex-1 text-center text-xs text-muted-foreground sm:text-left">
            &copy; 2025 SarriaTech Solutions S.A.S. Todos los derechos reservados.
          </p>
          <nav className="flex gap-4 sm:gap-6">
            <Button variant="outline" size="sm" asChild>
              <Link href="/login">Admin Login</Link>
            </Button>
          </nav>
        </div>
      </footer>
    </>
  );
}

export default function HomePage() {
    return (
      <div className='bg-background font-sans'>
        <StylistsProvider>
            <ServicesProvider>
                <HomePageContent />
            </ServicesProvider>
        </StylistsProvider>
      </div>
    )
}
