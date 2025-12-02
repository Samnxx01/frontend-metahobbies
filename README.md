# MABS Frontend - Sistema de Comercio Electrónico

Este es el frontend del proyecto MABS, una aplicación web moderna para comercio electrónico especializada en productos de belleza y maquillaje. El proyecto está construido con React, TypeScript y Vite, utilizando un conjunto robusto de herramientas modernas para ofrecer una experiencia de usuario fluida y escalable.

## Tecnologías Principales

### Core
- **React 19.2** - Biblioteca principal para construir la interfaz de usuario
- **TypeScript 5.9** - Tipado estático para mayor seguridad y mantenibilidad del código
- **Vite** - Herramienta de desarrollo ultrarrápida y bundler optimizado
- **React Router DOM 7.9** - Manejo de rutas y navegación en la aplicación

### Sistema de Diseño
- **Tailwind CSS 3.4** - Framework de utilidades CSS para estilos rápidos y consistentes
- **Shadcn UI** - Colección de componentes accesibles y personalizables construidos sobre Radix UI
  - Componentes incluidos: Avatar, Dialog, Dropdown Menu, Label, Select, Separator, Slot, Switch, Tabs, Button, Card, Input, Badge, y más
- **Lucide React** - Biblioteca de iconos moderna y ligera
- **class-variance-authority** - Gestión de variantes de componentes
- **tailwind-merge & clsx** - Utilidades para combinar clases de Tailwind de manera inteligente

### Gestión de Estado y Datos
- **Context API** - Gestión de estado global a través de providers personalizados
- **LocalStorage** - Persistencia de sesión y datos del carrito
- **Bearer Token** - Sistema de autenticación mediante tokens JWT almacenados en localStorage

### Formularios y Validación
- **React Hook Form 7.66** - Gestión eficiente de formularios con mínimos re-renders
- **Zod 4.1** - Validación de schemas con TypeScript-first
- **@hookform/resolvers** - Integración entre React Hook Form y Zod

### Notificaciones y Alertas
- **SweetAlert2 11.26** - Modales y alertas elegantes y personalizables
  - Implementamos un wrapper personalizado para soporte de tema claro/oscuro
  - Estilos dinámicos que se adaptan automáticamente al tema activo
- **React Toastify 11.0** - Notificaciones tipo toast para feedback rápido al usuario

### Comunicación en Tiempo Real
- **Socket.io Client 4.8** - WebSockets para funcionalidades en tiempo real
  - Notificaciones instantáneas
  - Actualización de estados en vivo

### Temas
- **next-themes** - Gestión de tema claro/oscuro con persistencia automática
- Sistema de variables CSS dinámicas para cambio de tema fluido
- Paleta de colores personalizada (Tickle Me Pink, Sunset, Blush, Raspberry Rose)

## Estructura del Proyecto

```
src/
├── app/
│   ├── hooks/              # Custom hooks (useMembership, useUsers)
│   ├── presentation/       # Capa de presentación
│   │   ├── components/     # Componentes reutilizables
│   │   │   ├── about/      # Componentes de "Sobre Nosotros"
│   │   │   ├── admin/      # Componentes del panel administrativo
│   │   │   ├── affiliate/  # Componentes del programa de afiliados
│   │   │   ├── common/     # Componentes comunes (Button, Card, Input, etc.)
│   │   │   ├── footer/     # Footer responsive con newsletter
│   │   │   ├── hero/       # Banner principal
│   │   │   ├── membership/ # Componentes de membresía
│   │   │   └── navbar/     # Navegación principal con tema
│   │   ├── layouts/        # Layouts principales (Admin, Auth, Public)
│   │   └── pages/          # Páginas de la aplicación
│   │       ├── admin/      # Dashboard y gestión administrativa
│   │       ├── carrito/    # Carrito de compras
│   │       ├── checkout/   # Proceso de pago
│   │       ├── home/       # Página principal
│   │       ├── login/      # Autenticación
│   │       ├── perfil/     # Perfil de usuario
│   │       └── productos/  # Catálogo de productos
│   ├── providers/          # Context Providers
│   │   ├── AuthProvider.tsx       # Gestión de autenticación
│   │   ├── CartProvider.tsx       # Estado del carrito
│   │   ├── LoadingProvider.tsx    # Estados de carga
│   │   └── MembershipProvider.tsx # Gestión de membresías
│   ├── router/             # Configuración de rutas
│   │   ├── LayoutRoutes.jsx       # Rutas con layouts
│   │   ├── MembershipRoutes.jsx   # Rutas de membresía
│   │   └── PrivateRoute.jsx       # Protección de rutas
│   └── services/           # Servicios de API
│       ├── adminService.js        # Servicios administrativos
│       ├── api.js                 # Configuración base de axios
│       ├── authService.js         # Autenticación y autorización
│       ├── clientService.js       # Servicios del cliente
│       ├── membershipService.js   # Gestión de membresías
│       └── routeService.js        # Utilidades de rutas
├── assets/                 # Recursos estáticos
├── components/ui/          # Componentes Shadcn UI
├── data/                   # Datos de ejemplo
├── lib/                    # Utilidades
│   ├── sweetalert.ts      # Wrapper de SweetAlert con soporte de temas
│   └── utils.js           # Funciones auxiliares
├── socket/                 # Configuración de Socket.io
└── types/                  # Definiciones de TypeScript
```

