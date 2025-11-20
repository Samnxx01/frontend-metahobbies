import React from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material'

export default function Modal({ open, title, children, onClose, actions }) {
    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            {title && <DialogTitle>{title}</DialogTitle>}
            <DialogContent dividers>
                {children}
            </DialogContent>
            <DialogActions>
                {actions ? actions : (
                    <>
                        <Button onClick={onClose}>Cancelar</Button>
                        <Button onClick={onClose} variant="contained">Aceptar</Button>
                    </>
                )}
            </DialogActions>
        </Dialog>
    )
}
