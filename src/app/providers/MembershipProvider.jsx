import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as membershipService from '../services/membershipService';

const MembershipContext = createContext();

export function MembershipProvider({ children }) {
    const [actionLoading, setActionLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(true);
    const [error, setError] = useState(null);
    const [membershipData, setMembershipData] = useState(null);

    const loadMembershipData = useCallback(async () => {
        setDataLoading(true);
        try {
            const data = await membershipService.getCurrentMembership();
            setMembershipData(data);
        } catch (err) {
            setError(err.message);
            console.error('Error loading membership data:', err);
        } finally {
            setDataLoading(false);
        }
    }, []);

    useEffect(() => {
        loadMembershipData();
    }, [loadMembershipData]);

    const handlePurchaseMembership = async (paymentData, token) => {
        setActionLoading(true);
        setError(null);
        try {
            const result = await membershipService.processMembershipPayment(paymentData, token);
            if (result.wompiRedirectUrl) {
                membershipService.redirectToWompi(result.wompiRedirectUrl);
            }
            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setActionLoading(false);
        }
    };

    const handleCreateMembershipParametrization = async (parametrizationData, metasploitToken) => {
        setActionLoading(true);
        setError(null);
        try {
            const result = await membershipService.createMembershipParametrization(parametrizationData, metasploitToken);
            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setActionLoading(false);
        }
    };

    const value = {
        membership: membershipData,
        isLoading: dataLoading,
        actionLoading,
        error,
        hasActiveMembership: !!membershipData && membershipData.status === 'active',
        purchaseMembership: handlePurchaseMembership,
        createMembershipParametrization: handleCreateMembershipParametrization,
        refreshMembershipData: loadMembershipData,
    };

    return (
        <MembershipContext.Provider value={value}>
            {children}
        </MembershipContext.Provider>
    );
}

export function useMembership() {
    const context = useContext(MembershipContext);
    if (!context) {
        throw new Error('useMembership must be used within a MembershipProvider');
    }
    return context;
}