## Características Principales

### Sistema de Autenticación
- Login y registro de usuarios
- Autenticación basada en JWT (Bearer Token)
- Tokens almacenados en localStorage
- Rutas protegidas con validación de roles (ADMIN, CLIENTE)
- Refresh automático de sesión
- Logout con limpieza completa de datos

### Gestión de Carrito
- Carrito persistente en localStorage
- Añadir/eliminar productos con confirmación (SweetAlert2)
- Actualización de cantidades en tiempo real
- Cálculo automático de totales
- Integración con sistema de colores de productos
- Vista previa en dropdown del navbar

### Panel Administrativo
- Dashboard con KPIs y estadísticas
- Gestión de usuarios (CRUD completo)
- Gestión de productos y categorías
- Gestión de pedidos
- Configuración del sistema
- Tabla de datos con paginación y búsqueda

### Sistema de Temas
- Modo claro y oscuro
- Toggle de tema en navbar (desktop y móvil)
- Persistencia de preferencia del usuario
- Variables CSS dinámicas con HSL
- SweetAlert2 adaptado al tema activo
- Componentes Shadcn UI totalmente compatibles

### Experiencia de Usuario
- Diseño responsive mobile-first
- Animaciones suaves con Tailwind CSS
- Notificaciones toast para feedback inmediato
- Modales elegantes con SweetAlert2
- Loading states en operaciones asíncronas
- Navegación intuitiva con indicadores visuales

### Perfil de Usuario
- Edición de información personal
- Gestión de direcciones de envío
- Subida de foto de perfil
- Historial de pedidos
- Gestión de membresía
- Formularios no controlados con refs para mejor rendimiento

## Instalación y Configuración

### Requisitos Previos
- Node.js 18+ 
- npm o yarn

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/Samnxx01/mabs-frontend.git

# Navegar al directorio
cd mabs-frontend

# Instalar dependencias
npm install
```

### Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

### Ejecutar en Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

### Build para Producción

```bash
npm run build
```

Los archivos optimizados se generarán en la carpeta `dist/`

### Preview de Producción

```bash
npm run preview
```

## Arquitectura de Autenticación

### Flujo de Login
1. Usuario ingresa credenciales
2. Se envía petición POST a `/auth/login`
3. Backend responde con token JWT y datos del usuario
4. Token se almacena en localStorage como `token`
5. Datos del usuario se guardan en Context API
6. Todas las peticiones subsecuentes incluyen el header `Authorization: Bearer {token}`

### Interceptor de Axios
```javascript
// Configuración automática del Bearer Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Protección de Rutas
Las rutas privadas verifican:
- Existencia de token en localStorage
- Usuario válido en AuthContext
- Rol apropiado para acceso (ADMIN para rutas administrativas)

## SweetAlert2 Personalizado

Implementamos un wrapper para SweetAlert2 que detecta automáticamente el tema activo:

```typescript
// lib/sweetalert.ts
export const swalFire = (options: SweetAlertOptions) => {
  const currentTheme = document.documentElement.classList.contains('dark') 
    ? 'dark' 
    : 'light';
  
  const themeStyles = getThemeStyles(currentTheme);
  return Swal.fire({ ...options, ...themeStyles });
};
```

Esto asegura que todos los modales de confirmación se vean correctamente en ambos temas.

## Shadcn UI

Los componentes de Shadcn UI están configurados con un sistema de variables CSS que permite personalización total:

- Paleta de colores personalizada (primary, secondary, muted, destructive)
- Componentes accesibles y conformes a ARIA
- Totalmente tipados con TypeScript
- Estilos consistentes con Tailwind CSS
- Variantes oscuras automáticas

## Scripts Disponibles

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build de producción
npm run preview  # Preview del build
npm run lint     # Verificar código con ESLint
```

## Contribución

Para contribuir al proyecto:

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Añadir nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## Convenciones de Código

- Componentes en PascalCase
- Archivos de servicios en camelCase
- Uso de TypeScript para nuevos componentes
- Props interfaces definidas para todos los componentes
- Comentarios en español para mejor comprensión del equipo

## Soporte y Contacto

Para preguntas o soporte, contacta al equipo de desarrollo.

---

**Desarrollado con dedicación para ofrecer la mejor experiencia en comercio electrónico de productos de belleza.**
