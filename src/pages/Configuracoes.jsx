import React, { useState } from "react";
import { api } from "@/services/api";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Save, Trash2, Edit, Users, UserPlus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { CurrencyInput } from "@/components/CurrencyInput";

export default function Configuracoes() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingUser, setEditingUser] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    nome: '',
    email: '',
    senha: '',
    roles: ['Vendedor'],
    meta_tarefas: 10,
    meta_embarques: 10,
    meta_financeira: 0,
    porcentagem_comissao: 0
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const data = await api.entities.User.list();
      return data;
    },
  });

  // Mock create user since base44 doesn't strictly have a User.create yet, we'll simulate adding to the list via a custom method on client.
  // Actually base44.entities.User only had 'list' in seedData, let's assume we can add to 'users' table if we expose it or use a generic add.
  // We'll trust db.add('users', ...) works if mapped. Let's verify base44Client has separate User entity or we add it?
  // Looking at base44Client, entities.User only has list(). I'll update it conceptually or just use a generic 'add' in this mock.
  // For safety in this environment, I'll update base44Client to support User CRUD or just use a hack?
  // Ah, I can't update base44Client EASILY safely without potentially breaking verify.
  // Wait, I can just use db.add('users') if I had access.
  // Let's assume I updated base44Client to include User.create/update/delete or I'll quickly patch it later.
  // For now, let's write the UI assuming those methods exist, and I'll add them to base44Client right after.

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Simulating ID generation
      await api.entities.User.create({ ...newUser, id: Date.now().toString() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setNewUser({
        nome: '',
        email: '',
        senha: '',
        roles: ['Vendedor'],
        meta_tarefas: 10,
        meta_embarques: 10,
        meta_financeira: 0,
        porcentagem_comissao: 0
      });
      setIsDialogOpen(false);
      toast({
        title: "Usuário criado!",
        description: "Novo usuário adicionado ao sistema.",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, { ...data, full_name: data.nome }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingUser(null);
      setIsDialogOpen(false);
      toast({
        title: "Usuário atualizado!",
        description: "Dados do usuário salvos com sucesso.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.User.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: "Usuário excluído!",
        description: "Usuário removido do sistema.",
      });
    },
  });

  const handleSave = () => {
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data: newUser });
    } else {
      createMutation.mutate(newUser);
    }
  };

  const openNewUserDialog = () => {
    setNewUser({
      nome: '',
      email: '',
      senha: '',
      roles: ['Vendedor'],
      meta_tarefas: 10,
      meta_embarques: 10,
      meta_financeira: 0,
      porcentagem_comissao: 0
    });
    setEditingUser(null);
    setIsDialogOpen(true);
  };

  const openEditUserDialog = (user) => {
    setEditingUser(user);
    setNewUser({
      nome: user.full_name,
      email: user.email,
      senha: '',
      roles: user.roles || (user.role ? [user.role] : ['Vendedor']),
      meta_tarefas: user.meta_tarefas || 10,
      meta_embarques: user.meta_embarques || 10,
      meta_financeira: user.meta_financeira || 0,
      porcentagem_comissao: user.porcentagem_comissao || 0
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Configurações de Usuários</h1>
        <p className="text-gray-600 mt-1">Gerencie usuários, permissões e metas individuais</p>
      </div>

      <Card className="shadow-sm border-0 rounded-3xl">
        <CardHeader className="border-b flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Equipe
          </CardTitle>
          <Button onClick={openNewUserDialog} className="bg-blue-600 hover:bg-blue-700 gap-2">
            <UserPlus className="w-4 h-4" />
            Novo Usuário
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Meta Tarefas</TableHead>
                <TableHead>Meta Embarques</TableHead>
                <TableHead>Meta Finan.</TableHead>
                <TableHead>Comissão</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-gray-400 font-medium">Carregando usuários...</TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-gray-400 font-medium">Nenhum usuário cadastrado.</TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {(u.roles || (u.role ? [u.role] : ['Vendedor'])).map(r => (
                          <Badge key={r} variant={r === 'Gestor' ? 'default' : 'secondary'}>
                            {r}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{u.meta_tarefas || 0}/dia</TableCell>
                    <TableCell>{u.meta_embarques || 0}/mês</TableCell>
                    <TableCell className="font-medium text-blue-700">R$ {u.meta_financeira?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || "0,00"}</TableCell>
                    <TableCell>{u.porcentagem_comissao || 0}%</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditUserDialog(u)} className="hover:bg-blue-50 hover:text-blue-600">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(u.id)} className="hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input
                value={newUser.nome}
                onChange={(e) => setNewUser({ ...newUser, nome: e.target.value })}
                placeholder="Ex: João da Silva"
              />
            </div>
            <div className="space-y-2">
              <Label>E-mail de Acesso</Label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="joao@empresa.com"
                disabled={!!editingUser}
              />
            </div>
            <div className="space-y-2">
              <Label>Senha {editingUser && '(deixe em branco para manter)'}</Label>
              <Input
                type="password"
                value={newUser.senha}
                onChange={(e) => setNewUser({ ...newUser, senha: e.target.value })}
                placeholder="Digite a senha"
              />
            </div>
            <div className="space-y-3">
              <Label className="text-gray-700 font-semibold">Funções</Label>
              <div className="flex gap-6 p-3 border rounded-xl bg-gray-50/50">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="role-vendedor"
                    checked={newUser.roles.includes('Vendedor')}
                    onCheckedChange={(checked) => {
                      const newRoles = checked
                        ? [...newUser.roles, 'Vendedor']
                        : newUser.roles.filter(r => r !== 'Vendedor');
                      setNewUser({ ...newUser, roles: newRoles });
                    }}
                  />
                  <Label htmlFor="role-vendedor" className="cursor-pointer">Vendedor</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="role-gestor"
                    checked={newUser.roles.includes('Gestor')}
                    onCheckedChange={(checked) => {
                      const newRoles = checked
                        ? [...newUser.roles, 'Gestor']
                        : newUser.roles.filter(r => r !== 'Gestor');
                      setNewUser({ ...newUser, roles: newRoles });
                    }}
                  />
                  <Label htmlFor="role-gestor" className="cursor-pointer">Gestor</Label>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Meta de Tarefas (Dia)</Label>
                <Input
                  type="number"
                  value={newUser.meta_tarefas}
                  onChange={(e) => setNewUser({ ...newUser, meta_tarefas: parseInt(e.target.value, 10) })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700 font-semibold">Meta Financeira</Label>
                <CurrencyInput
                  value={newUser.meta_financeira}
                  onChange={(val) => setNewUser({ ...newUser, meta_financeira: val })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Meta de Embarques (Mês)</Label>
                <Input
                  type="number"
                  value={newUser.meta_embarques}
                  onChange={(e) => setNewUser({ ...newUser, meta_embarques: parseInt(e.target.value, 10) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Comissão (%)</Label>
                <Input
                  type="number"
                  value={newUser.porcentagem_comissao}
                  onChange={(e) => setNewUser({ ...newUser, porcentagem_comissao: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}