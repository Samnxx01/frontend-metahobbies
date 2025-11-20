import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2'; // Mantenemos Swal para el diálogo de confirmación
import { useCart } from '../../../providers/CartProvider'; // Ruta ajustada
import { useAuth } from '../../../providers/AuthProvider'; // Ruta ajustada

// Shadcn UI components
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Reemplaza MUI Alert

// Lucide icons
import { Trash2, Minus, Plus, ArrowLeft, ShoppingCart, Info } from 'lucide-react';

const SHIPPING_FEE = 5.99;

export default function Carrito() {
    const { cartItems, removeFromCart, updateQuantity, cartTotal } = useCart();
    const { user } = useAuth();
    const navigate = useNavigate();
    const subtotal = cartTotal;
    const total = subtotal + (cartItems.length > 0 ? SHIPPING_FEE : 0);

    // --- Handlers de Funcionalidad ---

    const handleQuantityChange = (item, newQuantity) => {
        if (newQuantity < 1) return;
        updateQuantity(item.id, item.color?.pantone, newQuantity);
        toast.success('Cantidad actualizada', { autoClose: 1000 });
    };

    const handleRemoveItem = async (item) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: "¿Deseas eliminar este producto del carrito?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            removeFromCart(item.id, item.color?.pantone);
            toast.success('Producto eliminado del carrito');
        }
    };

    const handleProceedToCheckout = async () => {
        if (!user) {
            const result = await Swal.fire({
                title: 'Iniciar Sesión Requerido',
                text: 'Necesitas iniciar sesión para continuar con la compra.',
                icon: 'info',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Ir a Login',
                cancelButtonText: 'Cancelar'
            });

            if (result.isConfirmed) {
                navigate('/login', { state: { returnUrl: '/checkout' } });
            }
            return;
        }

        navigate('/checkout');
    };

    const handleContinueShopping = () => {
        navigate('/productos');
    };

    // --- Renderizado de Item del Carrito ---
    const CartItem = ({ item }) => (
        <div
            key={item.id}
            className="p-4 flex items-start sm:items-center gap-4 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors"
        >
            {/* Imagen */}
            <img
                src={item.image}
                alt={item.name}
                className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/80x80/f3f4f6/a3a3a3?text=IMG"; }}
            />

            {/* Detalles del Producto */}
            <div className="flex-1 space-y-1 sm:space-y-0 sm:flex sm:justify-between sm:items-center">
                <div>
                    <h3 className="text-base font-semibold">{item.name}</h3>
                    <p className="text-sm text-muted-foreground">Tono: {item.color?.name || 'N/A'}</p>
                </div>

                {/* Controles y Precios (Apilado en móvil) */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-2 sm:mt-0">

                    {/* Control de Cantidad */}
                    <div className="flex items-center border border-input rounded-md">
                        <Button
                            onClick={() => handleQuantityChange(item, item.quantity - 1)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-r-none"
                        >
                            <Minus className="h-4 w-4" />
                        </Button>
                        <span className="px-3 text-sm font-semibold min-w-[30px] text-center">{item.quantity}</span>
                        <Button
                            onClick={() => handleQuantityChange(item, item.quantity + 1)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-l-none"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Precio Total y Botón de Eliminar */}
                    <div className="flex items-center gap-2">
                        <p className="text-base font-bold w-16 text-right">
                            ${(item.price * item.quantity).toFixed(2)}
                        </p>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10 h-8 w-8"
                            onClick={() => handleRemoveItem(item)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );


    return (
        <div className="container max-w-7xl mx-auto py-8 px-4"> {/* Reemplaza Container maxWidth="lg" */}

            {/* Encabezado */}
            <div className="flex items-center gap-3 mb-8 border-b pb-4">
                <Button variant="ghost" size="icon" onClick={handleContinueShopping}>
                    <ArrowLeft className="w-5 h-5 text-foreground" />
                </Button>
                <h1 className="text-2xl md:text-3xl font-bold">
                    Carrito de Compras
                </h1>
            </div>

            {/* Contenido principal */}
            {cartItems.length === 0 ? (
                <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-700"> {/* Reemplaza MUI Alert */}
                    <Info className="h-4 w-4" />
                    <AlertTitle>Carrito Vacío</AlertTitle>
                    <AlertDescription>
                        Tu carrito está vacío. ¡Agrega algunos productos para comenzar tu compra!
                    </AlertDescription>
                </Alert>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8"> {/* Reemplaza Grid container spacing={3} */}

                    {/* Columna Izquierda: Items del Carrito */}
                    <div className="md:col-span-8">
                        <Card className="shadow-lg border rounded-xl overflow-hidden">
                            <CardContent className="p-0">
                                {cartItems.map((item) => (
                                    <CartItem key={item.id + item.color?.pantone} item={item} />
                                ))}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Columna Derecha: Resumen */}
                    <div className="md:col-span-4">
                        <Card className="shadow-xl border rounded-xl sticky top-8"> {/* Reemplaza Paper y position: 'sticky' */}
                            <CardContent className="p-6">
                                <h2 className="text-xl font-semibold mb-4 border-b pb-3">
                                    Resumen de la Orden
                                </h2>

                                <div className="flex flex-col gap-3 text-sm mb-6">

                                    <div className="flex justify-between">
                                        <p className="text-muted-foreground">Subtotal</p>
                                        <p className="font-medium">${subtotal.toFixed(2)}</p>
                                    </div>

                                    <div className="flex justify-between">
                                        <p className="text-muted-foreground">Envío</p>
                                        <p className="font-medium">
                                            {cartItems.length > 0 ? `$${SHIPPING_FEE.toFixed(2)}` : 'Gratis'}
                                        </p>
                                    </div>

                                    <Separator className='mt-2' />

                                    <div className="flex justify-between pt-2">
                                        <p className="text-lg font-bold">Total</p>
                                        <p className="text-lg font-bold text-primary">
                                            ${total.toFixed(2)}
                                        </p>
                                    </div>
                                </div>

                                <Button
                                    onClick={handleProceedToCheckout}
                                    className="w-full h-12 text-base font-semibold mb-3"
                                    disabled={cartItems.length === 0}
                                >
                                    Proceder al Pago
                                </Button>

                                <Button
                                    variant="outline"
                                    onClick={handleContinueShopping}
                                    className="w-full h-12 text-base"
                                >
                                    Continuar Comprando
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}