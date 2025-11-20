import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import MembershipPayment from '../presentation/pages/membresia/MembershipPayment';
import MembershipDashboard from '../presentation/pages/membresia/MembershipDashboard';
import { PrivateRoute } from './PrivateRoute';

export const MembershipRoutes = () => {
    return (
        <Routes>
            <Route path="pago" element={<MembershipPayment />} />
            <Route
                path="dashboard"
                element={
                    <PrivateRoute>
                        <MembershipDashboard />
                    </PrivateRoute>
                }
            />
        </Routes>
    );
};