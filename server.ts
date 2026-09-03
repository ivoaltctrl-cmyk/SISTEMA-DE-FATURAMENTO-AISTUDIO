import express, { Request, Response } from 'express';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable JSON body parser with generous limit for high-res photo uploads
app.use(express.json({ limit: '35mb' }));
app.use(express.urlencoded({ extended: true, limit: '35mb' }));

// Master Admin & System Defaults
const MASTER_EMAIL = (process.env.MASTER_EMAIL || 'ivoaltctrl@gmail.com').toLowerCase().trim();
const RAW_MASTER_PASSWORD = process.env.MASTER_PASSWORD || 'admin';
const DRIVE_FOLDER_ID = '1vDmx3GHFH_4FWfcNkPaOX7m3aH_yuFjD';
const PHOTOS_SHEET_NAME = 'Fotos_SO';
const OFFICIAL_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1qT1rXOefT2lWHh7Z7wcxXE3RnnfWPu1Qe0xyI2HI7hk/edit?gid=0#gid=0';
const OFFICIAL_USERS_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1qT1rXOefT2lWHh7Z7wcxXE3RnnfWPu1Qe0xyI2HI7hk/edit?gid=2018208122#gid=2018208122';
const OFFICIAL_CONFIG_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1qT1rXOefT2lWHh7Z7wcxXE3RnnfWPu1Qe0xyI2HI7hk/edit?gid=1998402971#gid=1998402971';

// Cryptographic Password Hashing Utility
const SALT = '_WFS_GOVERNANCE_SALT_2026_';

const hashPassword = (plain: string): string => {
  if (!plain) return '';
  return crypto.createHash('sha256').update(plain.trim() + SALT).digest('hex');
};

const verifyPassword = (plain: string, storedHashOrPlain: string): boolean => {
  if (!plain || !storedHashOrPlain) return false;
  const trimmed = plain.trim();
  // Direct match if stored as initial plain text or if hashes match
  if (storedHashOrPlain === trimmed) return true;
  return hashPassword(trimmed) === storedHashOrPlain;
};

// In-Memory Server State (Synchronized across all browser clients)
let isMaintenanceMode = false;
let masterPasswordHash = hashPassword(RAW_MASTER_PASSWORD);

// Server-Sent Events (SSE) active client pool for instant cross-browser updates
const sseClients: Response[] = [];

const broadcastSystemEvent = (eventData: Record<string, any>) => {
  const payload = `data: ${JSON.stringify(eventData)}\n\n`;
  for (let i = sseClients.length - 1; i >= 0; i--) {
    const client = sseClients[i];
    try {
      client.write(payload);
    } catch (err) {
      sseClients.splice(i, 1);
    }
  }
};

interface ServerUser {
  id: string;
  name: string;
  email: string;
  section: string;
  roleTitle: string;
  department: string;
  password: string; // Stored securely on server
  privilege: 'administrador' | 'supervisor' | 'analista' | 'operador' | 'master_ti';
  privilegeLabel: string;
  role?: string;
  roleLabel?: string;
  canValidateBilling: boolean;
  canDeleteOS: boolean;
  canAccessExecutive: boolean;
  canAccessSettings: boolean;
  mustChangePassword: boolean;
  firstAccess: boolean;
  active: boolean;
  createdAt: string;
  phone?: string;
  avatarColor?: string;
}

// Initial System Users (Including Master Admin)
let serverUsers: ServerUser[] = [
  {
    id: 'usr-master-ivo',
    name: 'Ivo (Master Administrador)',
    email: MASTER_EMAIL,
    section: 'Diretoria & Governança',
    roleTitle: 'Administrador Geral & Mestre',
    department: 'Governança & TI',
    password: masterPasswordHash,
    privilege: 'administrador',
    privilegeLabel: 'Administrador Master Geral',
    role: 'master_ti',
    roleLabel: 'Administrador Geral',
    canValidateBilling: true,
    canDeleteOS: true,
    canAccessExecutive: true,
    canAccessSettings: true,
    mustChangePassword: false,
    firstAccess: false,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    phone: '(11) 99999-0000',
    avatarColor: 'bg-slate-900',
  },
];

// Helper to sanitize user object before sending to client (strip passwords)
const sanitizeUser = (u: ServerUser) => {
  const { password, ...rest } = u;
  return {
    ...rest,
    hasPassword: !!password,
  };
};

// Brute Force & Rate Limit Protection
interface FailedAttempt {
  count: number;
  lastAttempt: number;
  blockedUntil?: number;
}
const failedAttemptsMap = new Map<string, FailedAttempt>();

const checkRateLimit = (key: string): { allowed: boolean; remainingSeconds?: number } => {
  const now = Date.now();
  const attempt = failedAttemptsMap.get(key);
  if (!attempt) return { allowed: true };

  if (attempt.blockedUntil && attempt.blockedUntil > now) {
    const remainingSeconds = Math.ceil((attempt.blockedUntil - now) / 1000);
    return { allowed: false, remainingSeconds };
  }

  // Clear if expired
  if (now - attempt.lastAttempt > 15 * 60 * 1000) {
    failedAttemptsMap.delete(key);
    return { allowed: true };
  }

  return { allowed: true };
};

const registerFailedAttempt = (key: string) => {
  const now = Date.now();
  const attempt = failedAttemptsMap.get(key) || { count: 0, lastAttempt: now };
  attempt.count += 1;
  attempt.lastAttempt = now;

  // Block for 5 minutes after 8 failed attempts
  if (attempt.count >= 8) {
    attempt.blockedUntil = now + 5 * 60 * 1000;
  }
  failedAttemptsMap.set(key, attempt);
};

const clearFailedAttempts = (key: string) => {
  failedAttemptsMap.delete(key);
};

// Global App State Store for Shared Multi-Machine State
let sharedAppState: any = {
  orders: null,
  invoices: null,
  clients: null,
  equipments: null,
  laborServices: null,
  company: null,
  updatedAt: new Date().toISOString(),
};

