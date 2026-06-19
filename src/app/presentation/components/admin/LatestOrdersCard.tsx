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

    const getStatusColor = (status: string): string => {
        switch (status.toLowerCase()) {
            case 'pendiente':
                return 'bg-secondary/20 text-secondary-foreground';
            case 'completado':
                return 'bg-primary/10 text-primary';
            default:
                return 'bg-muted text-muted-foreground';
        }
    };

    return (
        <Card className="rounded-xl p-6 shadow-sm border-0 bg-card h-full flex flex-col" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-primary">{title}</h3>
                <Button 
                    onClick={handleViewAll}
                    variant="default"
                    className="font-bold rounded-lg text-sm shadow-none"
                >
                    Ir a Pedidos
                </Button>
            </div>
            
            <div className="flex-1 overflow-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/40">
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
                                        variant="outline"
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
