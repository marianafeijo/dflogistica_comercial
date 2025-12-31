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
import { X } from "lucide-react";

const SETORES = [
    "Alimentício", "Automotivo", "Construção", "Eletrônicos", "Farmacêutico",
    "Têxtil", "Químico", "Agro", "Outro"
];

const ESTADOS = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
    "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
    "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

export default function LeadFilters({ filters, setFilters }) {
    const clearFilters = () => setFilters({});

    return (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
            <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Filtros Avançados</h3>
                {Object.keys(filters).length > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2">
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
                    <SelectTrigger>
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
                    <SelectTrigger>
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
                    <SelectTrigger>
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
    );
}