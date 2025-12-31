import React, { useState } from "react";
import { api } from "@/services/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, AlertTriangle, ThumbsUp, Trash2, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function Ocorrencias() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    tipo: "Reclamação",
    titulo: "",
    descricao: "",
    data_ocorrencia: format(new Date(), 'yyyy-MM-dd'),
    cliente: "",
    responsavel: ""
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: ocorrencias, isLoading } = useQuery({
    queryKey: ['ocorrencias'],
    queryFn: () => api.entities.Ocorrencia.list('-data_ocorrencia'),
    initialData: [],
  });

  const { data: leads } = useQuery({
    queryKey: ['leadsForOcorrencias'],
    queryFn: () => api.entities.Lead.list(),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.Ocorrencia.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ocorrencias'] });
      setShowDialog(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Ocorrencia.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ocorrencias'] });
    },
  });

  const resetForm = () => {
    setFormData({
      tipo: "Reclamação",
      titulo: "",
      descricao: "",
      data_ocorrencia: format(new Date(), 'yyyy-MM-dd'),
      cliente: "",
      responsavel: user?.email || ""
    });
  };

  const handleCreate = () => {
    createMutation.mutate({
      ...formData,
      responsavel: user?.email || "Sistema"
    });
  };

  const filteredOcorrencias = ocorrencias.filter(occ =>
    occ.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    occ.titulo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ocorrências</h1>
          <p className="text-gray-600 mt-1">Registre reclamações e feedbacks positivos</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="bg-blue-600 hover:bg-blue-700 gap-2">
          <Plus className="w-4 h-4" />
          Nova Ocorrência
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-sm border-0 rounded-3xl bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Reclamações Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredOcorrencias.filter(o => o.tipo === 'Reclamação').slice(0, 5).map(occ => (
                <div key={occ.id} className="p-4 bg-red-50 rounded-xl border border-red-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-red-900">{occ.titulo}</h4>
                      <p className="text-sm text-red-700 font-medium">{occ.cliente}</p>
                      <p className="text-xs text-red-600 mt-1">{format(new Date(occ.data_ocorrencia), 'dd/MM/yyyy')}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600" onClick={() => deleteMutation.mutate(occ.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-red-800 mt-2">{occ.descricao}</p>
                </div>
              ))}
              {filteredOcorrencias.filter(o => o.tipo === 'Reclamação').length === 0 && (
                <p className="text-center text-gray-500 py-4">Nenhuma reclamação registrada.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0 rounded-3xl bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <ThumbsUp className="w-5 h-5" />
              Feedbacks Positivos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredOcorrencias.filter(o => o.tipo === 'Feedback Positivo').slice(0, 5).map(occ => (
                <div key={occ.id} className="p-4 bg-green-50 rounded-xl border border-green-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-green-900">{occ.titulo}</h4>
                      <p className="text-sm text-green-700 font-medium">{occ.cliente}</p>
                      <p className="text-xs text-green-600 mt-1">{format(new Date(occ.data_ocorrencia), 'dd/MM/yyyy')}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="text-green-400 hover:text-green-600" onClick={() => deleteMutation.mutate(occ.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-green-800 mt-2">{occ.descricao}</p>
                </div>
              ))}
              {filteredOcorrencias.filter(o => o.tipo === 'Feedback Positivo').length === 0 && (
                <p className="text-center text-gray-500 py-4">Nenhum feedback positivo registrado.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-0 rounded-3xl">
        <CardHeader className="border-b">
          <div className="flex justify-between items-center">
            <CardTitle>Histórico Completo</CardTitle>
            <div className="w-64">
              <Input
                placeholder="Buscar por cliente ou título..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                <tr>
                  <th className="px-6 py-3">Data</th>
                  <th className="px-6 py-3">Tipo</th>
                  <th className="px-6 py-3">Cliente</th>
                  <th className="px-6 py-3">Título</th>
                  <th className="px-6 py-3">Descrição</th>
                  <th className="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOcorrencias.map((occ) => (
                  <tr key={occ.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3">{format(new Date(occ.data_ocorrencia), 'dd/MM/yyyy')}</td>
                    <td className="px-6 py-3">
                      <Badge variant={occ.tipo === 'Reclamação' ? 'destructive' : 'default'} className={occ.tipo === 'Feedback Positivo' ? 'bg-green-600 hover:bg-green-700' : ''}>
                        {occ.tipo}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 font-medium">{occ.cliente}</td>
                    <td className="px-6 py-3">{occ.titulo}</td>
                    <td className="px-6 py-3 max-w-xs truncate">{occ.descricao}</td>
                    <td className="px-6 py-3 text-right">
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(occ.id)}>
                        <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-600" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Ocorrência</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Reclamação">Reclamação</SelectItem>
                    <SelectItem value="Feedback Positivo">Feedback Positivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={formData.data_ocorrencia}
                  onChange={(e) => setFormData({ ...formData, data_ocorrencia: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={formData.cliente} onValueChange={(value) => setFormData({ ...formData, cliente: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {leads.map(lead => (
                    <SelectItem key={lead.id} value={lead.empresa}>{lead.empresa}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                placeholder="Resumo da ocorrência"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição Detalhada</Label>
              <Textarea
                placeholder="Descreva o que aconteceu..."
                rows={4}
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">Salvar Ocorrência</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}