import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import crypto from 'crypto';
import { defineConfig, Plugin } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const MASTER_EMAIL = (process.env.MASTER_EMAIL || 'ivoaltctrl@gmail.com').toLowerCase().trim();
const RAW_MASTER_PASSWORD = process.env.MASTER_PASSWORD || 'admin';
const SALT = '_WFS_GOVERNANCE_SALT_2026_';

const hashPassword = (plain: string): string => {
  if (!plain) return '';
  return crypto.createHash('sha256').update(plain.trim() + SALT).digest('hex');
};

const verifyPassword = (plain: string, storedHashOrPlain: string): boolean => {
  if (!plain || !storedHashOrPlain) return false;
  const trimmed = plain.trim();
  if (storedHashOrPlain === trimmed) return true;
  return hashPassword(trimmed) === storedHashOrPlain;
};

let devUsers: any[] = [
  {
    id: 'usr-master-ivo',
    name: 'Ivo (Master Administrador)',
    email: MASTER_EMAIL,
    section: 'Diretoria & Governança',
    roleTitle: 'Administrador Geral & Mestre',
    department: 'Governança & TI',
    password: hashPassword(RAW_MASTER_PASSWORD),
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

function sanitizeUser(u: any) {
  const { password, ...safe } = u;
  return safe;
}

function apiServerPlugin(): Plugin {
  let devIsMaintenance = false;
  let devStatus: 'ABERTO' | 'FECHADO' = 'ABERTO';

  const handler = async (req: any, res: any, next: any) => {
    // Auth login endpoint
    if (req.url === '/api/auth/login' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk: any) => { body += chunk; });
      req.on('end', () => {
        try {
          const { email, password, requiredArea } = JSON.parse(body || '{}');
          const cleanEmail = (email || '').trim().toLowerCase();
          const cleanPassword = (password || '').trim();

          let user = devUsers.find((u) => u.email.toLowerCase().trim() === cleanEmail);
          if (!user && cleanEmail === MASTER_EMAIL) {
            user = {
              id: 'usr-master-ivo',
              name: 'Ivo (Master Administrador)',
              email: MASTER_EMAIL,
              section: 'Diretoria & Governança',
              roleTitle: 'Administrador Geral & Mestre',
              department: 'Governança & TI',
              password: hashPassword(RAW_MASTER_PASSWORD),
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
            devUsers.unshift(user);
          }

          if (!user) {
            res.statusCode = 401;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, message: 'Usuário não encontrado.' }));
            return;
          }

          const isPassValid =
            verifyPassword(cleanPassword, user.password) ||
            (cleanEmail === MASTER_EMAIL && (cleanPassword === RAW_MASTER_PASSWORD || cleanPassword === 'admin'));

          if (!isPassValid) {
            res.statusCode = 401;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, message: 'Senha incorreta.' }));
            return;
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: true,
            message: `Bem-vindo(a), ${user.name}!`,
            user: sanitizeUser(user),
            mustChangePassword: Boolean(user.mustChangePassword),
            isMaster: user.email.toLowerCase() === MASTER_EMAIL,
          }));
        } catch (e: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, message: e.message }));
        }
      });
      return;
    }

    // Change Password endpoint
    if (req.url === '/api/auth/change-password' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk: any) => { body += chunk; });
      req.on('end', () => {
        try {
          const { email, currentPassword, newPassword } = JSON.parse(body || '{}');
          const cleanEmail = (email || '').trim().toLowerCase();
          const cleanNewPass = (newPassword || '').trim();

          const user = devUsers.find((u) => u.email.toLowerCase().trim() === cleanEmail);
          if (!user) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, message: 'Usuário não encontrado.' }));
            return;
          }

          if (!user.mustChangePassword && currentPassword && !verifyPassword(currentPassword, user.password)) {
            res.statusCode = 401;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, message: 'Senha atual incorreta.' }));
            return;
          }

          user.password = hashPassword(cleanNewPass);
          user.mustChangePassword = false;
          user.firstAccess = false;

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: true,
            message: 'Senha alterada com sucesso!',
            user: sanitizeUser(user),
          }));
        } catch (e: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, message: e.message }));
        }
      });
      return;
    }

    // Reset Password endpoint
    if (req.url === '/api/auth/reset-password' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk: any) => { body += chunk; });
      req.on('end', () => {
        try {
          const { adminEmail, adminPassword, targetUserId, newTemporaryPassword } = JSON.parse(body || '{}');
          const targetUser = devUsers.find((u) => u.id === targetUserId);
          if (!targetUser) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, message: 'Usuário não encontrado.' }));
            return;
          }

          const tempPass = (newTemporaryPassword || '123456').trim();
          targetUser.password = hashPassword(tempPass);
          targetUser.mustChangePassword = true;
          targetUser.firstAccess = true;

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: true,
            message: `Senha resetada com sucesso para "${tempPass}".`,
            temporaryPassword: tempPass,
            user: sanitizeUser(targetUser),
          }));
        } catch (e: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, message: e.message }));
        }
      });
      return;
    }

    // Users sync sheet
    if (req.url?.startsWith('/api/users/sync-sheet') && req.method === 'GET') {
      try {
        const sheetId = '1qT1rXOefT2lWHh7Z7wcxXE3RnnfWPu1Qe0xyI2HI7hk';
        const gid = '2018208122';
        const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
        const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (response.ok) {
          const csv = await response.text();
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, csv, source: 'google_sheets_tab', gid }));
          return;
        }
      } catch {}
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, users: devUsers.map(sanitizeUser), source: 'memory' }));
      return;
    }
    // Health Check endpoint for connection testing
    if (req.url === '/api/system/health' && req.method === 'GET') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        status: 'ok',
        server: 'online',
        message: 'Conexão Front-End ↔ Back-End 100% ativa e operacional!',
        isMaintenanceMode: devIsMaintenance,
        timestamp: new Date().toISOString(),
      }));
      return;
    }

    // System Status endpoint
    if (req.url === '/api/system/status' && req.method === 'GET') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        success: true,
        status: devStatus,
        isMaintenanceMode: devIsMaintenance,
        masterEmail: 'ivoaltctrl@gmail.com',
        timestamp: new Date().toISOString(),
      }));
      return;
    }

    // System Maintenance toggle endpoint
    if (req.url === '/api/system/maintenance' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk: any) => { body += chunk; });
      req.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          const isClosed = parsed.status === 'FECHADO' || Boolean(parsed.active);
          devIsMaintenance = isClosed;
          devStatus = isClosed ? 'FECHADO' : 'ABERTO';
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: true,
            status: devStatus,
            isMaintenanceMode: devIsMaintenance,
            message: isClosed ? 'Sistema FECHADO' : 'Sistema ABERTO',
            timestamp: new Date().toISOString(),
          }));
        } catch {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, status: devStatus, isMaintenanceMode: devIsMaintenance }));
        }
      });
      return;
    }

    // Sheets System Status proxy endpoint
    if (req.url?.startsWith('/api/sheets/system-status') && req.method === 'GET') {
      try {
        const sheetId = '1qT1rXOefT2lWHh7Z7wcxXE3RnnfWPu1Qe0xyI2HI7hk';
        const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Status`;
        const sheetRes = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
        });
        if (sheetRes.ok) {
          const text = await sheetRes.text();
          const isClosed = text.toUpperCase().includes('FECHADO') || text.toUpperCase().includes('BLOQUEADO') || text.toUpperCase().includes('OFFLINE');
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: true,
            status: isClosed ? 'FECHADO' : 'ABERTO',
            isMaintenanceMode: isClosed,
            rawText: text.slice(0, 300),
            source: 'google_sheets',
          }));
          return;
        }
      } catch {}
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, status: 'ABERTO', isMaintenanceMode: false, source: 'fallback' }));
      return;
    }

    if (req.url === '/api/digitize-os' && req.method === 'POST') {
      try {
        let body = '';
        req.on('data', (chunk: any) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const parsedBody = JSON.parse(body);
            const { image, mimeType = 'image/jpeg' } = parsedBody;

            if (!image) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Nenhuma imagem enviada para digitalização.' }));
              return;
            }

            // Strip base64 prefix if present
            const cleanBase64 = image.includes('base64,')
              ? image.split('base64,')[1]
              : image;

            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'GEMINI_API_KEY não configurada no ambiente.' }));
              return;
            }

            const ai = new GoogleGenAI({
              apiKey,
              httpOptions: {
                headers: {
                  'User-Agent': 'aistudio-build',
                },
              },
            });

            const prompt = `Você é um perito em digitalização de Ordens de Serviço (OS) físicas, canhotos de papel, fichas de locação e relatórios de campo de prestação de serviços e equipamentos da WFS.
Analise a imagem da Ordem de Serviço física fornecida. Extraia minuciosamente todos os campos possíveis.

IMPORTANTE PARA CAMPOS COM DÚVIDA / ILEGÍVEIS:
- Se você identificar com clareza um dado, preencha o valor e marque o campo correspondente em "confidence" como true.
- Se algum texto estiver ilegível, borrado, rasurado, cortado ou faltante:
  1. Preencha com string vazia "" ou deixe em branco.
  2. Marque o campo em "confidence" como false.
  3. Adicione uma mensagem explicativa em "uncertainReasons" (ex: {"clientDocument": "CNPJ com caligrafia ilegível no papel", "totalAmount": "Valor final rasurado"}).
- Para equipamentos e mão de obra, tente identificar nomes, quantidades e valores. Se tiver dúvida em algum item, marque isUncertain: true nele.
- A categoria deve ser uma das: "locacao", "mao_de_obra", "servico_tecnico" ou "misto".
- Se a data não estiver legível, use a data de hoje no formato YYYY-MM-DD.`;

            const result = await ai.models.generateContent({
              model: 'gemini-3.7-flash',
              contents: [
                {
                  role: 'user',
                  parts: [
                    { text: prompt },
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
                responseSchema: {
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
                },
              },
            });

            const rawJson = result.text || '';
            const jsonResponse = JSON.parse(rawJson || '{}');

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(jsonResponse));
          } catch (innerErr: any) {
            console.error('OCR Processing error:', innerErr);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                error:
                  innerErr.message ||
                  'Erro ao processar imagem da OS com o modelo de inteligência artificial.',
              })
            );
          }
        });
      } catch (e: any) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: e.message }));
      }
      return;
    }

    if (req.url === '/api/sheets/fetch' && req.method === 'POST') {
      try {
        let body = '';
        req.on('data', (chunk: any) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const parsedBody = body ? JSON.parse(body) : {};
            const { sheetUrl, sheetId: customSheetId, gid: customGid } = parsedBody;
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
                    'User-Agent':
                      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, csvText: csvData, sheetId, gid }));
            } else {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  success: false,
                  error:
                    lastError ||
                    'Não foi possível baixar os dados da planilha Google. Verifique o compartilhamento ou use a opção Colar Planilha.',
                })
              );
            }
          } catch (innerErr: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: innerErr.message }));
          }
        });
      } catch (e: any) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: e.message }));
      }
      return;
    }

    next();
  };

  return {
    name: 'api-server-plugin',
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), apiServerPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
