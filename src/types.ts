export type OSStatus = 
  | 'aguardando_validacao' // Nova OS lançada pelo Campo/Teams/IA aguardando validação do Faturamento
  | 'orcamento'            // Orçamento / Proposta
  | 'agendada'             // Agendada
  | 'em_andamento'         // Em Execução / Campo
  | 'concluida'            // Concluída & Validada (Pronta para Faturamento)
  | 'faturada'             // Fatura Gerada / Enviada para Cobrança
  | 'paga'                 // Cobrança Paga
  | 'cancelada';           // Excluída / Cancelada por Supervisor (com motivo gravado)

export type ServiceTypeCategory = 'locacao' | 'mao_de_obra' | 'servico_tecnico' | 'misto';

export type UserPrivilege = 
  | 'administrador' 
  | 'supervisor' 
  | 'analista' 
  | 'operador' 
  | 'master_ti';

export type UserRole = 
  | 'operador_campo' 
  | 'tecnico' 
  | 'faturamento' 
  | 'supervisor' 
  | 'master_ti';

export interface AppUser {
  id: string;
  name: string;             // Nome Completo
  email: string;            // E-mail Corporativo (login de acesso)
  section: string;          // Seção (ex: Pista & Rampa, Manutenção GSE, Faturamento, Cargas)
  roleTitle: string;        // Função (ex: Analista de Faturamento, Supervisor de Operações, Operador de GSE)
  department: string;       // Setor (ex: Ground Handling, Financeiro, Controladoria, Operações Solo)
  password: string;         // Senha pessoal cadastrada
  privilege: UserPrivilege; // Privilégio concedido
  privilegeLabel: string;   // Rótulo descritivo do privilégio
  role?: UserRole;          // Compatibilidade legado
  roleLabel?: string;       // Compatibilidade legado
  canValidateBilling?: boolean; // Permissão de validar faturamento
  canDeleteOS?: boolean;        // Permissão de exclusão com motivo
  canAccessExecutive?: boolean; // Permissão de acesso ao painel executivo
  canAccessSettings?: boolean;  // Permissão de acesso à aba de configurações
  mustChangePassword?: boolean; // Se true, obriga o usuário a redefinir a senha no primeiro acesso
  firstAccess?: boolean;        // Indicador de primeiro acesso
  active: boolean;          // Ativo / Inativo
  createdAt: string;
  phone?: string;
  avatarColor?: string;
}

export interface OSAuditLog {
  id: string;
  action: 
    | 'criacao_campo'
    | 'criacao_web'
    | 'digitalizacao_ia'
    | 'teams_upload'
    | 'edicao'
    | 'assinatura_cliente'
    | 'assinatura_tecnico'
    | 'validacao_faturamento'
    | 'rejeicao_ajuste'
    | 'faturamento_emitido'
    | 'pagamento_confirmado'
    | 'exclusao_cancelamento'
    | 'reativacao';
  userName: string;
  userRole: string;
  timestamp: string;
  details?: string;
  origin?: 'campo_app' | 'teams_upload' | 'teams_webhook' | 'painel_web' | 'ocr_ia' | 'digitalizacao_ia' | 'ocr_camera';
}

export interface Client {
  id: string;
  name: string; // Razão Social / Nome
  tradeName?: string; // Nome Fantasia
  document: string; // CNPJ ou CPF
  email: string;
  phone: string; // WhatsApp
  contactPerson: string;
  address: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    workSiteName?: string; // Nome da Obra / Local de Operação
  };
  paymentTermsDays: number; // Ex: 15 dias, 30 dias, à vista (0)
  notes?: string;
  createdAt: string;
}

export interface Equipment {
  id: string;
  code: string; // Código de patrimônio (ex: EQ-042)
  name: string; // Ex: Gerador 50kVA, Andaime Fachadeiro, Mini Escavadeira
  category: string;
  dailyRate: number; // Valor da diária
  monthlyRate?: number; // Valor mensal
  hourlyRate?: number; // Valor por hora
  status: 'disponivel' | 'em_uso' | 'manutencao';
  serialNumber?: string;
  specifications?: string;
}

export interface LaborService {
  id: string;
  code: string; // Ex: MO-01
  name: string; // Ex: Soldador TIG Especializado, Operador de Munck, Eletricista Industrial
  category: string;
  unit: 'hora' | 'diaria' | 'servico_fechado' | 'km';
  unitPrice: number;
  description?: string;
}

