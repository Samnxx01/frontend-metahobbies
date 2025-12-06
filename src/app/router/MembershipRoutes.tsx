import { Route, Routes } from 'react-router-dom';
import { ReactElement } from 'react';
import MembershipPayment from '../presentation/pages/membresia/MembershipPayment';
import MembershipDashboard from '../presentation/pages/membresia/MembershipDashboard';
import { PrivateRoute } from './PrivateRoute';

export const MembershipRoutes = (): ReactElement => {
    return (
        <Routes>
            <Route path="pago/:token" element={<MembershipPayment />} />
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