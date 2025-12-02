import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import type { SearchBarProps } from '@/types/components';

export default function SearchBar({ 
    placeholder = "Buscar productos...",
    onSearchChange,
    value,
    onChange,
    onSearch,
    ...props 
}: SearchBarProps = {}): React.ReactElement {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const newValue = e.target.value;
        onSearchChange?.(newValue);
        onChange?.(newValue);
    };

    return (
        <div className="relative w-full max-w-[500px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={handleChange}
                className="pl-10 bg-muted/50 border-none rounded-xl"
                {...props}
            />
        </div>
    );
}