import { BTN_ACTION } from '@/app/utils/buttonStyles';
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
                return 'text-secondary-foreground';
            default:
                return 'text-primary';
        }
    };

    const getButtonStyles = () => {
        switch (variant) {
            case 'primary':
            case 'secondary':
            default:
                return BTN_ACTION;
        }
    };

    return (
        <Card 
            className="
                rounded-xl p-6 
                shadow-sm border-0
                bg-card h-full 
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
                className={`w-full font-bold rounded-lg text-sm shadow-none ${getButtonStyles()}`}
            >
                Acceder
            </Button>
        </Card>
    );
}
