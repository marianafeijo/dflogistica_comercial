import React, { useState } from "react";
import { Link, useLocation, useNavigate, Route, Routes } from "react-router-dom";
import EditarLead from "./pages/EditarLead";
import { createPageUrl } from "@/utils";
import { LayoutDashboard, Users, CheckSquare, Settings, LogOut, Menu, ChevronDown, ChevronRight, ShoppingCart, DollarSign, FileText, BarChart3, History, Calendar as CalendarIcon, FileCheck, MapPin, Package, Truck as TruckIcon, CreditCard, Wrench } from "lucide-react";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarHeader,
    SidebarFooter,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const menuStructure = [
    {
        title: "Relatórios",
        icon: BarChart3,
        url: createPageUrl("Relatorios"),
        subsections: [] // Empty subsections means it's a direct link
    },
    {
        title: "Gestão Comercial",
        icon: FileText,
        subsections: [
            {
                title: "",
                items: [
                    { title: "Clientes", url: createPageUrl("Leads"), icon: Users },
                    { title: "Propostas", url: createPageUrl("Propostas"), icon: FileText, roles: ["Gestor"] },
                    { title: "Comissões", url: createPageUrl("Comissoes"), icon: DollarSign },
                ]
            }
        ]
    },
    {
        title: "Configurações",
        icon: Settings,
        subsections: [
            {
                title: "",
                items: [
                    { title: "Workflow", url: createPageUrl("Workflow"), icon: Wrench },
                    { title: "Cadastros", url: createPageUrl("Cadastros"), icon: Package },
                ]
            }
        ]
    }
];

