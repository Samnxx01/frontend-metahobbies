import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { QuickAccessCardProps } from '@/types/components';

export default function QuickAccessCard({ 
    title, 
    description, 
    icon, 
    onClick, 
    variant = 'default' 
}: QuickAccessCardProps): React.ReactElement {
    const getVariantStyles = () => {
        switch (variant) {
            case 'primary':
                return 'text-primary';
            case 'secondary':
                return 'text-secondary';
            default:
                return 'text-pink-600';
        }
    };

    const getButtonStyles = () => {
        switch (variant) {
            case 'primary':
                return 'bg-primary/20 text-primary hover:bg-primary/30';
            case 'secondary':
                return 'bg-secondary/20 text-secondary hover:bg-secondary/30';
            default:
                return 'bg-pink-100 text-pink-600 hover:bg-pink-200';
        }
    };

    return (
        <Card 
            className="
                rounded-xl p-6 
                shadow-sm border-0
                bg-white h-full 
                flex flex-col
            "
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
        >
            <div className="flex items-center gap-3 mb-3">
                {icon}
                <h3 className={`text-lg font-bold ${getVariantStyles()}`}>
                    {title}
                </h3>
            </div>
            
            <p className="text-sm text-muted-foreground mb-auto py-2">
                {description}
            </p>
            
            <Button 
                onClick={onClick}
                className={`
                    w-full font-bold rounded-lg 
                    text-sm shadow-none
                    ${getButtonStyles()}
                `}
                variant="secondary"
            >
                Acceder
            </Button>
        </Card>
    );
}