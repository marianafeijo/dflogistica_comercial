import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Calendar, CheckCircle, Filter, Download } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import TaskCard from "../components/tasks/TaskCard";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Historico() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("todos");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: completedTasks, isLoading } = useQuery({
    queryKey: ['allCompletedTasks'],
    queryFn: async () => {
      return await base44.entities.Task.filter({
        status: 'Concluída'
      }, '-data_conclusao', 500);
    },
    enabled: !!user,
    initialData: [],
  });

  const filteredTasks = React.useMemo(() => {
    let result = [...completedTasks];

    // Filtro por termo de busca
    if (searchTerm) {
      result = result.filter(task =>
        task.empresa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.nome_contato?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por data de início
    if (dataInicio) {
      const inicio = parseISO(dataInicio);
      result = result.filter(task => {
        const taskDate = task.data_conclusao
          ? parseISO(task.data_conclusao.split('T')[0])
          : parseISO(task.data_programada);
        return taskDate >= inicio;
      });
    }

    // Filtro por data fim
    if (dataFim) {
      const fim = parseISO(dataFim);
      result = result.filter(task => {
        const taskDate = task.data_conclusao
          ? parseISO(task.data_conclusao.split('T')[0])
          : parseISO(task.data_programada);
        return taskDate <= fim;
      });
    }

    // Filtro por tipo
    if (tipoFiltro !== "todos") {
      result = result.filter(task => task.tipo === tipoFiltro);
    }

    return result;
  }, [completedTasks, searchTerm, dataInicio, dataFim, tipoFiltro]);

  const tasksByDate = React.useMemo(() => {
    const grouped = {};
    filteredTasks.forEach(task => {
      const date = task.data_conclusao
        ? format(parseISO(task.data_conclusao.split('T')[0]), 'yyyy-MM-dd')
        : format(parseISO(task.data_programada), 'yyyy-MM-dd');

      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(task);
    });
    return Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredTasks]);

  const exportToCSV = () => {
    const headers = ['Data Conclusão', 'Empresa', 'Contato', 'Tipo', 'Descrição', 'Observações'];
    const rows = filteredTasks.map(task => [
      task.data_conclusao ? format(parseISO(task.data_conclusao), 'dd/MM/yyyy HH:mm') : '',
      task.empresa,
      task.nome_contato,
      task.tipo,
      task.descricao,
      task.observacoes || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `historico_tarefas_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const limparFiltros = () => {
    setSearchTerm("");
    setDataInicio("");
    setDataFim("");
    setTipoFiltro("todos");
  };

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Histórico de Tarefas</h1>
          <p className="text-gray-600 mt-1">
            Relatório de tarefas concluídas
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={exportToCSV}
            disabled={filteredTasks.length === 0}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-0 rounded-3xl">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-600" />
            Filtros do Relatório
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dataInicio">Data Início</Label>
              <Input
                id="dataInicio"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataFim">Data Fim</Label>
              <Input
                id="dataFim"
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Tarefa</Label>
              <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="E-mail">E-mail</SelectItem>
                  <SelectItem value="Ligação">Ligação</SelectItem>
                  <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                  <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                  <SelectItem value="Follow-up">Follow-up</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button
                variant="outline"
                onClick={limparFiltros}
                className="w-full"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Buscar por empresa, contato ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="text-sm text-gray-600">
            <strong>{filteredTasks.length}</strong> tarefa(s) encontrada(s)
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-0 rounded-3xl">
        <CardHeader className="border-b">
          <CardTitle>Tarefas Concluídas</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Carregando histórico...</p>
            </div>
          ) : tasksByDate.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Nenhuma tarefa encontrada</p>
            </div>
          ) : (
            <div className="space-y-8">
              {tasksByDate.map(([date, tasks]) => (
                <div key={date}>
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-lg text-gray-900">
                      {format(parseISO(date), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </h3>
                    <span className="text-sm text-gray-500">({tasks.length} tarefa{tasks.length > 1 ? 's' : ''})</span>
                  </div>
                  <div className="space-y-3 ml-7">
                    {tasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        completed
                        showObservacoes
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}