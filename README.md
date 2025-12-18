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
│   ├── hooks/              # Custom hooks
│   │   ├── useMembership.ts        # Gestión de membresías
│   │   ├── useMembershipForm.ts    # Formulario de membresía (3 pasos)
│   │   ├── useMembershipPaymentForm.ts # Lógica de pago con métodos múltiples
│   │   ├── useReferralLink.ts      # Links de referido
│   │   └── useUsers.ts             # Gestión de usuarios
│   ├── presentation/       # Capa de presentación
│   │   ├── components/     # Componentes reutilizables
│   │   │   ├── about/      # Componentes de "Sobre Nosotros"
│   │   │   ├── admin/      # Componentes del panel administrativo
│   │   │   ├── affiliate/  # Componentes del programa de afiliados
│   │   │   ├── common/     # Componentes comunes (Button, Card, Input, etc.)
│   │   │   ├── footer/     # Footer responsive con newsletter
│   │   │   ├── hero/       # Banner principal
│   │   │   ├── membership/ # Componentes de membresía con MembershipStepContent
│   │   │   └── navbar/     # Navegación principal con tema
│   │   ├── layouts/        # Layouts principales (Admin, Auth, Public)
│   │   └── pages/          # Páginas de la aplicación
│   │       ├── admin/      # Dashboard y gestión administrativa
│   │       ├── carrito/    # Carrito de compras
│   │       ├── checkout/   # Proceso de pago
│   │       ├── home/       # Página principal
│   │       ├── login/      # Autenticación
│   │       ├── membresia/  # Flujo de membresía
│   │       │   ├── MembershipPayment.tsx  # Página principal (3 pasos)
│   │       │   └── MembershipDashboard.tsx # Dashboard de referidos
│   │       ├── perfil/     # Perfil de usuario
│   │       └── productos/  # Catálogo de productos
│   ├── providers/          # Context Providers
│   │   ├── AuthProvider.tsx       # Gestión de autenticación
│   │   ├── CartProvider.tsx       # Estado del carrito
│   │   ├── LoadingProvider.tsx    # Estados de carga
│   │   └── MembershipProvider.tsx # Gestión de membresías
│   ├── router/             # Configuración de rutas
│   │   ├── LayoutRoutes.jsx       # Rutas con layouts
│   │   ├── MembershipRoutes.jsx   # Rutas parametrizadas de membresía
│   │   └── PrivateRoute.jsx       # Protección de rutas
│   ├── services/           # Servicios de API
│   │   ├── adminService.ts        # Servicios administrativos
│   │   ├── api.ts                 # Configuración base con interceptores
│   │   ├── authService.ts         # Autenticación y autorización
│   │   ├── clientService.ts       # Servicios del cliente
│   │   ├── membershipService.ts   # Gestión de membresías
│   │   ├── postsService.ts        # Servicios de posts
│   │   └── routeService.ts        # Utilidades de rutas
│   └── socket/             # Comunicación WebSocket
│       ├── index.ts        # Inicialización de Socket.io
│       ├── socketEvents.ts # Eventos y listeners
│       ├── socketService.ts # Servicios Socket
│       ├── socketTypes.ts   # Tipos para Socket
│       └── useSocket.ts     # Hook para Socket
├── assets/                 # Recursos estáticos
├── components/
│   ├── common/             # Componentes reutilizables
│   │   ├── CustomStepper.tsx       # Indicador de pasos para membresía
│   │   └── FormField.tsx           # Campo de formulario reutilizable
│   ├── membership/         # Componentes específicos de membresía
│   │   └── MembershipStepContent.tsx # Contenido dinámico de los 3 pasos
│   └── ui/                 # Componentes Shadcn UI
├── data/                   # Datos de ejemplo
│   ├── products.json       # Catálogo de productos
│   └── users.json          # Usuarios de ejemplo
├── lib/                    # Utilidades
│   ├── index.ts           # Exportaciones principales
│   ├── sweetalert.ts      # Wrapper de SweetAlert con soporte de temas
│   ├── utils.ts           # Funciones auxiliares
│   ├── validators.ts      # Validadores compartidos
│   ├── membership/        # Utilidades de membresía
│   │   ├── createMembership.ts
│   │   └── initiateMembershipCheckout.ts
│   ├── wompi/             # Integración con Wompi
│   │   ├── generateCheckout.ts
│   │   └── generateIntegrity.ts
│   └── types/             # Tipos globales
│       ├── common.ts      # Tipos comunes
│       ├── components.ts  # Props de componentes
│       ├── posts.ts       # Tipos de posts
│       ├── wompi.ts       # Tipos de Wompi
│       └── env.d.ts       # Tipos de variables de entorno
├── socket/                 # Configuración de Socket.io (legacy)
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
- Flujo de membresía con tokens de referido

