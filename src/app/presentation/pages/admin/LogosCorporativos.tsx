import React, { useEffect, useState, useRef } from 'react';
import { apiFetch } from '@/app/services/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, ChevronLeft, ChevronRight, Image as ImageIcon, FileText } from 'lucide-react';
import { toast } from 'react-toastify';
import { format, isValid, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const ITEMS_PER_PAGE = 10;

export default function LogosCorporativos() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchLogos = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/config/parametrizacion/listar/logos/coporativa', {
        method: 'GET'
      });

      setData(res);
    } catch (err: any) {
      console.error('❌ Error al cargar logos:', err);
      setError(err.message || 'Error al cargar datos');
      toast.error('Error al cargar la lista de logos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogos();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error('Selecciona una imagen primero');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('archivo', file);

      await apiFetch('/api/config/parametrizacion/guardar/logos/coporativa', {
        method: 'POST',
        body: formData,
      });

      toast.success('Imagen subida correctamente');

      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      await fetchLogos();
    } catch (err: any) {
      console.error('❌ Error subiendo logo:', err);
      toast.error(err.message || 'Error al subir la imagen');
    } finally {
      setSubmitting(false);
    }
  };


  const getFileExtension = (mimetype: string, filename: string) => {
    if (mimetype && mimetype.includes('/')) {
      return mimetype.split('/')[1].toUpperCase();
    }

    if (filename && filename.includes('.')) {
      return filename.split('.').pop()?.toUpperCase() || 'IMG';
    }
    return 'IMG';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return '-';
      return format(date, "d 'de' MMMM, yyyy", { locale: es });
    } catch {
      return '-';
    }
  };

  const logosList = data?.logos || [];

  const ultimosLogos = logosList.slice(0, 4);

  const totalPages = Math.ceil(logosList.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const logosPaginados = logosList.slice(startIndex, endIndex);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  return (
    <>
      <Card className="max-w-4xl mx-auto mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Logos Corporativos
          </CardTitle>
        </CardHeader>
        <CardContent>

          {/* TABLA RESUMEN */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin h-8 w-8" />
            </div>
          ) : error ? (
            <div className="text-destructive bg-destructive/10 p-4 rounded-md mb-6">
              {error}
            </div>
          ) : (
            <div className="mb-6">
              {ultimosLogos.length > 0 ? (
                <>
                  <div className="overflow-x-auto border rounded-md">
                    <table className="min-w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold">Nombre del Archivo</th>
                          <th className="px-4 py-3 text-left font-semibold">Extensión</th>
                          <th className="px-4 py-3 text-left font-semibold">Fecha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ultimosLogos.map((logo: any) => (
                          <tr key={logo._id} className="border-t hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3 truncate max-w-[300px]" title={logo.nombre_documento}>
                              {logo.nombre_documento || 'Sin nombre'}
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                {getFileExtension(logo.mimetype, logo.nombre_documento)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {formatDate(logo.usuCreacion)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* ENLACE VER TODOS */}
                  {logosList.length > 4 && (
                    <div className="mt-4 text-center">
                      <button
                        onClick={() => {
                          setCurrentPage(1);
                          setIsModalOpen(true);
                        }}
                        className="text-primary hover:underline font-medium text-sm inline-flex items-center gap-1"
                      >
                        Ver todos los documentos ({logosList.length})
                        <FileText className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-md border border-dashed">
                  <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay logos registrados</p>
                </div>
              )}
            </div>
          )}

          {/* FORMULARIO DE SUBIDA */}
          <div className="pt-6 border-t">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Subir nuevo logo
            </h3>
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="w-full">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Formatos permitidos: PNG, JPG, JPEG
                </p>
              </div>
              <Button onClick={handleSubmit} disabled={submitting || !file} className="w-full sm:w-auto">
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Subir
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MODAL / DIALOG */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Todos los Logos ({logosList.length})
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            <div className="overflow-x-auto border rounded-md">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Nombre del Archivo</th>
                    <th className="px-4 py-3 text-left font-semibold">Extensión</th>
                    <th className="px-4 py-3 text-left font-semibold">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {logosPaginados.map((logo: any) => (
                    <tr key={logo._id} className="border-t hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 truncate max-w-[400px]" title={logo.nombre_documento}>
                        {logo.nombre_documento || 'Sin nombre'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {getFileExtension(logo.mimetype, logo.nombre_documento)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(logo.usuCreacion)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* PAGINACIÓN */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Mostrando {startIndex + 1} - {Math.min(endIndex, logosList.length)} de {logosList.length}
              </p>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(page)}
                      className="w-10"
                    >
                      {page}
                    </Button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}