import { Button } from '@/components/ui/button';

export default function ButtonPrimary({ children, variant = 'default', ...props }) {
    return (
        <Button
            variant={variant}
            {...props}
        >
            {children}
        </Button>
    )
}
