import { AppUser, Client, CompanyProfile, Equipment, Invoice, LaborService, ServiceOrder } from './types';

export const initialUsers: AppUser[] = [
  {
    id: 'usr-master-ivo',
    name: 'Ivo (Master Administrador)',
    email: 'ivoaltctrl@gmail.com',
    section: 'Diretoria & Governança',
    roleTitle: 'Administrador Geral & Mestre',
    department: 'Governança & TI',
    password: 'admin',
    privilege: 'administrador',
    privilegeLabel: 'Administrador Master Geral',
    canValidateBilling: true,
    canDeleteOS: true,
    canAccessExecutive: true,
    canAccessSettings: true,
    mustChangePassword: false,
    firstAccess: false,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    role: 'master_ti',
    roleLabel: 'Administrador de TI & Governança',
    phone: '(11) 99999-0000',
    avatarColor: 'bg-slate-900',
  },
];

export const initialCompany: CompanyProfile = {
  name: 'WFS Brasil Serviços Aeroportuários e Operações Industriais Ltda',
  tradeName: 'WFS - A SATS COMPANY',
  cnpj: '02.481.932/0001-50',
  stateRegistration: '114.920.301.119',
  phone: '(11) 4002-8922',
  email: 'faturamento.brasil@wfs.aero',
  address: 'Aeroporto Internacional de Guarulhos - Terminal de Cargas / Hangar WFS',
  cityState: 'Guarulhos - SP',
  pixKey: '02481932000150',
  bankInfo: 'Banco Santander (033) - Ag: 2240 / CC: 93810-4',
  defaultTerms: 'O cliente declara estar ciente do recebimento dos equipamentos em perfeito estado de funcionamento e/ou da prestação dos serviços especializados discriminados nesta Ordem de Serviço conforme os padrões operacionais WFS. A recusa injustificada de aceite não desobriga o pagamento das diárias e horas apontadas.',
  billingAlertHours: 24,
};

export const initialClients: Client[] = [];

export const initialEquipments: Equipment[] = [];

export const initialLaborServices: LaborService[] = [];

export const initialOrders: ServiceOrder[] = [];

export const initialInvoices: Invoice[] = [];

