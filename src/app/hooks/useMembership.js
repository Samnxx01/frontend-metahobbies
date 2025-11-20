import { useState, useEffect } from 'react';
import { getCurrentMembership } from '../services/membershipService';

export const useMembership = () => {
    const [membershipData, setMembershipData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadMembershipData();
    }, []);

    const loadMembershipData = async () => {
        try {
            const data = await getCurrentMembership();
            setMembershipData(data);
        } catch (error) {
            console.error('Error loading membership data:', error);
        } finally {
            setLoading(false);
        }
    };

    return {
        membership: membershipData,
        isLoading: loading,
        hasActiveMembership: !!membershipData && membershipData.status === 'active',
    };
};