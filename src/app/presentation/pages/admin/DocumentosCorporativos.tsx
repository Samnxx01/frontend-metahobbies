import React, { useEffect, useState, useRef } from 'react';
import { apiFetch } from '@/app/services/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, Upload, ChevronLeft, ChevronRight, Eye, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { format, isValid, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const ITEMS_PER_PAGE = 10;

export default function DocumentosCorporativos() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewLoading, setViewLoading] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/config/parametrizacion/listar/documentos/coporativa', { method: 'GET' });
      setData(res);
    } catch (err: any) {
      console.error(err);
      toast.error('Error al cargar la lista de documentos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleViewDocument = async (id: string) => {
    setViewLoading(id);
    try {
      const res = await apiFetch(`/api/config/parametrizacion/listar/documentos/coporativa/${id}`, { method: 'GET' });

      if (res?.ok && res.documento) {
        const { data, mimetype, nombre_documento } = res.documento;

        const dataUri = `data:${mimetype};base64,${data}`;

        setSelectedDoc({
          url: dataUri,
          mimetype: mimetype,
          nombre: nombre_documento
        });
      } else {
        toast.error("No se pudo recuperar el contenido del documento.");
      }
    } catch (error) {
      console.error("Error cargando detalle:", error);
      toast.error("Error al cargar el documento.");
    } finally {
      setViewLoading(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error('Selecciona un archivo primero');

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('archivo', file);

      await apiFetch('/api/config/parametrizacion/guardar/cerficados/coporativa', {
        method: 'POST',
        body: formData,
      });

      toast.success('✅ Documento subido exitosamente');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchDocuments();
    } catch (err: any) {
      toast.error(err.message || 'Error al subir el documento');
    } finally {
      setSubmitting(false);
    }
  };

  const getFileExtension = (mimetype: string) => mimetype?.split('/')[1]?.toUpperCase() || 'DOC';
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = parseISO(dateString);
    return isValid(date) ? format(date, "d 'de' MMMM, yyyy", { locale: es }) : '-';
  };

  const ultimosDocumentos = data?.documentos?.slice(0, 4) || [];
  const todosDocumentos = data?.documentos || [];
  const totalPages = Math.ceil(todosDocumentos.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const documentosPaginados = todosDocumentos.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Renderizado de Fila (Reutilizable)
  const renderRow = (doc: any) => (
    <tr key={doc.iud || doc._id} className="border-t hover:bg-muted/20 transition-colors">
      <td className="px-4 py-3 truncate max-w-[200px]" title={doc.nombre_documento}>
        {doc.nombre_documento}
      </td>
      <td className="px-4 py-3">
        <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
          {getFileExtension(doc.mimetype)}
        </span>
      </td>
      <td className="px-4 py-3 text-muted-foreground text-xs">
        {formatDate(doc.usuCreacion)}
      </td>
      <td className="px-4 py-3 text-center">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => handleViewDocument(doc.iud || doc._id)}
          disabled={viewLoading === (doc.iud || doc._id)}
        >
          {viewLoading === (doc.iud || doc._id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4 text-primary" />}
        </Button>
      </td>
    </tr>
  );

  return (
    <>
      <Card className="max-w-4xl mx-auto mt-8 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Documentos Corporativos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
          ) : (
            <div className="mb-6">
              {ultimosDocumentos.length > 0 ? (
                <>
                  <div className="overflow-x-auto border rounded-md">
                    <table className="min-w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold">Nombre</th>
                          <th className="px-4 py-3 text-left font-semibold">Tipo</th>
                          <th className="px-4 py-3 text-left font-semibold">Fecha</th>
                          <th className="px-4 py-3 text-center font-semibold">Ver</th>
                        </tr>
                      </thead>
                      <tbody>{ultimosDocumentos.map(renderRow)}</tbody>
                    </table>
                  </div>
                  {todosDocumentos.length > 4 && (
                    <div className="mt-4 text-center">
                      <button onClick={() => setIsListModalOpen(true)} className="text-primary hover:underline font-medium text-sm inline-flex items-center gap-1">
                        Ver todos ({todosDocumentos.length}) <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  <p>No hay documentos registrados</p>
                </div>
              )}
            </div>
          )}

          {/* Formulario de Subida */}
          <div className="pt-6 border-t bg-muted/10 -mx-6 px-6 pb-2">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Upload className="h-4 w-4" /> Subir nuevo documento</h3>
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="w-full">
                <input ref={fileInputRef} type="file" accept=".png,.jpg,.jpeg,.pdf" onChange={handleFileChange} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer" />
              </div>
              <Button onClick={handleSubmit} disabled={submitting || !file} className="w-full sm:w-auto">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />} Subir
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MODAL: LISTA COMPLETA */}
      <Dialog open={isListModalOpen} onOpenChange={setIsListModalOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Todos los Documentos</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto border rounded-md">
            <table className="min-w-full text-sm">
              <thead className="bg-muted sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left">Nombre</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody>{documentosPaginados.map(renderRow)}</tbody>
            </table>
          </div>
          {/* Paginación simple */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center pt-4 border-t">
              <span className="text-xs text-muted-foreground">Página {currentPage} de {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL: VISOR DE DOCUMENTO */}
      <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 flex flex-col overflow-hidden bg-zinc-100">
          <div className="p-3 border-b bg-white flex justify-between items-center px-6">
            <h3 className="font-semibold truncate max-w-[80%]">{selectedDoc?.nombre}</h3>
            {/* <Button variant="ghost" size="sm" onClick={() => setSelectedDoc(null)}>
              <X className="h-5 w-5" />
            </Button> */}
          </div>

          <div className="flex-1 relative bg-zinc-200/50 flex items-center justify-center overflow-auto p-4">
            {selectedDoc ? (
              selectedDoc.mimetype === 'application/pdf' ? (
                <iframe src={selectedDoc.url} className="w-full h-full border rounded shadow-sm bg-white" title="Visor PDF" />
              ) : selectedDoc.mimetype.startsWith('image/') ? (
                <img src={selectedDoc.url} alt="Vista previa" className="max-w-full max-h-full object-contain rounded shadow-md" />
              ) : (
                <div className="text-center p-10 bg-white rounded shadow">
                  <p className="text-red-500 font-medium">Formato no soportado para vista previa</p>
                  <p className="text-sm text-muted-foreground mt-2">Tipo: {selectedDoc.mimetype}</p>
                </div>
              )
            ) : (
              <Loader2 className="animate-spin h-10 w-10 text-muted-foreground" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// PR hecho por Gustavo Pereira el 13-02-2026