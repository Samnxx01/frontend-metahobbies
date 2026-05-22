import React from 'react';
import { GobernanzaModuloDinamico } from '../gobernanza/GobernanzaModuloDinamico';

/** Alias: misma rejilla que GobernanzaModuloDinamico variant="config". */
export default function ConfigGobernanza(): React.ReactElement {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <GobernanzaModuloDinamico variant="config" />
    </div>
  );
}
