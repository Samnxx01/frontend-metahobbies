import { Button } from '@/components/ui/button';
import type { ButtonPrimaryProps } from '@/types/components';

export default function ButtonPrimary({
    children,
    variant = 'default',
    ...props
}: ButtonPrimaryProps): React.ReactElement {
    return (
        <Button
            variant={variant}
            {...props}
        >
            {children}
        </Button>
    );
}
