import React from 'react';
import { Paper, Box, Typography, Button } from '@mui/material';

export default function QuickAccessCard({ title, description, buttonText, icon, onClick }) {
    return (
        <Paper elevation={0} sx={{ borderRadius: 3, p: 2.5, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', background: '#fff', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                {icon}
                <Typography variant="h6" sx={{ color: '#e91e63', fontWeight: 700 }}>{title}</Typography>
            </Box>
            <Typography variant="body2" sx={{ mb: 'auto', py: 2 }}>{description}</Typography>
            <Button variant="contained" sx={{ bgcolor: '#f8bbd0', color: '#e91e63', fontWeight: 700, borderRadius: 2, textTransform: 'none', boxShadow: 'none' }} fullWidth onClick={onClick}>{buttonText}</Button>
        </Paper>
    );
}
