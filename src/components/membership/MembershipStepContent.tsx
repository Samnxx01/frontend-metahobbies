import React from 'react';
import FormField from '@/components/common/FormField';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface PersonalInfo {
  email: string;
}

interface PaymentInfo {
  paymentMethod: 'nequi' | 'card' | '';
  nequiPhone?: string;
  cardNumber?: string;
  cardName?: string;
  expiryDate?: string;
  cvv?: string;
}

interface FormData {
  personalInfo: PersonalInfo;
  paymentInfo: PaymentInfo;
}

interface MembershipStepContentProps {
  step: number;
  formData: FormData;
  handleFormChange: (section: 'personalInfo' | 'paymentInfo', field: string, value: string) => void;
  MEMBERSHIP_PRICE: number | null;
  token: string;
}

export default function MembershipStepContent({
  step,
  formData,
  handleFormChange,
  MEMBERSHIP_PRICE,
}: MembershipStepContentProps): React.ReactElement | null {
  
  switch (step) {
    case 0:
      // Email step
      return (
        <div className="space-y-6">
          <div>
            <FormField
              id="email"
              label="Correo Electrónico"
              type="email"
              required
              value={formData.personalInfo.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                handleFormChange('personalInfo', 'email', e.target.value);
              }}
              placeholder="ejemplo@email.com"
            />
          </div>
        </div>
      );

    case 1:
      // Summary step
      return (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold mb-4">Resumen de la Membresía</h3>
          <div className="border rounded-lg p-4 bg-card shadow-sm">
            <p className="text-lg font-semibold mb-1">Membresía Premium</p>
            <p className="text-muted-foreground">• Acceso a descuentos exclusivos</p>
            <p className="text-muted-foreground">• Programa de referidos</p>
            <p className="text-muted-foreground">• Ganancias por referencias</p>
            <div className="h-px bg-border my-4" />
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">Email:</p>
                <p className="text-sm font-medium">{formData.personalInfo.email}</p>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between items-center">
                <p className="text-lg font-bold">Total:</p>
                <p className="text-xl font-bold text-primary">COP ${MEMBERSHIP_PRICE?.toLocaleString('es-CO')}</p>
              </div>
            </div>
          </div>
        </div>
      );

    case 2:
      // Payment step
      return (
        <div className="space-y-6">
          <h3 className="text-xl font-semibold mb-4">Método de Pago</h3>
          
          {/* Payment Method Select */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">
              Selecciona el método de pago <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.paymentInfo.paymentMethod}
              onValueChange={(value) => handleFormChange('paymentInfo', 'paymentMethod', value)}
            >
              <SelectTrigger id="paymentMethod">
                <SelectValue placeholder="Selecciona un método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nequi">Nequi</SelectItem>
                <SelectItem value="card">Tarjeta de Crédito/Débito</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Nequi Fields */}
          {formData.paymentInfo.paymentMethod === 'nequi' && (
            <div className="space-y-4 animate-in fade-in-50">
              <FormField
                id="nequiPhone"
                label="Número de teléfono Nequi"
                type="tel"
                required
                value={formData.paymentInfo.nequiPhone || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                  handleFormChange('paymentInfo', 'nequiPhone', value);
                }}
                placeholder="3001234567"
              />
              <p className="text-sm text-muted-foreground">
                Ingresa un número colombiano válido (debe empezar con 3 y tener 10 dígitos). Recibirás una notificación en tu app de Nequi para aprobar el pago.
              </p>
            </div>
          )}

          {/* Card Fields */}
          {formData.paymentInfo.paymentMethod === 'card' && (
            <div className="space-y-4 animate-in fade-in-50">
              <FormField
                id="cardNumber"
                label="Número de tarjeta"
                type="text"
                required
                value={formData.paymentInfo.cardNumber || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 16);
                  handleFormChange('paymentInfo', 'cardNumber', value);
                }}
                placeholder="1234 5678 9012 3456"
              />
              
              <FormField
                id="cardName"
                label="Nombre en la tarjeta"
                type="text"
                required
                value={formData.paymentInfo.cardName || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  handleFormChange('paymentInfo', 'cardName', e.target.value.toUpperCase());
                }}
                placeholder="JUAN PEREZ"
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  id="expiryDate"
                  label="Fecha de expiración"
                  type="text"
                  required
                  value={formData.paymentInfo.expiryDate || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    let value = e.target.value.replace(/[^0-9]/g, '');
                    if (value.length >= 2) {
                      value = value.slice(0, 2) + '/' + value.slice(2, 4);
                    }
                    handleFormChange('paymentInfo', 'expiryDate', value);
                  }}
                  placeholder="MM/AA"
                />
                
                <FormField
                  id="cvv"
                  label="CVV"
                  type="text"
                  required
                  value={formData.paymentInfo.cvv || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                    handleFormChange('paymentInfo', 'cvv', value);
                  }}
                  placeholder="123"
                />
              </div>
            </div>
          )}
        </div>
      );

    default:
      return null;
  }
}