### Sistema de Membresía
- **Flujo completo de membresía con 3 pasos**:
  1. Email - Captura del correo del usuario
  2. Resumen - Información de la membresía a adquirir
  3. Pago - Selección del método de pago con opciones específicas

- **Métodos de pago integrados**:
  - **Nequi**: Validación de número telefónico colombiano (formato: 3XXXXXXXXX)
  - **Tarjeta de Crédito/Débito**: 
    - Tokenización con Wompi
    - Selección de tipo de tarjeta (crédito/débito)
    - Para crédito: selector de cuotas (1, 2, 3, 6, 12)
    - Para débito: 1 cuota automática
  - **PSE (Pago Seguro en Línea)**:
    - Campos requeridos: tipo de persona, tipo de documento, número de documento, banco
    - Campos de contacto: nombre completo, número telefónico
    - Integración con portal de Wompi para redirección

- **Flujo de pago con payment_flow**:
  - API: Para Nequi y Tarjeta
  - CHECKOUT: Para PSE con redirección a Wompi

- **Rutas parametrizadas con tokens de referido**:
  - Ruta: `/membresia/pago/:token`
  - Token extraído del enlace de invitación
  - Validación en cada paso del flujo
  - Bearer token usado en peticiones al backend

- **Dashboard de membresía**:
  - Resumen de referidos y comisiones
  - Tabla de vouchers con filtrado (solo no pendientes)
  - Generación de enlaces y códigos de referido
  - Estadísticas en tiempo real

### Gestión de Carrito
- Carrito persistente en localStorage
- Añadir/eliminar productos con confirmación (SweetAlert2)
- Actualización de cantidades en tiempo real
- Cálculo automático de totales
- Integración con sistema de colores de productos
- Vista previa en dropdown del navbar

### Navegación Principal
- **Navbar responsive** con:
  - Logo y menú de navegación principal
  - Autenticación: botones de login/logout condicionales
  - Búsqueda de productos en tiempo real
  - Selector de tema (claro/oscuro)
  - Carrito con contador de items
  - Acceso a panel administrativo para admins
  - Navegación móvil colapsible

### Panel Administrativo
- Dashboard con KPIs y estadísticas
- Gestión de usuarios (CRUD completo)
- Gestión de productos y categorías
- Gestión de pedidos
- Configuración del sistema
- Tabla de datos con paginación y búsqueda
- Acceso restringido solo para administradores

### Modal de Publicidad Personalizado
- Modal inteligente que se muestra según contexto:
  - Promociones especiales en homepage
  - Ofertas de membresía en páginas de productos
  - Descuentos de referido en páginas de perfil
- Cierre automático con timeout personalizable
- No interfiere con flujos críticos (checkout, login)
- Puede cerrarse manualmente por el usuario
- Integración con sistema de temas

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

## Flujo de Membresía Detallado

### Paso 1: Email
- Solicita el correo del usuario
- Validación de formato de email
- Usuario continúa con el enlace de referido

### Paso 2: Resumen
- Muestra información de la membresía
- Precio total en COP
- Email confirmado del usuario
- Botón para proceder al pago

### Paso 3: Pago
**Métodos disponibles:**

#### 1. Nequi
- Solicita número de teléfono
- Validación: 3XXXXXXXXX (10 dígitos)
- Payment flow: API
- Webhook de confirmación automática

#### 2. Tarjeta de Crédito/Débito
- Selector de tipo: Crédito o Débito
- Si es **Crédito**: 
  - Selector de cuotas (1, 2, 3, 6, 12)
  - Integración con Wompi para tokenización
  - Payment flow: API
- Si es **Débito**: 
  - 1 cuota automática (no mostrar selector)
  - Integración con Wompi para tokenización
  - Payment flow: API

#### 3. PSE
- Campos obligatorios:
  - Tipo de persona (Natural/Jurídica)
  - Tipo de documento (CC/CE/NIT)
  - Número de documento
  - Banco (dropdown con 20+ opciones)
  - **Nombre completo**
  - **Número de teléfono**
- Payment flow: CHECKOUT
- Redirección a portal de Wompi
- Webhook de confirmación

### Estructura del Payload de Pago

#### Para Nequi/Tarjeta (API):
```json
{
  "emailInvitado": "usuario@email.com",
  "payment_flow": "API",
  "payment_method_type": "NEQUI" | "CARD",
  "payment_method": {
    "type": "NEQUI" | "CARD",
    "phone_number": "3145678901",
    "installments": 1,
    "token": "wompi_token_xxxxx"
  }
}
```

