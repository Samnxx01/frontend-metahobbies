import React from 'react';
import { ArrowUpRight, Check, Gem, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

type PricingPlan = {
    name: string;
    tagline: string;
    price: string;
    prefix?: string;
    cta: string;
    featured?: boolean;
    accent: string;
    bullets: string[];
};

const PRICING_PLANS: PricingPlan[] = [
    {
        name: 'Gratis',
        tagline: 'Ideal para empezar y explorar la plataforma.',
        price: '$ 0',
        cta: 'Empezar Gratis',
        accent: 'from-slate-50 to-white',
        bullets: [
            'Acceso basico al panel de membresia',
            'Seguimiento limitado de progreso',
            'Soporte por ayuda guiada',
            'Contenido esencial para nuevos usuarios',
            '1 perfil activo por cuenta',
        ],
    },
    {
        name: 'Go',
        tagline: 'Mas capacidad para crecer tus ventas mes a mes.',
        price: '$ 29.900',
        cta: 'Elegir Go',
        accent: 'from-warning/10 to-white',
        bullets: [
            'Todo lo del plan Gratis',
            'Mas accesos y mas cargas mensuales',
            'Panel de comisiones ampliado',
            'Historial de actividad extendido',
            'Prioridad media en soporte',
        ],
    },
    {
        name: 'Plus',
        tagline: 'Pensado para quienes quieren escalar de verdad.',
        price: '$ 89.900',
        cta: 'Elegir Plus',
        featured: true,
        accent: 'from-destructive/10 to-white',
        bullets: [
            'Todo lo del plan Go',
            'Automatizaciones y reportes premium',
            'Mayor velocidad en flujos operativos',
            'Herramientas avanzadas de analitica',
            'Soporte preferencial y recursos premium',
        ],
    },
    {
        name: 'Pro',
        tagline: 'Maxima potencia para equipos y operaciones grandes.',
        prefix: 'Desde',
        price: '$ 169.900',
        cta: 'Elegir Pro',
        accent: 'from-info/10 to-white',
        bullets: [
            'Todo lo del plan Plus',
            'Multiples usuarios y permisos avanzados',
            'Procesos masivos y tableros ejecutivos',
            'Integraciones y capacidad extendida',
            'Acompanamiento prioritario especializado',
        ],
    },
];

function PricingCard({ plan }: { plan: PricingPlan }): React.ReactElement {
    return (
        <article
            className={[
                'relative flex h-full flex-col rounded-[28px] border bg-gradient-to-b p-6 shadow-sm transition-all duration-300',
                plan.featured
                    ? 'border-destructive/30 shadow-destructive/80 ring-1 ring-destructive/20'
                    : 'border-slate-200 hover:-translate-y-1 hover:shadow-lg',
                plan.accent,
            ].join(' ')}
        >
            {plan.featured ? (
                <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full bg-destructive px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                    <Sparkles className="h-3.5 w-3.5" />
                    Recomendado
                </div>
            ) : (
                <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                    <Gem className="h-3.5 w-3.5" />
                    Membresia
                </div>
            )}

            <div className="mb-8 space-y-3">
                <div>
                    <h2 className="text-4xl font-semibold tracking-tight text-slate-950">{plan.name}</h2>
                    <p className="mt-2 max-w-xs text-base leading-7 text-slate-600">{plan.tagline}</p>
                </div>

                <div className="pt-4">
                    {plan.prefix ? (
                        <p className="mb-1 text-sm font-medium uppercase tracking-[0.18em] text-slate-500">{plan.prefix}</p>
                    ) : null}
                    <div className="flex items-end gap-2">
                        <span className="text-5xl font-semibold tracking-tight text-slate-950">{plan.price}</span>
                        <span className="pb-1 text-sm font-medium text-slate-500">/mes</span>
                    </div>
                </div>
            </div>

            <Button
                className={[
                    'mb-8 h-12 rounded-full text-base font-semibold',
                    plan.featured ? 'bg-destructive hover:bg-destructive' : 'bg-slate-950 hover:bg-slate-800',
                ].join(' ')}
            >
                {plan.cta}
                <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>

            <div className="border-t border-slate-200/80 pt-6">
                <ul className="space-y-4">
                    {plan.bullets.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                            <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white">
                                <Check className="h-3.5 w-3.5" />
                            </span>
                            <span>{bullet}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </article>
    );
}

export default function MembershipPricingShowcase(): React.ReactElement {
    return (
        <div className="min-h-screen bg-[linear-gradient(180deg,#fff_0%,#fff7f3_46%,#ffffff_100%)] text-slate-950">
            <section className="mx-auto max-w-7xl px-6 pb-20 pt-16 md:px-10 md:pb-24 md:pt-24">
                <div className="mx-auto mb-16 max-w-3xl text-center md:mb-20">
                    <div className="mb-5 inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 shadow-sm">
                        Membresias
                    </div>
                    <h1 className="text-5xl font-semibold tracking-tight text-slate-950 md:text-7xl">
                        Planes listos para crecer contigo
                    </h1>
                    <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600 md:text-xl">
                        Una vista estilo pricing, con datos quemados, para presentar los niveles de membresia de forma clara, elegante y facil de comparar.
                    </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-4">
                    {PRICING_PLANS.map((plan) => (
                        <PricingCard key={plan.name} plan={plan} />
                    ))}
                </div>
            </section>
        </div>
    );
}