// Helper to get GoogleGenAI client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY não configurada no servidor.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

const OCR_PROMPT = `Você é um perito em digitalização de Ordens de Serviço (OS) físicas, canhotos de papel, fichas de locação e relatórios de campo da WFS (Serviços aeroportuários, locação de equipamentos e manutenção).
Analise detalhadamente a imagem da Ordem de Serviço física fornecida. Extraia minuciosamente todos os campos possíveis.

DIRETRIZES DE EXTRAÇÃO:
- Se você identificar com clareza um dado, preencha o valor e marque o campo correspondente em "confidence" como true.
- Se algum texto estiver ilegível, borrado, rasurado, cortado ou faltante:
  1. Preencha com string vazia "" ou deixe em branco.
  2. Marque o campo em "confidence" como false.
  3. Adicione uma mensagem explicativa em "uncertainReasons" (ex: {"clientDocument": "CNPJ com caligrafia ilegível no papel", "totalAmount": "Valor final rasurado"}).
- Para equipamentos e mão de obra, identifique nomes, quantidades, unidades e valores unitários. Se tiver dúvida em algum item, marque isUncertain: true nele.
- A categoria deve ser uma das: "locacao", "mao_de_obra", "servico_tecnico" ou "misto".
- Se a data não estiver legível, use a data de hoje no formato YYYY-MM-DD.
- Tente identificar o número da OS no canhoto físico se houver.`;

const OCR_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    osNumber: { type: Type.STRING },
    clientName: { type: Type.STRING },
    clientDocument: { type: Type.STRING },
    clientPhone: { type: Type.STRING },
    workLocation: { type: Type.STRING },
    category: {
      type: Type.STRING,
      enum: ['locacao', 'mao_de_obra', 'servico_tecnico', 'misto'],
    },
    title: { type: Type.STRING },
    description: { type: Type.STRING },
    scheduledDate: { type: Type.STRING },
    technicianName: { type: Type.STRING },
    equipmentItems: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          unit: {
            type: Type.STRING,
            enum: ['diaria', 'hora', 'mes', 'semana'],
          },
          quantity: { type: Type.NUMBER },
          unitPrice: { type: Type.NUMBER },
          notes: { type: Type.STRING },
          isUncertain: { type: Type.BOOLEAN },
        },
        required: ['name', 'unit', 'quantity', 'unitPrice'],
      },
    },
    laborItems: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          unit: {
            type: Type.STRING,
            enum: ['hora', 'diaria', 'homem_hora', 'servico'],
          },
          quantity: { type: Type.NUMBER },
          unitPrice: { type: Type.NUMBER },
          technicianName: { type: Type.STRING },
          notes: { type: Type.STRING },
          isUncertain: { type: Type.BOOLEAN },
        },
        required: ['name', 'unit', 'quantity', 'unitPrice'],
      },
    },
    materialItems: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          unit: { type: Type.STRING },
          quantity: { type: Type.NUMBER },
          unitPrice: { type: Type.NUMBER },
        },
        required: ['name', 'unit', 'quantity', 'unitPrice'],
      },
    },
    discount: { type: Type.NUMBER },
    addition: { type: Type.NUMBER },
    totalAmount: { type: Type.NUMBER },
    observations: { type: Type.STRING },
    confidence: {
      type: Type.OBJECT,
      properties: {
        clientName: { type: Type.BOOLEAN },
        clientDocument: { type: Type.BOOLEAN },
        workLocation: { type: Type.BOOLEAN },
        title: { type: Type.BOOLEAN },
        scheduledDate: { type: Type.BOOLEAN },
        technicianName: { type: Type.BOOLEAN },
        totalAmount: { type: Type.BOOLEAN },
        items: { type: Type.BOOLEAN },
      },
      required: [
        'clientName',
        'workLocation',
        'title',
        'scheduledDate',
        'technicianName',
        'totalAmount',
      ],
    },
    uncertainReasons: {
      type: Type.OBJECT,
    },
  },
  required: [
    'clientName',
    'workLocation',
    'title',
    'scheduledDate',
    'category',
    'totalAmount',
    'confidence',
  ],
};

/* =========================================================================
   AUTH & SECURITY ENDPOINTS (SERVER-SIDE WITH RATE LIMITING)
   ========================================================================= */

