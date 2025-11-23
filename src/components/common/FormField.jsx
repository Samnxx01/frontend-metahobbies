import { Input } from "@/components/ui/input"

import { Label } from "@/components/ui/label"
export default function FormField({ id, label, value, onChange, type = "text", required = false, placeholder = "" }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Input
        id={id}
        type={type}
        required={required}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full"
      />
    </div>
  );
}