export default function Layout({ children }) {
    const location = useLocation();
    const navigate = useNavigate();
    const [openSections, setOpenSections] = useState({ "Comercial": true });

    const { data: user } = useQuery({
        queryKey: ['currentUser'],
        queryFn: () => base44.auth.me(),
    });

    const handleLogout = () => {
        base44.auth.logout();
    };

    const toggleSection = (sectionTitle) => {
        setOpenSections(prev => ({
            ...prev,
            [sectionTitle]: !prev[sectionTitle]
        }));
    };

    const filteredMenuStructure = menuStructure.map(section => ({
        ...section,
        subsections: (section.subsections || []).map(subsection => ({
            ...subsection,
            items: (subsection.items || []).filter(item => {
                if (!item.roles) return true;
                const userRoles = user?.roles || (user?.role ? [user.role] : []);
                return item.roles.some(r => userRoles.includes(r));
            })
        })).filter(subsection => subsection.items.length > 0)
    })).filter(section => (section.subsections && section.subsections.length > 0) || section.url);

    return (
        <SidebarProvider>
            <style>{`
        :root {
          --primary: 210 100% 50%;
          --primary-foreground: 0 0% 100%;
        }
      `}</style>
            <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-50 to-blue-50">
                <Sidebar className="border-r border-gray-200 bg-white">
                    <SidebarHeader className="border-b border-gray-100 p-6">
                        <div className="flex items-center gap-3">
                            <img
                                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f7c97a21959431742973cb/0ff22efea_WhatsAppImage2024-02-27at151629-Photoroompng-Photoroom.png"
                                alt="D&F Log"
                                className="h-12 object-contain"
                            />
                        </div>
                    </SidebarHeader>

                    <SidebarContent className="p-3">
                        <SidebarGroup>
                            <SidebarGroupLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
                                Menu Principal
                            </SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {filteredMenuStructure.map((section) => (
                                        <div key={section.title} className="mb-2">
                                            {section.subsections.length > 0 ? (
                                                <Collapsible
                                                    open={openSections[section.title]}
                                                    onOpenChange={() => toggleSection(section.title)}
                                                >
                                                    <CollapsibleTrigger className="w-full">
                                                        <SidebarMenuItem>
                                                            <SidebarMenuButton className="hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg w-full">
                                                                <div className="flex items-center justify-between w-full px-3 py-2.5">
                                                                    <div className="flex items-center gap-3">
                                                                        <section.icon className="w-5 h-5" />
                                                                        <span className="font-medium">{section.title}</span>
                                                                    </div>
                                                                    {openSections[section.title] ? (
                                                                        <ChevronDown className="w-4 h-4" />
                                                                    ) : (
                                                                        <ChevronRight className="w-4 h-4" />
                                                                    )}
                                                                </div>
                                                            </SidebarMenuButton>
                                                        </SidebarMenuItem>
                                                    </CollapsibleTrigger>
                                                    <CollapsibleContent className="ml-4 mt-1">
                                                        {section.subsections.map((subsection, index) => (
                                                            <div key={index} className="mb-1">
                                                                {subsection.title && (
                                                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
                                                                        {subsection.title}
                                                                    </p>
                                                                )}
                                                                {subsection.items.map((item) => (
                                                                    <SidebarMenuItem key={item.title}>
                                                                        <SidebarMenuButton
                                                                            asChild
                                                                            className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg mb-1 ${location.pathname === item.url ? 'bg-blue-50 text-blue-700 font-medium' : ''
                                                                                }`}
                                                                        >
                                                                            <Link to={item.url} className="flex items-center gap-3 px-3 py-2">
                                                                                <item.icon className="w-4 h-4" />
                                                                                <span className="text-sm">{item.title}</span>
                                                                            </Link>
                                                                        </SidebarMenuButton>
                                                                    </SidebarMenuItem>
                                                                ))}
                                                            </div>
                                                        ))}
                                                    </CollapsibleContent>
                                                </Collapsible>
                                            ) : (
                                                <SidebarMenuItem>
                                                    <SidebarMenuButton
                                                        asChild={!!section.url}
                                                        className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg w-full ${location.pathname === section.url ? 'bg-blue-50 text-blue-700 font-medium' : ''
                                                            }`}
                                                    >
                                                        {section.url ? (
                                                            <Link to={section.url} className="flex items-center gap-3 px-3 py-2.5">
                                                                <section.icon className="w-5 h-5" />
                                                                <span className="font-medium">{section.title}</span>
                                                            </Link>
                                                        ) : (
                                                            <div className="flex items-center gap-3 px-3 py-2.5 w-full opacity-50 cursor-not-allowed">
                                                                <section.icon className="w-5 h-5" />
                                                                <span className="font-medium">{section.title}</span>
                                                                <span className="text-xs text-gray-400 ml-auto">(Em breve)</span>
                                                            </div>
                                                        )}
                                                    </SidebarMenuButton>
                                                </SidebarMenuItem>
                                            )}
                                        </div>
                                    ))}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    </SidebarContent>

                    <SidebarFooter className="border-t border-gray-100 p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <Avatar className="w-10 h-10 border-2 border-blue-100">
                                <AvatarImage src={user?.avatar_url} />
                                <AvatarFallback className="bg-blue-100 text-blue-700">
                                    {user?.full_name?.[0]?.toUpperCase() || 'U'}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 text-sm truncate">{user?.full_name}</p>
                                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            className="w-full justify-start gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                            onClick={handleLogout}
                        >
                            <LogOut className="w-4 h-4" />
                            Sair
                        </Button>
                    </SidebarFooter>
                </Sidebar>

                <main className="flex-1 flex flex-col overflow-hidden">
                    <header className="bg-white border-b border-gray-200 px-6 py-4 md:hidden shadow-sm">
                        <div className="flex items-center gap-4">
                            <SidebarTrigger className="hover:bg-gray-100 p-2 rounded-lg transition-colors duration-200">
                                <Menu className="w-5 h-5" />
                            </SidebarTrigger>
                            <img
                                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f7c97a21959431742973cb/0ff22efea_WhatsAppImage2024-02-27at151629-Photoroompng-Photoroom.png"
                                alt="D&F Log"
                                className="h-8 object-contain"
                            />
                        </div>
                    </header>

                    <div className="flex-1 overflow-auto">
                        <Routes>
                            <Route path="/editar-lead/:id" element={<EditarLead />} />
                            <Route path="*" element={children} />
                        </Routes>
                    </div>
                </main>
            </div>
        </SidebarProvider>
    );
}
