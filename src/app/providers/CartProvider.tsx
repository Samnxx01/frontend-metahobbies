import { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import type { Product, CartItem, ProductId, CartSummary } from '../../types/common';

// Cart context interface
interface CartContextType {
    cartItems: CartItem[];
    addToCart: (product: Product, quantity: number) => void;
    removeFromCart: (productId: ProductId, colorPantone?: string) => void;
    updateQuantity: (productId: ProductId, colorPantone: string | undefined, newQuantity: number) => void;
    clearCart: () => void;
    cartSummary: CartSummary;
    getItemCount: (productId: ProductId, colorPantone?: string) => number;
    isInCart: (productId: ProductId, colorPantone?: string) => boolean;
}

interface CartProviderProps {
    children: ReactNode;
}

const CartContext = createContext<CartContextType | null>(null);

export function useCart(): CartContextType {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}

export default function CartProvider({ children }: CartProviderProps) {
    const [cartItems, setCartItems] = useState<CartItem[]>([]);

    const addToCart = (product: Product, quantity: number) => {
        setCartItems(prevItems => {
            const existingItem = prevItems.find(
                item => item.id === product.id && item.color?.pantone === product.color?.pantone
            );

            if (existingItem) {
                return prevItems.map(item =>
                    item.id === product.id && item.color?.pantone === product.color?.pantone
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            } else {
                const cartItem: CartItem = {
                    ...product,
                    quantity,
                    addedAt: new Date().toISOString()
                };
                return [...prevItems, cartItem];
            }
        });
        console.log('Producto agregado:', { ...product, quantity });
    };

    const removeFromCart = (productId: ProductId, colorPantone?: string) => {
        setCartItems(prevItems =>
            prevItems.filter(item => 
                !(item.id === productId && item.color?.pantone === colorPantone)
            )
        );
    };

    const updateQuantity = (productId: ProductId, colorPantone: string | undefined, newQuantity: number) => {
        if (newQuantity <= 0) {
            removeFromCart(productId, colorPantone);
        } else {
            setCartItems(prevItems =>
                prevItems.map(item =>
                    item.id === productId && item.color?.pantone === colorPantone
                        ? { ...item, quantity: newQuantity }
                        : item
                )
            );
        }
    };

    const clearCart = () => {
        setCartItems([]);
    };

    const getItemCount = (productId: ProductId, colorPantone?: string): number => {
        const item = cartItems.find(
            item => item.id === productId && item.color?.pantone === colorPantone
        );
        return item ? item.quantity : 0;
    };

    const isInCart = (productId: ProductId, colorPantone?: string): boolean => {
        return cartItems.some(
            item => item.id === productId && item.color?.pantone === colorPantone
        );
    };

    const cartSummary = useMemo((): CartSummary => {
        const subtotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
        const totalItems = cartItems.reduce((total, item) => total + item.quantity, 0);
        const tax = subtotal * 0.19; // 19% IVA en Colombia
        const shipping = subtotal > 100000 ? 0 : 15000; // Envío gratis para compras mayores a $100,000
        const total = subtotal + tax + shipping;

        return {
            totalItems,
            subtotal,
            tax,
            shipping,
            total
        };
    }, [cartItems]);

    const value: CartContextType = {
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartSummary,
        getItemCount,
        isInCart,
    };

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
}
