import { useState } from 'react';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';

// Shadcn UI components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator'; // Reemplaza Divider de MUI

// Lucide icons
import { Plus, Search, Eye, Trash2, Hash } from 'lucide-react';

const orders = [
    {
        id: '#10ba538b', quantity: 3, date: '10 de nov de 2022', address: 'Kelly Williams 777 Brockton Avenue, Abington MA 2351', total: 350.00, status: 'Pendiente',
        items: [
            { name: 'Budi 2011', price: 226.00, quantity: 4, properties: 'Negro, L' },
            { name: 'Resla 2015', price: 101.00, quantity: 4, properties: 'Negro, L' },
            { name: 'Xursche 2018', price: 241.00, quantity: 4, properties: 'Negro, L' }
        ], shipping: 10, discount: 0, note: 'Please deliver ASAP!', paymentMethod: 'Pagado con tarjeta de crédito/débito'
    },
    { id: '#1f110985b', quantity: 3, date: '10 de nov de 2022', address: 'Kelly Williams 777 Brockton Avenue, Abington MA 2351', total: 500.00, status: 'Procesado', items: [] },
    { id: '#6d54d506', quantity: 3, date: '22 de dic de 2020', address: 'Kelly Williams 777 Brockton Avenue, Abington MA 2351', total: 700.00, status: 'Entregado', items: [] },
    { id: '#753deee0', quantity: 3, date: '14 de dic de 2020', address: 'Kelly Williams 777 Brockton Avenue, Abington MA 2351', total: 300.00, status: 'Cancelado', items: [] },
    { id: '#63d35462', quantity: 3, date: '20 de nov de 2020', address: 'Kelly Williams 777 Brockton Avenue, Abington MA 2351', total: 700.00, status: 'Entregado', items: [] }
];

const ORDER_STATUSES = ['Pendiente', 'Procesado', 'Entregado', 'Cancelado'];

