import React from 'react';
import Inventario from './Inventario';

/**
 * Entrada de ruta dinámica: el nombre del archivo coincide con el componente de pestaña
 * (`./components/InventarioOrdenComprasTab`) para rutas de seguridad que ya apuntan a
 * "InventarioOrdenComprasTab". Aquí se monta siempre el módulo completo con datos y la pestaña activa.
 */
export default function InventarioOrdenComprasTab(): React.ReactElement {
  return <Inventario initialActiveTab="orden-compras" />;
}
