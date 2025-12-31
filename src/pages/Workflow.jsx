import React, { useState } from "react";
import { api } from "@/services/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Save, Trash2, Edit } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
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

export default function Workflow() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState('com_whatsapp');
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [newTemplate, setNewTemplate] = useState({
        dia_offset: 0,
        rotulo: 'Hoje',
        tipo: 'E-mail',
        descricao: '',
        modelo_mensagem: '',
        ativo: true,
        ordem: 1
    });

    const { data: templates, isLoading } = useQuery({
        queryKey: ['workflowTemplates'],
        queryFn: async () => {
            const data = await api.entities.WorkflowTemplate.list('ordem');
            return data;
        },
        initialData: [],
    });

    const filteredTemplates = templates.filter(t => {
        // Default to 'com_whatsapp' for old templates
        const category = t.categoria || 'com_whatsapp';
        return category === activeTab;
    });

    const getRotulo = (diaOffset) => {
        if (diaOffset === 0) return 'Hoje';
        if (diaOffset === 1) return 'Amanhã';
        return `Em ${diaOffset} dias`;
    };

    const handleDiaOffsetChange = (value) => {
        const offset = parseInt(value, 10);
        setNewTemplate({
            ...newTemplate,
            dia_offset: offset,
            rotulo: getRotulo(offset)
        });
    };

    const createMutation = useMutation({
        mutationFn: (data) => api.entities.WorkflowTemplate.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workflowTemplates'] });
            setNewTemplate({
                dia_offset: 0,
                rotulo: 'Hoje',
                tipo: 'E-mail',
                descricao: '',
                modelo_mensagem: '',
                ativo: true,
                categoria: activeTab,
                ordem: templates.filter(t => (t.categoria || 'com_whatsapp') === activeTab).length + 1
            });
            toast({
                title: "Tarefa adicionada!",
                description: "Nova tarefa adicionada ao workflow.",
            });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            await api.entities.WorkflowTemplate.update(id, data);

            // Update future tasks based on this template
            const allTasks = await api.entities.Task.list();
            const today = new Date().toISOString().split('T')[0];

            // Find tasks that match this template's characteristics and are in the future or today
            const tasksToUpdate = allTasks.filter(task => {
                const taskDate = task.data_programada;
                return task.status === 'Pendente' && taskDate >= today;
            });

            // Update tasks that match the old template description and type
            const template = templates.find(t => t.id === id);
            if (template) {
                const updatePromises = tasksToUpdate
                    .filter(task => task.tipo === template.tipo && task.descricao === template.descricao)
                    .map(task => api.entities.Task.update(task.id, {
                        tipo: data.tipo,
                        descricao: data.descricao,
                        modelo_mensagem: data.modelo_mensagem,
                    }));

                await Promise.all(updatePromises);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workflowTemplates'] });
            queryClient.invalidateQueries({ queryKey: ['todayTasks'] });
            queryClient.invalidateQueries({ queryKey: ['overdueTasks'] });
            setEditingTemplate(null);
            toast({
                title: "Tarefa atualizada!",
                description: "As alterações foram salvas e tarefas futuras atualizadas.",
            });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => api.entities.WorkflowTemplate.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workflowTemplates'] });
            toast({
                title: "Tarefa removida!",
                description: "A tarefa foi removida do workflow.",
            });
        },
    });

    const handleCreate = () => {
        if (newTemplate.descricao) {
            createMutation.mutate({ ...newTemplate, categoria: activeTab });
        }
    };

    const handleEdit = (template) => {
        setEditingTemplate({ ...template, rotulo: template.rotulo || getRotulo(template.dia_offset) });
    };

    const handleUpdate = () => {
        if (editingTemplate) {
            updateMutation.mutate({
                id: editingTemplate.id,
                data: {
                    dia_offset: editingTemplate.dia_offset,
                    rotulo: editingTemplate.rotulo,
                    tipo: editingTemplate.tipo,
                    descricao: editingTemplate.descricao,
                    modelo_mensagem: editingTemplate.modelo_mensagem,
                    ativo: editingTemplate.ativo,
                    categoria: editingTemplate.categoria || 'com_whatsapp',
                    ordem: editingTemplate.ordem
                }
            });
        }
    };

    return (
        <div className="p-6 space-y-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Workflow</h1>
                <p className="text-gray-600 mt-1">Configure o fluxo automático de tarefas</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-md bg-white p-1 rounded-xl shadow-sm border">
                    <TabsTrigger value="com_whatsapp" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">
                        Com WhatsApp
                    </TabsTrigger>
                    <TabsTrigger value="sem_whatsapp" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">
                        Sem WhatsApp
                    </TabsTrigger>
                </TabsList>

                <div className="mt-6 space-y-6">
                    {/* Seção de Workflow */}
                    <Card className="shadow-sm border-0 rounded-3xl">
                        <CardHeader className="border-b">
                            <CardTitle className="flex items-center gap-2">
                                <Plus className="w-5 h-5" />
                                Adicionar Nova Tarefa ao Workflow
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <Label>Dias após cadastro</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={newTemplate.dia_offset}
                                        onChange={(e) => handleDiaOffsetChange(e.target.value)}
                                    />
                                    <p className="text-xs text-gray-500">
                                        {getRotulo(newTemplate.dia_offset)}
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Tipo</Label>
                                    <Select value={newTemplate.tipo} onValueChange={(value) => setNewTemplate({ ...newTemplate, tipo: value })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="E-mail">E-mail</SelectItem>
                                            <SelectItem value="Ligação">Ligação</SelectItem>
                                            <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                                            <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                                            <SelectItem value="Follow-up">Follow-up</SelectItem>
                                            <SelectItem value="Outro">Outro</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label>Descrição</Label>
                                    <Input
                                        value={newTemplate.descricao}
                                        onChange={(e) => setNewTemplate({ ...newTemplate, descricao: e.target.value })}
                                        placeholder="Ex: Enviar apresentação da empresa"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Modelo de Mensagem/Roteiro</Label>
                                <Textarea
                                    value={newTemplate.modelo_mensagem}
                                    onChange={(e) => setNewTemplate({ ...newTemplate, modelo_mensagem: e.target.value })}
                                    placeholder="Digite o modelo de mensagem. Use {NOME_CONTATO}, {EMPRESA} e {SETOR} como placeholders dinâmicos..."
                                    rows={6}
                                />
                                <p className="text-xs text-gray-500">
                                    💡 Use os placeholders: {'{NOME_CONTATO}'}, {'{EMPRESA}'}, {'{SETOR}'} para personalizar automaticamente
                                </p>
                            </div>

                            <div className="flex justify-end">
                                <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700 gap-2">
                                    <Plus className="w-4 h-4" />
                                    Adicionar Tarefa
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-0 rounded-3xl">
                        <CardHeader className="border-b">
                            <CardTitle>Workflow Atual</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Ordem</TableHead>
                                        <TableHead>Prazo</TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Descrição</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredTemplates.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                                Nenhuma tarefa configurada para este fluxo.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredTemplates.map((template, index) => (
                                            <TableRow key={template.id}>
                                                <TableCell>{index + 1}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">
                                                        {template.rotulo || getRotulo(template.dia_offset)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{template.tipo}</TableCell>
                                                <TableCell>{template.descricao}</TableCell>
                                                <TableCell>
                                                    <Badge className={template.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                                                        {template.ativo ? 'Ativo' : 'Inativo'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleEdit(template)}
                                                            className="hover:bg-blue-50 hover:text-blue-600"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => deleteMutation.mutate(template.id)}
                                                            className="hover:bg-red-50 hover:text-red-600"
                                                        >
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
                </div>
            </Tabs>

            <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Editar Tarefa do Workflow</DialogTitle>
                    </DialogHeader>
                    {editingTemplate && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Dias após cadastro</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={editingTemplate.dia_offset}
                                        onChange={(e) => {
                                            const offset = parseInt(e.target.value, 10);
                                            setEditingTemplate({ ...editingTemplate, dia_offset: offset, rotulo: getRotulo(offset) });
                                        }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Tipo</Label>
                                    <Select value={editingTemplate.tipo} onValueChange={(value) => setEditingTemplate({ ...editingTemplate, tipo: value })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="E-mail">E-mail</SelectItem>
                                            <SelectItem value="Ligação">Ligação</SelectItem>
                                            <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                                            <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                                            <SelectItem value="Follow-up">Follow-up</SelectItem>
                                            <SelectItem value="Outro">Outro</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Descrição</Label>
                                <Input
                                    value={editingTemplate.descricao}
                                    onChange={(e) => setEditingTemplate({ ...editingTemplate, descricao: e.target.value })}
                                    placeholder="Ex: Enviar apresentação da empresa"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Modelo de Mensagem/Roteiro</Label>
                                <Textarea
                                    value={editingTemplate.modelo_mensagem || ''}
                                    onChange={(e) => setEditingTemplate({ ...editingTemplate, modelo_mensagem: e.target.value })}
                                    placeholder="Digite o modelo de mensagem..."
                                    rows={8}
                                />
                                <p className="text-xs text-gray-500">
                                    💡 Use os placeholders: {'{NOME_CONTATO}'}, {'{EMPRESA}'}, {'{SETOR}'} para personalizar automaticamente
                                </p>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingTemplate(null)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleUpdate} className="bg-blue-600 hover:bg-blue-700 gap-2">
                            <Save className="w-4 h-4" />
                            Salvar Alterações
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
