import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Mail, Phone, MessageCircle, Linkedin, Building2, Copy, Check, ExternalLink, User } from "lucide-react";
import { motion } from "framer-motion";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const TIPO_COLORS = {
    'E-mail': 'bg-blue-100 text-blue-700',
    'Ligação': 'bg-green-100 text-green-700',
    'WhatsApp': 'bg-emerald-100 text-emerald-700',
    'LinkedIn': 'bg-indigo-100 text-indigo-700',
    'Follow-up': 'bg-purple-100 text-purple-700',
    'Outro': 'bg-gray-100 text-gray-700'
};

const TIPO_ICONS = {
    'E-mail': Mail,
    'Ligação': Phone,
    'WhatsApp': MessageCircle,
    'LinkedIn': Linkedin,
    'Follow-up': Mail,
    'Outro': Clock
};

export default function TaskCard({ task, onComplete, completed, isOverdue, showObservacoes }) {
    const Icon = TIPO_ICONS[task.tipo] || Clock;
    const colorClass = TIPO_COLORS[task.tipo] || TIPO_COLORS['Outro'];
    const [showTemplate, setShowTemplate] = useState(false);
    const [showContatoSelector, setShowContatoSelector] = useState(false);
    const [contatoSelecionado, setContatoSelecionado] = useState(null);
    const [copiedText, setCopiedText] = useState('');
    const [templateContent, setTemplateContent] = useState('');

    const contatos = task.contatos || [];
    const contatoPrincipal = contatos.find(c => c.principal) || contatos[0];

    React.useEffect(() => {
        const fetchTemplate = async () => {
            try {
                const templates = await base44.entities.WorkflowTemplate.filter({
                    descricao: task.descricao,
                    tipo: task.tipo
                });

                if (templates.length > 0 && templates[0].modelo_mensagem) {
                    let template = templates[0].modelo_mensagem;
                    const nomeContato = contatoSelecionado?.nome || contatoPrincipal?.nome || '[Nome do Contato]';
                    template = template.replace(/{NOME_CONTATO}/g, nomeContato);
                    template = template.replace(/{EMPRESA}/g, task.empresa || '[Nome da Empresa]');
                    template = template.replace(/{SETOR}/g, '[Setor da Empresa]');
                    setTemplateContent(template);
                } else {
                    setTemplateContent('Nenhum modelo cadastrado para esta tarefa. Configure em Configurações > Workflow.');
                }
            } catch (error) {
                setTemplateContent('Erro ao carregar modelo.');
            }
        };

        if (showTemplate) {
            fetchTemplate();
        }
    }, [showTemplate, task, contatoSelecionado, contatoPrincipal]);

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        setCopiedText(text);
        setTimeout(() => setCopiedText(''), 2000);
    };

    const handleLinkedInSearch = () => {
        const nomes = contatos.map(c => c.nome).join(' ');
        const searchQuery = `${task.empresa} ${nomes}`.trim();
        window.open(`https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(searchQuery)}`, '_blank');
    };

    const handleWhatsAppOrPhone = () => {
        if (contatos.length === 1) {
            const contato = contatos[0];
            const numero = task.tipo === 'WhatsApp' ? contato.whatsapp : contato.telefone;
            if (numero) {
                const phoneNumber = numero.replace(/\D/g, '');
                window.open(`https://wa.me/55${phoneNumber}`, '_blank');
            }
        } else {
            setShowContatoSelector(true);
        }
    };

    const handleSelecionarContato = () => {
        setShowContatoSelector(false);
        setShowTemplate(true);
    };

    const allEmails = contatos.map(c => c.email).filter(Boolean);

    return (
        <>
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
            >
                <Card className={`p-4 transition-all ${completed ? 'bg-gray-50 opacity-75' :
                        isOverdue ? 'bg-red-50 border-red-300 border-2 hover:shadow-md' :
                            'bg-white hover:shadow-md'
                    }`}>
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                            <div className={`p-2 rounded-lg ${colorClass.replace('text-', 'bg-').replace('100', '50')}`}>
                                <Icon className={`w-5 h-5 ${colorClass.split(' ')[1]}`} />
                            </div>
                            <div className="flex-1">
                                <h3 className={`font-medium mb-1 ${completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                    {task.descricao}
                                </h3>
                                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                                    <Building2 className="w-4 h-4" />
                                    <span>{task.empresa}</span>
                                </div>

                                {contatos.length > 0 && (
                                    <div className="space-y-1 mb-2">
                                        {contatos.map((contato, idx) => (
                                            <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                                                <User className="w-4 h-4" />
                                                <span>{contato.nome}</span>
                                                {contato.principal && (
                                                    <Badge variant="outline" className="text-xs">Principal</Badge>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {task.tipo === 'LinkedIn' && (
                                    <div className="mt-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleLinkedInSearch}
                                            className="h-8 text-xs gap-2"
                                        >
                                            <Linkedin className="w-4 h-4 text-blue-600" />
                                            Buscar no LinkedIn
                                            <ExternalLink className="w-3 h-3" />
                                        </Button>
                                    </div>
                                )}

                                {(task.tipo === 'E-mail' || task.tipo === 'Follow-up') && allEmails.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                        {allEmails.map((email, idx) => (
                                            <div key={idx} className="flex items-center gap-2 text-sm">
                                                <Mail className="w-4 h-4 text-blue-600" />
                                                <span className="text-blue-600">{email}</span>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-6 px-2"
                                                    onClick={() => handleCopy(email)}
                                                >
                                                    {copiedText === email ? (
                                                        <Check className="w-3 h-3 text-green-600" />
                                                    ) : (
                                                        <Copy className="w-3 h-3" />
                                                    )}
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {(task.tipo === 'WhatsApp' || task.tipo === 'Ligação') && contatos.length > 0 && (
                                    <div className="mt-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleWhatsAppOrPhone}
                                            className="h-8 text-xs gap-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                                        >
                                            {task.tipo === 'WhatsApp' ? <MessageCircle className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                                            {contatos.length === 1 ? 'Abrir WhatsApp' : 'Escolher Contato'}
                                            <ExternalLink className="w-3 h-3" />
                                        </Button>
                                    </div>
                                )}

                                {showObservacoes && task.observacoes && (
                                    <div className="mt-3 p-3 bg-gray-100 rounded-lg">
                                        <p className="text-xs font-medium text-gray-700 mb-1">Observações:</p>
                                        <p className="text-sm text-gray-600">{task.observacoes}</p>
                                    </div>
                                )}

                                <div className="flex gap-2 mt-3 flex-wrap">
                                    <Badge className={colorClass}>
                                        {task.tipo}
                                    </Badge>
                                    {isOverdue && !completed && (
                                        <Badge variant="destructive">
                                            Atrasada
                                        </Badge>
                                    )}
                                    {!completed && (task.tipo === 'WhatsApp' || task.tipo === 'Ligação') && contatos.length > 1 && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleWhatsAppOrPhone}
                                            className="h-6 text-xs"
                                        >
                                            Ver Roteiro
                                        </Button>
                                    )}
                                    {!completed && task.tipo !== 'WhatsApp' && task.tipo !== 'Ligação' && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setShowTemplate(true)}
                                            className="h-6 text-xs"
                                        >
                                            Ver Modelo
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                        {!completed && onComplete && (
                            <Button
                                size="sm"
                                onClick={() => onComplete(task)}
                                className="bg-green-600 hover:bg-green-700 gap-2"
                            >
                                <CheckCircle className="w-4 h-4" />
                                Concluir
                            </Button>
                        )}
                        {completed && (
                            <CheckCircle className="w-6 h-6 text-green-600" />
                        )}
                    </div>
                </Card>
            </motion.div>

            {/* Dialog de seleção de contato */}
            <Dialog open={showContatoSelector} onOpenChange={setShowContatoSelector}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Escolha o Contato para {task.tipo}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <RadioGroup value={contatoSelecionado?.nome} onValueChange={(nome) => {
                            const contato = contatos.find(c => c.nome === nome);
                            setContatoSelecionado(contato);
                        }}>
                            {contatos.map((contato, idx) => {
                                const temNumero = task.tipo === 'WhatsApp' ? contato.whatsapp : contato.telefone;
                                if (!temNumero) return null;

                                return (
                                    <div key={idx} className="flex items-start space-x-3 p-3 border rounded-lg">
                                        <RadioGroupItem value={contato.nome} id={`contato-${idx}`} />
                                        <Label htmlFor={`contato-${idx}`} className="flex-1 cursor-pointer">
                                            <div className="font-medium">{contato.nome}</div>
                                            {contato.principal && (
                                                <Badge variant="outline" className="text-xs mt-1">Principal</Badge>
                                            )}
                                            <div className="text-sm text-gray-600 mt-1">
                                                {task.tipo === 'WhatsApp' ? contato.whatsapp : contato.telefone}
                                            </div>
                                        </Label>
                                    </div>
                                );
                            })}
                        </RadioGroup>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowContatoSelector(false)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSelecionarContato}
                            disabled={!contatoSelecionado}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            Ver Roteiro e Número
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog de template/roteiro */}
            <Dialog open={showTemplate} onOpenChange={setShowTemplate}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Roteiro para {task.tipo}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        {contatoSelecionado && (
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <h3 className="font-semibold text-blue-900 mb-2">Contato Selecionado:</h3>
                                <p className="text-blue-800">{contatoSelecionado.nome}</p>
                                <p className="text-blue-700 font-mono text-lg mt-1">
                                    {task.tipo === 'WhatsApp' ? contatoSelecionado.whatsapp : contatoSelecionado.telefone}
                                </p>
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        const numero = (task.tipo === 'WhatsApp' ? contatoSelecionado.whatsapp : contatoSelecionado.telefone).replace(/\D/g, '');
                                        window.open(`https://wa.me/55${numero}`, '_blank');
                                    }}
                                    className="mt-2 bg-green-600 hover:bg-green-700"
                                >
                                    <MessageCircle className="w-4 h-4 mr-2" />
                                    Abrir WhatsApp
                                </Button>
                            </div>
                        )}
                        <div className="p-4 bg-gray-50 rounded-lg max-h-96 overflow-y-auto">
                            <pre className="whitespace-pre-wrap text-sm font-mono">{templateContent}</pre>
                        </div>
                        <Button
                            onClick={() => handleCopy(templateContent)}
                            className="w-full gap-2"
                        >
                            {copiedText === templateContent ? (
                                <>
                                    <Check className="w-4 h-4" />
                                    Copiado!
                                </>
                            ) : (
                                <>
                                    <Copy className="w-4 h-4" />
                                    Copiar Roteiro
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}