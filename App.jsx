import React from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import Layout from './layout'
import Leads from './pages/Leads'
import Propostas from './pages/Propostas'
import Comissoes from './pages/Comissoes'
import Cadastros from './pages/Cadastros'
import NovoLead from './pages/NovoLead'
import Relatorios from './pages/Relatorios'
import Workflow from './pages/Workflow'
import EditarLead from './pages/EditarLead'
import { Routes, Route } from 'react-router-dom'

import Login from './pages/Login'
import { Navigate, useLocation } from 'react-router-dom'
import { base44 } from './api/base44Client'

const RequireAuth = ({ children }) => {
    const location = useLocation();
    const session = localStorage.getItem('base44_session'); // Direct check for sync rendering

    if (!session) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
};

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login />} />

                <Route path="/*" element={
                    <RequireAuth>
                        <Layout>
                            <Routes>
                                <Route path="/" element={<Relatorios />} />
                                <Route path="/Leads" element={<Leads />} />
                                <Route path="/Propostas" element={<Propostas />} />
                                <Route path="/Comissoes" element={<Comissoes />} />
                                <Route path="/Cadastros" element={<Cadastros />} />
                                <Route path="/novo-lead" element={<NovoLead />} />

                                <Route path="/Relatorios" element={<Relatorios />} />
                                <Route path="/Workflow" element={<Workflow />} />
                                <Route path="/editar-lead/:id" element={<EditarLead />} />
                            </Routes>
                        </Layout>
                    </RequireAuth>
                } />
            </Routes>
        </Router>
    )
}

export default App
