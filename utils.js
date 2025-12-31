import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export function createPageUrl(pageName) {
    if (!pageName) return "/";
    // Normalize path, ensuring it starts with /
    return pageName.startsWith("/") ? pageName : `/${pageName}`;
}
export function formatDisplayDate(dateStr) {
    if (!dateStr) return "-";
    // If it's a full ISO string or already has time, parse normally
    if (dateStr.toString().includes('T')) {
        return new Date(dateStr).toLocaleDateString('pt-BR');
    }
    // For YYYY-MM-DD, parse manually to avoid timezone shift
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        const date = new Date(parts[0], parts[1] - 1, parts[2]);
        return date.toLocaleDateString('pt-BR');
    }
    return new Date(dateStr).toLocaleDateString('pt-BR');
}
