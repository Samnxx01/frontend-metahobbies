import React from 'react';
import { Paper, Box, Typography, Button, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';

export default function LatestOrdersCard({ title, orders, onViewAll }) {
    return (
        <Paper elevation={0} sx={{
            borderRadius: 3,
            p: 2.5,
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
            background: '#fff',
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ color: '#e91e63', fontWeight: 700 }}>{title}</Typography>
                <Button variant="contained" sx={{ bgcolor: '#f8bbd0', color: '#e91e63', fontWeight: 700, borderRadius: 2, textTransform: 'none', boxShadow: 'none' }} onClick={onViewAll}>Ir a Pedidos</Button>
            </Box>
            <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ backgroundColor: '#f5f7fb' }}>
                            <TableCell sx={{ fontWeight: 600 }}>ID PEDIDO</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>CLIENTE</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>TOTAL</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>ESTADO</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {orders.map((p) => (
                            <TableRow key={p.id}>
                                <TableCell>{p.id}</TableCell>
                                <TableCell>{p.cliente}</TableCell>
                                <TableCell>{p.total}</TableCell>
                                <TableCell>
                                    {p.estado === 'Pendiente' ? (
                                        <Chip label="Pendiente" sx={{ bgcolor: '#ffe1a8', color: '#b8860b', fontWeight: 700, borderRadius: 1 }} size="small" />
                                    ) : (
                                        <Chip label="Completado" sx={{ bgcolor: '#b2ebf2', color: '#009688', fontWeight: 700, borderRadius: 1 }} size="small" />
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
}
