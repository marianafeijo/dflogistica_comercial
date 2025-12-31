import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Phone, Mail, MessageCircle, CheckCircle, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";

export default function TasksSummary({ tasks, completedToday, metaDiaria, taxaAtingimento, overdueTasks }) {
    const tasksByType = React.useMemo(() => {
        const counts = {
            'Ligação': 0,
            'WhatsApp': 0,
            'E-mail': 0,
            'Follow-up': 0
        };

        tasks.forEach(task => {
            if (counts.hasOwnProperty(task.tipo)) {
                counts[task.tipo]++;
            }
        });

        return counts;
    }, [tasks]);

    const icons = {
        'Ligação': Phone,
        'WhatsApp': MessageCircle,
        'E-mail': Mail,
        'Follow-up': Mail
    };

    const hasOverdueTasks = overdueTasks && overdueTasks.length > 0;

    return (
        <Card className="shadow-lg border-0 bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                    <Calendar className="w-5 h-5" />
                    Suas Tarefas de Hoje
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {hasOverdueTasks && (
                        <Link to={createPageUrl("Tarefas")}>
                            <div className="p-3 bg-red-500 hover:bg-red-600 rounded-lg cursor-pointer transition-colors">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5" />
                                    <div>
                                        <p className="font-bold">{overdueTasks.length} Tarefa{overdueTasks.length > 1 ? 's' : ''} Atrasada{overdueTasks.length > 1 ? 's' : ''}</p>
                                        <p className="text-xs opacity-90">Clique para ver detalhes</p>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    )}

                    <div className="flex flex-wrap gap-6">
                        {Object.entries(tasksByType).map(([tipo, count]) => {
                            if (count === 0) return null;
                            const Icon = icons[tipo];
                            return (
                                <div key={tipo} className="flex items-center gap-3">
                                    <Icon className="w-5 h-5" />
                                    <div>
                                        <p className="text-2xl font-bold">{count}</p>
                                        <p className="text-sm opacity-90">{tipo}(s)</p>
                                    </div>
                                </div>
                            );
                        })}
                        {tasks.length === 0 && !hasOverdueTasks && (
                            <p className="text-lg opacity-90">Nenhuma tarefa pendente para hoje 🎉</p>
                        )}
                    </div>

                    <div className="pt-4 border-t border-green-400">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm opacity-90">Meta Diária</span>
                            <span className="font-bold">{completedToday} / {metaDiaria}</span>
                        </div>
                        <div className="w-full bg-green-400 rounded-full h-3">
                            <div
                                className="bg-white rounded-full h-3 transition-all duration-500"
                                style={{ width: `${Math.min(taxaAtingimento, 100)}%` }}
                            />
                        </div>
                        <p className="text-xs opacity-75 mt-1">{taxaAtingimento}% da meta concluída</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}