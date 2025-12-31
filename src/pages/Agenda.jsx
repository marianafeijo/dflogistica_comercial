import React, { useState } from "react";
import { api } from "@/services/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, CalendarDays, MapPin, Users, Target, Trash2, Edit, Check, X } from "lucide-react";
import { format, parseISO, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

export default function Agenda() {
    const queryClient = useQueryClient();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showDialog, setShowDialog] = useState(false);
    const [showDayEventsDialog, setShowDayEventsDialog] = useState(false);
    const [editingEvento, setEditingEvento] = useState(null);
    const [tipoEvento, setTipoEvento] = useState('');
    const [searchLead, setSearchLead] = useState('');

    const { data: user } = useQuery({
        queryKey: ['currentUser'],
        queryFn: () => base44.auth.me(),
    });

    const { data: eventos } = useQuery({
        queryKey: ['eventos'],
        queryFn: () => api.entities.Evento.list('-data_inicio'),
        initialData: [],
    });

    const { data: leads } = useQuery({
        queryKey: ['leadsForAgenda'],
        queryFn: () => api.entities.Lead.list(),
        initialData: [],
    });

    const [formData, setFormData] = useState({
        tipo: '',
        titulo: '',
        data_inicio: format(new Date(), 'yyyy-MM-dd'),
        data_fim: '',
        hora: '',
        local: '',
        empresas_visitar: [],
        metas: [],
        lead_id: '',
        cliente: '',
        pautas: '',
        responsavel: user?.email || '',
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Evento.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['eventos'] });
            resetForm();
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Evento.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['eventos'] });
            setEditingEvento(null);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.Evento.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['eventos'] });
        },
    });

    const resetForm = () => {
        setFormData({
            tipo: '',
            titulo: '',
            data_inicio: format(selectedDate || new Date(), 'yyyy-MM-dd'),
            data_fim: '',
            hora: '',
            local: '',
            empresas_visitar: [],
            metas: [],
            lead_id: '',
            cliente: '',
            pautas: '',
            responsavel: user?.email || '',
        });
        setTipoEvento('');
        setShowDialog(false);
    };

    const handleOpenDialog = () => {
        resetForm();
        setShowDialog(true);
    };

    const handleSelectTipo = (tipo) => {
        setTipoEvento(tipo);
        setFormData({ ...formData, tipo, data_inicio: format(selectedDate || new Date(), 'yyyy-MM-dd') });
    };

    const handleSubmit = () => {
        createMutation.mutate(formData);
    };

    const handleEdit = (evento) => {
        setEditingEvento(evento);
    };

    const handleUpdateChecklistItem = (campo, index, checked) => {
        const updatedItems = [...editingEvento[campo]];
        updatedItems[index].concluido = checked;
        updateMutation.mutate({
            id: editingEvento.id,
            data: { ...editingEvento, [campo]: updatedItems }
        });
    };

    const handleAddChecklistItem = (campo, novoItem) => {
        const updatedItems = [...(editingEvento[campo] || []), novoItem];
        updateMutation.mutate({
            id: editingEvento.id,
            data: { ...editingEvento, [campo]: updatedItems }
        });
    };

    const handleUpdatePautas = (pautas) => {
        updateMutation.mutate({
            id: editingEvento.id,
            data: { ...editingEvento, pautas }
        });
    };

    const eventosDoDia = React.useMemo(() => {
        if (!selectedDate) return [];

        return eventos.filter(e => {
            const dataInicio = parseISO(e.data_inicio);
            const dataFim = e.data_fim ? parseISO(e.data_fim) : null;

            if (dataFim) {
                return selectedDate >= dataInicio && selectedDate <= dataFim;
            }
            return isSameDay(dataInicio, selectedDate);
        });
    }, [eventos, selectedDate]);

    const proximosEventos = React.useMemo(() => {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        return eventos
            .filter(e => {
                const dataInicio = parseISO(e.data_inicio);
                const dataFim = e.data_fim ? parseISO(e.data_fim) : null;

                if (dataFim) {
                    return dataFim >= hoje;
                }
                return dataInicio >= hoje;
            })
            .sort((a, b) => new Date(a.data_inicio) - new Date(b.data_inicio))
            .slice(0, 10);
    }, [eventos]);

    const leadsFiltered = React.useMemo(() => {
        if (!searchLead) return leads.slice(0, 10);
        return leads.filter(l =>
            l.empresa?.toLowerCase().includes(searchLead.toLowerCase())
        ).slice(0, 10);
    }, [leads, searchLead]);

    const handleDateSelect = (date) => {
        if (date) {
            setSelectedDate(date);
            setShowDayEventsDialog(true);
        }
    };

    return (
        <div className="p-6 space-y-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Agenda</h1>
                    <p className="text-gray-600 mt-1">
                        Gerencie reuniões e viagens dos comerciais
                    </p>
                </div>
                <Button onClick={handleOpenDialog} className="bg-blue-600 hover:bg-blue-700 gap-2">
                    <Plus className="w-4 h-4" />
                    Novo Evento
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="space-y-6 lg:col-span-2">
                    <Card className="shadow-sm border-0 rounded-3xl">
                        <CardHeader className="border-b">
                            <CardTitle className="flex items-center gap-2">
                                <CalendarDays className="w-5 h-5 text-blue-600" />
                                Calendário
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 flex justify-center">
                            <div className="transform scale-110 origin-top">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={handleDateSelect}
                                    locale={ptBR}
                                    className="rounded-md border p-4"
                                    modifiers={{
                                        viagem: (date) => eventos.some(e => {
                                            if (e.tipo !== 'Viagem') return false;
                                            const start = parseISO(e.data_inicio);
                                            const end = e.data_fim ? parseISO(e.data_fim) : start;
                                            return date >= start && date <= end;
                                        })
                                    }}
                                    modifiersStyles={{
                                        viagem: { color: 'white', backgroundColor: '#9333ea', borderRadius: '4px' }
                                    }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-3">
                    <Card className="shadow-sm border-0 rounded-3xl h-full">
                        <CardHeader className="border-b py-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Target className="w-4 h-4 text-purple-600" />
                                Próximos Eventos
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            {proximosEventos.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-12">Nenhum evento próximo</p>
                            ) : (
                                <div className="space-y-4">
                                    {proximosEventos.map(evento => (
                                        <Card key={evento.id} className="hover:shadow-md transition-shadow">
                                            <CardContent className="p-4 flex items-start gap-4">
                                                <div className="flex flex-col items-center min-w-[3.5rem] bg-gray-50 rounded-lg p-2">
                                                    <span className="text-xs font-bold text-gray-500 uppercase">
                                                        {format(parseISO(evento.data_inicio), 'MMM', { locale: ptBR })}
                                                    </span>
                                                    <span className="text-xl font-bold text-gray-900">
                                                        {format(parseISO(evento.data_inicio), 'dd')}
                                                    </span>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <Badge className={
                                                                evento.tipo === 'Viagem' ? 'bg-purple-100 text-purple-800' :
                                                                    evento.tipo === 'Evento' ? 'bg-blue-100 text-blue-800' :
                                                                        'bg-green-100 text-green-800'
                                                            }>
                                                                {evento.tipo}
                                                            </Badge>
                                                            <h3 className="font-semibold text-lg mt-1">
                                                                {evento.titulo || evento.cliente || evento.local}
                                                            </h3>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(evento)}>
                                                                <Edit className="w-4 h-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(evento.id)}>
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    {evento.hora && (
                                                        <p className="text-sm text-gray-600 mt-1">🕐 {evento.hora}</p>
                                                    )}
                                                    {evento.local && (
                                                        <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                                                            <MapPin className="w-4 h-4" /> {evento.local}
                                                        </p>
                                                    )}
                                                    {evento.data_fim && (
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            Até {format(parseISO(evento.data_fim), "d 'de' MMMM", { locale: ptBR })}
                                                        </p>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Dialog Eventos do Dia */}
            <Dialog open={showDayEventsDialog} onOpenChange={setShowDayEventsDialog}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>
                            Eventos de {selectedDate ? format(selectedDate, "d 'de' MMMM", { locale: ptBR }) : ''}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                        {eventosDoDia.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">Nenhum evento neste dia.</p>
                        ) : (
                            eventosDoDia.map(evento => (
                                <Card key={evento.id} className="border-l-4 border-l-blue-500">
                                    <CardContent className="p-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Badge variant="outline">{evento.tipo}</Badge>
                                                    {evento.hora && <span className="text-sm text-gray-500">{evento.hora}</span>}
                                                </div>
                                                <h4 className="font-semibold text-lg">{evento.titulo || evento.cliente || evento.local}</h4>
                                                {evento.local && <p className="text-sm text-gray-600">{evento.local}</p>}
                                            </div>
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                                                    handleEdit(evento);
                                                    setShowDayEventsDialog(false);
                                                }}>
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteMutation.mutate(evento.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                    <DialogFooter>
                        <Button onClick={() => {
                            handleOpenDialog();
                            setShowDayEventsDialog(false);
                        }}>Novo Evento neste Dia</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog criar evento */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Novo Evento</DialogTitle>
                    </DialogHeader>

                    {!tipoEvento ? (
                        <div className="space-y-4">
                            <p className="text-gray-600">Selecione o tipo de evento:</p>
                            <div className="grid grid-cols-3 gap-4">
                                <Button
                                    variant="outline"
                                    className="h-24 flex flex-col gap-2"
                                    onClick={() => handleSelectTipo('Viagem')}
                                >
                                    <MapPin className="w-8 h-8 text-purple-600" />
                                    <span>Viagem</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-24 flex flex-col gap-2"
                                    onClick={() => handleSelectTipo('Evento')}
                                >
                                    <Target className="w-8 h-8 text-blue-600" />
                                    <span>Evento</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-24 flex flex-col gap-2"
                                    onClick={() => handleSelectTipo('Reunião')}
                                >
                                    <Users className="w-8 h-8 text-green-600" />
                                    <span>Reunião</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-24 flex flex-col gap-2"
                                    onClick={() => handleSelectTipo('Visita')}
                                >
                                    <MapPin className="w-8 h-8 text-orange-600" />
                                    <span>Visita</span>
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {tipoEvento === 'Viagem' && (
                                <>
                                    <div className="space-y-2">
                                        <Label>Local da Viagem *</Label>
                                        <Input
                                            value={formData.local}
                                            onChange={(e) => setFormData({ ...formData, local: e.target.value })}
                                            placeholder="Ex: São Paulo - SP"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Data de Ida *</Label>
                                            <Input
                                                type="date"
                                                value={formData.data_inicio}
                                                onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Data de Volta *</Label>
                                            <Input
                                                type="date"
                                                value={formData.data_fim}
                                                onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Empresas a Visitar</Label>
                                        <Input
                                            placeholder="Digite e pressione Enter"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && e.target.value) {
                                                    setFormData({
                                                        ...formData,
                                                        empresas_visitar: [...formData.empresas_visitar, { nome: e.target.value, concluido: false }]
                                                    });
                                                    e.target.value = '';
                                                }
                                            }}
                                        />
                                        <div className="space-y-1">
                                            {formData.empresas_visitar.map((emp, idx) => (
                                                <div key={idx} className="flex items-center gap-2 text-sm">
                                                    <Check className="w-4 h-4 text-gray-400" />
                                                    <span>{emp.nome}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {tipoEvento === 'Evento' && (
                                <>
                                    <div className="space-y-2">
                                        <Label>Título do Evento *</Label>
                                        <Input
                                            value={formData.titulo}
                                            onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                                            placeholder="Ex: Feira de Negócios"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Data *</Label>
                                        <Input
                                            type="date"
                                            value={formData.data_inicio}
                                            onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Metas do Evento</Label>
                                        <Input
                                            placeholder="Digite uma meta e pressione Enter"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && e.target.value) {
                                                    setFormData({
                                                        ...formData,
                                                        metas: [...formData.metas, { descricao: e.target.value, concluido: false }]
                                                    });
                                                    e.target.value = '';
                                                }
                                            }}
                                        />
                                        <div className="space-y-1">
                                            {formData.metas.map((meta, idx) => (
                                                <div key={idx} className="flex items-center gap-2 text-sm">
                                                    <Target className="w-4 h-4 text-gray-400" />
                                                    <span>{meta.descricao}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {(tipoEvento === 'Reunião' || tipoEvento === 'Visita') && (
                                <>
                                    <div className="space-y-2">
                                        <Label>Buscar Cliente/Lead</Label>
                                        <Input
                                            value={searchLead}
                                            onChange={(e) => setSearchLead(e.target.value)}
                                            placeholder="Digite para buscar..."
                                        />
                                        {searchLead && (
                                            <div className="border rounded-lg max-h-40 overflow-y-auto">
                                                {leadsFiltered.map(lead => (
                                                    <div
                                                        key={lead.id}
                                                        className="p-2 hover:bg-gray-100 cursor-pointer"
                                                        onClick={() => {
                                                            setFormData({ ...formData, lead_id: lead.id, cliente: lead.empresa });
                                                            setSearchLead('');
                                                        }}
                                                    >
                                                        {lead.empresa}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {formData.cliente && (
                                        <div className="p-2 bg-green-50 rounded">
                                            <p className="text-sm font-medium">Cliente selecionado: {formData.cliente}</p>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Data *</Label>
                                            <Input
                                                type="date"
                                                value={formData.data_inicio}
                                                onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Hora</Label>
                                            <Input
                                                type="time"
                                                value={formData.hora}
                                                onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{tipoEvento === 'Visita' ? 'Detalhes da Visita' : 'Pautas da Reunião'}</Label>
                                        <Textarea
                                            value={formData.pautas}
                                            onChange={(e) => setFormData({ ...formData, pautas: e.target.value })}
                                            rows={4}
                                            placeholder="Descreva os tópicos..."
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={resetForm}>Cancelar</Button>
                        {tipoEvento && (
                            <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">
                                Criar Evento
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog editar evento */}
            <Dialog open={!!editingEvento} onOpenChange={() => setEditingEvento(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Editar {editingEvento?.tipo}</DialogTitle>
                    </DialogHeader>

                    {editingEvento && (
                        <div className="space-y-4">
                            {editingEvento.tipo === 'Viagem' && editingEvento.empresas_visitar && (
                                <div className="space-y-2">
                                    <Label>Empresas a Visitar</Label>
                                    {editingEvento.empresas_visitar.map((emp, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <Checkbox
                                                checked={emp.concluido}
                                                onCheckedChange={(checked) => handleUpdateChecklistItem('empresas_visitar', idx, checked)}
                                            />
                                            <span className={emp.concluido ? 'line-through text-gray-500' : ''}>
                                                {emp.nome}
                                            </span>
                                        </div>
                                    ))}
                                    <Input
                                        placeholder="Adicionar empresa..."
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && e.target.value) {
                                                handleAddChecklistItem('empresas_visitar', { nome: e.target.value, concluido: false });
                                                e.target.value = '';
                                            }
                                        }}
                                    />
                                </div>
                            )}

                            {editingEvento.tipo === 'Evento' && editingEvento.metas && (
                                <div className="space-y-2">
                                    <Label>Metas do Evento</Label>
                                    {editingEvento.metas.map((meta, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <Checkbox
                                                checked={meta.concluido}
                                                onCheckedChange={(checked) => handleUpdateChecklistItem('metas', idx, checked)}
                                            />
                                            <span className={meta.concluido ? 'line-through text-gray-500' : ''}>
                                                {meta.descricao}
                                            </span>
                                        </div>
                                    ))}
                                    <Input
                                        placeholder="Adicionar meta..."
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && e.target.value) {
                                                handleAddChecklistItem('metas', { descricao: e.target.value, concluido: false });
                                                e.target.value = '';
                                            }
                                        }}
                                    />
                                </div>
                            )}

                            {(editingEvento.tipo === 'Reunião' || editingEvento.tipo === 'Visita') && (
                                <div className="space-y-2">
                                    <Label>Pautas/Detalhes</Label>
                                    <Textarea
                                        defaultValue={editingEvento.pautas}
                                        onBlur={(e) => handleUpdatePautas(e.target.value)}
                                        rows={6}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingEvento(null)}>Fechar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}