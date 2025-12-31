import React, { useMemo, useState } from "react";
import { format, parseISO, startOfMonth, endOfMonth, isBefore, isSameMonth, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import { Users, TrendingUp, DollarSign, Package, CheckCircle2, Download } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function Comissoes() {
    const { data: users = [] } = useQuery({
        queryKey: ['users'],
        queryFn: () => base44.entities.User.list(),
    });

    const { data: proposals = [] } = useQuery({
        queryKey: ['proposals'],
        queryFn: () => base44.entities.Proposal.list(),
    });

    const { data: leads = [] } = useQuery({
        queryKey: ['leads'],
        queryFn: () => base44.entities.Lead.list(),
    });

    const [selectedDate, setSelectedDate] = useState(new Date());

    const availableMonths = useMemo(() => {
        const dates = proposals
            .map(p => {
                if (!p.dataAceite) return null;
                const d = parseISO(p.dataAceite);
                return isValid(d) ? startOfMonth(d) : null;
            })
            .filter(Boolean);

        // Add current month if not present
        dates.push(startOfMonth(new Date()));

        const uniqueMonths = Array.from(new Set(dates.map(d => d.getTime())))
            .map(t => new Date(t))
            .sort((a, b) => b - a);

        return uniqueMonths;
    }, [proposals]);

    const sellers = useMemo(() => users.filter(u => {
        const roles = u.roles || (u.role ? [u.role] : []);
        return roles.includes('Vendedor') || roles.includes('Gestor');
    }), [users]);

    const sellerStats = useMemo(() => {
        const targetMonth = startOfMonth(selectedDate);
        const nextMonth = startOfMonth(new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 1));

        return sellers.map(seller => {
            // Filter proposals based on rollover logic:
            // 1. Accepted in the target month
            // 2. Accepted BEFORE target month AND (not invoiced OR invoiced in/after target month)
            // Wait, if it was invoiced in a later month, it should show as "Não" faturado in the current month view.

            const visibleProposals = proposals
                .filter(p => {
                    if (p.vendedorId !== seller.id) return false;
                    if (p.status !== 'Aceita' && p.status !== 'Finalizada') return false;
                    if (!p.dataAceite) return false;

                    const dateAceite = parseISO(p.dataAceite);
                    if (!isValid(dateAceite)) return false;
                    const monthAceite = startOfMonth(dateAceite);

                    // Scenario 1: Exactly in this month
                    if (isSameMonth(dateAceite, targetMonth)) return true;

                    // Scenario 2: Rollover from previous months
                    if (isBefore(monthAceite, targetMonth)) {
                        // If not faturado yet, it rolls over
                        if (!p.faturado) return true;

                        // If faturado, check WHEN. Only show if faturado in the CURRENT target month
                        const dateFaturado = p.dataFaturado ? parseISO(p.dataFaturado) : null;
                        if (dateFaturado && isValid(dateFaturado) && isSameMonth(dateFaturado, targetMonth)) return true;
                    }

                    return false;
                })
                .sort((a, b) => new Date(a.dataAceite || 0) - new Date(b.dataAceite || 0));

            const META_OPERACIONAL = 34; // 34 shipments target
            const targetFinancial = seller.meta_financeira || 0;

            let runningProfit = 0;
            let runningCount = 0;
            let totalCommission = 0;

            const enrichedProposals = visibleProposals.map(p => {
                const profit = p.lucroReal || p.lucroEstimado || 0;

                const currentProfit = runningProfit;
                const currentCount = runningCount;

                const isFinancialMet = targetFinancial > 0 && currentProfit >= targetFinancial;
                const isOperationalMet = currentCount >= META_OPERACIONAL;
                const isGoalMet = isFinancialMet || isOperationalMet;

                let commissionBase = 0;

                if (isGoalMet) {
                    const totalProfitAfterThis = runningProfit + profit;
                    const commissionableTotal = Math.max(0, totalProfitAfterThis - targetFinancial);
                    const totalProfitBeforeThis = runningProfit;
                    const commissionablePre = Math.max(0, totalProfitBeforeThis - targetFinancial);
                    commissionBase = Math.max(0, commissionableTotal - commissionablePre);
                } else {
                    const meetsFinNow = targetFinancial > 0 && (runningProfit + profit) >= targetFinancial;
                    const meetsOpNow = (runningCount + 1) >= META_OPERACIONAL;
                    if (meetsFinNow || meetsOpNow) {
                        const totalProfitAfterThis = runningProfit + profit;
                        const commissionableTotal = Math.max(0, totalProfitAfterThis - targetFinancial);
                        commissionBase = commissionableTotal;
                    }
                }

                const individualCommission = commissionBase * (seller.porcentagem_comissao || 0) / 100;

                runningProfit += profit;
                runningCount += 1;
                totalCommission += individualCommission;

                return {
                    ...p,
                    profitShow: profit,
                    individualCommission
                };
            });

            return {
                ...seller,
                acceptedProposals: enrichedProposals,
                totalLucro: runningProfit,
                totalCount: runningCount,
                percentFinancial: targetFinancial > 0 ? Math.min((runningProfit / targetFinancial) * 100, 100) : 100,
                percentOperational: Math.min((runningCount / META_OPERACIONAL) * 100, 100),
                remainingFinancial: Math.max(targetFinancial - runningProfit, 0),
                remainingOperational: Math.max(META_OPERACIONAL - runningCount, 0),
                commission: totalCommission,
                count: visibleProposals.length,
                metaOperacional: META_OPERACIONAL
            };
        });
    }, [sellers, proposals, selectedDate]);

    const exportToExcel = (seller) => {
        const rows = [
            ["Vendedor", "Lead", "Documento", "Valor USD", "Lucro Estimado", "Comissao"],
            ...seller.acceptedProposals.map(p => {
                const lead = leads.find(l => l.id === p.leadId);
                return [
                    seller.full_name,
                    lead?.empresa || "N/A",
                    p.crtIdentifier || "N/A",
                    p.freteDolar,
                    p.profitShow,
                    p.individualCommission
                ];
            })
        ];

        const csvContent = "data:text/csv;charset=utf-8,"
            + rows.map(e => e.join(";")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `comissoes_${seller.full_name.replace(/\s+/g, '_').toLowerCase()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-6 space-y-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Gestão de Comissões</h1>
                    <p className="text-gray-600 mt-1">Acompanhamento de metas financeiras e performance comercial</p>
                </div>
                <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-blue-100">
                    <span className="text-sm font-semibold text-gray-500 ml-2">Mês:</span>
                    <Select
                        value={selectedDate.getTime().toString()}
                        onValueChange={(val) => setSelectedDate(new Date(parseInt(val)))}
                    >
                        <SelectTrigger className="w-[180px] h-10 border-0 shadow-none focus:ring-0">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {availableMonths.map(month => (
                                <SelectItem key={month.getTime()} value={month.getTime().toString()}>
                                    {format(month, "MMMM 'de' yyyy", { locale: ptBR })}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {sellerStats.map((seller) => (
                    <Card key={seller.id} className="shadow-xl border-0 rounded-3xl overflow-hidden bg-white/80 backdrop-blur-md">
                        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                        <Users className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl">{seller.full_name}</CardTitle>
                                        <CardDescription className="text-blue-100">{seller.email}</CardDescription>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <div className="text-sm uppercase tracking-widest text-blue-200">Comissão Acumulada</div>
                                        <div className="text-3xl font-black">R$ {seller.commission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="bg-white/10 hover:bg-white/20 text-white rounded-xl"
                                        onClick={() => exportToExcel(seller)}
                                        title="Exportar para Excel"
                                    >
                                        <Download className="w-5 h-5" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Stats Cards */}
                                <div className="space-y-4">
                                    <div className="bg-blue-50 p-4 rounded-2xl flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-blue-600 font-bold uppercase">Embarques Fechados</p>
                                            <p className="text-2xl font-bold text-blue-900">{seller.count}</p>
                                        </div>
                                        <Package className="w-8 h-8 text-blue-300" />
                                    </div>
                                    <div className="bg-green-50 p-4 rounded-2xl flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-green-600 font-bold uppercase">Lucro Gerado</p>
                                            <p className="text-2xl font-bold text-green-900">R$ {seller.totalLucro.toLocaleString()}</p>
                                        </div>
                                        <TrendingUp className="w-8 h-8 text-green-300" />
                                    </div>
                                    <div className="bg-orange-50 p-4 rounded-2xl flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-orange-600 font-bold uppercase">Meta Financeira</p>
                                            <p className="text-2xl font-bold text-orange-900">R$ {seller.meta_financeira?.toLocaleString()}</p>
                                        </div>
                                        <DollarSign className="w-8 h-8 text-orange-300" />
                                    </div>

                                    {(seller.remainingFinancial > 0 && seller.remainingOperational > 0) ? (
                                        <div className="p-4 border-2 border-dashed border-gray-200 rounded-2xl space-y-2">
                                            <p className="text-sm text-gray-500">
                                                Faltam <span className="font-bold text-gray-900">R$ {seller.remainingFinancial.toLocaleString()}</span>
                                            </p>
                                            <p className="text-xs text-gray-400 font-bold uppercase text-center">- OU -</p>
                                            <p className="text-sm text-gray-500">
                                                Faltam <span className="font-bold text-gray-900">{seller.remainingOperational} embarques</span>
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-green-50 border-2 border-green-500 rounded-2xl text-center flex flex-col items-center justify-center gap-2">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                                                <p className="text-sm font-bold text-green-700">META ATINGIDA!</p>
                                            </div>
                                            <div className="text-xs text-green-600 font-medium">
                                                {seller.remainingFinancial <= 0 ? "Financeiro OK" : ""}
                                                {(seller.remainingFinancial <= 0 && seller.remainingOperational <= 0) ? " & " : ""}
                                                {seller.remainingOperational <= 0 ? "Volume OK" : ""}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Chart */}
                                <div className="lg:col-span-1 h-[250px] flex flex-col items-center">
                                    <p className="text-sm font-bold text-gray-500 mb-4 uppercase">Progresso da Meta</p>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { name: 'Atingido', value: seller.totalLucro },
                                                    { name: 'Faltante', value: seller.remainingFinancial }
                                                ]}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                <Cell fill="#3b82f6" />
                                                <Cell fill="#e5e7eb" />
                                            </Pie>
                                            <Tooltip formatter={(value) => `R$ ${value.toLocaleString()}`} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="text-center mt-[-130px] mb-[100px] flex flex-col gap-1">
                                        <span className="text-xl font-black text-blue-600">{seller.percentFinancial.toFixed(0)}% Fin</span>
                                        <span className="text-sm font-bold text-gray-400">{seller.percentOperational.toFixed(0)}% Vol</span>
                                    </div>
                                </div>

                                {/* Proposals Table */}
                                <div className="lg:col-span-1">
                                    <p className="text-sm font-bold text-gray-500 mb-4 uppercase">Ultimas Propostas Fechadas</p>
                                    <div className="border rounded-xl overflow-hidden">
                                        <Table>
                                            <TableHeader className="bg-gray-50">
                                                <TableRow>
                                                    <TableHead className="text-xs">Lead / Doc / Processo</TableHead>
                                                    <TableHead className="text-xs text-right">Lucro</TableHead>
                                                    <TableHead className="text-xs text-right">Comissão</TableHead>
                                                    <TableHead className="text-xs text-center">Faturado</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {seller.acceptedProposals.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={3} className="text-center text-xs text-gray-400 py-4">Sem fechamentos.</TableCell>
                                                    </TableRow>
                                                ) : (
                                                    seller.acceptedProposals.slice(0, 10).map(p => {
                                                        const lead = leads.find(l => l.id === p.leadId);
                                                        return (
                                                            <TableRow key={p.id} className="text-xs">
                                                                <TableCell className="font-medium">
                                                                    <div className="truncate max-w-[150px]" title={lead?.empresa}>
                                                                        {lead?.empresa || "N/A"}
                                                                    </div>
                                                                    <div className="flex gap-1 mt-1">
                                                                        <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono uppercase bg-gray-50">
                                                                            {p.crtIdentifier || "N/A"}
                                                                        </Badge>
                                                                        <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono bg-blue-50 text-blue-700">
                                                                            {p.processoInterno || "N/A"}
                                                                        </Badge>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-right">R$ {p.profitShow?.toLocaleString()}</TableCell>
                                                                <TableCell className="text-blue-600 font-bold text-right">
                                                                    R$ {p.individualCommission?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    {p.faturado ? (
                                                                        <span className="text-green-600 font-bold uppercase text-[10px]">Sim</span>
                                                                    ) : (
                                                                        <span className="text-red-500 font-bold uppercase text-[10px]">Não</span>
                                                                    )}
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
