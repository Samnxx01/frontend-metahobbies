import React, { useState } from 'react';
import { apiFetch } from '@/app/services/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function EstadoUsuarios() {
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserId(e.target.value);
  };

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await apiFetch(
        `https://server-mabs-xo9s.onrender.com/api/usuarios/inactivousuario/${userId}`,
        {
          method: 'DELETE',
        }
      );
      setSuccess('Usuario inhabilitado correctamente');
      setUserId('');
    } catch (err: any) {
      setError(err.message || 'Error al inhabilitar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>Inhabilitar Usuario</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleDelete} className="space-y-4">
          <Input name="userId" value={userId} onChange={handleChange} placeholder="ID de usuario" required />
          <Button type="submit" disabled={loading}>{loading ? 'Inhabilitando...' : 'Inhabilitar Usuario'}</Button>
          {error && <div className="text-destructive mt-2">{error}</div>}
          {success && <div className="text-success mt-2">{success}</div>}
        </form>
      </CardContent>
    </Card>
  );
}
