
// Helper to manage localStorage
const db = {
    get: (key) => JSON.parse(localStorage.getItem(key) || '[]'),
    set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
    add: (key, item) => {
        const list = db.get(key);
        const newItem = { id: Math.random().toString(36).substr(2, 9), ...item };
        list.push(newItem);
        db.set(key, list);
        return newItem;
    },
    update: (key, id, updates) => {
        const list = db.get(key);
        const index = list.findIndex(i => i.id === id);
        if (index !== -1) {
            list[index] = { ...list[index], ...updates };
            db.set(key, list);
            return list[index];
        }
        return null;
    },
    delete: (key, id) => {
        const list = db.get(key);
        const filtered = list.filter(i => i.id !== id);
        db.set(key, filtered);
        return true;
    }
};

// Initial Data Population (Seeding)
const seedData = () => {
    if (db.get('workflowTemplates').length === 0) {
        db.set('workflowTemplates', [
            { id: '1', ordem: 1, ativo: true, dia_offset: 0, tipo: 'LinkedIn', descricao: 'Adicionar no LinkedIn', modelo_mensagem: 'Olá {NOME_CONTATO}, vi que você trabalha na {EMPRESA} e gostaria de conectar...' },
            { id: '2', ordem: 2, ativo: true, dia_offset: 1, tipo: 'E-mail', descricao: 'E-mail de Apresentação', modelo_mensagem: 'Oi {NOME_CONTATO}, gostaria de apresentar nossos serviços...' },
            { id: '3', ordem: 3, ativo: true, dia_offset: 3, tipo: 'Ligação', descricao: 'Primeiro Contato Telefônico', modelo_mensagem: 'Roteiro: Apresentar-se, confirmar recebimento do e-mail, agendar reunião.' },
            { id: '4', ordem: 4, ativo: true, dia_offset: 5, tipo: 'WhatsApp', descricao: 'Follow-up via WhatsApp', modelo_mensagem: 'Olá {NOME_CONTATO}, conseguimos falar sobre a proposta?' }
        ]);
    }
    if (db.get('users').length === 0) {
        db.set('users', [
            { id: 'u1', email: 'mariana@dflogistica.com.br', full_name: 'Mariana Feijó', avatar_url: '', roles: ['Gestor', 'Vendedor'], meta_tarefas: 0, meta_fechamentos: 0, meta_financeira: 0, porcentagem_comissao: 5 },
            { id: 'u2', email: 'vendedor@dflogistica.com.br', full_name: 'Vendedor Teste', avatar_url: '', roles: ['Vendedor'], meta_tarefas: 10, meta_fechamentos: 20000, meta_financeira: 50000, porcentagem_comissao: 3 }
        ]);
    } else {
        // Migration for existing users
        const users = db.get('users');
        let changed = false;
        const migrated = users.map(u => {
            if (u.role && !u.roles) {
                changed = true;
                return { ...u, roles: [u.role], role: undefined };
            }
            return u;
        });
        if (changed) db.set('users', migrated);
    }
    if (db.get('operationalCosts').length === 0) {
        db.set('operationalCosts', [
            { id: 'c1', nome: 'Pedágio', valor: 250 },
            { id: 'c2', nome: 'Taxa Administrativa', valor: 150 },
            { id: 'c3', nome: 'Escolta', valor: 1200 }
        ]);
    }
    if (db.get('paymentTerms').length === 0) {
        db.set('paymentTerms', [
            { id: 'p1', nome: 'À vista' },
            { id: 'p2', nome: '7 dias' },
            { id: 'p3', nome: '15 dias' },
            { id: 'p4', nome: '30 dias' }
        ]);
    }
    if (db.get('leads').length === 0) {
        db.set('leads', [
            { id: 'l1', empresa: 'Britânia Eletrodomésticos', nome_contato: 'Carlos Silva', setor: 'Alimentos e Bebidas', estado: 'PR', tipo: 'Prospecção', status: 'Novo', responsavel: 'mariana@dflogistica.com.br', data_cadastro: '2024-01-01', toneladas: 25 },
            { id: 'l2', empresa: 'Nestlé Brasil', nome_contato: 'Ana Paula', setor: 'Alimentos e Bebidas', estado: 'SP', tipo: 'Cliente Ativo', status: 'Em Negociação', responsavel: 'mariana@dflogistica.com.br', data_cadastro: '2024-01-02', toneladas: 150 },
            { id: 'l3', empresa: 'Ambev', nome_contato: 'Ricardo', setor: 'Alimentos e Bebidas', estado: 'SP', tipo: 'Prospecção', status: 'Novo', responsavel: 'vendedor@dflogistica.com.br', data_cadastro: '2024-01-03', toneladas: 80 }
        ]);
    }
    if (db.get('originDestinations').length === 0) {
        db.set('originDestinations', [
            { id: 'od1', nome: 'São Paulo - SP (BR)' },
            { id: 'od2', nome: 'Curitiba - PR (BR)' },
            { id: 'od3', nome: 'Buenos Aires (AR)' },
            { id: 'od4', nome: 'Montevideo (UY)' },
            { id: 'od5', nome: 'Santiago (CL)' },
            { id: 'od6', nome: 'Asunción (PY)' }
        ]);
    }
};

