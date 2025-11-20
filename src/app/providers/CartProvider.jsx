import { createContext, useContext, useState, useMemo } from 'react';

const CartContext = createContext(null);

export function useCart() {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}

export default function CartProvider({ children }) {
    const [cartItems, setCartItems] = useState([]);

    const addToCart = (product, quantity) => {
        setCartItems(prevItems => {
            const existingItem = prevItems.find(item => item.id === product.id && item.color?.pantone === product.color?.pantone);

            if (existingItem) {
                return prevItems.map(item =>
                    item.id === product.id && item.color?.pantone === product.color?.pantone
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            } else {
                return [...prevItems, { ...product, quantity }];
            }
        });
        console.log('Producto agregado:', { ...product, quantity });
    };

    const removeFromCart = (productId, colorPantone) => {
        setCartItems(prevItems =>
            prevItems.filter(item => !(item.id === productId && item.color?.pantone === colorPantone))
        );
    };

    const updateQuantity = (productId, colorPantone, newQuantity) => {
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

    const cartTotal = useMemo(() =>
        cartItems.reduce((total, item) => total + (item.price * item.quantity), 0),
        [cartItems]
    );

    const totalItems = useMemo(() =>
        cartItems.reduce((total, item) => total + item.quantity, 0),
        [cartItems]
    );

    const value = {
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartTotal,
        totalItems,
    };

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
}