#### Para PSE (CHECKOUT):
```json
{
  "emailInvitado": "usuario@email.com",
  "payment_flow": "CHECKOUT",
  "payment_method": {
    "type": "PSE",
    "user_type": 0,
    "user_legal_id_type": "CC",
    "user_legal_id": "1099888777",
    "financial_institution_code": "1007",
    "payment_description": "Membresía Premium - Ref: xxxxx"
  },
  "customer_data": {
    "phone_number": "3145678901",
    "full_name": "Juan Pérez"
  }
}
```

### Rutas Parametrizadas

#### Ruta de Membresía:
```
/membresia/pago/:token
```

- `:token` - Token de referido extraído de `useParams()`
- Validación en cada paso con `validateStep()`
- Token enviado en header `Authorization: Bearer {token}`
- Mensaje de error si token es inválido o vacío

#### Generación de Links:
```
/membresia/pago/0bf719b86d98cdefa34b7b96491ab705...
```

### Dashboard de Membresía

**Ruta:** `/membresia/dashboard`

**Funcionalidades:**
- Resumen de estadísticas (total de vouchers, saldo actual, pagado, pendiente)
- Tabla de vouchers con columnas:
  - Fecha
  - Ciclo
  - Monto
  - Motivo
  - ~~Estado~~ (omitido por requisito)
- Filtrado automático (solo muestra vouchers no pendientes)
- Generación de enlaces de referido
- Copiar código o enlace al portapapeles
- Compartir mediante navegador (si está disponible)
- Recarga de datos en tiempo real

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

## Integración con Wompi

### Wompi API
- **Endpoint de tokenización**: `https://production.wompi.co/v1/tokens/cards`
- **Clave pública**: Almacenada en variable de entorno `VITE_WOMPI_PUBLIC_KEY`
- **Tokens de tarjeta**: Se obtienen antes de enviar al backend
- **Integridad**: Generada con algoritmo SHA-256 desde el backend

### Flujo de Pago:
1. Usuario completa datos de tarjeta
2. Frontend tokeniza con Wompi usando clave pública
3. Backend recibe token + método de pago
4. Backend genera checkout o procesa pago directo
5. Para PSE: redirección a portal de Wompi
6. Para Nequi/Tarjeta: confirmación en modal

## Shadcn UI

Los componentes de Shadcn UI están configurados con un sistema de variables CSS que permite personalización total:

- Paleta de colores personalizada (primary, secondary, muted, destructive)
- Componentes accesibles y conformes a ARIA
- Totalmente tipados con TypeScript
- Estilos consistentes con Tailwind CSS
- Variantes oscuras automáticas

## Scripts Disponibles

```bash
npm run dev      # Servidor de desarrollo (puerto 5173)
npm run build    # Build de producción
npm run preview  # Preview del build
npm run lint     # Verificar código con ESLint
```

## Variables de Entorno Requeridas

```env
# API
VITE_API_BASE_URL=http://localhost:3000/api

# Wompi
VITE_WOMPI_PUBLIC_KEY=pub_prod_xxxxxxxxxxxxxx

# Socket.io (opcional)
VITE_SOCKET_URL=http://localhost:3000
```

## Componentes Clave del Proyecto

### useMembershipPaymentForm Hook
- Gestión completa del formulario de 3 pasos
- Validación por paso
- Manejo de múltiples métodos de pago
- Generación de payloads con `payment_flow`
- Integración con Wompi para tokenización

### MembershipStepContent Componente
- Renderización dinámica de contenido por paso
- Campos específicos por método de pago
- Validación visual y feedback en tiempo real
- Estilos adaptados a tema claro/oscuro

### CustomStepper Componente
- Indicador visual de progreso (3 pasos)
- Navegación entre pasos
- Estados: activo, completado, deshabilitado

## Consideraciones de Desarrollo

### Seguridad
- Tokens JWT almacenados en localStorage (considerar sessionStorage para mayor seguridad)
- Bearer token en header `Authorization` de todas las peticiones
- Validación de roles en rutas protegidas
- Validación de emails antes de procesar

### Performance
- Lazy loading de componentes pesados
- Memoización de componentes frecuentes
- Optimización de imágenes
- Caché de datos del usuario en localStorage

### Mantenibilidad
- TypeScript en todo el proyecto
- Componentes reutilizables con props tipadas
- Servicios centralizados para API
- Documentación en código comentado

### Testing
- Validaciones en frontend antes de enviar
- Mensajes de error específicos por campo
- Toast notifications para feedback
- Modales SweetAlert2 para confirmaciones críticas