export interface OSEquipmentItem {
  id: string;
  equipmentId?: string;
  name: string;
  code?: string;
  unit: 'diaria' | 'hora' | 'mes' | 'semana';
  quantity: number;
  unitPrice: number;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export interface OSLaborItem {
  id: string;
  laborServiceId?: string;
  name: string; // Ex: Operador de Munck
  unit: 'hora' | 'diaria' | 'homem_hora' | 'servico';
  quantity: number; // Ex: 8 horas ou 2 diárias
  unitPrice: number;
  technicianName?: string;
  notes?: string;
}

export interface OSMaterialItem {
  id: string;
  name: string;
  unit: string; // un, kg, m, pct
  quantity: number;
  unitPrice: number;
}

export interface SignatureData {
  signatureImage: string; // Base64 image
  signerName: string;
  signerDocument?: string; // CPF ou RG
  signerRole: string; // Ex: 'Encarregado de Obra', 'Gerente de Manutenção'
  signedAt: string;
  locationGeo?: {
    latitude?: number;
    longitude?: number;
    addressDescription?: string;
  };
}

export interface PhotoEvidence {
  id: string;
  url: string; // Base64 or URL
  title: string;
  category: 'antes' | 'durante' | 'depois' | 'equipamento' | 'canhoto' | 'outro';
  timestamp: string;
  notes?: string;
}

export interface ChecklistItem {
  id: string;
  task: string;
  completed: boolean;
  completedAt?: string;
}

export interface ServiceOrder {
  id: string;
  osNumber: string; // Ex: OS-2026-0042
  clientId: string;
  clientName: string;
  clientDocument: string;
  clientPhone: string;
  clientEmail: string;
  workLocation: string; // Endereço/local específico da prestação ou entrega de equipamento
  category: ServiceTypeCategory;
  title: string; // Ex: Locação de Gerador + Operador Especializado
  description: string;
  
  status: OSStatus;
  
  // Rastreabilidade de Usuários & Origem
  createdBy?: string; // Nome de quem lançou
  createdByRole?: string;
  createdOrigin?: 'campo_app' | 'teams_upload' | 'teams_webhook' | 'painel_web' | 'ocr_ia' | 'digitalizacao_ia' | 'ocr_camera';
  validatedBy?: string; // Nome de quem validou no faturamento
  validatedAt?: string;
  validationNotes?: string;
  
  // Trava de Exclusão por Supervisor
  deletedBy?: string; // Nome do supervisor que excluiu
  deletedAt?: string;
  deletionReason?: string; // Motivo obrigatório do cancelamento/exclusão
  
  // Histórico e Auditoria
  auditLogs?: OSAuditLog[];
  
  // Integração Microsoft Teams
  teamsSenderName?: string;
  teamsMessageId?: string;
  teamsChannel?: string;
  
  // Datas e prazos
  createdAt: string;
  scheduledDate: string;
  scheduledTime?: string;
  executionStartDate?: string;
  executionEndDate?: string;
  completedAt?: string; // Data em que o cliente assinou no campo
  invoicedAt?: string; // Data do faturamento
  paidAt?: string; // Data de recebimento
  
  // Responsáveis de campo e Novos Campos da Planilha Google Sheets
  technicianName: string;
  technicianPhone?: string;
  agentName?: string; // Nome Do Agente ou Serviço Executado (ex: "AMANDA APARECIDA VASCO CORTEZ 14286")
  agentBadge?: string; // Matrícula extraída do agente (ex: "14286")
  startTime?: string; // Hora Início (ex: "14:34")
  endTime?: string; // Hora Fim (ex: "20:10")
  durationMinutes?: number; // Duração calculada em minutos
  durationFormatted?: string; // Ex: "5h 36m"
  quantity?: number | string; // Quantidade (ex: 1, "-")
  filledBy?: string; // Responsável pelo Preenchimento (ex: "Amanda Aparecida...")
  canhotoUrl?: string; // Link direto do canhoto no Google Drive (ex: "https://drive.google.com/...")
  
  // Itens da OS
  equipmentItems: OSEquipmentItem[];
  laborItems: OSLaborItem[];
  materialItems: OSMaterialItem[];
  
  // Valores
  discount: number;
  addition: number;
  totalAmount: number;
  
  // Execução no campo
  checklist: ChecklistItem[];
  photos: PhotoEvidence[];
  
  // Assinaturas Digitais (Cliente e Técnico)
  clientSignature?: SignatureData;
  technicianSignature?: SignatureData;
  
  // Faturamento e Cobrança
  invoiceId?: string;
  invoiceNumber?: string;
  paymentMethod?: 'pix' | 'boleto' | 'transferencia' | 'cartao' | 'faturado';
  paymentDueDate?: string;
  billingNotes?: string;
  
  // Termos e Observações
  termsAcceptedText?: string;
  internalNotes?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // Ex: FAT-2026-0089
  clientId: string;
  clientName: string;
  clientDocument: string;
  osIds: string[]; // Pode agrupar várias OSs do mesmo cliente em uma fatura
  osNumbers: string[];
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  status: 'pendente' | 'enviada' | 'paga' | 'cancelada' | 'atrasada';
  paymentMethod: 'pix' | 'boleto' | 'transferencia' | 'cartao' | 'faturado';
  pixKey?: string;
  bankDetails?: string;
  notes?: string;
  sentAt?: string;
  paidAt?: string;
}

export interface CompanyProfile {
  name: string;
  tradeName: string;
  cnpj: string;
  stateRegistration?: string;
  phone: string;
  email: string;
  address: string;
  cityState: string;
  pixKey: string;
  bankInfo: string;
  defaultTerms: string;
  billingAlertHours: number; // Ex: alertar se passar 24h sem faturar após conclusão
}
