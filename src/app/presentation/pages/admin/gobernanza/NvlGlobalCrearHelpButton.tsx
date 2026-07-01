import React from 'react';
import { CircleHelp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';

const HELP_PARAGRAPHS = [
  'Este formulario da de alta un nuevo escalón en la jerarquía global de tenants (catálogo generacionGlobalNvlRoles). Cada nivel define qué tipo de tenant se puede crear y con qué poder relativo dentro de la plataforma.',
  'El número de nivel (nvl) indica la posición en la jerarquía: un número menor significa mayor poder (por ejemplo, NVL 0 = acceso libre/DIOS, NVL 1 = tenant global, NVL 2 = corporativo). Puedes elegir un NVL ya parametrizado en el listado o «Otro / nuevo nivel» y completar los datos con el botón Parametrizar.',
  'La clave interna (generation_tenant) es el identificador técnico en UPPERCASE (ej. LIBRE, TENANT-GLOBAL). El nombre visible y la descripción son las etiquetas que verán los administradores al crear tenants.',
  'La secuencia de NVL registrados se calcula automáticamente desde la parametrización hija generacionglobalnvlrolesconfigs. Usa «Validar secuencia» para comprobar el contador antes de guardar.',
  'Acceso libre (securityPlatform) se envía al formulario padre y se refleja en la parametrización hija del nivel. Solo el scope tenantSuperAdmin del JWT puede ejecutar esta acción.',
];

const HELP_TIPS = [
  'Flujo recomendado: elige o define el NVL → Parametrizar → valida secuencia → Ejecutar.',
  'Tras crear, revisa el catálogo con «Listar niveles globales» o «Actualizar lista (GET catálogo)».',
  'Para ajustar securityPlatform de un nivel ya creado, usa «Modificar parametrización NVL global».',
];

export function NvlGlobalCrearHelpButton(): React.ReactElement {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5">
          <CircleHelp className="h-4 w-4" />
          Ayuda
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-[min(70vh,520px)] w-80 overflow-y-auto sm:w-96">
        <PopoverHeader>
          <PopoverTitle>¿Qué hace «Crear nivel global»?</PopoverTitle>
          <PopoverDescription asChild>
            <div className="space-y-2 pt-1 text-xs leading-relaxed text-muted-foreground">
              {HELP_PARAGRAPHS.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
              <ul className="list-disc space-y-1 pl-4">
                {HELP_TIPS.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          </PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  );
}
