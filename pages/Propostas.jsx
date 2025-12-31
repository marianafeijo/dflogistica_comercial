import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { formatDisplayDate } from "@/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search, FileText, CheckCircle2, MoreVertical, Truck, Globe, DollarSign, Calendar, Calculator, Trash2, MapPin, ArrowRight, CheckSquare, Copy, Receipt, Download } from "lucide-react";
import { format } from "date-fns";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CurrencyInput } from "@/components/CurrencyInput";
import {
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
} from "@/components/ui/tabs";

const TRUCK_TYPES = [
    "Carreta aberta",
    "Carreta Sider",
    "Carreta Baú",
    "Truck Aberto",
    "Truck Sider",
    "Truck Baú"
];

export default function Propostas() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterVendedor, setFilterVendedor] = useState("all");
    const [filterCliente, setFilterCliente] = useState("");
    const [filterCRT, setFilterCRT] = useState("");
    const [filterProcesso, setFilterProcesso] = useState("");
    const [filterOrigem, setFilterOrigem] = useState("all");
    const [filterDestino, setFilterDestino] = useState("all");
    const [filterStatus, setFilterStatus] = useState("all"); // "all", "aberto", "finalizado"
    const [leadSearchTerm, setLeadSearchTerm] = useState("");
    const [isLeadPopoverOpen, setIsLeadPopoverOpen] = useState(false);

    // Estados para o CRT/CTE
    const [isCrtDialogOpen, setIsCrtDialogOpen] = useState(false);
    const [selectedProposalForCrt, setSelectedProposalForCrt] = useState(null);
    const [crtValue, setCrtValue] = useState("");
    const [processoInternoValue, setProcessoInternoValue] = useState("");

    // Estados para Finalização
    const [isFinalizeDialogOpen, setIsFinalizeDialogOpen] = useState(false);
    const [selectedProposalForFinalize, setSelectedProposalForFinalize] = useState(null);
    const [finalizeData, setFinalizeData] = useState({
        custosFixos: [], // [{ id, nome, valor }]
        despesasVariaveis: [], // [{ nome, valor }]
    });
    const [newVariableExpense, setNewVariableExpense] = useState({ nome: '', valor: 0 });

    const initialFormData = {
        tipo: "NACIONAL",
        vendedorId: "",
        origem: "",
        destino: "",
        freteDolar: 0,
        valorMercadoria: 0,
        seguroValor: 0,
        prazoPagamentoId: "",
        freteiroReais: 0,
        custosSelecionados: [], // IDs dos custos operacionais
        leadId: "",
        ptax: 5.00,
        kmNacional: 0,
        kmInternacional: 0,
        processoInterno: "",
        crtIdentifier: "",
        toneladas: 0,
    };

    const [formData, setFormData] = useState(initialFormData);

    const { data: proposals = [] } = useQuery({
        queryKey: ['proposals'],
        queryFn: () => base44.entities.Proposal.list(),
    });

    const { data: leads = [] } = useQuery({
        queryKey: ['leads'],
        queryFn: () => base44.entities.Lead.list(),
    });

    const { data: sellers = [] } = useQuery({
        queryKey: ['sellers'],
        queryFn: async () => {
            const users = await base44.entities.User.list();
            return users.filter(u => (u.roles || [u.role]).includes('Vendedor'));
        },
    });

    const { data: locations = [] } = useQuery({
        queryKey: ['originDestinations'],
        queryFn: () => base44.entities.OriginDestination.list(),
    });

    const { data: costs = [] } = useQuery({
        queryKey: ['operationalCosts'],
        queryFn: () => base44.entities.OperationalCost.list(),
    });

    const { data: terms = [] } = useQuery({
        queryKey: ['paymentTerms'],
        queryFn: () => base44.entities.PaymentTerm.list(),
        initialData: [],
    });

    const { data: user } = useQuery({
        queryKey: ['currentUser'],
        queryFn: () => base44.auth.me(),
    });

    React.useEffect(() => {
        if (isDialogOpen && user && !formData.vendedorId) {
            const isVendedor = (user.roles || [user.role]).includes('Vendedor');
            if (isVendedor) {
                const seller = sellers.find(s => s.email === user.email);
                if (seller) setFormData(prev => ({ ...prev, vendedorId: seller.id }));
            }
        }
    }, [isDialogOpen, user, sellers]);

    const freteReais = useMemo(() => formData.freteDolar * (formData.ptax || 1), [formData.freteDolar, formData.ptax]);

    const seguroFinal = useMemo(() => {
        return (formData.valorMercadoria * formData.seguroValor) / 100;
    }, [formData.seguroValor, formData.valorMercadoria]);

    const totalCustosOperacionais = useMemo(() => {
        return formData.custosSelecionados.reduce((acc, costId) => {
            const cost = costs.find(c => c.id === costId);
            return acc + (cost?.valor || 0);
        }, 0);
    }, [formData.custosSelecionados, costs]);

    const totalGastos = useMemo(() => {
        return formData.freteiroReais + totalCustosOperacionais;
    }, [formData.freteiroReais, totalCustosOperacionais]);

    const profitCalculations = useMemo(() => {
        const lucroBruto = freteReais - totalGastos;
        const ir_cs = (formData.freteDolar * 0.0288 * (formData.ptax || 1));
        const kmTotal = (formData.kmNacional || 0) + (formData.kmInternacional || 0) || 1;
        const porcentagemNacional = (formData.kmNacional || 0) / kmTotal;

        // Base de cálculo conforme orientação: Faturamento Total BRL
        const pis_cofins_brl = (freteReais * porcentagemNacional) * 0.0365;

        const totalImpostos = ir_cs + pis_cofins_brl;
        const lucroLiquido = lucroBruto - totalImpostos;

        return {
            lucroBruto,
            ir_cs,
            pis_cofins_brl,
            totalImpostos,
            lucroLiquido,
            kmTotal,
            porcentagemNacional
        };
    }, [freteReais, totalGastos, formData.freteDolar, formData.ptax, formData.kmNacional, formData.kmInternacional, formData.freteiroReais]);

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Proposal.create({
            ...data,
            status: "Pendente",
            dataCriacao: new Date().toISOString(),
            ptaxAplicada: formData.ptax,
            freteReais,
            totalGastos,
            lucroEstimado: profitCalculations.lucroLiquido,
            metadataFinanceira: profitCalculations
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['proposals'] });
            setIsDialogOpen(false);
            setFormData(initialFormData);
            toast({ title: "Proposta criada com sucesso!" });
        }
    });

    const acceptMutation = useMutation({
        mutationFn: ({ id, crt, processoInterno }) => base44.entities.Proposal.update(id, {
            status: "Aceita",
            crtIdentifier: crt,
            processoInterno: processoInterno,
            dataAceite: new Date().toISOString()
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['proposals'] });
            setIsCrtDialogOpen(false);
            setSelectedProposalForCrt(null);
            setCrtValue("");
            setProcessoInternoValue("");
            toast({ title: "Proposta aceita!", description: "Dados registrados com sucesso." });
        }
    });

    const finalizeMutation = useMutation({
        mutationFn: ({ id, custosFixosReais, despesasVariaveis, lucroReal }) => base44.entities.Proposal.update(id, {
            status: "Finalizada",
            custosFixosReais,
            despesasVariaveis,
            lucroReal: lucroReal,
            dataFinalizacao: new Date().toISOString()
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['proposals'] });
            setIsFinalizeDialogOpen(false);
            setSelectedProposalForFinalize(null);
            setFinalizeData({ custosFixos: [], despesasVariaveis: [] });
            toast({ title: "Proposta finalizada!", description: "Custos reais registrados com sucesso." });
        }
    });

    const toggleFaturadoMutation = useMutation({
        mutationFn: ({ id, faturado }) => base44.entities.Proposal.update(id, {
            faturado,
            dataFaturado: faturado ? new Date().toISOString() : null
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['proposals'] });
            toast({ title: "Status atualizado", description: "Status de faturamento alterado." });
        }
    });

    const rejectMutation = useMutation({
        mutationFn: (id) => base44.entities.Proposal.update(id, {
            status: "Recusada",
            dataRecusa: new Date().toISOString()
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['proposals'] });
            toast({ title: "Proposta recusada!", description: "Status atualizado para recusada." });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.Proposal.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['proposals'] });
            toast({ title: "Proposta excluída!", description: "A proposta foi removida permanentemente." });
        }
    });

    const handleNewProposal = () => {
        setFormData(initialFormData);
        setIsDialogOpen(true);
    };

    const handleAcceptClick = (proposal) => {
        setSelectedProposalForCrt(proposal);
        setCrtValue(proposal.crtIdentifier || "");
        setProcessoInternoValue(proposal.processoInterno || "");
        setIsCrtDialogOpen(true);
    };

    const handleCopyProposal = (proposal) => {
        const { id, status, dataCriacao, dataAceite, dataFinalizacao, dataRecusa, metadataFinanceira, lucroEstimado, lucroReal, faturado, dataFaturado, ...rest } = proposal;
        setFormData({
            ...initialFormData,
            ...rest,
            // Keep specific fields but reset state-dependent ones if needed
            processoInterno: "",
            crtIdentifier: "",
        });
        setIsDialogOpen(true);
    };

    const confirmAccept = () => {
        if (!processoInternoValue.trim()) {
            toast({ title: "Erro", description: "O Número do Processo no Sistema é obrigatório.", variant: "destructive" });
            return;
        }

        const isInternacional = selectedProposalForCrt?.tipo === "INTERNACIONAL";
        if (isInternacional && !crtValue.trim()) {
            toast({ title: "Erro", description: "O CRT é obrigatório para processos internacionais.", variant: "destructive" });
            return;
        }

        // Validar unicidade apenas se houver valor informado
        const isDuplicate = crtValue.trim() && proposals.some(p =>
            p.crtIdentifier?.toLowerCase() === crtValue.toLowerCase().trim() &&
            p.id !== selectedProposalForCrt?.id
        );

        if (isDuplicate) {
            toast({
                title: "CRT/CTE Duplicado",
                description: "Este número já foi informado em outra proposta.",
                variant: "destructive"
            });
            return;
        }

        acceptMutation.mutate({
            id: selectedProposalForCrt.id,
            crt: crtValue.trim(),
            processoInterno: processoInternoValue.trim()
        });
    };

    const handleFinalizeClick = (proposal) => {
        setSelectedProposalForFinalize(proposal);
        // Pre-fill with existing selected fixed costs (estimates) to be reviewed
        const currentFixedCosts = proposal.custosSelecionados?.map(id => {
            const costRef = costs.find(c => c.id === id);
            return {
                id: id,
                nome: costRef?.nome || "Custo Removido",
                valor: costRef?.valor || 0
            };
        }) || [];

        setFinalizeData({
            custosFixos: currentFixedCosts,
            despesasVariaveis: proposal.despesasVariaveis || []
        });
        setIsFinalizeDialogOpen(true);
    };

    const confirmFinalize = () => {
        if (!selectedProposalForFinalize) return;

        // Calculate Real Profit locally to save it
        const totalCustosFixos = finalizeData.custosFixos.reduce((acc, c) => acc + c.valor, 0);
        const totalVariaveis = finalizeData.despesasVariaveis.reduce((acc, c) => acc + c.valor, 0);
        const totalGastosReais = (selectedProposalForFinalize.freteiroReais || 0) + totalCustosFixos + totalVariaveis;

        // Recalculate taxes logic
        const freteReais = selectedProposalForFinalize.freteReais || 0;
        const lucroBruto = freteReais - totalGastosReais;

        // Taxes are constant based on Revenue (FreteReais)
        const totalImpostos = selectedProposalForFinalize.metadataFinanceira?.totalImpostos || 0;
        const lucroLiquidoReal = lucroBruto - totalImpostos;

        finalizeMutation.mutate({
            id: selectedProposalForFinalize.id,
            custosFixosReais: finalizeData.custosFixos,
            despesasVariaveis: finalizeData.despesasVariaveis,
            lucroReal: lucroLiquidoReal
        });
    };




    const filteredProposals = proposals.filter(p => {
        const lead = leads.find(l => l.id === p.leadId);
        const leadName = lead?.empresa || "";

        const matchesSearch = p.origem?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.destino?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            leadName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.processoInterno?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.crtIdentifier?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesVendedor = filterVendedor === "all" || p.vendedorId === filterVendedor;
        const matchesCliente = !filterCliente || leadName.toLowerCase().includes(filterCliente.toLowerCase());
        const matchesCRT = !filterCRT || p.crtIdentifier?.toLowerCase().includes(filterCRT.toLowerCase());
        const matchesProcesso = !filterProcesso || p.processoInterno?.toLowerCase().includes(filterProcesso.toLowerCase());
        const matchesOrigem = filterOrigem === "all" || p.origem === filterOrigem;
        const matchesDestino = filterDestino === "all" || p.destino === filterDestino;
        const matchesStatus = filterStatus === "all" ||
            (filterStatus === "aberto" && p.status !== "Finalizada") ||
            (filterStatus === "finalizado" && p.status === "Finalizada");

        return matchesSearch && matchesVendedor && matchesCliente && matchesCRT && matchesProcesso && matchesOrigem && matchesDestino && matchesStatus;
    });

    const exportToExcel = () => {
        const rows = [
            ["Vendedor", "Cliente", "Nº Processo", "CRT", "Origem", "Destino", "Toneladas", "Status", "Lucro", "Frete BRL", "Faturado"],
            ...filteredProposals.map(p => {
                const lead = leads.find(l => l.id === p.leadId);
                const seller = sellers.find(s => s.id === p.vendedorId);
                const lucro = p.status === 'Finalizada' ? (p.lucroReal || 0) : (p.lucroEstimado || 0);
                return [
                    seller?.full_name || "N/A",
                    lead?.empresa || "N/A",
                    p.processoInterno || "-",
                    p.crtIdentifier || "-",
                    p.origem,
                    p.destino,
                    p.toneladas || 0,
                    p.status,
                    lucro.toFixed(2),
                    (p.freteReais || 0).toFixed(2),
                    p.faturado ? "Sim" : "Não"
                ];
            })
        ];

        const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
            + rows.map(e => e.join(";")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `propostas_export_${format(new Date(), "yyyy-MM-dd")}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const selectedSeller = useMemo(() => sellers.find(s => s.id === formData.vendedorId), [formData.vendedorId, sellers]);

    const normalizeString = (str) => {
        return str?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() || "";
    };

    const availableLeads = useMemo(() => {
        if (!leads || leads.length === 0) return [];

        let list = [...leads];

        if (leadSearchTerm) {
            const s = normalizeString(leadSearchTerm);
            list = list.filter(l => {
                const empresa = normalizeString(l.empresa);
                const contato = normalizeString(l.nome_contato);
                const email = normalizeString(l.email);
                const responsavel = normalizeString(l.responsavel);

                return empresa.includes(s) ||
                    contato.includes(s) ||
                    email.includes(s) ||
                    responsavel.includes(s) ||
                    (l.contatos || []).some(c =>
                        normalizeString(c.nome).includes(s) ||
                        normalizeString(c.email).includes(s)
                    );
            });
        }
        return list;
    }, [leads, leadSearchTerm]);

    return (
        <div className="p-6 space-y-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen" >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Propostas Comerciais</h1>
                    <p className="text-gray-600 mt-1">Gerencie propostas, fretes e lucratividade</p>
                </div>
                <Button onClick={handleNewProposal} className="bg-blue-600 hover:bg-blue-700 gap-2 h-11 px-6 rounded-xl shadow-lg transition-all hover:scale-105">
                    <Plus className="w-5 h-5" />
                    Nova Proposta
                </Button>
            </div>

            <Card className="shadow-sm border-0 rounded-3xl overflow-hidden">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Buscar por cliente, processo, CRT..."
                            className="pl-10 h-11 bg-white border-0 shadow-sm rounded-xl"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button
                        variant="outline"
                        onClick={exportToExcel}
                        className="bg-white hover:bg-gray-50 border-0 shadow-sm rounded-xl h-11 px-4 gap-2 text-gray-600"
                    >
                        <Download className="w-4 h-4" />
                        Exportar CSV
                    </Button>
                </div>

                {/* Filtros Avançados */}
                <Card className="border-0 shadow-sm rounded-2xl overflow-hidden bg-white/80 backdrop-blur-sm mt-4">
                    <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-gray-500 uppercase ml-1">Vendedor</Label>
                                <Select value={filterVendedor} onValueChange={setFilterVendedor}>
                                    <SelectTrigger className="h-9 bg-white">
                                        <SelectValue placeholder="Todos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        {sellers.map((s) => (
                                            <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-gray-500 uppercase ml-1">Cliente</Label>
                                <Input
                                    className="h-9 bg-white"
                                    placeholder="Nome..."
                                    value={filterCliente}
                                    onChange={(e) => setFilterCliente(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-gray-500 uppercase ml-1">CRT</Label>
                                <Input
                                    className="h-9 bg-white"
                                    placeholder="Nº CRT..."
                                    value={filterCRT}
                                    onChange={(e) => setFilterCRT(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-gray-500 uppercase ml-1">Processo</Label>
                                <Input
                                    className="h-9 bg-white"
                                    placeholder="Nº Processo..."
                                    value={filterProcesso}
                                    onChange={(e) => setFilterProcesso(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-gray-500 uppercase ml-1">Origem</Label>
                                <Select value={filterOrigem} onValueChange={setFilterOrigem}>
                                    <SelectTrigger className="h-9 bg-white">
                                        <SelectValue placeholder="Todas" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas</SelectItem>
                                        {locations.map((loc) => (
                                            <SelectItem key={loc.id} value={loc.nome}>{loc.nome}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-gray-500 uppercase ml-1">Destino</Label>
                                <Select value={filterDestino} onValueChange={setFilterDestino}>
                                    <SelectTrigger className="h-9 bg-white">
                                        <SelectValue placeholder="Todos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        {locations.map((loc) => (
                                            <SelectItem key={loc.id} value={loc.nome}>{loc.nome}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-gray-500 uppercase ml-1">Status</Label>
                                <Select value={filterStatus} onValueChange={setFilterStatus}>
                                    <SelectTrigger className="h-9 bg-white">
                                        <SelectValue placeholder="Todos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        <SelectItem value="aberto">Aberto (Não Finalizado)</SelectItem>
                                        <SelectItem value="finalizado">Finalizado</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <CardContent className="p-0 mt-6">
                    <Table>
                        <TableHeader className="bg-gray-50">
                            <TableRow>
                                <TableHead>Lead/Empresa</TableHead>
                                <TableHead>Processo</TableHead>
                                <TableHead>CRT</TableHead>
                                <TableHead>Vendedor</TableHead>
                                <TableHead>Rota (Origem → Destino)</TableHead>
                                <TableHead>Toneladas</TableHead>
                                <TableHead>Lucro</TableHead>
                                <TableHead>Faturado</TableHead>
                                <TableHead className="text-center w-[150px]">Status / Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredProposals.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-12 text-gray-500">Nenhuma proposta encontrada.</TableCell>
                                </TableRow>
                            ) : (
                                filteredProposals.map((prop) => (
                                    <TableRow key={prop.id} className="hover:bg-blue-50/50 transition-colors">
                                        <TableCell className="font-medium">
                                            {leads.find(l => l.id === prop.leadId)?.empresa || "Sem Lead"}
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-xs font-mono bg-gray-100 px-2 py-1 rounded w-fit">{prop.processoInterno || '-'}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded w-fit">{prop.crtIdentifier || '-'}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">{sellers.find(s => s.id === prop.vendedorId)?.full_name || "N/A"}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="font-semibold">{prop.origem}</span>
                                                <ArrowRight className="w-3 h-3 text-gray-400" />
                                                <span className="font-semibold">{prop.destino}</span>
                                            </div>
                                            <div className="text-[10px] text-gray-500">{prop.tipoCaminhao}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm font-semibold">{prop.toneladas || 0} t</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-bold text-green-600">
                                                {prop.status === 'Finalizada' ? (
                                                    <span>Real: R$ {Number(prop.lucroReal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                ) : (
                                                    <span>Est: R$ {Number(prop.lucroEstimado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                )}
                                            </div>
                                            <div className="text-[10px] text-gray-400">
                                                Frete: R$ {Number(prop.freteReais || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    checked={prop.faturado}
                                                    onCheckedChange={(checked) => toggleFaturadoMutation.mutate({ id: prop.id, faturado: checked })}
                                                />
                                                <span className={`text-xs font-bold ${prop.faturado ? 'text-green-600' : 'text-red-500'}`}>
                                                    {prop.faturado ? 'Sim' : 'Não'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="space-y-2 py-4">
                                            {prop.status === 'Pendente' && (
                                                <Button
                                                    size="sm"
                                                    className="w-full bg-blue-600 hover:bg-blue-700 h-8 text-xs gap-1"
                                                    onClick={() => handleAcceptClick(prop)}
                                                >
                                                    <CheckSquare className="w-3.5 h-3.5" />
                                                    Aceitar
                                                </Button>
                                            )}
                                            {prop.status === 'Aceita' && (
                                                <Button
                                                    size="sm"
                                                    className="w-full bg-green-600 hover:bg-green-700 h-8 text-xs gap-1 text-white shadow-sm"
                                                    onClick={() => handleFinalizeClick(prop)}
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    Finalizar
                                                </Button>
                                            )}
                                            {prop.status === 'Finalizada' && (
                                                <Badge className="w-full justify-center py-1 bg-slate-800 text-white border-0">Finalizada</Badge>
                                            )}
                                            {prop.status === 'Recusada' && (
                                                <Badge variant="destructive" className="w-full justify-center py-1">Recusada</Badge>
                                            )}

                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="w-full h-8 text-[10px] text-gray-600 hover:text-blue-600 hover:bg-blue-50 gap-1"
                                                onClick={() => handleCopyProposal(prop)}
                                            >
                                                <Copy className="w-3 h-3" />
                                                Copiar
                                            </Button>

                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="w-full h-8 text-[10px] text-gray-400 hover:text-red-600 hover:bg-red-50 gap-1"
                                                onClick={() => {
                                                    if (confirm("Tem certeza que deseja excluir esta proposta permanentemente?")) {
                                                        deleteMutation.mutate(prop.id);
                                                    }
                                                }}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                                Excluir
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-0 shadow-2xl">
                    <DialogHeader className="p-6 bg-blue-600 text-white rounded-t-3xl border-b border-blue-500/30">
                        <DialogTitle className="text-2xl flex items-center gap-2">
                            <Calculator className="w-6 h-6" />
                            Nova Proposta Comercial
                        </DialogTitle>
                        <CardDescription className="text-blue-100/80 mt-1">Gere propostas com cálculos automáticos de frete, lucro e impostos.</CardDescription>
                    </DialogHeader>

                    <Tabs defaultValue="geral" className="w-full">
                        <div className="px-8 pt-6 border-b bg-gray-50/50">
                            <TabsList className="grid w-full grid-cols-3 bg-gray-200/50 p-1 rounded-xl h-12">
                                <TabsTrigger value="geral" className="rounded-lg font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">Geral</TabsTrigger>
                                <TabsTrigger value="logistica" className="rounded-lg font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">Logística</TabsTrigger>
                                <TabsTrigger value="financeiro" className="rounded-lg font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">Financeiro</TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="p-8 space-y-8">
                            <TabsContent value="geral" className="mt-0 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <Label className="text-gray-700 font-semibold">Regime de Viagem</Label>
                                        <div className="flex gap-2">
                                            <Button
                                                variant={formData.tipo === "NACIONAL" ? "default" : "outline"}
                                                className="flex-1 rounded-xl h-12"
                                                onClick={() => setFormData({ ...formData, tipo: "NACIONAL" })}
                                            >
                                                <Globe className="w-4 h-4 mr-2" /> NACIONAL
                                            </Button>
                                            <Button
                                                variant={formData.tipo === "INTERNACIONAL" ? "default" : "outline"}
                                                className="flex-1 rounded-xl h-12"
                                                onClick={() => setFormData({ ...formData, tipo: "INTERNACIONAL" })}
                                            >
                                                <Globe className="w-4 h-4 mr-2" /> INTERNACIONAL
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-gray-700 font-semibold">Comercial Responsável</Label>
                                        <Select
                                            value={formData.vendedorId}
                                            onValueChange={(val) => setFormData({ ...formData, vendedorId: val, leadId: "" })}
                                        >
                                            <SelectTrigger className="h-12 rounded-xl">
                                                <SelectValue placeholder="Selecione o vendedor" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {sellers.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-gray-700 font-semibold">Lead Vinculado</Label>
                                    <Popover open={isLeadPopoverOpen} onOpenChange={setIsLeadPopoverOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                className="w-full justify-between h-12 rounded-xl"
                                            >
                                                {formData.leadId
                                                    ? leads.find(l => l.id === formData.leadId)?.empresa
                                                    : "Pesquisar lead..."}
                                                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[400px] p-0 shadow-2xl rounded-2xl border-blue-100" align="start">
                                            <div className="p-3 border-b bg-gray-50/50 space-y-2">
                                                <Input
                                                    placeholder="Buscar empresa, contato ou e-mail..."
                                                    value={leadSearchTerm}
                                                    onChange={(e) => setLeadSearchTerm(e.target.value)}
                                                    className="h-10 rounded-xl"
                                                    autoFocus
                                                />
                                                <p className="text-[10px] text-gray-500 font-medium px-1">
                                                    Mostrando todos os leads registrados ({leads?.length || 0})
                                                </p>
                                            </div>
                                            <ScrollArea className="h-[300px]">
                                                <div className="p-2 space-y-1">
                                                    {availableLeads.length === 0 ? (
                                                        <p className="text-sm text-center py-10 text-gray-500 font-medium">
                                                            Nenhum lead encontrado.
                                                        </p>
                                                    ) : (
                                                        availableLeads.map(l => (
                                                            <button
                                                                key={l.id || l.empresa}
                                                                type="button"
                                                                className="flex w-full items-center px-4 py-3 text-sm rounded-xl hover:bg-blue-50 transition-all text-left border border-transparent hover:border-blue-100 group"
                                                                onClick={() => {
                                                                    setFormData({ ...formData, leadId: l.id });
                                                                    setIsLeadPopoverOpen(false);
                                                                    setLeadSearchTerm("");
                                                                }}
                                                            >
                                                                <div className="flex flex-col gap-0.5">
                                                                    <span className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors uppercase text-[11px] tracking-tight">{l.empresa}</span>
                                                                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                                                        <span className="font-medium">{l.nome_contato}</span>
                                                                        {l.responsavel && (
                                                                            <Badge variant="outline" className="text-[9px] py-0 h-4 border-gray-100 bg-gray-50 font-normal">
                                                                                {l.responsavel.split('@')[0]}
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                            </ScrollArea>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </TabsContent>

                            <TabsContent value="logistica" className="mt-0 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-gray-700 font-semibold">Origem</Label>
                                        <Select
                                            value={formData.origem}
                                            onValueChange={(val) => setFormData({ ...formData, origem: val })}
                                        >
                                            <SelectTrigger className="h-11 rounded-xl">
                                                <SelectValue placeholder="Selecione a origem" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {locations.map(loc => (
                                                    <SelectItem key={loc.id} value={loc.nome}>{loc.nome}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-gray-700 font-semibold">Destino</Label>
                                        <Select
                                            value={formData.destino}
                                            onValueChange={(val) => setFormData({ ...formData, destino: val })}
                                        >
                                            <SelectTrigger className="h-11 rounded-xl">
                                                <SelectValue placeholder="Selecione o destino" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {locations.map(loc => (
                                                    <SelectItem key={loc.id} value={loc.nome}>{loc.nome}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                    <div className="space-y-2">
                                        <Label className="text-gray-700 font-semibold">Nº Processo</Label>
                                        <Input
                                            placeholder="000/2024"
                                            value={formData.processoInterno}
                                            onChange={(e) => setFormData({ ...formData, processoInterno: e.target.value })}
                                            className="h-11 rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-gray-700 font-semibold">Nº CRT / CTE</Label>
                                        <Input
                                            placeholder="000000"
                                            value={formData.crtIdentifier}
                                            onChange={(e) => setFormData({ ...formData, crtIdentifier: e.target.value })}
                                            className="h-11 rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <Label className="text-gray-700 font-semibold">Toneladas</Label>
                                        <Input
                                            type="number"
                                            placeholder="Ex: 25"
                                            value={formData.toneladas}
                                            onChange={(e) => setFormData({ ...formData, toneladas: parseFloat(e.target.value) || 0 })}
                                            className="h-11 rounded-xl"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-blue-50/50 p-6 rounded-2xl border border-blue-100 mt-4">
                                    <div className="space-y-2">
                                        <Label className="text-blue-800 font-bold">KM Nacional</Label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                                            <Input
                                                type="number"
                                                placeholder="KM percorridos no Brasil"
                                                className="pl-10 h-11 border-blue-200 focus:ring-blue-500 rounded-xl bg-white"
                                                value={formData.kmNacional}
                                                onChange={(e) => setFormData({ ...formData, kmNacional: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-blue-800 font-bold">KM Internacional</Label>
                                        <div className="relative">
                                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                                            <Input
                                                type="number"
                                                placeholder="KM percorridos no Exterior"
                                                className="pl-10 h-11 border-blue-200 focus:ring-blue-500 rounded-xl bg-white"
                                                value={formData.kmInternacional}
                                                onChange={(e) => setFormData({ ...formData, kmInternacional: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="financeiro" className="mt-0 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                    <div className="space-y-2">
                                        <Label className="text-blue-700 font-bold">PTAX / Taxa Conversão</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            className="border-blue-200 focus:border-blue-500 font-bold h-10 rounded-xl"
                                            value={formData.ptax}
                                            onChange={(e) => setFormData({ ...formData, ptax: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-blue-700 font-bold">Frete em Dólar (USD)</Label>
                                        <CurrencyInput
                                            prefix="$ "
                                            value={formData.freteDolar}
                                            onChange={(val) => setFormData({ ...formData, freteDolar: val })}
                                            className="border-blue-200 focus:border-blue-500 font-bold h-10 rounded-xl"
                                        />
                                        <p className="text-[10px] text-blue-600 font-semibold px-1">BRL Est.: R$ {freteReais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Valor da Mercadoria</Label>
                                        <CurrencyInput
                                            value={formData.valorMercadoria}
                                            onChange={(val) => setFormData({ ...formData, valorMercadoria: val })}
                                            className="h-10 rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-blue-700 font-bold">Seguro (%)</Label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                step="0.01"
                                                className="border-blue-200 focus:border-blue-500 font-bold h-10 rounded-xl pr-10"
                                                value={formData.seguroValor}
                                                onChange={(e) => setFormData({ ...formData, seguroValor: parseFloat(e.target.value) || 0 })}
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                                        </div>
                                        <p className="text-[10px] text-gray-500 px-1">Total: R$ {seguroFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-gray-700 font-semibold">Prazo de Pagamento</Label>
                                        <Select value={formData.prazoPagamentoId} onValueChange={(val) => setFormData({ ...formData, prazoPagamentoId: val })}>
                                            <SelectTrigger className="h-11 rounded-xl bg-white">
                                                <SelectValue placeholder="Selecione o prazo de faturamento" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {terms.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-6 pt-6 border-t">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Calculator className="w-5 h-5 text-gray-500" />
                                        <h3 className="text-lg font-bold text-gray-800 uppercase tracking-wide">Memória de Cálculo</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <Label className="text-gray-700 font-semibold">Valor Freteiro (R$)</Label>
                                                <CurrencyInput
                                                    value={formData.freteiroReais}
                                                    onChange={(val) => setFormData({ ...formData, freteiroReais: val })}
                                                    placeholder="Valor pago ao caminhoneiro"
                                                    className="h-11 rounded-xl shadow-sm"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <Label className="text-gray-700 font-semibold">Custos Operacionais</Label>
                                                <div className="grid grid-cols-1 gap-2 border p-4 rounded-2xl bg-white max-h-[150px] overflow-y-auto shadow-inner">
                                                    {costs.map(cost => (
                                                        <div key={cost.id} className="flex items-center space-x-2 p-1.5 hover:bg-blue-50/50 rounded-xl transition-colors">
                                                            <Checkbox
                                                                id={cost.id}
                                                                checked={formData.custosSelecionados.includes(cost.id)}
                                                                onCheckedChange={(checked) => {
                                                                    const newCosts = checked
                                                                        ? [...formData.custosSelecionados, cost.id]
                                                                        : formData.custosSelecionados.filter(id => id !== cost.id);
                                                                    setFormData({ ...formData, custosSelecionados: newCosts });
                                                                }}
                                                            />
                                                            <label htmlFor={cost.id} className="text-sm font-medium flex justify-between w-full cursor-pointer">
                                                                <span className="text-gray-700">{cost.nome}</span>
                                                                <span className="text-gray-400 font-semibold">R$ {cost.valor.toLocaleString()}</span>
                                                            </label>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-gradient-to-br from-blue-600 to-indigo-800 p-8 rounded-[32px] text-white shadow-2xl flex flex-col justify-between relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                                <DollarSign className="w-24 h-24" />
                                            </div>
                                            <div className="space-y-4 relative z-10">
                                                <div className="flex justify-between items-center text-blue-100 border-b border-white/10 pb-3">
                                                    <span className="text-sm">Receita Total (BRL)</span>
                                                    <span className="font-bold text-lg">R$ {freteReais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-blue-100">
                                                    <span className="text-sm">Gastos Previstos</span>
                                                    <span className="font-bold text-red-300">- R$ {totalGastos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                </div>
                                                <div className="space-y-2 pt-3 border-t border-white/10">
                                                    <div className="flex justify-between items-center text-xs text-blue-200">
                                                        <span>Imposto IR / CS (2.88% s/ Frete USD)</span>
                                                        <span>- R$ {profitCalculations.ir_cs.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs text-blue-200 border-t border-white/10 pt-3">
                                                        <div className="flex flex-col">
                                                            <span>PIS / Cofins (3,65% s/ Faturamento Nac.)</span>
                                                            <span className="text-[10px] opacity-60">Base: R$ {freteReais.toLocaleString('pt-BR')} (Fat.) * {(profitCalculations.porcentagemNacional * 100).toFixed(0)}% (Nac.)</span>
                                                        </div>
                                                        <span className="font-bold">- R$ {profitCalculations.pis_cofins_brl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-10 pt-6 border-t border-white/20 relative z-10">
                                                <div className="text-[10px] uppercase tracking-[0.2em] text-blue-200 mb-2 font-black">Lucro Líquido Estimado</div>
                                                <div className="flex items-center justify-between">
                                                    <div className="text-4xl font-black flex items-baseline gap-1">
                                                        <span className="text-xl font-normal opacity-70 mr-1">R$</span>
                                                        {profitCalculations.lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </div>
                                                    <div className="bg-green-400/20 text-green-300 border border-green-500/30 px-3 py-1 rounded-full text-sm font-bold shadow-inner">
                                                        {freteReais > 0 ? ((profitCalculations.lucroLiquido / freteReais) * 100).toFixed(1) : 0}%
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                    <DialogFooter className="p-6 bg-gray-50 rounded-b-3xl">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl px-6 h-12">Cancelar</Button>
                        <Button type="button" onClick={() => createMutation.mutate(formData)} className="bg-blue-600 hover:bg-blue-700 rounded-xl px-8 h-12 shadow-md">Salvar Proposta</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={isCrtDialogOpen} onOpenChange={setIsCrtDialogOpen}>
                <DialogContent className="max-w-md rounded-3xl p-6 border-0 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            Informar CRT / CTE
                        </DialogTitle>
                        <CardDescription>
                            Para aceitar esta proposta, informe o identificador único do processo.
                        </CardDescription>
                    </DialogHeader>

                    <div className="py-6 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="processo" className="text-sm font-semibold text-gray-700">Número do Processo no Sistema *</Label>
                            <Input
                                id="processo"
                                placeholder="Ex: 2023-001"
                                value={processoInternoValue}
                                onChange={(e) => setProcessoInternoValue(e.target.value)}
                                className="h-12 rounded-xl border-gray-200 focus:ring-blue-500 uppercase font-mono"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="crt" className="text-sm font-semibold text-gray-700">
                                {selectedProposalForCrt?.tipo === 'INTERNACIONAL' ? 'CRT (Obrigatório) *' : 'CTE (Opcional)'}
                            </Label>
                            <Input
                                id="crt"
                                placeholder={selectedProposalForCrt?.tipo === 'INTERNACIONAL' ? "Ex: CRT123456" : "Informar se disponível"}
                                value={crtValue}
                                onChange={(e) => setCrtValue(e.target.value)}
                                className="h-12 rounded-xl border-gray-200 focus:ring-blue-500 uppercase font-mono"
                            />
                        </div>
                        <div className="bg-blue-50 p-4 rounded-xl text-xs text-blue-700 leading-relaxed">
                            <strong>Atenção:</strong> O Número do Processo é obrigatório. O {selectedProposalForCrt?.tipo === 'INTERNACIONAL' ? 'CRT é obrigatório para processos internacionais' : 'CTE pode ser informado depois para processos nacionais'}.
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setIsCrtDialogOpen(false)} className="rounded-xl px-6 h-12">Cancelar</Button>
                        <Button
                            onClick={confirmAccept}
                            disabled={!crtValue.trim() || acceptMutation.isPending}
                            className="bg-green-600 hover:bg-green-700 rounded-xl px-8 h-12 shadow-md"
                        >
                            {acceptMutation.isPending ? "Processando..." : "Confirmar Aceite"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog de Finalização */}
            <Dialog open={isFinalizeDialogOpen} onOpenChange={setIsFinalizeDialogOpen} >
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl">
                    <DialogHeader>
                        <DialogTitle>Finalização Financeira da Proposta</DialogTitle>
                        <CardDescription>Revise os custos fixos e adicione despesas variáveis reais.</CardDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Seção 1: Custos Fixos */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold uppercase text-gray-500 border-b pb-1">1. Revisão de Custos Fixos</h3>
                            {finalizeData.custosFixos.length === 0 ? (
                                <p className="text-sm text-gray-400 italic">Nenhum custo fixo vinculado.</p>
                            ) : (
                                <div className="space-y-2">
                                    {finalizeData.custosFixos.map((cost, index) => (
                                        <div key={index} className="flex items-center gap-4 bg-gray-50 p-2 rounded-lg">
                                            <span className="flex-1 text-sm font-medium">{cost.nome}</span>
                                            <div className="w-32">
                                                <CurrencyInput
                                                    value={cost.valor}
                                                    onChange={(val) => {
                                                        const newCustos = [...finalizeData.custosFixos];
                                                        newCustos[index].valor = val;
                                                        setFinalizeData(prev => ({ ...prev, custosFixos: newCustos }));
                                                    }}
                                                    className="h-8 text-right bg-white"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Seção 2: Despesas Variáveis */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold uppercase text-gray-500 border-b pb-1">2. Despesas Variáveis Reais</h3>

                            <div className="flex gap-2 items-end bg-blue-50 p-3 rounded-xl border border-blue-100">
                                <div className="space-y-1 flex-1">
                                    <Label className="text-xs">Nome da Despesa</Label>
                                    <Input
                                        placeholder="Ex: Multa, Taxa Extra..."
                                        value={newVariableExpense.nome}
                                        onChange={e => setNewVariableExpense(prev => ({ ...prev, nome: e.target.value }))}
                                        className="h-8 bg-white"
                                    />
                                </div>
                                <div className="space-y-1 w-32">
                                    <Label className="text-xs">Valor</Label>
                                    <CurrencyInput
                                        value={newVariableExpense.valor}
                                        onChange={val => setNewVariableExpense(prev => ({ ...prev, valor: val }))}
                                        className="h-8 bg-white"
                                    />
                                </div>
                                <Button
                                    size="icon"
                                    className="h-8 w-8 bg-blue-600 hover:bg-blue-700"
                                    onClick={() => {
                                        if (!newVariableExpense.nome || !newVariableExpense.valor) return;
                                        setFinalizeData(prev => ({
                                            ...prev,
                                            despesasVariaveis: [...prev.despesasVariaveis, { ...newVariableExpense, id: Date.now() }]
                                        }));
                                        setNewVariableExpense({ nome: '', valor: 0 });
                                    }}
                                >
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="space-y-2">
                                {finalizeData.despesasVariaveis.map((exp, index) => (
                                    <div key={index} className="flex items-center gap-4 bg-white border p-2 rounded-lg">
                                        <span className="flex-1 text-sm">{exp.nome}</span>
                                        <span className="font-mono text-sm">R$ {exp.valor.toLocaleString()}</span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-red-500 hover:bg-red-50"
                                            onClick={() => {
                                                const newExp = finalizeData.despesasVariaveis.filter((_, i) => i !== index);
                                                setFinalizeData(prev => ({ ...prev, despesasVariaveis: newExp }));
                                            }}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                ))}
                                {finalizeData.despesasVariaveis.length === 0 && (
                                    <p className="text-sm text-gray-400 italic text-center py-2">Nenhuma despesa variável adicionada.</p>
                                )}
                            </div>
                        </div>

                        {/* Resumo Previsto */}
                        <div className="bg-gray-900 text-white p-4 rounded-xl space-y-2">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400">Total Custos Fixos (Real)</span>
                                <span>R$ {finalizeData.custosFixos.reduce((a, b) => a + b.valor, 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400">Total Variáveis (Real)</span>
                                <span>R$ {finalizeData.despesasVariaveis.reduce((a, b) => a + b.valor, 0).toLocaleString()}</span>
                            </div>
                            <div className="border-t border-gray-700 my-2 pt-2 flex justify-between items-center font-bold text-lg">
                                <span className="text-blue-300">Lucro Real Estimado</span>
                                <span>
                                    R$ {(() => {
                                        // Quick preview calculation
                                        if (!selectedProposalForFinalize) return 0;
                                        const fixos = finalizeData.custosFixos.reduce((a, b) => a + b.valor, 0);
                                        const varis = finalizeData.despesasVariaveis.reduce((a, b) => a + b.valor, 0);
                                        const frete = selectedProposalForFinalize.freteReais || 0;
                                        const imp = selectedProposalForFinalize.metadataFinanceira?.totalImpostos || 0;
                                        const freteiro = selectedProposalForFinalize.freteiroReais || 0;
                                        return (frete - (freteiro + fixos + varis) - imp).toLocaleString();
                                    })()}
                                </span>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsFinalizeDialogOpen(false)}>Cancelar</Button>
                        <Button className="bg-green-600 hover:bg-green-700" onClick={confirmFinalize}>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Confirmar Finalização
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >
        </div >
    );
}
