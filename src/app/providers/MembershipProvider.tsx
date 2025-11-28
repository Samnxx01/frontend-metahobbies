import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as membershipService from '../services/membershipService';
import type { 
    MembershipPaymentResponse, 
    PaymentData,
    MembershipParametrizationData 
} from '../services/membershipService';
import type { ApiResponse, CurrentMembershipData } from '../../types/common';

interface MembershipContextType {
    membership: CurrentMembershipData | null;
    isLoading: boolean;
    actionLoading: boolean;
    error: string | null;
    hasActiveMembership: boolean;
    purchaseMembership: (paymentData: PaymentData, token: string) => Promise<MembershipPaymentResponse>;
    createMembershipParametrization: (parametrizationData: MembershipParametrizationData, metasploitToken: string) => Promise<ApiResponse>;
    refreshMembershipData: () => Promise<void>;
}

interface MembershipProviderProps {
    children: ReactNode;
}

const MembershipContext = createContext<MembershipContextType | null>(null);

export function MembershipProvider({ children }: MembershipProviderProps) {
    const [actionLoading, setActionLoading] = useState<boolean>(false);
    const [dataLoading, setDataLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [membershipData, setMembershipData] = useState<CurrentMembershipData | null>(null);

    const loadMembershipData = useCallback(async (): Promise<void> => {
        setDataLoading(true);
        try {
            const data = await membershipService.getCurrentMembership();
            setMembershipData(data);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            console.error('Error loading membership data:', err);
        } finally {
            setDataLoading(false);
        }
    }, []);

    useEffect(() => {
        loadMembershipData();
    }, [loadMembershipData]);

    const handlePurchaseMembership = async (paymentData: PaymentData, token: string): Promise<MembershipPaymentResponse> => {
        setActionLoading(true);
        setError(null);
        try {
            const result = await membershipService.processMembershipPayment(paymentData, token);
            if (result.data?.wompiLink) {
                membershipService.redirectToWompi(result.data.wompiLink);
            }
            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            throw err;
        } finally {
            setActionLoading(false);
        }
    };

    const handleCreateMembershipParametrization = async (parametrizationData: MembershipParametrizationData, metasploitToken: string): Promise<ApiResponse> => {
        setActionLoading(true);
        setError(null);
        try {
            const result = await membershipService.createMembershipParametrization(parametrizationData, metasploitToken);
            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            throw err;
        } finally {
            setActionLoading(false);
        }
    };

    const value: MembershipContextType = {
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

export function useMembership(): MembershipContextType {
    const context = useContext(MembershipContext);
    if (!context) {
        throw new Error('useMembership must be used within a MembershipProvider');
    }
    return context;
}