import React from 'react';
// Importamos los componentes de tabla de Shadcn
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';

// Lucide icons
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Constantes de estilo (traducidas a Tailwind si es posible)
// Nota: PRIMARY_COLOR no es necesario si se usan clases de Tailwind, pero se mantiene 
// para consistencia si se usa en subcomponentes que no estamos reescribiendo aquí.
const PRIMARY_COLOR = "#C43670";
const BORDER_COLOR = "border-gray-200";
const HEADER_BG_COLOR = "bg-muted/50";
const ROW_HOVER_COLOR = "hover:bg-primary/5"; // Sustituye '#FBF4EB'

// Nota: Este componente ya no se comportará como un DataGrid avanzado (sin sorting, filtering, etc.) 
// sino como una tabla HTML estilizada por Shadcn.

export const DataTable = ({ rows, columns, ...props }) => {

    // Función para renderizar el contenido de una celda
    const renderCellContent = (row, column) => {
        // 1. Si la columna tiene una función de renderizado (como las acciones, estado, etc.)
        if (column.render) {
            // Pasamos la fila completa (incluyendo ID)
            return column.render(row);
        }

        // 2. Si la columna tiene un valueGetter (para formatear datos, como la fecha)
        if (column.valueGetter) {
            return column.valueGetter(row[column.field]);
        }

        // 3. Renderizado de campo simple
        return row[column.field];
    };

    // Nota: La paginación real necesitaría lógica de estado (currentPage, totalPages, etc.)
    // Aquí solo se simula la estructura visual del footer.

    const MIN_WIDTH = props.minWidth || '900px';
    const MIN_HEIGHT = props.minHeight || '200px';


    return (
        // Contenedor principal - Reemplaza Box con sus estilos
        <div
            className="w-full bg-white rounded-lg overflow-hidden border border-border shadow-sm"
            style={{ minHeight: MIN_HEIGHT }}
        >
            {/* Contenedor de la tabla interna con minWidth para el scroll horizontal */}
            <div className="overflow-x-auto">
                <Table style={{ minWidth: MIN_WIDTH }}>

                    {/* Cabecera de la Tabla */}
                    <TableHeader className={`sticky top-0 z-10 ${HEADER_BG_COLOR}`}>
                        <TableRow className="border-b border-border">
                            {columns.map((column) => (
                                <TableHead
                                    key={column.field}
                                    className={`
                                        text-xs uppercase text-muted-foreground font-semibold 
                                        h-10 
                                        ${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'}
                                    `}
                                    style={{
                                        minWidth: column.minWidth ? `${column.minWidth}px` : 'auto',
                                        flex: column.flex || 'none'
                                    }}
                                >
                                    {column.headerName}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>

                    {/* Cuerpo de la Tabla */}
                    <TableBody>
                        {rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                                    No se encontraron datos.
                                </TableCell>
                            </TableRow>
                        ) : (
                            rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    className={ROW_HOVER_COLOR} // Hover de la fila
                                >
                                    {columns.map((column) => (
                                        <TableCell
                                            key={column.field}
                                            className={`
                                                py-3 px-4 text-sm font-normal text-foreground whitespace-nowrap
                                                ${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'}
                                            `}
                                        >
                                            {/* Renderizamos el contenido basado en la lógica de la columna */}
                                            {renderCellContent(row, column)}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Footer de Paginación (Simulado para replicar el estilo de MUI) */}
            <div className={`flex justify-end items-center h-14 min-h-[56px] border-t ${BORDER_COLOR} ${HEADER_BG_COLOR} px-4 py-2`}>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <p className="hidden sm:block">Filas por página: 10</p>
                    <p className="ml-4">1-10 de 50</p>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default DataTable;