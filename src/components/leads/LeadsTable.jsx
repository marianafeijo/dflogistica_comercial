import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Trash2, CheckCircle, XCircle, Pencil } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { createPageUrl, formatDisplayDate } from "@/utils";

export default function LeadsTable({ leads, isLoading, onDelete, onView, onToggleConvertido, onUpdate }) {
    const navigate = useNavigate();
    if (isLoading) {
        return (
            <div className="p-6">
                {Array(5).fill(0).map((_, i) => (
                    <div key={i} className="flex gap-4 mb-4">
                        <Skeleton className="h-12 flex-1" />
                        <Skeleton className="h-12 w-32" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Contato</TableHead>
                        <TableHead>Setor</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Responsável</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {leads.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={12} className="text-center py-8 text-gray-500">
                                Nenhum lead encontrado
                            </TableCell>
                        </TableRow>
                    ) : (
                        leads.map((lead) => (
                            <TableRow key={lead.id} className="hover:bg-gray-50">
                                <TableCell>{formatDisplayDate(lead.data_cadastro)}</TableCell>
                                <TableCell className="font-medium">{lead.empresa}</TableCell>
                                <TableCell className="text-sm">{lead.nome_contato || '-'}</TableCell>
                                <TableCell>{lead.setor}</TableCell>
                                <TableCell>{lead.estado}</TableCell>
                                <TableCell>
                                    <Select
                                        value={lead.tipo}
                                        onValueChange={(value) => onUpdate({ id: lead.id, data: { tipo: value } })}
                                    >
                                        <SelectTrigger className="h-8 w-[140px] border-0 bg-transparent hover:bg-gray-100 p-2 focus:ring-0">
                                            <SelectValue>
                                                <Badge variant={lead.tipo === 'Prospecção' ? 'default' : 'secondary'}>
                                                    {lead.tipo}
                                                </Badge>
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Prospecção">Prospecção</SelectItem>
                                            <SelectItem value="Cotando">Cotando</SelectItem>
                                            <SelectItem value="Cliente Ativo">Cliente Ativo</SelectItem>
                                            <SelectItem value="Cliente Inativo">Cliente Inativo</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                {/* Botão de convertido removido */}
                                <TableCell className="text-sm text-gray-600">
                                    {lead.responsavel?.split('@')[0]}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => navigate(createPageUrl(`editar-lead/${lead.id}`))}
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onView(lead)}
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onDelete(lead.id)}
                                            className="hover:bg-red-50 hover:text-red-600"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}