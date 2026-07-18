import React, { useEffect, useMemo, useState } from 'react';
import FormField from '@/components/common/FormField';
import metodoPagoService, { type MetodoPagoCatalogo } from '@/app/services/metodoPagoService';
import type { BeneficioMembresiaPago } from '@/app/services/brandingWidget';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Mail,
  CheckCircle2,
  Sparkles,
  CreditCard,
  Smartphone,
  Building2,
  Shield,
  Zap,
  Gift,
  TrendingUp
} from 'lucide-react';

interface PersonalInfo {
  email: string;
}

interface PaymentInfo {
  paymentMethod: 'nequi' | 'card' | 'pse' | '';
  cardType?: 'credit' | 'debit';
  nequiPhone?: string;
  cardNumber?: string;
  cardName?: string;
  expiryDate?: string;
  cvv?: string;
  installments?: number;
  pseUserType?: '0' | '1' | '';
  pseLegalIdType?: 'CC' | 'CE' | 'NIT' | '';
  pseLegalId?: string;
  pseFinancialInstitution?: string;
  fullName?: string;
  phoneNumber?: string;
}

interface FormData {
  personalInfo: PersonalInfo;
  paymentInfo: PaymentInfo;
}

interface MembershipStepContentProps {
  step: number;
  formData: FormData;
  handleFormChange: (section: 'personalInfo' | 'paymentInfo', field: string, value: any) => void;
  MEMBERSHIP_PRICE: number | null;
  MEMBERSHIP_NOMBRE?: string;
  BENEFICIOS_PAGO?: BeneficioMembresiaPago[];
  token: string;
}

