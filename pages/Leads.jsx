import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/Components/ui/card";
import { Plus, Search, Filter, Download, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/Components/ui/select";
import { Badge } from "@/Components/ui/badge";
import { format } from "date-fns";
import { formatDisplayDate } from "@/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/Components/ui/dialog";
import { Label } from "@/Components/ui/label";

import LeadsTable from "../Components/leads/LeadsTable";
import LeadFilters from "../Components/leads/LeadFilters";
import LeadDetailDialog from "../Components/leads/LeadDetailDialog";

export default function Leads() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({});
  const [selectedLead, setSelectedLead] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return { email: 'user@example.com' };
      }
    },
  });

  const { data: leads, isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      try {
        return await base44.entities.Lead.list('-created_date');
      } catch {
        return [];
      }
    },
    initialData: [],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      await base44.entities.Lead.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const tasks = await base44.entities.Task.filter({ lead_id: id });
      await Promise.all(tasks.map(task => base44.entities.Task.delete(task.id)));
      await base44.entities.Lead.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['todayTasks'] });
      queryClient.invalidateQueries({ queryKey: ['overdueTasks'] });
    },
  });

  const toggleConvertidoMutation = useMutation({
    mutationFn: async (lead) => {
      await base44.entities.Lead.update(lead.id, {
        convertido: !lead.convertido
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['todayTasks'] });
      queryClient.invalidateQueries({ queryKey: ['overdueTasks'] });
    },
  });




  const filteredLeads = React.useMemo(() => {
    let result = [...leads];

    if (searchTerm) {
      result = result.filter(lead =>
        lead.empresa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.responsavel?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filters.tipo) {
      result = result.filter(lead => lead.tipo === filters.tipo);
    }

    if (filters.tipo_contato) {
      result = result.filter(lead => lead.tipo_contato === filters.tipo_contato);
    }

    if (filters.cotando !== undefined) {
      result = result.filter(lead => lead.cotando === filters.cotando);
    }

    if (filters.embarcando !== undefined) {
      result = result.filter(lead => lead.embarcando === filters.embarcando);
    }

    if (filters.estado) {
      result = result.filter(lead => lead.estado === filters.estado);
    }

    if (filters.setor) {
      result = result.filter(lead => lead.setor === filters.setor);
    }

    if (filters.mes_cadastro) {
      result = result.filter(lead => {
        if (!lead.data_cadastro) return false;
        return lead.data_cadastro.startsWith(filters.mes_cadastro);
      });
    }

    // RBAC: If ONLY Vendedor (no Gestor), only show own leads
    const userRoles = user?.roles || (user?.role ? [user.role] : []);
    const isGestor = userRoles.includes('Gestor');
    const isVendedor = userRoles.includes('Vendedor');

    if (!isGestor && isVendedor) {
      result = result.filter(lead => lead.responsavel === user.email);
    }

    return result;
  }, [leads, searchTerm, filters, user]);



  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-600 mt-1">
            Gerencie sua base de clientes e prospecções
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => navigate(createPageUrl("novo-lead"))}
            className="bg-blue-600 hover:bg-blue-700 gap-2 h-11 px-6 rounded-xl shadow-lg transition-all hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            Novo Cliente
          </Button>
        </div>
      </div>

      <Card className="shadow-lg border-0">
        <CardHeader className="border-b">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Buscar por empresa, e-mail ou responsável..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="w-4 h-4" />
              Filtros {Object.keys(filters).length > 0 && `(${Object.keys(filters).length})`}
            </Button>
          </div>

          {showFilters && (
            <LeadFilters filters={filters} setFilters={setFilters} />
          )}
        </CardHeader>
        <CardContent className="p-0">
          <LeadsTable
            leads={filteredLeads}
            isLoading={isLoading}
            onDelete={deleteMutation.mutate}
            onView={setSelectedLead}
            onToggleConvertido={toggleConvertidoMutation.mutate}
            onUpdate={updateMutation.mutate}
          />
        </CardContent>
      </Card>

      {selectedLead && (
        <LeadDetailDialog
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
        />
      )}


    </div>
  );
}