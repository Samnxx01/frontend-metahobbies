import { useState, useEffect } from 'react';
import { getCurrentMembership } from '../services/membershipService';
import type { CurrentMembershipData } from '../../types/common';

// Interface for the hook return value
interface UseMembershipReturn {
    membership: CurrentMembershipData | null;
    isLoading: boolean;
    hasActiveMembership: boolean;
    refreshMembership: () => Promise<void>;
}

export const useMembership = (): UseMembershipReturn => {
    const [membershipData, setMembershipData] = useState<CurrentMembershipData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        loadMembershipData();
    }, []);

    const loadMembershipData = async (): Promise<void> => {
        try {
            const data = await getCurrentMembership();
            setMembershipData(data);
        } catch (error) {
            console.error('Error loading membership data:', error);
            setMembershipData(null);
        } finally {
            setLoading(false);
        }
    };

    const refreshMembership = async (): Promise<void> => {
        setLoading(true);
        await loadMembershipData();
    };

    return {
        membership: membershipData,
        isLoading: loading,
        hasActiveMembership: !!membershipData && membershipData.status === 'active',
        refreshMembership,
    };
};