export default function Pedidos() {
    const [search, setSearch] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [currentOrders, setCurrentOrders] = useState(orders);

    // Función para manejar el color del estado (usando clases de Tailwind)
    const getStatusClasses = (status) => {
        switch (status) {
            case 'Pendiente':
                return 'bg-blue-100 text-blue-600 border border-blue-200 hover:bg-blue-200';
            case 'Procesado':
                return 'bg-amber-100 text-amber-600 border border-amber-200 hover:bg-amber-200';
            case 'Entregado':
                return 'bg-green-100 text-green-600 border border-green-200 hover:bg-green-200';
            case 'Cancelado':
                return 'bg-red-100 text-red-600 border border-red-200 hover:bg-red-200';
            default:
                return 'bg-gray-100 text-gray-600';
        }
    };

    const handleViewOrder = (order) => {
        setSelectedOrder(order);
        setOpenDialog(true);
    };

    const handleStatusChange = (orderId, newStatus) => {
        setCurrentOrders(prevOrders =>
            prevOrders.map(order =>
                order.id === orderId ? { ...order, status: newStatus } : order
            )
        );
        setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null); // Actualiza el modal
        toast.success(`Estado del pedido ${orderId} actualizado a: ${newStatus}`);
    };

    // Simulación de eliminación de pedido
    const handleDeleteOrder = (order) => {
        Swal.fire({
            title: '¿Eliminar pedido?',
            text: `Estás a punto de eliminar el pedido ${order.id}. ¿Confirmas la acción?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                setCurrentOrders(prev => prev.filter(o => o.id !== order.id));
                toast.success(`Pedido ${order.id} eliminado.`);
            }
        });
    };

    const filteredOrders = currentOrders.filter(
        order => order.id.toLowerCase().includes(search.toLowerCase()) ||
            order.address.toLowerCase().includes(search.toLowerCase())
    );

    // --- Contenido del Modal de Detalles ---
    const renderOrderDetails = () => {
        if (!selectedOrder) return null;

        const subtotal = selectedOrder.items?.reduce((acc, item) => acc + (item.price * item.quantity), 0) || 0;

        return (
            <div className="flex flex-col gap-6 p-4">

                {/* Encabezado y Selector de Estado */}
                <div className="flex justify-between items-center pb-2 border-b border-border">
                    <div className="flex items-center space-x-2">
                        <Hash className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-semibold text-muted-foreground">Pedido: {selectedOrder.id}</span>
                    </div>

                    {/* Selector de Estado - Reemplaza MUI Select */}
                    <div className="flex items-center gap-2">
                        <Label htmlFor="status-select" className="text-sm font-medium">Estado:</Label>
                        <Select
                            value={selectedOrder.status}
                            onValueChange={(newStatus) => handleStatusChange(selectedOrder.id, newStatus)}
                        >
                            <SelectTrigger id="status-select" className={`w-[140px] h-9 ${getStatusClasses(selectedOrder.status)} text-sm font-semibold`}>
                                <SelectValue placeholder={selectedOrder.status} />
                            </SelectTrigger>
                            <SelectContent>
                                {ORDER_STATUSES.map(status => (
                                    <SelectItem key={status} value={status} className={`text-sm ${getStatusClasses(status)} hover:${getStatusClasses(status)}`}>
                                        {status}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Información Principal: Productos y Resumen */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* Columna 1: Lista de Productos */}
                    <div className="md:col-span-2 border rounded-lg p-4 bg-muted/20">
                        <h4 className="text-lg font-semibold mb-3">Productos ({selectedOrder.items?.length || 0})</h4>
                        {selectedOrder.items && selectedOrder.items.length > 0 ? (
                            <Table>
                                <TableBody>
                                    {selectedOrder.items.map((item, index) => (
                                        <TableRow key={index} className="hover:bg-transparent">
                                            <TableCell className="font-medium text-sm">
                                                {item.name}
                                                <p className="text-xs text-muted-foreground">{item.properties}</p>
                                            </TableCell>
                                            <TableCell className="text-right text-sm">
                                                ${item.price.toFixed(2)} x {item.quantity}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <p className="text-sm text-muted-foreground">Detalle de productos no disponible.</p>
                        )}
                    </div>

                    {/* Columna 2: Resumen de Totales */}
                    <div className="md:col-span-1 space-y-3 p-4 border rounded-lg bg-card shadow-sm">
                        <h4 className="text-lg font-semibold mb-2">Resumen de Pago</h4>

                        <div className="flex justify-between text-sm">
                            <p className="text-muted-foreground">Subtotal:</p>
                            <p className="font-medium">${subtotal.toFixed(2)}</p>
                        </div>
                        <div className="flex justify-between text-sm">
                            <p className="text-muted-foreground">Envío:</p>
                            <p className="font-medium">${selectedOrder.shipping?.toFixed(2) || 0.00}</p>
                        </div>
                        <div className="flex justify-between text-sm">
                            <p className="text-muted-foreground">Descuento:</p>
                            <p className="font-medium text-destructive">-${selectedOrder.discount?.toFixed(2) || 0.00}</p>
                        </div>

                        <Separator className="my-2" /> {/* Reemplaza Divider */}

                        <div className="flex justify-between text-lg font-bold">
                            <p>Total:</p>
                            <p className="text-primary">${selectedOrder.total?.toFixed(2) || 0.00}</p>
                        </div>
                    </div>
                </div>

                {/* Información Adicional */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
                    <div className="space-y-1">
                        <h5 className="text-sm font-semibold">Método de Pago</h5>
                        <p className="text-sm text-muted-foreground">{selectedOrder.paymentMethod || 'N/A'}</p>
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                        <h5 className="text-sm font-semibold">Dirección de Envío</h5>
                        <p className="text-sm text-muted-foreground">{selectedOrder.address}</p>
                    </div>
                    <div className="space-y-1 sm:col-span-3">
                        <h5 className="text-sm font-semibold">Nota del Cliente</h5>
                        <p className="text-sm text-muted-foreground italic">{selectedOrder.note || 'Sin notas'}</p>
                    </div>
                </div>

            </div>
        );
    }


    return (
        <div className="p-4 md:p-6 lg:p-8"> {/* Reemplaza Box sx={{ p: 3 }} */}

            {/* Header y Botón de Acción */}
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                    Gestión de Órdenes
                </h1>
                <Button
                    className="flex items-center gap-2 rounded-lg"
                >
                    <Plus className="h-5 w-5" />
                    Crear Pedido
                </Button>
            </div>

            {/* Buscador */}
            <div className="mb-6 max-w-lg">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        fullWidth
                        placeholder="Buscar por ID de pedido o dirección..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 h-10 rounded-lg shadow-sm"
                    />
                </div>
            </div>

            {/* Tabla de órdenes - Reemplaza TableContainer y Paper */}
            <div className="rounded-lg border shadow-sm overflow-x-auto bg-card">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead className="w-[120px]">ID del Pedido</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Dirección de Envío</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Acción</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredOrders.map((order) => (
                            <TableRow key={order.id} className="hover:bg-accent/50">
                                <TableCell className="font-mono text-xs text-muted-foreground">{order.id}</TableCell>
                                <TableCell className="text-sm">{order.date}</TableCell>
                                <TableCell className="text-xs max-w-[200px] truncate">{order.address}</TableCell>
                                <TableCell className="font-bold text-primary">${order.total.toFixed(2)}</TableCell>
                                <TableCell>
                                    <Badge
                                        className={`text-xs font-semibold ${getStatusClasses(order.status)}`}
                                        variant="outline"
                                    >
                                        {order.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right space-x-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-secondary hover:bg-secondary/10"
                                        onClick={() => handleViewOrder(order)}
                                    >
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                        onClick={() => handleDeleteOrder(order)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Paginación simple */}
            <div className="flex justify-center mt-6">
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" className="w-10 h-10 rounded-full">&lt;</Button>
                    <Button className="w-10 h-10 rounded-full font-bold" variant="default">1</Button>
                    <Button variant="outline" size="icon" className="w-10 h-10 rounded-full">&gt;</Button>
                </div>
            </div>

            {/* Modal de detalles del pedido - Reemplaza MUI Dialog */}
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogContent className="sm:max-w-3xl"> {/* sm:max-w-3xl reemplaza maxWidth="md" */}
                    <DialogHeader>
                        <DialogTitle>
                            Detalles de la Orden
                        </DialogTitle>
                    </DialogHeader>
                    {renderOrderDetails()}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenDialog(false)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}