export default function MembershipStepContent({
  step,
  formData,
  handleFormChange,
  MEMBERSHIP_PRICE,
  MEMBERSHIP_NOMBRE,
  BENEFICIOS_PAGO = [],
}: MembershipStepContentProps): React.ReactElement | null {
  const [metodosPago, setMetodosPago] = useState<MetodoPagoCatalogo[]>([]);

  useEffect(() => {
    if (step !== 2) return;

    let mounted = true;
    metodoPagoService.listarActivos()
      .then((data) => {
        if (mounted) setMetodosPago(data);
      })
      .catch(() => {
        if (mounted) setMetodosPago([]);
      });

    return () => {
      mounted = false;
    };
  }, [step]);

  const paymentMethods = useMemo(() => {
    const presentationByCode = {
      nequi: {
        id: 'nequi' as const,
        icon: Smartphone,
        color: 'from-primary/15 to-accent/10',
      },
      card: {
        id: 'card' as const,
        icon: CreditCard,
        color: 'from-accent/15 to-secondary/10',
      },
      pse: {
        id: 'pse' as const,
        icon: Building2,
        color: 'from-secondary/15 to-primary/10',
      },
    };

    return metodosPago.flatMap((method) => {
      const code = method.codigo.trim().toLowerCase();
      const normalizedCode = code === 'tarjeta' ? 'card' : code;
      const presentation = presentationByCode[normalizedCode as keyof typeof presentationByCode];
      if (!presentation) return [];

      return [{
        ...presentation,
        name: method.nombre,
        description: method.descripcion || '',
      }];
    });
  }, [metodosPago]);

  switch (step) {
    // Step 0: Email 
    case 0:
      return (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              ¿Cuál es tu correo electrónico?
            </h3>
            <p className="text-sm text-muted-foreground">
              Lo usaremos para enviarte la confirmación y acceso a tu cuenta
            </p>
          </div>

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
      );

    // Step 1: Resumen
    case 1: {
      const benefits = [
        { icon: Gift, text: 'Descuentos exclusivos en productos' },
        { icon: TrendingUp, text: 'Programa de referidos activo' },
        { icon: Zap, text: 'Ganancias por cada referencia' },
        { icon: Shield, text: 'Acceso de por vida' },
      ];

      // Nombre del plan: usa el dinámico si viene, si no fallback genérico
      const nombrePlan = MEMBERSHIP_NOMBRE || 'Membresía Premium';

      return (
        <div className="space-y-6">
          {/* Hero */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">{nombrePlan}</h3>
            <p className="text-muted-foreground">Revisa los detalles antes de continuar</p>
          </div>

          {/* Beneficios */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/40"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <benefit.icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm text-foreground">{benefit.text}</span>
              </div>
            ))}
          </div>

          {/* Card resumen */}
          <Card className="border-2 border-primary/20 overflow-hidden">
            <div className="bg-gradient-to-r from-primary/5 to-transparent p-4 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Email:</span>
                </div>
                <span className="text-sm font-medium text-foreground">
                  {formData.personalInfo.email}
                </span>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                {/* Nombre dinámico del plan seleccionado */}
                <span className="text-muted-foreground">{nombrePlan}</span>
                <span className="text-sm text-muted-foreground">Pago único</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-foreground">Total a pagar:</span>
                <div className="text-right">
                  {MEMBERSHIP_PRICE != null ? (
                    <>
                      <div className="text-3xl font-bold text-primary">
                        ${MEMBERSHIP_PRICE.toLocaleString('es-CO')}
                      </div>
                      <div className="text-xs text-muted-foreground">COP</div>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground italic">No disponible</div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Textos parametrizados del flujo de pago */}
          {BENEFICIOS_PAGO.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground pt-4">
              {BENEFICIOS_PAGO.map((beneficio, index) => (
                <div key={`${beneficio.texto}-${index}`} className="flex items-center gap-1">
                  {beneficio.icono && <span aria-hidden="true">{beneficio.icono}</span>}
                  <span>{beneficio.texto}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Step 2: Pago
    case 2: {
      return (
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <CreditCard className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">
              Selecciona tu método de pago
            </h3>
            <p className="text-sm text-muted-foreground">
              Todas las transacciones son 100% seguras
            </p>
          </div>

          {/* Cards de métodos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => handleFormChange('paymentInfo', 'paymentMethod', method.id)}
                className={`
                  relative p-4 rounded-xl border-2 transition-all duration-200
                  hover:scale-105 hover:shadow-md
                  ${formData.paymentInfo.paymentMethod === method.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border/40 hover:border-primary/50'
                  }
                `}
              >
                <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${method.color} opacity-50`} />
                <div className="relative">
                  <div className="flex flex-col items-center gap-2">
                    <method.icon className={`w-8 h-8 ${formData.paymentInfo.paymentMethod === method.id
                      ? 'text-primary'
                      : 'text-muted-foreground'
                      }`} />
                    <div className="text-center">
                      <div className="font-semibold text-sm">{method.name}</div>
                      <div className="text-xs text-muted-foreground">{method.description}</div>
                    </div>
                    {formData.paymentInfo.paymentMethod === method.id && (
                      <CheckCircle2 className="absolute -top-2 -right-2 w-5 h-5 text-primary" />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
          {paymentMethods.length === 0 && (
            <p className="text-sm text-center text-muted-foreground">
              No hay métodos de pago disponibles.
            </p>
          )}

          {/* Formularios dinámicos por método */}
          {formData.paymentInfo.paymentMethod && (
            <Card className="p-6 animate-in fade-in-50 slide-in-from-bottom-4 duration-300">

              {/* ── Nequi ── */}
              {formData.paymentInfo.paymentMethod === 'nequi' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Smartphone className="w-5 h-5 text-primary" />
                    <h4 className="font-semibold">Datos de Nequi</h4>
                  </div>
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
                  <div className="flex items-start gap-2 p-3 bg-accent/10 border border-accent/25 rounded-lg">
                    <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      Recibirás una notificación en tu app de Nequi para aprobar el pago de forma segura.
                    </p>
                  </div>
                </div>
              )}

              {/* Tarjeta */}
              {formData.paymentInfo.paymentMethod === 'card' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <h4 className="font-semibold">Datos de la tarjeta</h4>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cardType">Tipo de tarjeta *</Label>
                      <Select
                        value={formData.paymentInfo.cardType || ''}
                        onValueChange={(value) => {
                          handleFormChange('paymentInfo', 'cardType', value);
                          if (value === 'debit') handleFormChange('paymentInfo', 'installments', 1);
                        }}
                      >
                        <SelectTrigger id="cardType"><SelectValue placeholder="Selecciona" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="credit">💳 Crédito</SelectItem>
                          <SelectItem value="debit">🏦 Débito</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.paymentInfo.cardType === 'credit' && (
                      <div className="space-y-2">
                        <Label htmlFor="installments">Cuotas *</Label>
                        <Select
                          value={(formData.paymentInfo.installments || 1).toString()}
                          onValueChange={(v) => handleFormChange('paymentInfo', 'installments', parseInt(v, 10))}
                        >
                          <SelectTrigger id="installments"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 6, 12].map(num => (
                              <SelectItem key={num} value={num.toString()}>
                                {num} {num === 1 ? 'cuota' : 'cuotas'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <FormField
                    id="cardNumber" label="Número de tarjeta" type="text" required
                    value={formData.paymentInfo.cardNumber || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      handleFormChange('paymentInfo', 'cardNumber', e.target.value.replace(/[^0-9]/g, '').slice(0, 16));
                    }}
                    placeholder="•••• •••• •••• ••••"
                  />
                  <FormField
                    id="cardName" label="Nombre en la tarjeta" type="text" required
                    value={formData.paymentInfo.cardName || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      handleFormChange('paymentInfo', 'cardName', e.target.value.toUpperCase());
                    }}
                    placeholder="JUAN PEREZ"
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      id="expiryDate" label="Vencimiento" type="text" required
                      value={formData.paymentInfo.expiryDate || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        let v = e.target.value.replace(/[^0-9]/g, '');
                        if (v.length >= 2) v = v.slice(0, 2) + '/' + v.slice(2, 4);
                        handleFormChange('paymentInfo', 'expiryDate', v);
                      }}
                      placeholder="MM/AA"
                    />
                    <FormField
                      id="cvv" label="CVV" type="text" required
                      value={formData.paymentInfo.cvv || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        handleFormChange('paymentInfo', 'cvv', e.target.value.replace(/[^0-9]/g, '').slice(0, 4));
                      }}
                      placeholder="•••"
                    />
                  </div>
                </div>
              )}

              {/* PSE */}
              {formData.paymentInfo.paymentMethod === 'pse' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Building2 className="w-5 h-5 text-primary" />
                    <h4 className="font-semibold">Datos para PSE</h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pseUserType">Tipo de persona *</Label>
                      <Select
                        value={formData.paymentInfo.pseUserType || ''}
                        onValueChange={(v) => handleFormChange('paymentInfo', 'pseUserType', v)}
                      >
                        <SelectTrigger id="pseUserType"><SelectValue placeholder="Selecciona" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">👤 Natural</SelectItem>
                          <SelectItem value="1">🏢 Jurídica</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pseLegalIdType">Tipo de documento *</Label>
                      <Select
                        value={formData.paymentInfo.pseLegalIdType || ''}
                        onValueChange={(v) => handleFormChange('paymentInfo', 'pseLegalIdType', v)}
                      >
                        <SelectTrigger id="pseLegalIdType"><SelectValue placeholder="Selecciona" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CC">CC - Cédula</SelectItem>
                          <SelectItem value="CE">CE - Extranjería</SelectItem>
                          <SelectItem value="NIT">NIT</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <FormField
                    id="pseLegalId" label="Número de documento" type="text" required
                    value={formData.paymentInfo.pseLegalId || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      handleFormChange('paymentInfo', 'pseLegalId', e.target.value.replace(/[^0-9]/g, ''));
                    }}
                    placeholder="1099888777"
                  />

                  <div className="space-y-2">
                    <Label htmlFor="pseFinancialInstitution">Banco *</Label>
                    <Select
                      value={formData.paymentInfo.pseFinancialInstitution || ''}
                      onValueChange={(v) => handleFormChange('paymentInfo', 'pseFinancialInstitution', v)}
                    >
                      <SelectTrigger id="pseFinancialInstitution"><SelectValue placeholder="Selecciona tu banco" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1007">Bancolombia</SelectItem>
                        <SelectItem value="1013">BBVA</SelectItem>
                        <SelectItem value="1063">Davivienda</SelectItem>
                        <SelectItem value="1023">Occidente</SelectItem>
                        <SelectItem value="1002">Popular</SelectItem>
                        <SelectItem value="1019">Colpatria</SelectItem>
                        <SelectItem value="1060">Caja Social</SelectItem>
                        <SelectItem value="1040">AV Villas</SelectItem>
                        <SelectItem value="1032">Falabella</SelectItem>
                        <SelectItem value="1507">Nequi</SelectItem>
                        <SelectItem value="1551">Daviplata</SelectItem>
                        <SelectItem value="1009">Lulo Bank</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="border-t border-border/40 pt-4 mt-6">
                    <h5 className="font-medium mb-4 text-sm">Información de contacto</h5>
                    <div className="space-y-4">
                      <FormField
                        id="pseFullName" label="Nombre completo" type="text" required
                        value={formData.paymentInfo.fullName || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          handleFormChange('paymentInfo', 'fullName', e.target.value);
                        }}
                        placeholder="Juan Pérez"
                      />
                      <FormField
                        id="psePhoneNumber" label="Teléfono" type="tel" required
                        value={formData.paymentInfo.phoneNumber || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          handleFormChange('paymentInfo', 'phoneNumber', e.target.value.replace(/[^0-9]/g, '').slice(0, 10));
                        }}
                        placeholder="3001234567"
                      />
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-3 bg-secondary/15 border border-secondary/30 rounded-lg mt-4">
                    <Shield className="w-5 h-5 text-secondary-foreground flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      Serás redirigido a la plataforma de tu banco para completar el pago de forma segura.
                    </p>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      );
    }

    default:
      return null;
  }
}
