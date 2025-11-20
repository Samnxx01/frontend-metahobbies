const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const getAuthorizedRoutes = async () => {
    const user = JSON.parse(localStorage.getItem('user'));

    if (user?.role === 'ADMIN' || user?.role === 'DESARROLLADOR') {
        return {
            adminRoutes: [
                { path: 'dashboard', component: 'DashboardAdmin' },
                { path: 'productos', component: 'GestionProductos' },
                { path: 'categorias', component: 'GestionCategorias' },
                { path: 'usuarios', component: 'GestionUsuarios' },
                { path: 'pedidos', component: 'PedidosAdmin' },
                { path: 'configuracion', component: 'ConfiguracionAdmin' }
            ]
        };
    }

    return []; // Para usuarios no admin, retornamos un array vacío
};