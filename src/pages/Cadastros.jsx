import React, { useState } from "react";
import { api } from "@/services/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/CurrencyInput";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Package, CreditCard, DollarSign, Users, UserPlus, Edit, ShieldCheck, UserCog } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

export default function Cadastros() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    // Auxiliares States
    const [newCost, setNewCost] = useState({ nome: '', valor: 0 });
    const [newTerm, setNewTerm] = useState({ nome: '' });
    const [newLocation, setNewLocation] = useState({ nome: '' });

    // Users States
    const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [userType, setUserType] = useState('Gestor'); // 'Gestor' or 'Vendedor'
    const [userData, setUserData] = useState({
        nome: '',
        email: '',
        senha: '',
        meta_embarques: 10,
        meta_financeira: 0,
        porcentagem_comissao: 0
    });

    const { data: costs = [] } = useQuery({
        queryKey: ['operationalCosts'],
        queryFn: () => api.entities.OperationalCost.list(),
    });

    const { data: terms = [] } = useQuery({
        queryKey: ['paymentTerms'],
        queryFn: () => api.entities.PaymentTerm.list(),
    });

    const { data: locations = [] } = useQuery({
        queryKey: ['originDestinations'],
        queryFn: () => api.entities.OriginDestination.list(),
    });

    const { data: users = [] } = useQuery({
        queryKey: ['users'],
        queryFn: () => api.entities.User.list(),
    });

    // Mutations for Auxiliares
    const addCostMutation = useMutation({
        mutationFn: (data) => api.entities.OperationalCost.create({ ...data, id: Date.now().toString() }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['operationalCosts'] });
            setNewCost({ nome: '', valor: 0 });
            toast({ title: "Custo cadastrado!" });
        },
    });

    const deleteCostMutation = useMutation({
        mutationFn: (id) => base44.entities.OperationalCost.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['operationalCosts'] }),
    });

    const addTermMutation = useMutation({
        mutationFn: (data) => base44.entities.PaymentTerm.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['paymentTerms'] });
            setNewTerm({ nome: '' });
            toast({ title: "Prazo cadastrado!" });
        },
    });

    const deleteTermMutation = useMutation({
        mutationFn: (id) => base44.entities.PaymentTerm.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['paymentTerms'] }),
    });

    const addLocationMutation = useMutation({
        mutationFn: (data) => base44.entities.OriginDestination.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['originDestinations'] });
            setNewLocation({ nome: '' });
            toast({ title: "Localidade cadastrada!" });
        },
    });

    const deleteLocationMutation = useMutation({
        mutationFn: (id) => base44.entities.OriginDestination.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['originDestinations'] }),
    });

    // Mutations for Users
    const createOrUpdateUserMutation = useMutation({
        mutationFn: async (data) => {
            const payload = {
                ...editingUser,
                full_name: data.nome,
                email: data.email,
                meta_embarques: data.meta_embarques,
                meta_financeira: data.meta_financeira,
                porcentagem_comissao: data.porcentagem_comissao,
                roles: [userType],
                ...(data.senha ? { senha: data.senha } : {})
            };

            if (editingUser) {
                return await base44.entities.User.update(editingUser.id, payload);
            } else {
                return await base44.entities.User.create(payload);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setIsUserDialogOpen(false);
            toast({
                title: editingUser ? "Cadastro atualizado!" : "Cadastro criado!",
                description: `${userType} salvo com sucesso.`
            });
        },
    });

    const deleteUserMutation = useMutation({
        mutationFn: (id) => base44.entities.User.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast({ title: "Usuário excluído!" });
        },
    });

    const handleOpenDialog = (type, user = null) => {
        setUserType(type);
        setEditingUser(user);
        if (user) {
            setUserData({
                nome: user.full_name || '',
                email: user.email || '',
                senha: '',
                meta_embarques: user.meta_embarques || 10,
                meta_financeira: user.meta_financeira || 0,
                porcentagem_comissao: user.porcentagem_comissao || 0
            });
        } else {
            setUserData({
                nome: '',
                email: '',
                senha: '',
                meta_embarques: 10,
                meta_financeira: 0,
                porcentagem_comissao: 0
            });
        }
        setIsUserDialogOpen(true);
    };

    const managers = users.filter(u => (u.roles || []).includes('Gestor'));
    const sellers = users.filter(u => (u.roles || []).includes('Vendedor'));

    return (
        <div className="p-6 space-y-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Cadastros</h1>
                <p className="text-gray-600 mt-1">Gerencie usuários, vendedores e configurações do sistema</p>
            </div>

            <Tabs defaultValue="auxiliares" className="w-full">
                <TabsList className="grid w-full grid-cols-4 bg-white/50 p-1 rounded-xl h-14 shadow-sm border border-gray-100">
                    <TabsTrigger value="auxiliares" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white gap-2 font-semibold transition-all">
                        <Package className="w-4 h-4" /> Auxiliares
                    </TabsTrigger>
                    <TabsTrigger value="localidades" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white gap-2 font-semibold transition-all">
                        <CreditCard className="w-4 h-4" /> Origens/Destinos
                    </TabsTrigger>
                    <TabsTrigger value="gestores" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white gap-2 font-semibold transition-all">
                        <ShieldCheck className="w-4 h-4" /> Gestores
                    </TabsTrigger>
                    <TabsTrigger value="vendedores" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white gap-2 font-semibold transition-all">
                        <Users className="w-4 h-4" /> Vendedores
                    </TabsTrigger>
                </TabsList>

                {/* ABA AUXILIARES */}
                <TabsContent value="auxiliares" className="mt-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="shadow-sm border-0 rounded-3xl overflow-hidden">
                            <CardHeader className="bg-white border-b">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <DollarSign className="w-5 h-5 text-blue-600" />
                                    Custos Operacionais Fixos
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4 items-end">
                                    <div className="space-y-2">
                                        <Label>Nome do Custo</Label>
                                        <Input
                                            placeholder="Ex: Pedágio"
                                            value={newCost.nome}
                                            onChange={(e) => setNewCost({ ...newCost, nome: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Valor (R$)</Label>
                                        <div className="flex gap-2">
                                            <CurrencyInput
                                                value={newCost.valor}
                                                onChange={(val) => setNewCost({ ...newCost, valor: val })}
                                                className="h-10"
                                            />
                                            <Button onClick={() => addCostMutation.mutate(newCost)} size="icon" className="h-10 w-10 shrink-0 bg-blue-600 hover:bg-blue-700">
                                                <Plus className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nome</TableHead>
                                            <TableHead>Valor</TableHead>
                                            <TableHead className="text-right">Ação</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {costs.map((cost) => (
                                            <TableRow key={cost.id}>
                                                <TableCell className="font-medium">{cost.nome}</TableCell>
                                                <TableCell>R$ {cost.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => deleteCostMutation.mutate(cost.id)} className="text-red-500 hover:bg-red-50">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm border-0 rounded-3xl overflow-hidden">
                            <CardHeader className="bg-white border-b">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <CreditCard className="w-5 h-5 text-blue-600" />
                                    Prazos de Pagamento
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                                <div className="space-y-2">
                                    <Label>Novo Prazo</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Ex: 30/60/90 dias"
                                            value={newTerm.nome}
                                            onChange={(e) => setNewTerm({ nome: e.target.value })}
                                        />
                                        <Button onClick={() => addTermMutation.mutate(newTerm)} size="icon" className="bg-blue-600 hover:bg-blue-700">
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Descrição</TableHead>
                                            <TableHead className="text-right">Ação</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {terms.map((term) => (
                                            <TableRow key={term.id}>
                                                <TableCell className="font-medium">{term.nome}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => deleteTermMutation.mutate(term.id)} className="text-red-500 hover:bg-red-50">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* ABA LOCALIDADES */}
                <TabsContent value="localidades" className="mt-6">
                    <Card className="shadow-sm border-0 rounded-3xl overflow-hidden">
                        <CardHeader className="bg-white border-b">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <CreditCard className="w-5 h-5 text-blue-600" />
                                Origens e Destinos de Cargas
                            </CardTitle>
                            <CardDescription>Cadastre as cidades ou regiões atendidas para usar nas propostas</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="space-y-2">
                                <Label>Nova Localidade</Label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Ex: São Paulo - SP (BR)"
                                        value={newLocation.nome}
                                        onChange={(e) => setNewLocation({ nome: e.target.value })}
                                    />
                                    <Button onClick={() => addLocationMutation.mutate(newLocation)} size="icon" className="bg-blue-600 hover:bg-blue-700">
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Descrição</TableHead>
                                        <TableHead className="text-right">Ação</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {locations.length === 0 ? (
                                        <TableRow><TableCell colSpan={2} className="text-center py-8">Nenhuma localidade cadastrada.</TableCell></TableRow>
                                    ) : (
                                        locations.map((loc) => (
                                            <TableRow key={loc.id}>
                                                <TableCell className="font-medium">{loc.nome}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => deleteLocationMutation.mutate(loc.id)} className="text-red-500 hover:bg-red-50">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ABA GESTORES */}
                <TabsContent value="gestores" className="mt-6">
                    <Card className="shadow-sm border-0 rounded-3xl">
                        <CardHeader className="flex flex-row items-center justify-between border-b">
                            <div>
                                <CardTitle>Gestores do Sistema</CardTitle>
                                <CardDescription>Usuários com acesso administrativo e login</CardDescription>
                            </div>
                            <Button onClick={() => handleOpenDialog('Gestor')} className="bg-blue-600 hover:bg-blue-700 gap-2">
                                <UserPlus className="w-4 h-4" /> Novo Gestor
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nome</TableHead>
                                        <TableHead>E-mail</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {managers.length === 0 ? (
                                        <TableRow><TableCell colSpan={3} className="text-center py-8">Nenhum gestor cadastrado.</TableCell></TableRow>
                                    ) : (
                                        managers.map(u => (
                                            <TableRow key={u.id}>
                                                <TableCell className="font-semibold">{u.full_name}</TableCell>
                                                <TableCell>{u.email}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog('Gestor', u)}>
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => deleteUserMutation.mutate(u.id)} className="text-red-500 hover:bg-red-50">
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ABA VENDEDORES */}
                <TabsContent value="vendedores" className="mt-6">
                    <Card className="shadow-sm border-0 rounded-3xl">
                        <CardHeader className="flex flex-row items-center justify-between border-b">
                            <div>
                                <CardTitle>Vendedores / Comerciais</CardTitle>
                                <CardDescription>Gestão de metas e desempenho (sem login no sistema)</CardDescription>
                            </div>
                            <Button onClick={() => handleOpenDialog('Vendedor')} className="bg-blue-600 hover:bg-blue-700 gap-2">
                                <UserPlus className="w-4 h-4" /> Novo Vendedor
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nome</TableHead>
                                        <TableHead>Meta de Embarques</TableHead>
                                        <TableHead>Meta Financeira</TableHead>
                                        <TableHead>Comissão</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sellers.length === 0 ? (
                                        <TableRow><TableCell colSpan={5} className="text-center py-8">Nenhum vendedor cadastrado.</TableCell></TableRow>
                                    ) : (
                                        sellers.map(u => (
                                            <TableRow key={u.id}>
                                                <TableCell className="font-semibold">{u.full_name}</TableCell>
                                                <TableCell>{u.meta_embarques || 0} p/mês</TableCell>
                                                <TableCell className="font-medium text-blue-700">R$ {u.meta_financeira?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                                                <TableCell>{u.porcentagem_comissao || 0}%</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog('Vendedor', u)}>
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => deleteUserMutation.mutate(u.id)} className="text-red-500 hover:bg-red-50">
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
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

            {/* DIALOG DE USUÁRIO / VENDEDOR */}
            <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {userType === 'Gestor' ? <UserCog className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                            {editingUser ? `Editar ${userType}` : `Novo ${userType}`}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nome Completo</Label>
                            <Input
                                value={userData.nome}
                                onChange={(e) => setUserData({ ...userData, nome: e.target.value })}
                                placeholder="Nome completo"
                            />
                        </div>

                        {userType === 'Gestor' && (
                            <>
                                <div className="space-y-2">
                                    <Label>E-mail (Login)</Label>
                                    <Input
                                        type="email"
                                        value={userData.email}
                                        onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                                        placeholder="exemplo@dflogistica.com.br"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Senha {editingUser && "(deixe em branco se não quiser alterar)"}</Label>
                                    <Input
                                        type="password"
                                        value={userData.senha}
                                        onChange={(e) => setUserData({ ...userData, senha: e.target.value })}
                                        placeholder="Min. 6 caracteres"
                                    />
                                </div>
                            </>
                        )}

                        {userType === 'Vendedor' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Meta Embarques (Mês)</Label>
                                    <Input
                                        type="number"
                                        value={userData.meta_embarques}
                                        onChange={(e) => setUserData({ ...userData, meta_embarques: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Comissão (%)</Label>
                                    <Input
                                        type="number"
                                        value={userData.porcentagem_comissao}
                                        onChange={(e) => setUserData({ ...userData, porcentagem_comissao: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label>Meta Financeira (Mês)</Label>
                                    <CurrencyInput
                                        value={userData.meta_financeira}
                                        onChange={(val) => setUserData({ ...userData, meta_financeira: val })}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsUserDialogOpen(false)} className="rounded-xl">Cancelar</Button>
                        <Button onClick={() => createOrUpdateUserMutation.mutate(userData)} className="bg-blue-600 hover:bg-blue-700 rounded-xl px-8">Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

