import { useState } from 'react';
import { toast } from 'react-toastify';

// Shadcn UI components
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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

export default function MembershipDashboard() {
    const [referralLink] = useState('https://mabs.com/ref/ABC123');
    const [referralCode] = useState('MABS-ABC123');

    // Datos de ejemplo
    const referralStats = {
        totalReferrals: 15,
        totalEarnings: '450,000',
        membershipPaid: true,
        currentLevel: 2,
        percentageEarned: '5%'
    };

    const referralList = [
        { id: 1, name: 'Juan Pérez', date: '2023-11-01', level: 0, commission: '25%', status: 'Activo' },
        { id: 2, name: 'María García', date: '2023-11-02', level: 1, commission: '5%', status: 'Activo' },
        { id: 3, name: 'Carlos Ruiz', date: '2023-11-05', level: 0, commission: '25%', status: 'Inactivo' },
        { id: 4, name: 'Ana López', date: '2023-11-10', level: 1, commission: '5%', status: 'Activo' },
    ];

    // Reemplaza navigator.clipboard.writeText por document.execCommand('copy') por si se usa en un entorno iframe
    const handleCopy = (text, type) => {
        const tempInput = document.createElement('textarea');
        tempInput.value = text;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        toast.success(`${type} copiado al portapapeles`);
    };

    const handleCopyLink = () => handleCopy(referralLink, 'Enlace');
    const handleCopyCode = () => handleCopy(referralCode, 'Código');

    const handleShare = () => {
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
        <div className="container max-w-7xl mx-auto py-8 px-4"> {/* Reemplaza Container maxWidth="lg" */}

            {/* Header Section */}
            <h1 className="text-2xl md:text-3xl font-bold mb-6 text-foreground">
                Mi Programa de Membresía
            </h1>

            {/* --- SECCIÓN PRINCIPAL DE HERRAMIENTAS Y ESTADÍSTICAS --- */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8"> {/* Reemplaza Grid container spacing={3} */}

                {/* Columna Izquierda (Enlaces y Códigos) */}
                <div className="md:col-span-6">
                    <Card className="shadow-lg border rounded-xl h-full p-6">
                        <h2 className="text-xl font-semibold mb-4">
                            Herramientas de Referido
                        </h2>

                        {/* Enlace de Referido */}
                        <div className="mb-6 space-y-2">
                            <Label htmlFor="referral-link" className="text-sm">Enlace de Referido</Label>
                            <div className="relative flex items-center">
                                <Input
                                    id="referral-link"
                                    value={referralLink}
                                    readOnly
                                    className="pr-20 font-mono text-sm bg-muted/50"
                                />
                                <div className="absolute right-0 flex space-x-1 pr-1">
                                    <Button
                                        onClick={handleCopyLink}
                                        variant="ghost"
                                        size="icon"
                                        className="w-8 h-8 text-muted-foreground hover:text-primary"
                                        title="Copiar Enlace"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        onClick={handleShare}
                                        variant="ghost"
                                        size="icon"
                                        className="w-8 h-8 text-muted-foreground hover:text-primary"
                                        title="Compartir"
                                    >
                                        <Share2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Código de Descuento */}
                        <div className="space-y-2">
                            <Label htmlFor="referral-code" className="text-sm">Código de Descuento</Label>
                            <div className="relative flex items-center">
                                <Input
                                    id="referral-code"
                                    value={referralCode}
                                    readOnly
                                    className="pr-12 font-mono text-sm font-semibold bg-muted/50"
                                />
                                <Button
                                    onClick={handleCopyCode}
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 w-10 h-10 text-muted-foreground hover:text-primary"
                                    title="Copiar Código"
                                >
                                    <Copy className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Columna Derecha (Resumen de Referidos) */}
                <div className="md:col-span-6">
                    <Card className="shadow-lg border rounded-xl h-full p-6">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <Users className="w-5 h-5 text-primary" /> Resumen
                        </h2>

                        {/* Tabla de Estadísticas - Reemplaza TableContainer */}
                        <div className="border rounded-lg overflow-hidden">
                            <Table className="w-full">
                                <TableBody>
                                    <TableRow className="hover:bg-transparent">
                                        <TableCell className="font-medium text-sm w-1/2 flex items-center gap-2">
                                            <Users className="w-4 h-4 text-muted-foreground" /> Total de Referidos
                                        </TableCell>
                                        <TableCell className="text-right font-semibold w-1/2">{referralStats.totalReferrals}</TableCell>
                                    </TableRow>
                                    <TableRow className="hover:bg-transparent">
                                        <TableCell className="font-medium text-sm flex items-center gap-2">
                                            <DollarSign className="w-4 h-4 text-muted-foreground" /> Ganancias Totales
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-primary">COP ${referralStats.totalEarnings}</TableCell>
                                    </TableRow>
                                    <TableRow className="hover:bg-transparent">
                                        <TableCell className="font-medium text-sm flex items-center gap-2">
                                            <TrendingUp className="w-4 h-4 text-muted-foreground" /> Nivel Actual
                                        </TableCell>
                                        <TableCell className="text-right font-semibold">Generación {referralStats.currentLevel}</TableCell>
                                    </TableRow>
                                    <TableRow className="hover:bg-transparent">
                                        <TableCell className="font-medium text-sm">Porcentaje de Ganancia</TableCell>
                                        <TableCell className="text-right font-bold text-green-600">{referralStats.percentageEarned}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </div>
            </div>

            {/* --- TABLA DE REFERIDOS DETALLADA --- */}
            <Card className="shadow-lg border rounded-xl p-6"> {/* Reemplaza Paper */}
                <h2 className="text-xl font-semibold mb-4">
                    Mis Referidos Directos
                </h2>

                {/* Tabla de Referidos */}
                <div className="rounded-lg border overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="w-[150px]">Nombre</TableHead>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Generación</TableHead>
                                <TableHead>Comisión</TableHead>
                                <TableHead>Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {referralList.map((referral) => (
                                <TableRow key={referral.id} className="hover:bg-accent/50">
                                    <TableCell className="font-medium text-sm">{referral.name}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{referral.date}</TableCell>
                                    <TableCell className="text-sm">Nivel {referral.level}</TableCell>
                                    <TableCell className="font-semibold text-primary">{referral.commission}</TableCell>
                                    <TableCell>
                                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${referral.status === 'Activo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {referral.status}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    );
}