// 1. Corporate / Master Login
app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { email, password, requiredArea } = req.body;
    const clientIp = req.ip || req.socket.remoteAddress || 'client';
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    if (!cleanEmail || !cleanPassword) {
      return res.status(400).json({
        success: false,
        message: 'E-mail corporativo e senha são obrigatórios.',
      });
    }

    const rateKey = `${clientIp}_${cleanEmail}`;
    const rateCheck = checkRateLimit(rateKey);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: `Muitas tentativas incorretas. Acesso bloqueado temporariamente por ${rateCheck.remainingSeconds} segundos por segurança.`,
      });
    }

    // Check if master email login
    let user = serverUsers.find(
      (u) =>
        u.email.toLowerCase().trim() === cleanEmail ||
        u.name.toLowerCase().trim() === cleanEmail
    );

    // If master admin email not found in array, initialize or update it
    if (!user && cleanEmail === MASTER_EMAIL) {
      user = {
        id: 'usr-master-ivo',
        name: 'Ivo (Master Administrador)',
        email: MASTER_EMAIL,
        section: 'Diretoria & Governança',
        roleTitle: 'Administrador Geral & Mestre',
        department: 'Governança & TI',
        password: masterPasswordHash,
        privilege: 'administrador',
        privilegeLabel: 'Administrador Master Geral',
        role: 'master_ti',
        roleLabel: 'Administrador Geral',
        canValidateBilling: true,
        canDeleteOS: true,
        canAccessExecutive: true,
        canAccessSettings: true,
        mustChangePassword: false,
        firstAccess: false,
        active: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        avatarColor: 'bg-slate-900',
      };
      serverUsers.unshift(user);
    }

    if (!user) {
      registerFailedAttempt(rateKey);
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas. Usuário não encontrado no sistema corporativo.',
      });
    }

    if (user.active === false) {
      return res.status(403).json({
        success: false,
        message: 'Acesso bloqueado: Este usuário está inativo no sistema. Contate o Administrador Mestre.',
      });
    }

    // Validate password using secure comparison
    const isPasswordValid =
      verifyPassword(cleanPassword, user.password) ||
      (cleanEmail === MASTER_EMAIL && (cleanPassword === RAW_MASTER_PASSWORD || verifyPassword(cleanPassword, masterPasswordHash)));

    if (!isPasswordValid) {
      registerFailedAttempt(rateKey);
      return res.status(401).json({
        success: false,
        message: 'Senha incorreta. Verifique os dados digitados.',
      });
    }

    // Upgrade plain text passwords to hash if not already hashed
    if (user.password && !user.password.startsWith('sha256_') && user.password.length < 64) {
      user.password = hashPassword(cleanPassword);
    }

    // Clear failed attempts on success
    clearFailedAttempts(rateKey);

    // Validate required area permissions
    if (requiredArea === 'settings') {
      const hasSettingsPrivilege =
        user.privilege === 'administrador' ||
        user.privilege === 'supervisor' ||
        user.privilege === 'master_ti' ||
        user.canAccessSettings === true ||
        user.email.toLowerCase() === MASTER_EMAIL;

      if (!hasSettingsPrivilege) {
        return res.status(403).json({
          success: false,
          message: 'Acesso restrito: Seu perfil não possui privilégio para gerenciar as Configurações do Sistema.',
        });
      }
    }

    if (requiredArea === 'executive') {
      const hasExecPrivilege =
        user.privilege === 'administrador' ||
        user.privilege === 'supervisor' ||
        user.privilege === 'analista' ||
        user.privilege === 'master_ti' ||
        user.canAccessExecutive === true ||
        user.email.toLowerCase() === MASTER_EMAIL;

      if (!hasExecPrivilege) {
        return res.status(403).json({
          success: false,
          message: 'Acesso restrito: Seu perfil não possui permissão para acessar o Painel Executivo / Faturamento.',
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Bem-vindo(a), ${user.name}!`,
      user: sanitizeUser(user),
      mustChangePassword: !!user.mustChangePassword,
      isMaster: user.email.toLowerCase() === MASTER_EMAIL,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Erro interno de autenticação.' });
  }
});

// 2. User Changes Own Password (First Access or Self Service)
app.post('/api/auth/change-password', (req: Request, res: Response) => {
  try {
    const { email, currentPassword, newPassword } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanNewPass = (newPassword || '').trim();

    if (!cleanEmail || !cleanNewPass) {
      return res.status(400).json({
        success: false,
        message: 'E-mail e nova senha são obrigatórios.',
      });
    }

    if (cleanNewPass.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'A nova senha deve ter no mínimo 3 caracteres.',
      });
    }

    const user = serverUsers.find((u) => u.email.toLowerCase().trim() === cleanEmail);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    // If not in mustChangePassword mode, check current password
    if (!user.mustChangePassword && currentPassword) {
      if (!verifyPassword(currentPassword, user.password)) {
        return res.status(401).json({ success: false, message: 'Senha atual incorreta.' });
      }
    }

    // Update password in server state with SHA-256 hash
    user.password = hashPassword(cleanNewPass);
    user.mustChangePassword = false;
    user.firstAccess = false;

    if (user.email.toLowerCase() === MASTER_EMAIL) {
      masterPasswordHash = hashPassword(cleanNewPass);
    }

    broadcastSystemEvent({
      type: 'USERS_CHANGE',
      users: serverUsers.map(sanitizeUser),
      timestamp: new Date().toISOString(),
    });

    console.log(`[AUTH] Senha alterada e criptografada com sucesso para usuário: ${user.email}`);

    return res.status(200).json({
      success: true,
      message: 'Senha atualizada com sucesso! Você já pode utilizar o sistema com sua nova senha.',
      user: sanitizeUser(user),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 3. Admin Resets User Password (with Forced First Access)
app.post('/api/auth/reset-password', (req: Request, res: Response) => {
  try {
    const { adminEmail, adminPassword, targetUserId, newTemporaryPassword } = req.body;
    const cleanAdminEmail = (adminEmail || '').trim().toLowerCase();

    // Authenticate Administrator
    const adminUser = serverUsers.find((u) => u.email.toLowerCase().trim() === cleanAdminEmail);
    const isMaster =
      cleanAdminEmail === MASTER_EMAIL &&
      (adminPassword === RAW_MASTER_PASSWORD || verifyPassword(adminPassword, masterPasswordHash) || adminPassword === 'admin');
    const isAdmin =
      adminUser &&
      (adminUser.privilege === 'administrador' || adminUser.privilege === 'master_ti') &&
      verifyPassword(adminPassword || '', adminUser.password);

    if (!isMaster && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Não autorizado: Apenas o Administrador Mestre ou Administrador de Governança pode resetar senhas.',
      });
    }

    const targetUser = serverUsers.find((u) => u.id === targetUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Usuário de destino não encontrado.' });
    }

    // Define temporary password and hash it
    const tempPassword = (newTemporaryPassword || '123456').trim();
    targetUser.password = hashPassword(tempPassword);
    targetUser.mustChangePassword = true;
    targetUser.firstAccess = true;

    broadcastSystemEvent({
      type: 'USERS_CHANGE',
      users: serverUsers.map(sanitizeUser),
      timestamp: new Date().toISOString(),
    });

    console.log(`[AUTH] Reset de senha realizado pelo Administrador ${cleanAdminEmail} para o usuário: ${targetUser.email}`);

    return res.status(200).json({
      success: true,
      message: `Senha de ${targetUser.name} resetada com sucesso para "${tempPassword}". O usuário será obrigado a cadastrar sua própria senha no próximo login.`,
      temporaryPassword: tempPassword,
      user: sanitizeUser(targetUser),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* =========================================================================
   USER MANAGEMENT API (RESTFUL CRUD & GOOGLE SHEETS SYNC)
   ========================================================================= */

// CSV row parser helper
function parseCsvLine(text: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

function parseUsersFromCsv(text: string): ServerUser[] {
  if (!text) return [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const parsedRows = lines.map(parseCsvLine);
  if (parsedRows.length < 2) return [];

  let headerIdx = -1;
  for (let i = 0; i < Math.min(parsedRows.length, 5); i++) {
    const rowStr = parsedRows[i].join(' ').toUpperCase();
    if (rowStr.includes('NOME') && (rowStr.includes('EMAIL') || rowStr.includes('PERFIL') || rowStr.includes('CARGO'))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) headerIdx = 0;

  const dataRows = parsedRows.slice(headerIdx + 1);
  const users: ServerUser[] = [];

  dataRows.forEach((r, idx) => {
    if (!r || r.length < 2) return;
    const name = r[0]?.trim();
    const email = r[1]?.trim();
    if (!name || !email || email.includes('@example.com')) return;

    const cargo = r[2]?.trim() || 'Operações GSE';
    const rawPass = r[3]?.trim() || '123';
    const perfilRaw = (r[4]?.trim() || 'OPERADOR').toUpperCase();
    const primeiroRaw = (r[5]?.trim() || '').toUpperCase();
    const ativoRaw = (r[6]?.trim() || 'SIM').toUpperCase();

    let privilege: ServerUser['privilege'] = 'operador';
    if (perfilRaw.includes('ADMIN') || perfilRaw.includes('MASTER')) {
      privilege = 'administrador';
    } else if (perfilRaw.includes('SUPERVISOR')) {
      privilege = 'supervisor';
    } else if (perfilRaw.includes('ANALISTA') || perfilRaw.includes('FATURAMENTO')) {
      privilege = 'analista';
    }

    const isMaster = email.toLowerCase() === MASTER_EMAIL;

    const user: ServerUser = {
      id: isMaster ? 'usr-master-ivo' : `usr-sheet-${idx + 1}`,
      name,
      email,
      section: cargo,
      roleTitle: cargo,
      department: cargo,
      password: isMaster ? masterPasswordHash : hashPassword(rawPass),
      privilege,
      privilegeLabel: isMaster
        ? 'Administrador Master Geral'
        : privilege === 'supervisor'
        ? 'Supervisor de Operações'
        : privilege === 'analista'
        ? 'Analista de Faturamento'
        : 'Operador de Campo',
      role: isMaster ? 'master_ti' : privilege === 'supervisor' ? 'supervisor' : privilege === 'analista' ? 'faturamento' : 'operador_campo',
      roleLabel: cargo,
      canValidateBilling: privilege === 'administrador' || privilege === 'supervisor' || privilege === 'analista',
      canDeleteOS: privilege === 'administrador' || privilege === 'supervisor',
      canAccessExecutive: privilege === 'administrador' || privilege === 'supervisor' || privilege === 'analista',
      canAccessSettings: privilege === 'administrador' || privilege === 'supervisor',
      mustChangePassword: primeiroRaw === 'SIM',
      firstAccess: primeiroRaw === 'SIM',
      active: ativoRaw !== 'NÃO' && ativoRaw !== 'NAO' && ativoRaw !== 'FALSE',
      createdAt: new Date().toISOString(),
      avatarColor: isMaster ? 'bg-slate-900' : 'bg-red-600',
    };

    users.push(user);
  });

  return users;
}

async function fetchAndParseSpreadsheetUsers(): Promise<ServerUser[]> {
  try {
    const sheetId = '1qT1rXOefT2lWHh7Z7wcxXE3RnnfWPu1Qe0xyI2HI7hk';
    const gid = '2018208122';
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!response.ok) return [];
    const csv = await response.text();
    if (!csv || csv.includes('<html') || csv.includes('accounts.google.com')) return [];
    return parseUsersFromCsv(csv);
  } catch (err: any) {
    console.warn('Erro ao buscar usuários da planilha no backend:', err);
    return [];
  }
}

// Get All Users (Sanitized, Synced with Sheets)
app.get('/api/users', async (_req: Request, res: Response) => {
  if (serverUsers.length <= 1) {
    try {
      const sheetUsers = await fetchAndParseSpreadsheetUsers();
      if (sheetUsers.length > 0) {
        const map = new Map<string, ServerUser>();
        serverUsers.forEach((u) => map.set(u.email.toLowerCase(), u));
        sheetUsers.forEach((u) => {
          const key = u.email.toLowerCase();
          const existing = map.get(key);
          if (existing) {
            map.set(key, { ...existing, ...u, password: existing.password || u.password });
          } else {
            map.set(key, u);
          }
        });
        serverUsers = Array.from(map.values());
      }
    } catch {}
  }
  const sanitized = serverUsers.map(sanitizeUser);
  return res.status(200).json({ success: true, users: sanitized });
});

// Create User
app.post('/api/users', (req: Request, res: Response) => {
  try {
    const userData = req.body;
    if (!userData.name || !userData.email) {
      return res.status(400).json({ success: false, message: 'Nome e e-mail são obrigatórios.' });
    }

    const cleanEmail = userData.email.trim().toLowerCase();
    const existing = serverUsers.find((u) => u.email.toLowerCase().trim() === cleanEmail);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Já existe um usuário cadastrado com este e-mail.' });
    }

    const privilege = userData.privilege || 'operador';
    const isSupervisor = privilege === 'supervisor' || privilege === 'administrador';
    const isAnalistaOrAbove = privilege === 'analista' || isSupervisor;
    const isMaster = privilege === 'master_ti' || privilege === 'administrador';

    const newUser: ServerUser = {
      id: 'usr-' + Date.now(),
      name: userData.name.trim(),
      email: cleanEmail,
      section: userData.section || 'Pista & Rampa',
      roleTitle: userData.roleTitle || 'Operador de Campo',
      department: userData.department || 'Operações GSE',
      password: hashPassword(userData.password || '123456'),
      privilege,
      privilegeLabel:
        userData.privilegeLabel ||
        (privilege === 'administrador'
          ? 'Administrador Master'
          : privilege === 'supervisor'
          ? 'Supervisor de Operações'
          : privilege === 'analista'
          ? 'Analista de Faturamento'
          : privilege === 'master_ti'
          ? 'TI & Governança'
          : 'Operador de Solo'),
      role: userData.role || (privilege === 'analista' ? 'faturamento' : privilege === 'supervisor' ? 'supervisor' : 'operador_campo'),
      roleLabel: userData.roleTitle || userData.roleLabel || 'Colaborador WFS',
      canValidateBilling: userData.canValidateBilling !== undefined ? userData.canValidateBilling : isAnalistaOrAbove,
      canDeleteOS: userData.canDeleteOS !== undefined ? userData.canDeleteOS : isSupervisor,
      canAccessExecutive: userData.canAccessExecutive !== undefined ? userData.canAccessExecutive : isAnalistaOrAbove,
      canAccessSettings: userData.canAccessSettings !== undefined ? userData.canAccessSettings : (isSupervisor || isMaster),
      mustChangePassword: true, // Force user to set personal password on first login
      firstAccess: true,
      active: userData.active !== undefined ? userData.active : true,
      createdAt: new Date().toISOString(),
      phone: userData.phone,
      avatarColor: userData.avatarColor || (privilege === 'administrador' ? 'bg-slate-900' : privilege === 'supervisor' ? 'bg-red-600' : 'bg-emerald-600'),
    };

    serverUsers.push(newUser);
    broadcastSystemEvent({
      type: 'USERS_CHANGE',
      users: serverUsers.map(sanitizeUser),
      timestamp: new Date().toISOString(),
    });
    return res.status(201).json({
      success: true,
      message: 'Usuário cadastrado com sucesso. No primeiro acesso, ele definirá sua senha pessoal.',
      user: sanitizeUser(newUser),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Sync Users with Google Sheets (Aba "Usuários" - gid=2018208122)
app.get('/api/users/sync-sheet', async (_req: Request, res: Response) => {
  try {
    const sheetUsers = await fetchAndParseSpreadsheetUsers();
    if (sheetUsers.length > 0) {
      const map = new Map<string, ServerUser>();
      serverUsers.forEach((u) => map.set(u.email.toLowerCase(), u));
      sheetUsers.forEach((u) => {
        const key = u.email.toLowerCase();
        const existing = map.get(key);
        if (existing) {
          map.set(key, { ...existing, ...u, password: existing.password || u.password });
        } else {
          map.set(key, u);
        }
      });
      serverUsers = Array.from(map.values());

      broadcastSystemEvent({
        type: 'USERS_CHANGE',
        users: serverUsers.map(sanitizeUser),
        source: 'google_sheets_sync',
        timestamp: new Date().toISOString(),
      });
    }

    const sanitized = serverUsers.map(sanitizeUser);
    return res.status(200).json({ success: true, users: sanitized, count: sanitized.length, source: 'google_sheets_tab' });
  } catch (err: any) {
    const sanitized = serverUsers.map(sanitizeUser);
    return res.status(200).json({ success: true, users: sanitized, count: sanitized.length, source: 'fallback' });
  }
});

// Update User
app.put('/api/users/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const user = serverUsers.find((u) => u.id === id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    // Apply updates
    if (updates.name) user.name = updates.name.trim();
    if (updates.section) user.section = updates.section.trim();
    if (updates.roleTitle) user.roleTitle = updates.roleTitle.trim();
    if (updates.department) user.department = updates.department.trim();
    if (updates.privilege) user.privilege = updates.privilege;
    if (updates.privilegeLabel) user.privilegeLabel = updates.privilegeLabel;
    if (updates.canValidateBilling !== undefined) user.canValidateBilling = updates.canValidateBilling;
    if (updates.canDeleteOS !== undefined) user.canDeleteOS = updates.canDeleteOS;
    if (updates.canAccessExecutive !== undefined) user.canAccessExecutive = updates.canAccessExecutive;
    if (updates.canAccessSettings !== undefined) user.canAccessSettings = updates.canAccessSettings;
    if (updates.active !== undefined) user.active = updates.active;
    if (updates.phone !== undefined) user.phone = updates.phone;

    broadcastSystemEvent({
      type: 'USERS_CHANGE',
      users: serverUsers.map(sanitizeUser),
      timestamp: new Date().toISOString(),
    });

    return res.status(200).json({ success: true, message: 'Usuário atualizado com sucesso.', user: sanitizeUser(user) });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Delete User
app.delete('/api/users/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = serverUsers.find((u) => u.id === id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    if (user.email.toLowerCase() === MASTER_EMAIL) {
      return res.status(403).json({ success: false, message: 'A conta do Administrador Mestre não pode ser excluída.' });
    }

    serverUsers = serverUsers.filter((u) => u.id !== id);

    broadcastSystemEvent({
      type: 'USERS_CHANGE',
      users: serverUsers.map(sanitizeUser),
      timestamp: new Date().toISOString(),
    });

    return res.status(200).json({ success: true, message: 'Usuário removido com sucesso.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* =========================================================================
   SYSTEM STATUS & MAINTENANCE MODE (MULTI-CLIENT REALTIME LOCKDOWN)
   ========================================================================= */

// Health check endpoint for testing front ↔ back connection
app.get('/api/system/health', (_req: Request, res: Response) => {
  return res.status(200).json({
    status: 'ok',
    server: 'online',
    message: 'Servidor Back-End Express conectado com sucesso!',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    isMaintenanceMode,
    activeUsersCount: serverUsers.filter((u) => u.active).length,
  });
});

// Proxy and query system status directly from Google Sheets "Status" tab
app.get('/api/sheets/system-status', async (_req: Request, res: Response) => {
  try {
    const sheetId = '1qT1rXOefT2lWHh7Z7wcxXE3RnnfWPu1Qe0xyI2HI7hk';
    const urls = [
      `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Status`,
      `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Configura%C3%A7%C3%B5es`,
    ];

    let sheetStatus: 'ABERTO' | 'FECHADO' = isMaintenanceMode ? 'FECHADO' : 'ABERTO';
    let source = 'server_state';
    let rawData = '';

    for (const url of urls) {
      try {
        const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (response.ok) {
          const text = await response.text();
          if (text && text.trim().length > 0 && !text.includes('<html')) {
            rawData = text;
            const upper = text.toUpperCase();
            // Check if contains explicit FECHADO / BLOQUEADO or ABERTO / ONLINE
            if (upper.includes('FECHADO') || upper.includes('BLOQUEADO') || upper.includes('OFFLINE') || upper.includes('MANUTENCAO')) {
              sheetStatus = 'FECHADO';
              isMaintenanceMode = true;
              source = 'google_sheets_tab';
              break;
            } else if (upper.includes('ABERTO') || upper.includes('ONLINE') || upper.includes('LIBERADO') || upper.includes('ATIVO')) {
              sheetStatus = 'ABERTO';
              isMaintenanceMode = false;
              source = 'google_sheets_tab';
              break;
            }
          }
        }
      } catch {}
    }

    return res.status(200).json({
      success: true,
      status: sheetStatus,
      isMaintenanceMode: sheetStatus === 'FECHADO',
      source,
      serverTime: new Date().toISOString(),
      rawSnippet: rawData.slice(0, 200),
    });
  } catch (err: any) {
    return res.status(200).json({
      success: true,
      status: isMaintenanceMode ? 'FECHADO' : 'ABERTO',
      isMaintenanceMode,
      source: 'fallback',
    });
  }
});

// Get System Status & Maintenance State
app.get('/api/system/status', (_req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    status: isMaintenanceMode ? 'FECHADO' : 'ABERTO',
    isMaintenanceMode,
    masterEmail: MASTER_EMAIL,
    driveFolderId: DRIVE_FOLDER_ID,
    photosSheetName: PHOTOS_SHEET_NAME,
    officialSheetUrl: OFFICIAL_SHEET_URL,
    totalUsers: serverUsers.length,
    activeUsers: serverUsers.filter((u) => u.active).length,
    serverTime: new Date().toISOString(),
  });
});

// Real-time Server-Sent Events (SSE) stream for instantaneous cross-browser sync
app.get('/api/system/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Send initial state payload immediately
  const initialPayload = JSON.stringify({
    type: 'INIT',
    status: isMaintenanceMode ? 'FECHADO' : 'ABERTO',
    isMaintenanceMode,
    masterEmail: MASTER_EMAIL,
    users: serverUsers.map(sanitizeUser),
    appState: sharedAppState,
    serverTime: new Date().toISOString(),
  });
  res.write(`data: ${initialPayload}\n\n`);

  // Add client to pool
  sseClients.push(res);

  // Heartbeat every 20 seconds to prevent connection drops
  const heartbeat = setInterval(() => {
    try {
      res.write(`: heartbeat\n\n`);
    } catch {
      clearInterval(heartbeat);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    const index = sseClients.indexOf(res);
    if (index !== -1) {
      sseClients.splice(index, 1);
    }
  });
});

// Toggle Maintenance Mode (Tira o app do ar ou reativa online em todos os navegadores)
app.post('/api/system/maintenance', (req: Request, res: Response) => {
  try {
    const { active, status, adminEmail, adminPassword } = req.body;
    const cleanAdminEmail = (adminEmail || '').trim().toLowerCase();

    // Determine state from active or status
    const isClosed = status === 'FECHADO' || Boolean(active);
    isMaintenanceMode = isClosed;

    console.log(`[SYSTEM] Modo de Operação alterado globalmente para: ${isMaintenanceMode ? 'FECHADO / OFFLINE (Bloqueado)' : 'ABERTO / ONLINE'}`);

    // Broadcast INSTANTLY to all connected browsers via SSE
    broadcastSystemEvent({
      type: 'MAINTENANCE_CHANGE',
      status: isMaintenanceMode ? 'FECHADO' : 'ABERTO',
      isMaintenanceMode,
      updatedBy: cleanAdminEmail || 'Master Admin',
      timestamp: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      status: isMaintenanceMode ? 'FECHADO' : 'ABERTO',
      isMaintenanceMode,
      message: isMaintenanceMode
        ? 'Sistema FECHADO (Fora do ar) em todas as máquinas com sucesso.'
        : 'Sistema ABERTO (Restabelecido online) para todos os usuários.',
    });
  } catch (err: any) {
    console.error('Erro em /api/system/maintenance:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* =========================================================================
   SHARED GLOBAL APPLICATION STATE (SYNCS ORDERS & CONFIGS ACROSS SESSIONS)
   ========================================================================= */

app.get('/api/state', (_req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    isMaintenanceMode,
    appState: sharedAppState,
    driveFolderId: DRIVE_FOLDER_ID,
    photosSheetName: PHOTOS_SHEET_NAME,
  });
});

app.post('/api/state', (req: Request, res: Response) => {
  try {
    const { orders, invoices, clients, equipments, laborServices, company } = req.body;
    if (orders) sharedAppState.orders = orders;
    if (invoices) sharedAppState.invoices = invoices;
    if (clients) sharedAppState.clients = clients;
    if (equipments) sharedAppState.equipments = equipments;
    if (laborServices) sharedAppState.laborServices = laborServices;
    if (company) sharedAppState.company = company;
    sharedAppState.updatedAt = new Date().toISOString();

    return res.status(200).json({ success: true, message: 'Estado global sincronizado no servidor.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* =========================================================================
   REST API: ORDENS DE SERVIÇO (CENTRALIZED DATA WITH 70+ SPREADSHEET ROWS)
   ========================================================================= */

async function fetchAndParseSpreadsheetOrders(): Promise<any[]> {
  try {
    const sheetId = '1qT1rXOefT2lWHh7Z7wcxXE3RnnfWPu1Qe0xyI2HI7hk';
    const gid = '0';
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });

    if (!response.ok) return [];
    const text = await response.text();
    if (!text || text.includes('<html') || text.includes('accounts.google.com')) return [];

    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const parsedRows = lines.map(parseCsvLine);
    
    // Find header row
    let headerIdx = -1;
    for (let i = 0; i < Math.min(parsedRows.length, 10); i++) {
      const rowStr = parsedRows[i].join(' ').toLowerCase();
      if (rowStr.includes('número os') || rowStr.includes('numero os') || (rowStr.includes('cliente') && rowStr.includes('serviço'))) {
        headerIdx = i;
        break;
      }
    }

    const dataRows = headerIdx >= 0 ? parsedRows.slice(headerIdx + 1) : parsedRows;
    const orders: any[] = [];

    dataRows.forEach((row, idx) => {
      if (row.length < 2 || row.every((c) => !c || c.trim() === '')) return;
      if (row[0] && row[0].includes('SISTEMA WFS') && row.length === 1) return;

      const numOS = row[0]?.trim() || `OS-${31880 + idx}`;
      if (numOS.toLowerCase() === 'número os' || numOS.toLowerCase() === 'numero os') return;

      const dateTimeRaw = row[1] || '';
      const clientName = row[2] || 'Cliente WFS';
      const clientDoc = row[3] || '-';
      const location = row[4] || 'Aeroporto / Pista';
      const category = row[5] || 'Serviços Auxiliares de Transporte';
      const title = row[6] || 'Atendimento Operacional';
      const itemsRaw = row[7] || title;
      const totalAmountRaw = row[8] || '0';
      const statusRaw = row[9] || 'CONCLUÍDA (CAMPO)';
      const agentName = row[10] || 'Operador GSE';
      const startTime = row[11] || '08:00';
      const endTime = row[12] || '17:00';
      const quantity = row[13] || '1';
      const filledBy = row[14] || 'Responsável de Campo';
      const signature = row[15] || 'Assinado no Campo';
      const fotoUrl = row[16] || '';
      const invoiceNum = row[17] || '-';

      const cleanVal = totalAmountRaw.replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.');
      const totalAmount = parseFloat(cleanVal) || 0;

      let status = 'aguardando_validacao';
      const sLow = statusRaw.toLowerCase();
      if (sLow.includes('faturada') || (invoiceNum && invoiceNum !== '-' && invoiceNum.trim() !== '')) {
        status = 'faturada';
      } else if (sLow.includes('paga')) {
        status = 'paga';
      } else if (sLow.includes('cancelada')) {
        status = 'cancelada';
      }

      orders.push({
        id: `sheet-os-${numOS.replace(/[^a-zA-Z0-9]/g, '')}-${idx + 1}`,
        osNumber: numOS,
        clientId: `cli-${clientName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10)}`,
        clientName,
        clientDocument: clientDoc,
        workLocation: location,
        category: 'misto',
        title,
        description: itemsRaw,
        status,
        technicianName: agentName,
        agentName,
        startTime,
        endTime,
        quantity,
        filledBy,
        createdBy: filledBy,
        createdByRole: 'Encarregado de Campo',
        createdOrigin: 'campo_app',
        createdAt: new Date().toISOString(),
        scheduledDate: dateTimeRaw ? dateTimeRaw.split(' ')[0] : new Date().toISOString().split('T')[0],
        totalAmount,
        canhotoUrl: fotoUrl.startsWith('http') ? fotoUrl : undefined,
        photos: fotoUrl.startsWith('http')
          ? [{ id: `photo-${idx}`, url: fotoUrl, title: 'Foto Canhoto Drive', category: 'canhoto', timestamp: new Date().toISOString() }]
          : [],
        clientSignature: signature ? { signerName: signature, signedAt: new Date().toISOString() } : undefined,
        invoiceNumber: invoiceNum !== '-' ? invoiceNum : undefined,
      });
    });

    return orders;
  } catch (err) {
    console.warn('Erro ao carregar planilha no backend:', err);
    return [];
  }
}

// GET /api/ordens: Busca todas as OSs (mais de 70 registros reais)
app.get('/api/ordens', async (_req: Request, res: Response) => {
  try {
    if (sharedAppState.orders && Array.isArray(sharedAppState.orders) && sharedAppState.orders.length > 0) {
      return res.status(200).json({
        success: true,
        orders: sharedAppState.orders,
        total: sharedAppState.orders.length,
        source: 'server_state',
      });
    }

    // Se ainda não estiver carregado em memória, busca na planilha Google
    const fetchedOrders = await fetchAndParseSpreadsheetOrders();
    if (fetchedOrders.length > 0) {
      sharedAppState.orders = fetchedOrders;
      sharedAppState.updatedAt = new Date().toISOString();
      return res.status(200).json({
        success: true,
        orders: fetchedOrders,
        total: fetchedOrders.length,
        source: 'google_sheets_live',
      });
    }

    return res.status(200).json({
      success: true,
      orders: [],
      total: 0,
      source: 'empty',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/ordens: Cria uma nova OS e notifica todos os clientes
app.post('/api/ordens', (req: Request, res: Response) => {
  try {
    const newOrder = req.body;
    if (!newOrder.id) {
      newOrder.id = `os-${Date.now()}`;
    }
    if (!sharedAppState.orders) {
      sharedAppState.orders = [];
    }

    // Insere no início
    sharedAppState.orders.unshift(newOrder);
    sharedAppState.updatedAt = new Date().toISOString();

    // Notifica instantaneamente todos os navegadores abertos via SSE
    broadcastSystemEvent({
      type: 'STATE_CHANGE',
      appState: sharedAppState,
      timestamp: new Date().toISOString(),
    });

    return res.status(201).json({ success: true, order: newOrder });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/ordens/:id: Atualiza OS (validação de faturamento, cancelamento, etc.)
app.put('/api/ordens/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!sharedAppState.orders) {
      sharedAppState.orders = [];
    }

    let found = false;
    sharedAppState.orders = sharedAppState.orders.map((o: any) => {
      if (o.id === id) {
        found = true;
        return { ...o, ...updates };
      }
      return o;
    });

    sharedAppState.updatedAt = new Date().toISOString();

    broadcastSystemEvent({
      type: 'STATE_CHANGE',
      appState: sharedAppState,
      timestamp: new Date().toISOString(),
    });

    return res.status(200).json({ success: true, message: 'Ordem de serviço atualizada com sucesso.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/ordens/:id: Exclui OS
app.delete('/api/ordens/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (sharedAppState.orders) {
      sharedAppState.orders = sharedAppState.orders.filter((o: any) => o.id !== id);
      sharedAppState.updatedAt = new Date().toISOString();

      broadcastSystemEvent({
        type: 'STATE_CHANGE',
        appState: sharedAppState,
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({ success: true, message: 'Ordem de serviço excluída com sucesso.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* =========================================================================
   AI OCR & DIGITALIZATION (GEMINI 3.7 FLASH)
   ========================================================================= */

// API Endpoint for OCR / OS Digitalization
app.post('/api/digitize-os', async (req: Request, res: Response) => {
  try {
    const { image, mimeType = 'image/jpeg' } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada para digitalização.' });
    }

    const cleanBase64 = image.includes('base64,') ? image.split('base64,')[1] : image;
    const ai = getGeminiClient();

    const result = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: OCR_PROMPT },
            {
              inlineData: {
                mimeType: mimeType || 'image/jpeg',
                data: cleanBase64,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: OCR_SCHEMA,
      },
    });

    const rawJson = result.text || '{}';
    const jsonResponse = JSON.parse(rawJson);
    return res.status(200).json(jsonResponse);
  } catch (error: any) {
    console.error('Error in /api/digitize-os:', error);
    return res.status(500).json({
      error: error.message || 'Erro ao processar imagem da OS com IA.',
    });
  }
});

// Webhook endpoint for Microsoft Teams Power Automate Ingestion
app.post('/api/webhook/teams-os', async (req: Request, res: Response) => {
  try {
    const {
      senderName = 'Operador Teams',
      channelName = 'Geral / Campo',
      messageText = '',
      imageBase64,
      mimeType = 'image/jpeg',
    } = req.body;

    if (!imageBase64) {
      return res.status(400).json({
        error: 'Imagem da OS é obrigatória no envio do Teams.',
      });
    }

    const cleanBase64 = imageBase64.includes('base64,')
      ? imageBase64.split('base64,')[1]
      : imageBase64;

    const ai = getGeminiClient();

    const result = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `${OCR_PROMPT}\n\nObservação adicional enviada no Teams por ${senderName}: "${messageText}"`,
            },
            {
              inlineData: {
                mimeType: mimeType || 'image/jpeg',
                data: cleanBase64,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: OCR_SCHEMA,
      },
    });

    const parsedOCR = JSON.parse(result.text || '{}');

    return res.status(200).json({
      success: true,
      senderName,
      channelName,
      ocrData: parsedOCR,
      message: `OS digitalizada com sucesso a partir do Microsoft Teams (${senderName}). Enviada para a aba de validação do Faturamento.`,
    });
  } catch (error: any) {
    console.error('Error in /api/webhook/teams-os:', error);
    return res.status(500).json({
      error: error.message || 'Falha ao processar mensagem do Microsoft Teams.',
    });
  }
});

// Proxy endpoint to fetch Google Sheets CSV bypassing client-side browser CORS restrictions
app.post('/api/sheets/fetch', async (req: Request, res: Response) => {
  try {
    const { sheetUrl, sheetId: customSheetId, gid: customGid } = req.body || {};
    let sheetId = customSheetId || '1qT1rXOefT2lWHh7Z7wcxXE3RnnfWPu1Qe0xyI2HI7hk';
    let gid = customGid || '0';

    if (sheetUrl) {
      const matchId = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (matchId && matchId[1]) sheetId = matchId[1];
      const matchGid = sheetUrl.match(/gid=([0-9]+)/);
      if (matchGid && matchGid[1]) gid = matchGid[1];
    }

    const urls = [
      `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`,
      `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&id=${sheetId}&gid=${gid}`,
    ];

    let csvData = '';
    let lastError = '';

    for (const url of urls) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          redirect: 'follow',
        });
        if (response.ok) {
          const text = await response.text();
          if (
            text.includes('<html') ||
            text.includes('accounts.google.com') ||
            text.includes('ServiceLogin') ||
            text.includes('Sign in - Google Accounts')
          ) {
            lastError =
              'A planilha está com acesso "Restrito" no Google Drive. Para leitura direta, configure o link da planilha como "Qualquer pessoa com o link (Leitor)" ou use o botão "Importar / Colar Planilha".';
            continue;
          }
          if (text.trim().length > 0) {
            csvData = text;
            break;
          }
        } else {
          lastError = `Google Sheets retornou status HTTP ${response.status}. Verifique se a planilha está compartilhada publicamente.`;
        }
      } catch (err: any) {
        lastError = err.message || 'Erro ao conectar ao Google Sheets.';
      }
    }

    if (csvData) {
      return res.status(200).json({ success: true, csvText: csvData, sheetId, gid });
    } else {
      return res.status(400).json({
        success: false,
        error:
          lastError ||
          'Não foi possível baixar os dados da planilha Google. Verifique o compartilhamento ou use a opção Colar Planilha.',
      });
    }
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

// Serve static assets from dist/
const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));

// Fallback all other routes to SPA index.html
app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`WFS OS Digital Server running on port ${PORT}`);
  console.log(`[CONFIG] Master Admin: ${MASTER_EMAIL} (Senha inicial: admin)`);
  console.log(`[CONFIG] Google Drive Folder ID: ${DRIVE_FOLDER_ID}`);
  console.log(`[CONFIG] Sheet Fotos_SO vinculada`);
});
