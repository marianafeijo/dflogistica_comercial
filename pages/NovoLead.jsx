import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, Loader2, Plus, Trash2, Star } from "lucide-react";
import { format, addDays, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";

const SETORES = [
  "Químicos", "Papel e Celulose", "Partes e Peças", "Tabaco", "Alimentos e Bebidas", "Outros"
];

const LOCAIS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
  "Argentina", "Uruguai", "Chile", "Paraguai"
];

export default function NovoLead() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contatos, setContatos] = useState([
    { nome: '', email: '', celular: '' }
  ]);
  const [errorMessage, setErrorMessage] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const sellers = users.filter(u => (u.roles || []).includes('Vendedor'));

  const { data: workflowTemplates } = useQuery({
    queryKey: ['workflowTemplates'],
    queryFn: async () => {
      const templates = await base44.entities.WorkflowTemplate.filter({ ativo: true }, 'ordem');
      return templates;
    },
    initialData: [],
  });

  const [formData, setFormData] = useState({
    data_cadastro: format(new Date(), 'yyyy-MM-dd'),
    setor: '',
    empresa: '',
    estado: '', // we will use this for Local
    site: '',
    tipo: 'Cliente Ativo',
    resumo: '',
    status: 'Novo',
    responsavel: user?.email || '',
  });

  useEffect(() => {
    if (user?.email && !formData.responsavel) {
      setFormData(prev => ({ ...prev, responsavel: user.email }));
    }
  }, [user]);

  const formatPhone = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 7) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    } else {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  const adicionarContato = () => {
    setContatos([...contatos, { nome: '', email: '', celular: '' }]);
  };

  const removerContato = (index) => {
    if (contatos.length > 1) {
      setContatos(contatos.filter((_, i) => i !== index));
    }
  };

  const atualizarContato = (index, field, value) => {
    const novosContatos = [...contatos];
    if (field === 'celular') {
      novosContatos[index][field] = formatPhone(value);
    } else {
      novosContatos[index][field] = value;
    }
    setContatos(novosContatos);
  };

  const marcarComoPrincipal = (index) => {
    const novosContatos = contatos.map((c, i) => ({
      ...c,
      principal: i === index
    }));
    setContatos(novosContatos);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (contatos.length === 0 || !contatos.some(c => c.nome)) {
      setErrorMessage('Adicione pelo menos um contato com nome.');
      return;
    }
    setErrorMessage('');

    setIsSubmitting(true);

    try {
      const leadData = {
        ...formData,
        contatos: contatos.filter(c => c.nome),
        responsavel: formData.responsavel || user?.email,
      };

      await base44.entities.Lead.create(leadData);

      navigate(createPageUrl("Leads"));
    } catch (error) {
      console.error("Erro ao criar lead:", error);
      setErrorMessage("Erro ao criar lead. Tente novamente.");
    }

    setIsSubmitting(false);
  };

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(createPageUrl("Leads"))}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Novo Cliente</h1>
          <p className="text-gray-600 mt-1">Cadastre uma nova empresa na sua base</p>
          {errorMessage && (
            <div className="mt-2 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm">
              {errorMessage}
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="shadow-lg border-0">
          <CardHeader className="border-b">
            <CardTitle>Informações da Empresa</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="data_cadastro">Data de Cadastro *</Label>
                <Input
                  id="data_cadastro"
                  type="date"
                  value={formData.data_cadastro}
                  onChange={(e) => setFormData({ ...formData, data_cadastro: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="empresa">Nome da Empresa *</Label>
                <Input
                  id="empresa"
                  value={formData.empresa}
                  onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                  placeholder="Nome da empresa"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="setor">Setor</Label>
                <Select value={formData.setor} onValueChange={(value) => setFormData({ ...formData, setor: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o setor" />
                  </SelectTrigger>
                  <SelectContent>
                    {SETORES.map(setor => (
                      <SelectItem key={setor} value={setor}>{setor}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="estado">Local</Label>
                <Select value={formData.estado} onValueChange={(value) => setFormData({ ...formData, estado: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o local" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCAIS.map(local => (
                      <SelectItem key={local} value={local}>{local}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="site">Site</Label>
                <Input
                  id="site"
                  type="text"
                  value={formData.site}
                  onChange={(e) => setFormData({ ...formData, site: e.target.value })}
                  placeholder="www.empresa.com.br"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo *</Label>
                <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Prospecção">Prospecção</SelectItem>
                    <SelectItem value="Cotando">Cotando</SelectItem>
                    <SelectItem value="Cliente Ativo">Cliente Ativo</SelectItem>
                    <SelectItem value="Cliente Inativo">Cliente Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="responsavel">Responsável *</Label>
                <Select
                  value={formData.responsavel}
                  onValueChange={(value) => setFormData({ ...formData, responsavel: value })}
                  disabled={user?.role === 'Vendedor'} // Disable if Vendedor
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    {sellers.map(u => (
                      <SelectItem key={u.email} value={u.email}>{u.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {user?.role === 'Vendedor' && <p className="text-xs text-gray-500">Vendedores só podem cadastrar leads para si mesmos.</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resumo">Resumo / Observações</Label>
              <Textarea
                id="resumo"
                value={formData.resumo}
                onChange={(e) => setFormData({ ...formData, resumo: e.target.value })}
                placeholder="Adicione observações sobre o lead..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 mt-6">
          <CardHeader className="border-b">
            <div className="flex justify-between items-center">
              <CardTitle>Contatos para envio de solicitação de feedback *</CardTitle>
              <Button type="button" onClick={adicionarContato} variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                Adicionar Contato
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {contatos.map((contato, index) => (
              <Card key={index} className="p-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold">Contato #{index + 1}</h3>
                    {contatos.length > 1 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removerContato(index)}
                        className="hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Nome *</Label>
                      <Input
                        value={contato.nome}
                        onChange={(e) => atualizarContato(index, 'nome', e.target.value)}
                        placeholder="Ex: João Silva"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>E-mail</Label>
                      <Input
                        type="email"
                        value={contato.email}
                        onChange={(e) => atualizarContato(index, 'email', e.target.value)}
                        placeholder="contato@empresa.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Telefone Celular</Label>
                      <Input
                        value={contato.celular}
                        onChange={(e) => atualizarContato(index, 'celular', e.target.value)}
                        placeholder="(00) 00000-0000"
                        maxLength={15}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(createPageUrl("Leads"))}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Salvar Cliente
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}