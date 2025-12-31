import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format, subMonths, addMonths, startOfMonth, endOfMonth, parseISO, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Users,
  FileText,
  DollarSign,
  AlertTriangle,
  Package,
  Globe,
  CircleDollarSign,
  Filter,
  ArrowRight
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
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
import { Badge } from "@/components/ui/badge";

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function Relatorios() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedClient, setSelectedClient] = useState("all");
  const [selectedVendedor, setSelectedVendedor] = useState("all");

  const handlePrevMonth = () => setCurrentDate(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentDate(prev => addMonths(prev, 1));

  // Data fetching - with safety wrappers
  const { data: proposalsData } = useQuery({
    queryKey: ['proposals'],
    queryFn: async () => {
      const data = await base44.entities.Proposal.list();
      return Array.isArray(data) ? data : [];
    }
  });
  const proposals = proposalsData || [];

  const { data: leadsData } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const data = await base44.entities.Lead.list();
      return Array.isArray(data) ? data : [];
    }
  });
  const leads = leadsData || [];

  const { data: usersData } = useQuery({
    queryKey: ['vendedores'],
    queryFn: async () => {
      const data = await base44.entities.User.list();
      return Array.isArray(data) ? data : [];
    }
  });
  const users = usersData || [];

  const sellers = useMemo(() => users.filter(u => u?.roles?.includes('Vendedor')), [users]);

  // Filtered Data
  const filteredProposals = useMemo(() => {
    if (!proposals || proposals.length === 0) return [];

    return proposals.filter(p => {
      if (!p) return false;
      const dateStr = p.data_aceite || p.data_solicitacao || p.data_cadastro;
      if (!dateStr) return false;

      try {
        const propDate = parseISO(dateStr);
        if (isNaN(propDate.getTime())) return false;

        const matchesMonth = isSameMonth(propDate, currentDate);
        const matchesClient = selectedClient === "all" || p.leadId === selectedClient;
        const matchesVendedor = selectedVendedor === "all" || p.vendedorId === selectedVendedor;

        return matchesMonth && matchesClient && matchesVendedor;
      } catch (e) {
        return false;
      }
    });
  }, [proposals, currentDate, selectedClient, selectedVendedor]);

  // KPI Calculations
  const stats = useMemo(() => {
    let totalTons = 0;
    let totalShipments = 0;
    let totalInvoiced = 0;
    let totalProfit = 0;
    let totalExpenses = 0;
    let nationalCount = 0;
    let internationalCount = 0;

    filteredProposals.forEach(p => {
      totalTons += Number(p.toneladas || 0);
      totalShipments += 1;
      totalInvoiced += Number(p.freteReais || 0);
      const profit = p.status === 'Finalizada' ? Number(p.lucroReal || 0) : Number(p.lucroEstimado || 0);
      totalProfit += profit;
      totalExpenses += (Number(p.freteReais || 0) - profit);

      if (p.tipo === "INTERNACIONAL") internationalCount++;
      else nationalCount++;
    });

    return {
      totalTons,
      totalShipments,
      totalInvoiced,
      totalProfit,
      totalExpenses,
      pieData: [
        { name: 'Nacional', value: nationalCount },
        { name: 'Internacional', value: internationalCount }
      ].filter(d => d.value > 0)
    };
  }, [filteredProposals]);

  // ABC Classification logic
  const abcData = useMemo(() => {
    if (!leads || leads.length === 0) return [];

    const clientProfits = proposals.reduce((acc, p) => {
      if (!p.leadId) return acc;
      const profit = p.status === 'Finalizada' ? Number(p.lucroReal || 0) : Number(p.lucroEstimado || 0);
      acc[p.leadId] = (acc[p.leadId] || 0) + profit;
      return acc;
    }, {});

    const sortedClients = [...leads]
      .map(l => ({ ...l, totalProfit: clientProfits[l.id] || 0 }))
      .sort((a, b) => b.totalProfit - a.totalProfit);

    const totalCount = sortedClients.length;

    return sortedClients.map((l, index) => {
      const rank = totalCount > 0 ? (index / totalCount) * 100 : 0;
      let classification = "C";
      if (rank <= 20) classification = "A";
      else if (rank <= 70) classification = "B";

      return { ...l, classification };
    });
  }, [proposals, leads]);

  // Loss Processes logic
  const lossProcesses = useMemo(() => {
    return filteredProposals.filter(p => {
      const profit = p.status === 'Finalizada' ? Number(p.lucroReal || 0) : Number(p.lucroEstimado || 0);
      return profit < 0;
    }).map(p => {
      const lead = leads.find(l => l.id === p.leadId);
      const profit = p.status === 'Finalizada' ? Number(p.lucroReal || 0) : Number(p.lucroEstimado || 0);
      return { ...p, leadName: lead?.empresa || "N/A", profit };
    });
  }, [filteredProposals, leads]);

  const renderCustomizedLabel = ({ name, percent }) => {
    return `${name}: ${(percent * 100).toFixed(0)}%`;
  };

  return (
    <div className="p-6 space-y-8 bg-gradient-to-br from-white to-blue-50/30 min-h-screen">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Relatório Executivo</h1>
          <p className="text-slate-500 font-medium">Performance e análise detalhada de processos</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white rounded-2xl px-4 py-2 shadow-sm border border-slate-200">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={handlePrevMonth}>
              <ChevronLeft className="w-4 h-4 text-blue-600" />
            </Button>
            <span className="text-sm font-black text-slate-700 capitalize w-32 text-center">
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={handleNextMonth}>
              <ChevronRight className="w-4 h-4 text-blue-600" />
            </Button>
          </div>

          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className="w-[180px] rounded-2xl bg-white border-slate-200 shadow-sm h-[42px] font-bold text-xs text-left px-4">
              <div className="flex items-center gap-2 truncate">
                <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                <SelectValue placeholder="Cliente" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all">Todos Clientes</SelectItem>
              {leads.map(l => (
                <SelectItem key={l.id} value={l.id}>{l.empresa}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedVendedor} onValueChange={setSelectedVendedor}>
            <SelectTrigger className="w-[180px] rounded-2xl bg-white border-slate-200 shadow-sm h-[42px] font-bold text-xs text-left px-4">
              <div className="flex items-center gap-2 truncate">
                <Users className="w-3 h-3 text-slate-400 shrink-0" />
                <SelectValue placeholder="Comercial" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all">Todos Vendedores</SelectItem>
              {sellers.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Toneladas', val: `${stats.totalTons.toLocaleString('pt-BR')} t`, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50', footer: 'No período' },
          { label: 'Embarques', val: stats.totalShipments, icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50', footer: 'Processos ativos' },
          { label: 'Total Despesas', val: `R$ ${stats.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', footer: 'Custos operacionais' },
          { label: 'Total Faturado', val: `R$ ${stats.totalInvoiced.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: CircleDollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', footer: 'Receita bruta' },
          { label: 'Lucro Total', val: `R$ ${stats.totalProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: stats.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600', bg: 'bg-emerald-100', footer: 'Performance líquida', border: 'border-2 border-green-500/20' }
        ].map((kpi, idx) => (
          <Card key={idx} className={`rounded-[2rem] border-0 shadow-xl shadow-blue-900/5 bg-white relative overflow-hidden group ${kpi.border || ''}`}>
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <kpi.icon className={`w-12 h-12 ${kpi.color}`} />
            </div>
            <CardContent className="p-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{kpi.label}</p>
              <p className={`text-2xl font-black text-slate-900 ${kpi.label === 'Lucro Total' ? kpi.color : ''}`}>{kpi.val}</p>
              <div className={`mt-2 text-[10px] ${kpi.color} font-bold ${kpi.bg} px-2 py-0.5 rounded-full w-fit`}>{kpi.footer}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="rounded-[2.5rem] border-0 shadow-xl shadow-blue-900/5 bg-white lg:col-span-1">
          <CardHeader className="pb-0 pt-8 px-8">
            <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-500" />
              Distribuição por Tipo
            </CardTitle>
            <CardDescription className="text-xs font-medium">Processos Nacionais vs Internacionais</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[320px] w-full">
              {stats.pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={8}
                      dataKey="value"
                      label={renderCustomizedLabel}
                    >
                      {stats.pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium italic">Sem dados no período</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] border-0 shadow-xl shadow-blue-900/5 bg-white lg:col-span-2 overflow-hidden text-left">
          <CardHeader className="pt-8 px-8 border-b border-slate-50">
            <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Classificação ABC de Clientes
            </CardTitle>
            <CardDescription className="text-xs font-medium">Baseado no lucro histórico acumulado</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="pl-8 text-[10px] font-black uppercase text-slate-400 w-24">Class.</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-400">Cliente</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-400">Localização</TableHead>
                  <TableHead className="text-right pr-8 text-[10px] font-black uppercase text-slate-400">Lucro Histórico</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {abcData.length > 0 ? abcData.map((client) => (
                  <TableRow key={client.id} className="hover:bg-blue-50/30 transition-colors">
                    <TableCell className="pl-8">
                      <Badge className={`
                        ${client.classification === 'A' ? 'bg-emerald-100 text-emerald-700' :
                          client.classification === 'B' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-600'}
                        border-0 font-black px-3
                      `}>
                        {client.classification}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-bold text-slate-700">{client.empresa}</TableCell>
                    <TableCell className="text-slate-500 text-xs font-medium">{client.cidade || '-'}/{client.estado}</TableCell>
                    <TableCell className="text-right pr-8 font-black text-slate-900 whitespace-nowrap">
                      R$ {Number(client.totalProfit || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-slate-400 italic">Nenhum cliente com movimentação</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {lossProcesses.length > 0 && (
        <Card className="rounded-[2.5rem] border-0 shadow-xl shadow-red-900/10 bg-white overflow-hidden border-2 border-red-50 text-left">
          <CardHeader className="bg-red-50/50 pt-8 px-8 border-b border-red-100">
            <CardTitle className="text-lg font-black text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Análise de Lucro Negativo
            </CardTitle>
            <CardDescription className="text-red-600/70 text-xs font-semibold">Processos que resultaram em prejuízo no período selecionado</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-red-50/20">
                <TableRow>
                  <TableHead className="pl-8 text-[10px] font-black uppercase text-red-400">Processo</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-red-400">Cliente</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-red-400">Rota</TableHead>
                  <TableHead className="text-right pr-8 text-[10px] font-black uppercase text-red-400">Prejuízo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lossProcesses.map((p) => (
                  <TableRow key={p.id} className="hover:bg-red-50/30 transition-colors">
                    <TableCell className="pl-8">
                      <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-700">{p.processoInterno || '---'}</span>
                    </TableCell>
                    <TableCell className="font-bold text-slate-700">{p.leadName}</TableCell>
                    <TableCell className="text-slate-500 text-xs font-medium">
                      <div className="flex items-center gap-2">
                        {p.origem} <ArrowRight className="w-3 h-3 shrink-0" /> {p.destino}
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-8 font-black text-red-600 whitespace-nowrap">
                      R$ {Number(p.profit || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}