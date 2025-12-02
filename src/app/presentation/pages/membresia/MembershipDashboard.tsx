import React, { useState } from 'react';
import { toast } from 'react-toastify';

// Shadcn UI components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';

// Lucide icons
import { Copy, Share2, DollarSign, Users, TrendingUp } from 'lucide-react';

interface ReferralStats {
    totalReferrals: number;
    totalEarnings: string;
    membershipPaid: boolean;
    currentLevel: number;
    percentageEarned: string;
}

interface Referral {
    id: number;
    name: string;
    date: string;
    level: number;
    commission: string;
    status: string;
}

export default function MembershipDashboard(): React.ReactElement {
    const [referralLink] = useState<string>('https://mabs.com/ref/ABC123');
    const [referralCode] = useState<string>('MABS-ABC123');

    // Datos de ejemplo
    const referralStats: ReferralStats = {
        totalReferrals: 15,
        totalEarnings: '450,000',
        membershipPaid: true,
        currentLevel: 2,
        percentageEarned: '5%'
    };

    const referralList: Referral[] = [
        { id: 1, name: 'Juan Pérez', date: '2023-11-01', level: 0, commission: '25%', status: 'Activo' },
        { id: 2, name: 'María García', date: '2023-11-02', level: 1, commission: '5%', status: 'Activo' },
        { id: 3, name: 'Carlos Ruiz', date: '2023-11-05', level: 0, commission: '25%', status: 'Inactivo' },
        { id: 4, name: 'Ana López', date: '2023-11-10', level: 1, commission: '5%', status: 'Activo' },
    ];

    const handleCopy = (text: string, type: string): void => {
        const tempInput = document.createElement('textarea');
        tempInput.value = text;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        toast.success(`${type} copiado al portapapeles`);
    };

    const handleCopyLink = (): void => handleCopy(referralLink, 'Enlace');
    const handleCopyCode = (): void => handleCopy(referralCode, 'Código');

    const handleShare = (): void => {
        if (navigator.share) {
            navigator.share({
                title: 'Únete a Mabs',
                text: '¡Únete a Mabs con mi código de referido!',
                url: referralLink
            });
        } else {
            toast.info('La función de compartir nativa no está disponible en este navegador.');
        }
    };

    return (
        <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header Section - Dashboard style */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground">
                        Mi Programa de Membresía
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Gestiona tus referidos y ganancias
                    </p>
                </div>

                {/* --- SECCIÓN PRINCIPAL DE HERRAMIENTAS Y ESTADÍSTICAS --- */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Columna Izquierda (Enlaces y Códigos) - Sin bordes */}
                    <Card className="shadow-sm border-0 bg-card">
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold">
                                Herramientas de Referido
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Enlace de Referido */}
                            <div className="space-y-2">
                                <Label htmlFor="referral-link" className="text-sm font-medium">
                                    Enlace de Referido
                                </Label>
                                <div className="relative flex items-center">
                                    <Input
                                        id="referral-link"
                                        value={referralLink}
                                        readOnly
                                        className="pr-20 font-mono text-sm bg-muted/30 border-muted"
                                    />
                                    <div className="absolute right-1 flex space-x-1">
                                        <Button
                                            onClick={handleCopyLink}
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                            title="Copiar Enlace"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            onClick={handleShare}
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                            title="Compartir"
                                        >
                                            <Share2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Código de Descuento */}
                            <div className="space-y-2">
                                <Label htmlFor="referral-code" className="text-sm font-medium">
                                    Código de Descuento
                                </Label>
                                <div className="relative flex items-center">
                                    <Input
                                        id="referral-code"
                                        value={referralCode}
                                        readOnly
                                        className="pr-12 font-mono text-sm font-semibold bg-muted/30 border-muted"
                                    />
                                    <Button
                                        onClick={handleCopyCode}
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-1 h-8 w-8 text-muted-foreground hover:text-foreground"
                                        title="Copiar Código"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Columna Derecha (Resumen de Referidos) - Sin bordes */}
                    <Card className="shadow-sm border-0 bg-card">
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                <Users className="w-5 h-5 text-primary" /> Resumen
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-3 border-b border-border/40">
                                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                        <Users className="w-4 h-4" />
                                        Total de Referidos
                                    </div>
                                    <span className="text-lg font-semibold text-foreground">
                                        {referralStats.totalReferrals}
                                    </span>
                                </div>
                                
                                <div className="flex justify-between items-center py-3 border-b border-border/40">
                                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                        <DollarSign className="w-4 h-4" />
                                        Ganancias Totales
                                    </div>
                                    <span className="text-lg font-bold text-primary">
                                        COP ${referralStats.totalEarnings}
                                    </span>
                                </div>
                                
                                <div className="flex justify-between items-center py-3 border-b border-border/40">
                                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                        <TrendingUp className="w-4 h-4" />
                                        Nivel Actual
                                    </div>
                                    <span className="text-lg font-semibold text-foreground">
                                        Generación {referralStats.currentLevel}
                                    </span>
                                </div>
                                
                                <div className="flex justify-between items-center py-3">
                                    <span className="text-sm font-medium text-muted-foreground">
                                        Porcentaje de Ganancia
                                    </span>
                                    <span className="text-lg font-bold text-green-600">
                                        {referralStats.percentageEarned}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* --- TABLA DE REFERIDOS DETALLADA --- */}
                <Card className="shadow-sm border-0 bg-card">
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold">
                            Mis Referidos Directos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                                        <TableHead className="font-semibold">Nombre</TableHead>
                                        <TableHead className="font-semibold">Fecha</TableHead>
                                        <TableHead className="font-semibold">Generación</TableHead>
                                        <TableHead className="font-semibold">Comisión</TableHead>
                                        <TableHead className="font-semibold">Estado</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {referralList.map((referral) => (
                                        <TableRow key={referral.id} className="hover:bg-muted/30">
                                            <TableCell className="font-medium">{referral.name}</TableCell>
                                            <TableCell className="text-muted-foreground">{referral.date}</TableCell>
                                            <TableCell>Nivel {referral.level}</TableCell>
                                            <TableCell className="font-semibold text-primary">{referral.commission}</TableCell>
                                            <TableCell>
                                                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                                                    referral.status === 'Activo' 
                                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                                                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                                }`}>
                                                    {referral.status}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
