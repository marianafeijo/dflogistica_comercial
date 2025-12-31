import React from "react";
import { Input } from "./ui/input";

export function CurrencyInput({ value, onChange, placeholder, className, prefix = "R$ " }) {
    const handleChange = (e) => {
        let rawValue = e.target.value.replace(/\D/g, "");

        // Remove leading zeros
        rawValue = rawValue.replace(/^0+/, "");

        if (rawValue === "") {
            onChange(0);
            return;
        }

        const numericValue = parseFloat(rawValue) / 100;
        onChange(numericValue);
    };

    const formattedValue = new Intl.NumberFormat("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value || 0);

    return (
        <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                {prefix}
            </div>
            <Input
                type="text"
                value={formattedValue}
                onChange={handleChange}
                placeholder={placeholder}
                className={`pl-10 ${className}`}
            />
        </div>
    );
}
