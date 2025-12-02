import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { LatestOrdersCardProps } from '@/types/components';

export default function LatestOrdersCard({ orders, title = "Últimos Pedidos", onViewAll }: LatestOrdersCardProps): React.ReactElement {
    const handleViewAll = (): void => {
        if (onViewAll) {
            onViewAll();
        }
    };

    const getStatusVariant = (status: string) => {
        switch (status.toLowerCase()) {
            case 'pendiente':
                return 'secondary';
            case 'completado':
                return 'default';
            default:
                return 'outline';
        }
    };

    const getStatusColor = (status: string): string => {
        switch (status.toLowerCase()) {
            case 'pendiente':
                return 'bg-yellow-100 text-yellow-800';
            case 'completado':
                return 'bg-green-100 text-green-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <Card className="rounded-xl p-6 shadow-sm border-0 bg-white h-full flex flex-col" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-pink-600">{title}</h3>
                <Button 
                    onClick={handleViewAll}
                    className="bg-pink-100 text-pink-600 hover:bg-pink-200 font-bold rounded-lg text-sm shadow-none"
                    variant="secondary"
                >
                    Ir a Pedidos
                </Button>
            </div>
            
            <div className="flex-1 overflow-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50">
                            <TableHead className="font-semibold">ID PEDIDO</TableHead>
                            <TableHead className="font-semibold">CLIENTE</TableHead>
                            <TableHead className="font-semibold">TOTAL</TableHead>
                            <TableHead className="font-semibold">ESTADO</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orders.map((order) => (
                            <TableRow key={order.id}>
                                <TableCell className="font-medium">{order.id}</TableCell>
                                <TableCell>{order.customer}</TableCell>
                                <TableCell>${order.amount.toLocaleString()}</TableCell>
                                <TableCell>
                                    <Badge 
                                        variant={getStatusVariant(order.status)}
                                        className={`font-semibold rounded-sm ${getStatusColor(order.status)}`}
                                    >
                                        {order.status}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </Card>
    );
}