// Helper for filter logic
const matchesFilter = (item, filter) => {
    return Object.entries(filter).every(([key, value]) => item[key] === value);
};

export const api = {
    auth: {
        me: async () => {
            seedData(); // Ensure data exists when app starts
            const session = localStorage.getItem('user_session');
            if (!session) return null;
            return JSON.parse(session);
        },
        login: async (email, password) => {
            seedData(); // Ensure data exists when login is called
            // Mock authentication
            const users = db.get('users');
            const user = users.find(u => u.email === email);
            if (user && password === 'DFLog123') {
                localStorage.setItem('user_session', JSON.stringify(user));
                return user;
            }
            throw new Error('Credenciais inválidas');
        },
        logout: async () => {
            localStorage.removeItem('user_session');
            window.location.href = '/login'; // Force redirect using window location for safety
        }
    },
    entities: {
        Lead: {
            create: async (data) => db.add('leads', data),
            update: async (id, data) => db.update('leads', id, data),
            delete: async (id) => db.delete('leads', id),
            list: async () => db.get('leads'),
            filter: async (filter) => db.get('leads').filter(i => matchesFilter(i, filter))
        },
        Task: {
            create: async (data) => db.add('tasks', data),
            update: async (id, data) => db.update('tasks', id, data),
            delete: async (id) => db.delete('tasks', id),
            list: async () => db.get('tasks'),
            filter: async (filter, sortField) => {
                let items = db.get('tasks');
                items = items.filter(i => matchesFilter(i, filter));
                if (sortField) {
                    items.sort((a, b) => (a[sortField] > b[sortField] ? 1 : -1));
                }
                return items;
            }
        },
        WorkflowTemplate: {
            create: async (data) => db.add('workflowTemplates', data),
            update: async (id, data) => db.update('workflowTemplates', id, data),
            delete: async (id) => db.delete('workflowTemplates', id),
            list: async (sortField) => {
                let items = db.get('workflowTemplates');
                if (sortField === 'ordem') {
                    items.sort((a, b) => a.ordem - b.ordem);
                }
                return items;
            },
            filter: async (filter, sortField) => {
                let items = db.get('workflowTemplates');
                items = items.filter(i => matchesFilter(i, filter));
                if (sortField === 'ordem') {
                    items.sort((a, b) => a.ordem - b.ordem);
                }
                return items;
            }
        },
        User: {
            create: async (data) => db.add('users', data),
            update: async (id, data) => db.update('users', id, data),
            delete: async (id) => db.delete('users', id),
            list: async () => db.get('users')
        },
        Proposal: {
            create: async (data) => db.add('proposals', data),
            update: async (id, data) => db.update('proposals', id, data),
            delete: async (id) => db.delete('proposals', id),
            list: async () => db.get('proposals'),
            filter: async (filter) => db.get('proposals').filter(i => matchesFilter(i, filter))
        },
        OperationalCost: {
            create: async (data) => db.add('operationalCosts', data),
            update: async (id, data) => db.update('operationalCosts', id, data),
            delete: async (id) => db.delete('operationalCosts', id),
            list: async () => db.get('operationalCosts')
        },
        PaymentTerm: {
            create: async (data) => db.add('paymentTerms', data),
            update: async (id, data) => db.update('paymentTerms', id, data),
            delete: async (id) => db.delete('paymentTerms', id),
            list: async () => db.get('paymentTerms')
        },
        OriginDestination: {
            create: async (data) => db.add('originDestinations', data),
            update: async (id, data) => db.update('originDestinations', id, data),
            delete: async (id) => db.delete('originDestinations', id),
            list: async () => db.get('originDestinations')
        }
    }
};
