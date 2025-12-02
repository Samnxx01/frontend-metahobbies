import React, { useState } from 'react';
import FormField from '@/components/common/FormField';
import { Button } from '@/components/ui/button';
import { generateCheckout } from '@/lib/wompi/generateCheckout';
import { initiateMembershipCheckout } from '@/lib/membership/initiateMembershipCheckout';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { PersonalInfo } from '@/lib/types/wompi';

 

interface FormData {
  personalInfo: PersonalInfo;
}

interface MembershipStepContentProps {
  step: number;
  formData: FormData;
  handleFormChange: (section: 'personalInfo', field: string, value: string) => void;
  MEMBERSHIP_PRICE: number | null;
  token: string;
}

export default function MembershipStepContent({
  step,
  formData,
  handleFormChange,
  MEMBERSHIP_PRICE,
  token,
}: MembershipStepContentProps): React.ReactElement | null {
  const [processing, setProcessing] = useState<boolean>(false);
  
  switch (step) {
    case 0:
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <FormField
            id="nombre"
            label="Nombre"
            required
            value={formData.personalInfo.nombre}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFormChange('personalInfo', 'nombre', e.target.value)}
          />
          <FormField
            id="apellido"
            label="Apellido"
            required
            value={formData.personalInfo.apellido}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFormChange('personalInfo', 'apellido', e.target.value)}
          />
          <div className="sm:col-span-2">
            <FormField
              id="email"
              label="Email"
              type="email"
              required
              value={formData.personalInfo.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const value = e.target.value;
                const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
                if (!emailRegex.test(value) && value !== '') {
                  e.target.setCustomValidity('Correo inválido');
                } else {
                  e.target.setCustomValidity('');
                }
                handleFormChange('personalInfo', 'email', value);
              }}
              placeholder="ejemplo@email.com"
            />
          </div>
          <div className="sm:col-span-2">
            <FormField
              id="telefono"
              label="Teléfono"
              required
              type="text"
              value={formData.personalInfo.telefono || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const value = e.target.value.replace(/[^0-9]/g, '');
                handleFormChange('personalInfo', 'telefono', value);
              }}
              placeholder="Solo números"
            />
          </div>

          <div className="sm:col-span-2 flex gap-4 items-end">
            <div className="w-40">
              <label htmlFor="legalIdType" className="block text-sm font-medium mb-1">Tipo <span className="text-destructive ml-1">*</span></label>
              <select
                id="legalIdType"
                required
                className="w-full border rounded px-3 py-2 bg-white focus:bg-white"
                value={formData.personalInfo.legalIdType || ''}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFormChange('personalInfo', 'legalIdType', e.target.value)}
                style={{ backgroundColor: '#fff' }}
              >
                <option value="">Selecciona tipo</option>
                <option value="CC">CC</option>
                <option value="NIT">NIT</option>
                <option value="CE">CE</option>
              </select>
            </div>
            <div className="flex-1">
              <FormField
                id="legalId"
                label="Identificación (Legal ID)"
                required
                type="text"
                value={formData.personalInfo.legalId || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  handleFormChange('personalInfo', 'legalId', value);
                }}
                placeholder="Solo números"
              />
            </div>
          </div>
        </div>
      );
    case 1:
      return (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold mb-4">Resumen de la Membresía</h3>
          <div className="border rounded-lg p-4 bg-card shadow-sm">
            <p className="text-lg font-semibold mb-1">Membresía Premium</p>
            <p className="text-muted-foreground">• Acceso a descuentos exclusivos</p>
            <p className="text-muted-foreground">• Programa de referidos</p>
            <p className="text-muted-foreground">• Ganancias por referencias</p>
            <div className="h-px bg-border my-4" />
            <div className="flex justify-between items-center">
              <p className="text-lg font-bold">Total:</p>
              <p className="text-xl font-bold text-primary">COP ${MEMBERSHIP_PRICE?.toLocaleString('es-CO')}</p>
            </div>
          </div>
        </div>
      );
    case 2:
      // If price still loading, show a loader and prevent checkout
      if (MEMBERSHIP_PRICE == null) {
        return (
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p>Cargando precio de la membresía...</p>
          </div>
        );
      }

      return (
        <div className="flex flex-col items-center justify-center space-y-6">
          <Button
            size="lg"
            className="w-full max-w-xs"
            onClick={async () => {
              if (processing) return;

              setProcessing(true);
              try {
                const checkoutParams = await initiateMembershipCheckout({
                  personalInfo: formData.personalInfo,
                  price: MEMBERSHIP_PRICE,
                  token,
                });

                await generateCheckout(checkoutParams);
              } catch (err: any) {
                console.error(err);
                toast.error(err?.message || 'Error inesperado al iniciar el pago.');
              } finally {
                setProcessing(false);
              }
            }}
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin inline-block" /> Procesando...
              </>
            ) : (
              'Pagar Membresía'
            )}
          </Button>
        </div>
      );
    default:
      return null;
  }
}
