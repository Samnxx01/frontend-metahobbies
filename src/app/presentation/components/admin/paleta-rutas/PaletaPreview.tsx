import React from 'react';
import type { PaletaRutaColores, ImgFondoConfig, BotonesConfig } from '@/app/services/paletaRutaService';
import { normalizeImageRenderUrl } from '@/app/utils/normalizeImageRenderUrl';

interface Props {
  colores: PaletaRutaColores;
  imgFondo: ImgFondoConfig;
  botonesConfig: BotonesConfig;
  nombreRuta?: string;
}

// ─── Keyframes inyectados como <style> una sola vez ───────────────────────────
const KEYFRAMES = `
  @keyframes mabs-pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.6; }
  }
  @keyframes mabs-bounce {
    0%, 100% { transform: translateY(0); }
    50%       { transform: translateY(-4px); }
  }
  @keyframes mabs-shake {
    0%, 100% { transform: translateX(0); }
    25%       { transform: translateX(-3px); }
    75%       { transform: translateX(3px); }
  }
  @keyframes mabs-glow {
    0%, 100% { box-shadow: 0 0 4px 0px currentColor; }
    50%       { box-shadow: 0 0 12px 4px currentColor; }
  }
`;

function getButtonAnimation(
  animacion: BotonesConfig['animacion']
): React.CSSProperties {
  switch (animacion) {
    case 'pulse':
      return { animation: 'mabs-pulse 1.5s ease-in-out infinite' };
    case 'bounce':
      return { animation: 'mabs-bounce 0.8s ease-in-out infinite' };
    case 'shake':
      return { animation: 'mabs-shake 0.5s ease-in-out infinite' };
    case 'glow':
      return { animation: 'mabs-glow 1.5s ease-in-out infinite' };
    case 'scale':
      // scale se aplica en :hover — aquí mostramos el estado base
      return { transition: 'transform 0.2s ease', transform: 'scale(1)' };
    default:
      return {};
  }
}

/**
 * Panel de preview que muestra visualmente cómo se verá la paleta en la vista.
 * Usa style inline para colores dinámicos; no usa clases Tailwind para colores.
 */
export default function PaletaPreview({
  colores,
  imgFondo,
  botonesConfig,
  nombreRuta,
}: Props) {
  const btnBaseStyle: React.CSSProperties = {
    borderRadius: botonesConfig.bordeRadio,
    border: `${botonesConfig.grosorBorde} solid transparent`,
    padding: '8px 18px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 600,
    transition: 'transform 0.2s ease',
    ...(botonesConfig.sombra
      ? { boxShadow: `0 2px 8px ${colores.colorSombra}` }
      : {}),
    ...getButtonAnimation(botonesConfig.animacion),
  };

  const btnPrimarioStyle: React.CSSProperties = {
    ...btnBaseStyle,
    backgroundColor: colores.colorBotonPrimario,
    color: colores.colorBotonPrimarioTexto,
  };

  const btnSecundarioStyle: React.CSSProperties = {
    ...btnBaseStyle,
    backgroundColor: colores.colorBotonSecundario,
    color: colores.colorBotonSecundarioTexto,
  };

  const wrapperStyle: React.CSSProperties = {
    position: 'relative',
    backgroundColor: colores.colorFondo,
    borderRadius: '0.5rem',
    overflow: 'hidden',
    minHeight: '320px',
    border: `1px solid ${colores.colorBorde}`,
  };

  const fondoUrl = normalizeImageRenderUrl(imgFondo.url);

  const bgImageStyle: React.CSSProperties =
    fondoUrl
      ? {
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${fondoUrl})`,
          backgroundSize: imgFondo.tamaño,
          backgroundPosition: imgFondo.posicion,
          backgroundRepeat: imgFondo.repetir,
          opacity: imgFondo.opacidad,
          zIndex: 0,
        }
      : {};

  return (
    <>
      {/* Inyectar keyframes una sola vez */}
      <style>{KEYFRAMES}</style>

      <div style={wrapperStyle}>
        {/* Capa de imagen de fondo */}
        {fondoUrl && <div style={bgImageStyle} aria-hidden="true" />}

        {/* Contenido sobre la imagen */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Navbar simulado */}
          <div
            style={{
              backgroundColor: colores.colorNavbar,
              color: colores.colorNavbarTexto,
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 700,
              fontSize: '0.9rem',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 20,
                height: 20,
                borderRadius: '50%',
                backgroundColor: colores.colorNavbarTexto,
                opacity: 0.4,
              }}
            />
            {nombreRuta ?? 'Vista de ejemplo'}
          </div>

          {/* Cuerpo */}
          <div style={{ padding: '20px' }}>
            {/* Tarjeta de contenido */}
            <div
              style={{
                backgroundColor: colores.colorFondoSecundario,
                border: `1px solid ${colores.colorBorde}`,
                borderRadius: '0.5rem',
                padding: '16px',
                boxShadow: `0 1px 4px ${colores.colorSombra}`,
              }}
            >
              <h3
                style={{
                  color: colores.colorPrimario,
                  margin: '0 0 4px',
                  fontSize: '1rem',
                  fontWeight: 700,
                }}
              >
                Título de la sección
              </h3>
              <p
                style={{
                  color: colores.colorTexto,
                  margin: '0 0 4px',
                  fontSize: '0.875rem',
                }}
              >
                Texto principal de la vista con el color configurado.
              </p>
              <p
                style={{
                  color: colores.colorTextoSecundario,
                  margin: '0 0 16px',
                  fontSize: '0.8rem',
                }}
              >
                Subtítulo o descripción secundaria.
              </p>

              {/* Botones */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button style={btnPrimarioStyle} type="button">
                  Botón primario
                </button>
                <button style={btnSecundarioStyle} type="button">
                  Botón secundario
                </button>
              </div>
            </div>

            {/* Muestra de colores auxiliares */}
            <div
              style={{
                marginTop: '12px',
                display: 'flex',
                gap: '6px',
                flexWrap: 'wrap',
              }}
            >
              {[
                { color: colores.colorPrimario, label: 'Primario' },
                { color: colores.colorSecundario, label: 'Secundario' },
                { color: colores.colorBorde, label: 'Borde' },
                { color: colores.colorSombra, label: 'Sombra' },
              ].map(({ color, label }) => (
                <div
                  key={label}
                  title={`${label}: ${color}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.7rem',
                    color: colores.colorTextoSecundario,
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: 14,
                      height: 14,
                      borderRadius: '3px',
                      backgroundColor: color,
                      border: '1px solid rgba(0,0,0,0.15)',
                      flexShrink: 0,
                    }}
                  />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
