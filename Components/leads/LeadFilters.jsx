import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { X, Search, Filter } from "lucide-react";

const SETORES = [
    "Alimentício", "Automotivo", "Construção", "Eletrônicos", "Farmacêutico",
    "Têxtil", "Químico", "Agro", "Outro"
];

const ESTADOS = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
    "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
    "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

export default function LeadFilters({
    filters,
    setFilters,
    searchTerm,
    setSearchTerm,
    showFilters,
    setShowFilters
}) {
    const clearFilters = () => setFilters({});

    // Count active filters (excluding searchTerm)
    const activeFiltersCount = Object.keys(filters).length;

    return (
        <div className="space-y-4">
            {/* Search Bar and Filter Toggle */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                        placeholder="Buscar por empresa, e-mail ou responsável..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className="gap-2"
                >
                    <Filter className="w-4 h-4" />
                    Filtros {activeFiltersCount > 0 && `(${activeFiltersCount})`}
                </Button>
            </div>

            {/* Advanced Filters Area */}
            {showFilters && (
                <div className="p-4 bg-gray-50 rounded-lg space-y-4 border border-gray-100 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-sm text-gray-700">Filtros Avançados</h3>
                        {activeFiltersCount > 0 && (
                            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2 h-8 text-red-600 hover:text-red-700 hover:bg-red-50">
                                <X className="w-4 h-4" />
                                Limpar Filtros
                            </Button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Select
                            value={filters.tipo || ''}
                            onValueChange={(value) => setFilters({ ...filters, tipo: value || undefined })}
                        >
                            <SelectTrigger className="bg-white">
                                <SelectValue placeholder="Tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Prospecção">Prospecção</SelectItem>
                                <SelectItem value="Cotando">Cotando</SelectItem>
                                <SelectItem value="Cliente Ativo">Cliente Ativo</SelectItem>
                                <SelectItem value="Cliente Inativo">Cliente Inativo</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select
                            value={filters.setor || ''}
                            onValueChange={(value) => setFilters({ ...filters, setor: value || undefined })}
                        >
                            <SelectTrigger className="bg-white">
                                <SelectValue placeholder="Setor" />
                            </SelectTrigger>
                            <SelectContent>
                                {SETORES.map(setor => (
                                    <SelectItem key={setor} value={setor}>{setor}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={filters.estado || ''}
                            onValueChange={(value) => setFilters({ ...filters, estado: value || undefined })}
                        >
                            <SelectTrigger className="bg-white">
                                <SelectValue placeholder="Estado" />
                            </SelectTrigger>
                            <SelectContent>
                                {ESTADOS.map(estado => (
                                    <SelectItem key={estado} value={estado}>{estado}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="space-y-1">
                            <span className="text-xs text-gray-500 font-medium ml-1">Mês de Cadastro</span>
                            <Input
                                type="month"
                                value={filters.mes_cadastro || ''}
                                onChange={(e) => setFilters({ ...filters, mes_cadastro: e.target.value || undefined })}
                                className="bg-white"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}