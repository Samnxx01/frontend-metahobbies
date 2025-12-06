
export const getAuthorizedRoutes = async () => {
    const userJson = localStorage.getItem('user');
    const user = userJson ? JSON.parse(userJson) : null;

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