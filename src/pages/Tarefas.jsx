import React, { useState } from "react";
import { api } from "@/services/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, Mail, Phone, MessageCircle, Linkedin } from "lucide-react";
import { format, parseISO, isBefore, isAfter, startOfToday, isSameDay } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import TaskCard from "../components/tasks/TaskCard";

const TIPO_ICONS = {
  'E-mail': Mail,
  'Ligação': Phone,
  'WhatsApp': MessageCircle,
  'LinkedIn': Linkedin,
  'Follow-up': Mail,
  'Outro': Clock
};

export default function Tarefas() {
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = useState(null);
  const [observacoes, setObservacoes] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });

  const { data: allTasks, isLoading } = useQuery({
    queryKey: ['allPendingTasks'],
    queryFn: async () => {
      // Fetch ALL pending tasks
      return await api.entities.Task.filter({
        status: 'Pendente'
      }, 'data_programada');
    },
    enabled: !!user,
    initialData: [],
  });

  const completeMutation = useMutation({
    mutationFn: async ({ id, observacoes, lead_id }) => {
      // 1. Complete the task
      await api.entities.Task.update(id, {
        status: 'Concluída',
        data_conclusao: new Date().toISOString(),
        observacoes: observacoes || undefined
      });

      // 2. Check if there are any other pending tasks for this lead
      const pendingTasks = await api.entities.Task.filter({
        lead_id: lead_id,
        status: 'Pendente'
      });

      // Filter out the task we just completed (in case the query returns it due to race condition or if we filtered locally)
      // Actually base44.filter should reflect DB state, but let's be safe.
      // If we await update, the filter should typically not return it if consistency is immediate.
      // Assuming eventual consistency might be a slight issue, but usually fine.

      const remainingTasks = pendingTasks.filter(t => t.id !== id);

      if (remainingTasks.length === 0) {
        // No more tasks, update Lead status
        await api.entities.Lead.update(lead_id, {
          status: 'Lead sem retorno'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allPendingTasks'] });
      queryClient.invalidateQueries({ queryKey: ['completedTasksToday'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] }); // Update leads list as status might change
      setSelectedTask(null);
      setObservacoes('');
    },
  });

  const handleComplete = (task) => {
    setSelectedTask(task);
    if (task.tipo !== 'Ligação') {
      setObservacoes('');
    }
  };

  const confirmComplete = () => {
    if (selectedTask) {
      completeMutation.mutate({
        id: selectedTask.id,
        observacoes,
        lead_id: selectedTask.lead_id
      });
    }
  };

  // Filter tasks:
  // 1. Pending (already filtered by query)
  // 2. data_programada <= Today
  const visibleTasks = React.useMemo(() => {
    const today = startOfToday();
    return allTasks.filter(task => {
      // 1. Must be pending (already filtered by query, but good to be safe)
      if (task.status === 'Concluída') return false;

      const taskDate = parseISO(task.data_programada);

      // 2. Show if date is BEFORE or EQUAL to today (Today or Overdue)
      // Hide if date is AFTER today (Future)
      return isBefore(taskDate, today) || isSameDay(taskDate, today);
    }).sort((a, b) => new Date(a.data_programada) - new Date(b.data_programada));
  }, [allTasks]);

  const tasksByType = React.useMemo(() => {
    const counts = {};
    visibleTasks.forEach(task => {
      counts[task.tipo] = (counts[task.tipo] || 0) + 1;
    });
    return counts;
  }, [visibleTasks]);

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tarefas do Dia</h1>
          <p className="text-gray-600 mt-1">
            Acompanhe suas atividades prioritárias
          </p>
        </div>
      </div>

      {Object.keys(tasksByType).length > 0 && (
        <Card className="shadow-sm border-0 rounded-3xl bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Resumo do Dia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-6">
              {Object.entries(tasksByType).map(([tipo, count]) => {
                const Icon = TIPO_ICONS[tipo] || Clock;
                return (
                  <div key={tipo} className="flex items-center gap-2">
                    <Icon className="w-5 h-5" />
                    <span className="font-semibold">{count}</span>
                    <span className="opacity-90">{tipo}(s)</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-sm border-0 rounded-3xl">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-600" />
            Tarefas ({visibleTasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {visibleTasks.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Tudo em dia! Nenhuma tarefa pendente para hoje ou atrasada.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleTasks.map(task => {
                const taskDate = parseISO(task.data_programada);
                const today = startOfToday();
                // isLate if strictly before today
                const isLate = isBefore(taskDate, today) && !isSameDay(taskDate, today);

                return (
                  <div
                    key={task.id}
                    className={`transition-all duration-200 rounded-xl ${isLate ? 'bg-red-100 border-2 border-red-400 p-1' : ''}`}
                  >
                    <TaskCard
                      task={task}
                      onComplete={handleComplete}
                      isOverdue={isLate}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedTask?.tipo === 'Ligação' ? 'Resumo da Ligação' : 'Concluir Tarefa'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="font-medium">{selectedTask?.descricao}</p>
              <p className="text-sm text-gray-600 mt-1">{selectedTask?.empresa}</p>
            </div>
            <div className="space-y-2">
              <Label>
                {selectedTask?.tipo === 'Ligação'
                  ? 'O que foi conversado na ligação? *'
                  : 'Observações (opcional)'}
              </Label>
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder={
                  selectedTask?.tipo === 'Ligação'
                    ? 'Descreva o que foi discutido na call...'
                    : 'Adicione observações sobre a execução desta tarefa...'
                }
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTask(null)}>
              Cancelar
            </Button>
            <Button
              onClick={confirmComplete}
              className="bg-green-600 hover:bg-green-700"
              disabled={selectedTask?.tipo === 'Ligação' && !observacoes.trim()}
            >
              Confirmar Conclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}