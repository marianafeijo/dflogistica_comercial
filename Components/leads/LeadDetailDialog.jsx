import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Building2, Mail, Phone, MapPin, Calendar, User, FileText, CheckCircle, XCircle, Truck } from "lucide-react";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { startOfMonth, isSameMonth, parseISO, isValid } from 'date-fns';
import { ptBR } from "date-fns/locale";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { TrendingUp, Package, Weight, ArrowRight } from "lucide-react";

export default function LeadDetailDialog({ lead, onClose }) {
    const [selectedMonth, setSelectedMonth] = React.useState(new Date());

    const { data: proposals = [] } = useQuery({
        queryKey: ['proposals'],
        queryFn: () => base44.entities.Proposal.list(),
    });

    if (!lead) return null;

    // Calculate ABC Classification logic
    const clientProfitStats = proposals.reduce((acc, p) => {
        const profit = p.status === 'Finalizada' ? (p.lucroReal || 0) : (p.lucroEstimado || 0);
        acc[p.leadId] = (acc[p.leadId] || 0) + profit;
        return acc;
    }, {});

    const sortedProfits = Object.values(clientProfitStats).sort((a, b) => b - a);
    const clientProfit = clientProfitStats[lead.id] || 0;

    let classification = "C";
    if (sortedProfits.length > 0) {
        const rank = sortedProfits.indexOf(clientProfit);
        const percentile = (rank / sortedProfits.length) * 100;

        if (percentile <= 20) classification = "A";
        else if (percentile <= 70) classification = "B";
    }

    const classColors = {
        "A": "bg-green-100 text-green-700 border-green-200",
        "B": "bg-blue-100 text-blue-700 border-blue-200",
        "C": "bg-gray-100 text-gray-700 border-gray-200"
    };

    // Filter proposals for this client and month
    const clientProposals = proposals.filter(p => p.leadId === lead.id);

    const availableMonths = Array.from(new Set(
        clientProposals
            .map(p => p.dataAceite ? startOfMonth(parseISO(p.dataAceite)).getTime() : null)
            .filter(Boolean)
    ))
        .map(t => new Date(t))
        .sort((a, b) => b - a);

    // If current month is not in available, add it defensively
    if (!availableMonths.some(m => isSameMonth(m, new Date()))) {
        availableMonths.unshift(startOfMonth(new Date()));
    }

    const filteredProposals = clientProposals.filter(p => {
        if (!p.dataAceite) return false;
        return isSameMonth(parseISO(p.dataAceite), selectedMonth);
    });

    const monthStats = filteredProposals.reduce((acc, p) => {
        acc.profit += p.status === 'Finalizada' ? (p.lucroReal || 0) : (p.lucroEstimado || 0);
        acc.shipments += 1;
        acc.tons += (p.toneladas || 0);
        return acc;
    }, { profit: 0, shipments: 0, tons: 0 });

    return (
        <Dialog open={!!lead} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 border-0 rounded-3xl overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
                    <DialogHeader>
                        <div className="flex justify-between items-start">
                            <DialogTitle className="text-3xl font-bold flex items-center gap-3">
                                <Building2 className="w-8 h-8 opacity-80" />
                                {lead.empresa}
                            </DialogTitle>
                            <Badge className={`${classColors[classification]} text-lg px-4 py-1 rounded-full border-2 font-black shadow-lg`}>
                                CLASSIFICAÇÃO {classification}
                            </Badge>
                        </div>
                    </DialogHeader>
                </div>

                <Tabs defaultValue="detalhes" className="w-full">
                    <TabsList className="w-full justify-start rounded-none border-b bg-white px-6 h-14">
                        <TabsTrigger value="detalhes" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none h-14 px-8 font-semibold">
                            Detalhes do Cliente
                        </TabsTrigger>
                        <TabsTrigger value="perfil" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none h-14 px-8 font-semibold">
                            Perfil Comercial
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="detalhes" className="p-8 space-y-8 animate-in fade-in duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <Card className="border-0 bg-gray-50/40 shadow-none ring-1 ring-gray-100">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-xs font-bold uppercase text-gray-400 tracking-widest flex items-center gap-2">
                                            <Building2 className="w-4 h-4 text-blue-500" />
                                            Informações Gerais
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex justify-between items-center py-2 border-b border-gray-100/50">
                                            <span className="text-sm text-gray-500">Segmento</span>
                                            <Badge variant="secondary" className="bg-white border text-blue-700 font-bold">{lead.setor}</Badge>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-gray-100/50">
                                            <span className="text-sm text-gray-500">Localização</span>
                                            <Badge variant="outline" className="bg-white border font-mono font-bold">{lead.estado}</Badge>
                                        </div>
                                        <div className="flex justify-between items-center py-2">
                                            <span className="text-sm text-gray-500">Data de Cadastro</span>
                                            <span className="text-sm font-bold text-gray-700">{isValid(new Date(lead.data_cadastro)) ? format(new Date(lead.data_cadastro), 'dd/MM/yyyy') : 'N/A'}</span>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-0 bg-blue-50/30 shadow-none ring-1 ring-blue-100">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-xs font-bold uppercase text-blue-400 tracking-widest flex items-center gap-2">
                                            <User className="w-4 h-4 text-blue-500" />
                                            Gestão e Responsável
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                                                {lead.responsavel?.[0]?.toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-tighter">Responsável Comercial</p>
                                                <p className="text-sm font-black text-blue-900">{lead.responsavel?.split('@')[0]}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="space-y-6">
                                <Card className="border-0 bg-white shadow-xl shadow-blue-900/5 ring-1 ring-gray-100">
                                    <CardHeader className="pb-3 border-b border-gray-50">
                                        <CardTitle className="text-xs font-bold uppercase text-gray-400 tracking-widest flex items-center gap-2">
                                            <Phone className="w-4 h-4 text-green-500" />
                                            Contatos para Feedback
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-6 space-y-6">
                                        <div className="p-4 bg-green-50/50 rounded-2xl border border-green-100/50 group hover:bg-green-50 transition-colors">
                                            <p className="text-[10px] font-bold text-green-600 uppercase mb-2">Contato Principal</p>
                                            <p className="text-lg font-black text-gray-900 mb-4">{lead.nome_contato || 'Não informado'}</p>

                                            <div className="space-y-3">
                                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                                    <Mail className="w-4 h-4 text-gray-400 group-hover:text-green-500" />
                                                    <span className="font-medium">{lead.email || '---'}</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                                    <Phone className="w-4 h-4 text-gray-400 group-hover:text-green-500" />
                                                    <span className="font-medium font-mono">{lead.telefone || '---'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {lead.resumo && (
                                    <div className="bg-gray-50/50 p-6 rounded-3xl border border-dashed border-gray-200">
                                        <div className="flex items-center gap-2 mb-3">
                                            <FileText className="w-5 h-5 text-gray-400" />
                                            <p className="font-bold text-gray-700 uppercase text-xs tracking-wider">Anotações do Cliente</p>
                                        </div>
                                        <p className="text-gray-600 text-sm italic leading-relaxed">"{lead.resumo}"</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="perfil" className="p-8 space-y-8 animate-in fade-in duration-300">
                        <div className="flex justify-between items-center bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                            <div>
                                <h3 className="font-bold text-blue-900">Análise de Performance</h3>
                                <p className="text-xs text-blue-600">Métricas consolidadas de faturamento e volume</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-blue-700 uppercase">Período:</span>
                                <Select value={selectedMonth.getTime().toString()} onValueChange={(val) => setSelectedMonth(new Date(parseInt(val)))}>
                                    <SelectTrigger className="w-[200px] h-9 bg-white shadow-sm border-blue-200 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableMonths.map(m => (
                                            <SelectItem key={m.getTime()} value={m.getTime().toString()}>
                                                {format(m, "MMMM 'de' yyyy", { locale: ptBR })}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card className="border-0 bg-white shadow-sm ring-1 ring-gray-100">
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
                                            <TrendingUp className="w-6 h-6" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Lucro no Mês</p>
                                    <p className="text-2xl font-black text-gray-900">R$ {monthStats.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                </CardContent>
                            </Card>

                            <Card className="border-0 bg-white shadow-sm ring-1 ring-gray-100">
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                                            <Package className="w-6 h-6" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Nº de Embarques</p>
                                    <p className="text-2xl font-black text-gray-900">{monthStats.shipments} <span className="text-sm font-normal text-gray-400">processos</span></p>
                                </CardContent>
                            </Card>

                            <Card className="border-0 bg-white shadow-sm ring-1 ring-gray-100">
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                                            <Weight className="w-6 h-6" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total de Toneladas</p>
                                    <p className="text-2xl font-black text-gray-900">{monthStats.tons.toLocaleString()} <span className="text-sm font-normal text-gray-400">ton</span></p>
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="border-0 shadow-sm ring-1 ring-gray-100 overflow-hidden">
                            <CardHeader className="bg-gray-50/50 py-4">
                                <CardTitle className="text-xs font-bold uppercase text-gray-500 tracking-widest flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    Detalhamento dos Processos ({format(selectedMonth, 'MMMM/yyyy', { locale: ptBR })})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader className="bg-white">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="text-[10px] uppercase font-bold text-gray-400 px-6">Documento / Processo</TableHead>
                                            <TableHead className="text-[10px] uppercase font-bold text-gray-400">Rota</TableHead>
                                            <TableHead className="text-[10px] uppercase font-bold text-gray-400 text-center">Peso</TableHead>
                                            <TableHead className="text-[10px] uppercase font-bold text-gray-400 text-right px-6">Lucro</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredProposals.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center py-10 text-gray-400 italic text-sm">Nenhum processo neste período.</TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredProposals.map(p => (
                                                <TableRow key={p.id} className="group hover:bg-blue-50/30 transition-colors">
                                                    <TableCell className="px-6">
                                                        <div className="font-mono text-[11px] font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded w-fit mb-1">{p.processoInterno || '---'}</div>
                                                        <div className="text-[10px] text-gray-500 font-medium">CRT: <span className="text-blue-600 font-bold">{p.crtIdentifier || 'PENDENTE'}</span></div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[11px] font-bold text-gray-700">{p.origem}</span>
                                                            <ArrowRight className="w-3 h-3 text-gray-300 group-hover:text-blue-400 transition-colors" />
                                                            <span className="text-[11px] font-bold text-gray-700">{p.destino}</span>
                                                        </div>
                                                        <div className="text-[9px] text-gray-400 font-medium">{p.tipoCaminhao}</div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant="outline" className="text-[10px] font-bold border-gray-200 text-gray-600 bg-white">
                                                            {p.toneladas || 0} t
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right px-6">
                                                        <p className="text-[11px] font-black text-green-600">R$ {(p.status === 'Finalizada' ? p.lucroReal : p.lucroEstimado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                                        <Badge variant="outline" className={`text-[8px] py-0 px-1 border-0 h-4 ${p.status === 'Finalizada' ? 'bg-slate-800 text-white' : 'bg-orange-100 text-orange-700'}`}>
                                                            {p.status}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}