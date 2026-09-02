import React, { useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Edit3,
  ExternalLink,
  HardHat,
  Key,
  KeyRound,
  Lock,
  Plus,
  Power,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppUser, UserPrivilege } from '../types';
import {
  OFFICIAL_CONFIG_SHEET_URL,
  OFFICIAL_DRIVE_FOLDER_ID,
  OFFICIAL_DRIVE_FOLDER_URL,
  OFFICIAL_PHOTOS_SHEET_NAME,
  OFFICIAL_SHEET_URL,
  OFFICIAL_USERS_SHEET_URL,
} from '../services/sheetsService';

export const UsersManager: React.FC = () => {
  const {
    users,
    currentUser,
    addUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    resetUserPasswordByAdmin,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterPrivilege, setFilterPrivilege] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);

  // Password reset modal states
  const [resetModalUser, setResetModalUser] = useState<AppUser | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState('123456');
  const [adminPasswordForReset, setAdminPasswordForReset] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [section, setSection] = useState('Pista & Rampa');
  const [roleTitle, setRoleTitle] = useState('');
  const [department, setDepartment] = useState('Operações GSE');
  const [password, setPassword] = useState('');
  const [privilege, setPrivilege] = useState<UserPrivilege>('analista');
  const [canValidateBilling, setCanValidateBilling] = useState(true);
  const [canDeleteOS, setCanDeleteOS] = useState(false);
  const [canAccessExecutive, setCanAccessExecutive] = useState(true);
  const [canAccessSettings, setCanAccessSettings] = useState(false);
  const [active, setActive] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const privilegeConfig: Record<
    UserPrivilege,
    { label: string; bg: string; text: string; border: string; desc: string }
  > = {
    administrador: {
      label: 'Administrador Master',
      bg: 'bg-slate-900',
      text: 'text-white',
      border: 'border-slate-800',
      desc: 'Acesso total irrestrito (Faturamento, Configurações, Exclusões e Gestão de Usuários)',
    },
    supervisor: {
      label: 'Supervisor de Operações',
      bg: 'bg-red-600',
      text: 'text-white',
      border: 'border-red-500',
      desc: 'Supervisão geral, aprovação de OSs, exclusões com motivo e acesso ao painel executivo e configurações',
    },
    analista: {
      label: 'Analista de Faturamento',
      bg: 'bg-emerald-600',
      text: 'text-white',
      border: 'border-emerald-500',
      desc: 'Validação de OSs, faturamento, emissão de cobranças e relatórios executivos',
    },
    operador: {
      label: 'Operador de Campo / Solo',
      bg: 'bg-amber-500',
      text: 'text-slate-950',
      border: 'border-amber-400',
      desc: 'Acesso exclusivo ao Modo Campo (apontamentos de pista e digitalização de canhotos)',
    },
    master_ti: {
      label: 'TI & Governança',
      bg: 'bg-indigo-700',
      text: 'text-white',
      border: 'border-indigo-600',
      desc: 'Configurações técnicas, integrações com Google Sheets / Drive e governança',
    },
  };

  const handleOpenCreate = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setSection('Pista & Rampa');
    setRoleTitle('Analista de Faturamento');
    setDepartment('Financeiro & Controladoria');
    setPassword('123456');
    setPrivilege('analista');
    setCanValidateBilling(true);
    setCanDeleteOS(false);
    setCanAccessExecutive(true);
    setCanAccessSettings(false);
    setActive(true);
    setShowModal(true);
  };

  const handleOpenEdit = (user: AppUser) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setSection(user.section || 'Pista & Rampa');
    setRoleTitle(user.roleTitle || user.roleLabel || '');
    setDepartment(user.department || 'Operações GSE');
    setPassword(user.password || '');
    setPrivilege(user.privilege || 'operador');
    setCanValidateBilling(user.canValidateBilling ?? true);
    setCanDeleteOS(user.canDeleteOS ?? false);
    setCanAccessExecutive(user.canAccessExecutive ?? true);
    setCanAccessSettings(user.canAccessSettings ?? false);
    setActive(user.active !== false);
    setShowModal(true);
  };

  const handlePrivilegeSelect = (p: UserPrivilege) => {
    setPrivilege(p);
    if (p === 'administrador' || p === 'master_ti') {
      setCanValidateBilling(true);
      setCanDeleteOS(true);
      setCanAccessExecutive(true);
      setCanAccessSettings(true);
    } else if (p === 'supervisor') {
      setCanValidateBilling(true);
      setCanDeleteOS(true);
      setCanAccessExecutive(true);
      setCanAccessSettings(true);
    } else if (p === 'analista') {
      setCanValidateBilling(true);
      setCanDeleteOS(false);
      setCanAccessExecutive(true);
      setCanAccessSettings(false);
    } else {
      setCanValidateBilling(false);
      setCanDeleteOS(false);
      setCanAccessExecutive(false);
      setCanAccessSettings(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setFeedback({ type: 'error', text: 'Nome completo e e-mail corporativo são obrigatórios.' });
      return;
    }

    // Check email uniqueness among other users
    const emailNorm = email.trim().toLowerCase();
    const existing = users.find(
      (u) => u.id !== editingUser?.id && u.email?.toLowerCase().trim() === emailNorm
    );
    if (existing) {
      setFeedback({ type: 'error', text: `O e-mail corporativo ${email} já está em uso por outro usuário.` });
      return;
    }

    const privilegeLabel = privilegeConfig[privilege].label;

    if (editingUser) {
      await updateUser({
        ...editingUser,
        name: name.trim(),
        email: emailNorm,
        section: section.trim(),
        roleTitle: roleTitle.trim(),
        department: department.trim(),
        privilege,
        privilegeLabel,
        canValidateBilling,
        canDeleteOS,
        canAccessExecutive,
        canAccessSettings,
        active,
      });
      setFeedback({ type: 'success', text: `Usuário "${name}" atualizado com sucesso no backend!` });
    } else {
      await addUser({
        name: name.trim(),
        email: emailNorm,
        section: section.trim(),
        roleTitle: roleTitle.trim(),
        department: department.trim(),
        password: password.trim() || '123456',
        privilege,
        privilegeLabel,
        canValidateBilling,
        canDeleteOS,
        canAccessExecutive,
        canAccessSettings,
        active,
      });
      setFeedback({
        type: 'success',
        text: `Novo usuário "${name}" cadastrado! No primeiro acesso com a senha temporária, ele definirá sua senha pessoal.`,
      });
    }

    setShowModal(false);
  };

  const handleOpenResetModal = (user: AppUser) => {
    setResetModalUser(user);
    setTemporaryPassword('123456');
    setAdminPasswordForReset('');
    setFeedback(null);
  };

  const handleConfirmPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser) return;

    setIsResetting(true);
    try {
      const res = await resetUserPasswordByAdmin(
        currentUser?.email || 'ivoaltctrl@gmail.com',
        adminPasswordForReset || 'admin',
        resetModalUser.id,
        temporaryPassword.trim() || '123456'
      );

      setIsResetting(false);
      if (res.success) {
        setFeedback({
          type: 'success',
          text: `Senha de ${resetModalUser.name} resetada com sucesso para "${res.temporaryPassword || temporaryPassword}". O usuário será obrigado a cadastrar uma nova senha no próximo login.`,
        });
        setResetModalUser(null);
      } else {
        setFeedback({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setIsResetting(false);
      setFeedback({ type: 'error', text: err.message || 'Erro ao resetar senha no backend.' });
    }
  };

  const handleDeleteUser = async (user: AppUser) => {
    if (user.email.toLowerCase() === 'ivoaltctrl@gmail.com') {
      setFeedback({ type: 'error', text: 'A conta do Administrador Mestre não pode ser excluída.' });
      return;
    }
    if (confirm(`Tem certeza que deseja excluir permanentemente o acesso de ${user.name}?`)) {
      await deleteUser(user.id);
      setFeedback({ type: 'success', text: `Usuário ${user.name} removido com sucesso.` });
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.section?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.roleTitle?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPrivilege = filterPrivilege === 'all' || u.privilege === filterPrivilege;

    return matchesSearch && matchesPrivilege;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner & Instructions */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/30 border border-red-500/40 text-red-300 text-[11px] font-black uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
            <span>Governança, Usuários & Segurança Central</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Usuários, Senha Mestre & Privilégios Corporativos
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Administração central de contas no servidor. A conta mestre <strong>ivoaltctrl@gmail.com</strong> tem autoridade máxima para criar colaboradores, alterar permissões e <strong>resetar senhas</strong> com primeiro acesso obrigatório.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-3 bg-red-600 hover:bg-red-500 active:scale-98 text-white rounded-2xl font-black text-xs flex items-center gap-2 shadow-lg shadow-red-600/30 cursor-pointer transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Novo Colaborador</span>
          </button>
        </div>
      </div>

      {/* Sheets & Drive Backing Info Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <a
          href={OFFICIAL_USERS_SHEET_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="p-3.5 bg-white border border-slate-200 rounded-2xl hover:border-emerald-400 hover:shadow-xs transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              👥
            </div>
            <div>
              <span className="font-bold text-slate-900 block text-xs">Aba Google Sheets</span>
              <span className="text-[10px] text-slate-500">Aba Usuários (GID 2018208122)</span>
            </div>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
        </a>

        <a
          href={OFFICIAL_CONFIG_SHEET_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="p-3.5 bg-white border border-slate-200 rounded-2xl hover:border-blue-400 hover:shadow-xs transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              ⚙️
            </div>
            <div>
              <span className="font-bold text-slate-900 block text-xs">Aba Configurações</span>
              <span className="text-[10px] text-slate-500">Aba Configurações (GID 1998402971)</span>
            </div>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
        </a>

        <a
          href={OFFICIAL_DRIVE_FOLDER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="p-3.5 bg-white border border-slate-200 rounded-2xl hover:border-indigo-400 hover:shadow-xs transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
              📁
            </div>
            <div>
              <span className="font-bold text-slate-900 block text-xs">Google Drive & Fotos_SO</span>
              <span className="text-[10px] text-slate-500 font-mono">ID: {OFFICIAL_DRIVE_FOLDER_ID.slice(0, 12)}...</span>
            </div>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
        </a>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between gap-3 animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
              : 'bg-red-50 text-red-800 border border-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail, função ou setor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Nível:
          </span>
          {['all', 'administrador', 'supervisor', 'analista', 'operador', 'master_ti'].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setFilterPrivilege(p)}
              className={`px-3 py-1.5 rounded-xl font-bold text-[11px] capitalize whitespace-nowrap transition-all cursor-pointer ${
                filterPrivilege === p
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {p === 'all'
                ? 'Todos'
                : p === 'master_ti'
                ? 'TI Master'
                : p === 'operador'
                ? 'Campo'
                : p}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                <th className="py-3.5 px-4">Colaborador / E-mail</th>
                <th className="py-3.5 px-4">Seção / Setor</th>
                <th className="py-3.5 px-4">Função Operacional</th>
                <th className="py-3.5 px-4">Nível de Acesso</th>
                <th className="py-3.5 px-4 text-center">Permissões Específicas</th>
                <th className="py-3.5 px-4 text-center">Status / Segurança</th>
                <th className="py-3.5 px-4 text-right">Ações & Reset</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Nenhum colaborador encontrado com os critérios pesquisados.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const pKey = user.privilege || 'operador';
                  const pConfig = privilegeConfig[pKey] || privilegeConfig.operador;
                  const isCurrent = user.id === currentUser?.id;
                  const isMaster = user.email?.toLowerCase().trim() === 'ivoaltctrl@gmail.com';

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name & Corporate Email */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl ${
                              user.avatarColor || 'bg-slate-800'
                            } text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs`}
                          >
                            {user.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 text-xs">{user.name}</span>
                              {isMaster && (
                                <span className="px-2 py-0.2 bg-purple-100 text-purple-900 text-[9px] font-black rounded-full border border-purple-300">
                                  MASTER
                                </span>
                              )}
                              {isCurrent && !isMaster && (
                                <span className="px-2 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded-full border border-emerald-300">
                                  Você
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 font-mono block">
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Section & Department */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 block">{user.section || 'Geral'}</span>
                        <span className="text-[10px] text-slate-400 block">{user.department || 'Operações'}</span>
                      </td>

                      {/* Role Title */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-700">{user.roleTitle || user.roleLabel || '-'}</span>
                      </td>

                      {/* Privilege Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold ${pConfig.bg} ${pConfig.text} shadow-2xs`}
                        >
                          <Shield className="w-3 h-3" />
                          {user.privilegeLabel || pConfig.label}
                        </span>
                      </td>

                      {/* Custom Permissions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1 flex-wrap max-w-[200px] mx-auto">
                          {user.canValidateBilling && (
                            <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[9px] font-bold" title="Pode Validar Faturamento">
                              Faturamento
                            </span>
                          )}
                          {user.canDeleteOS && (
                            <span className="px-1.5 py-0.5 bg-red-50 text-red-800 border border-red-200 rounded text-[9px] font-bold" title="Pode Excluir OS com Motivo">
                              Exclusão OS
                            </span>
                          )}
                          {user.canAccessExecutive && (
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded text-[9px] font-bold" title="Acesso ao Painel Executivo">
                              Executivo
                            </span>
                          )}
                          {user.canAccessSettings && (
                            <span className="px-1.5 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 rounded text-[9px] font-bold" title="Acesso às Configurações">
                              Configurações
                            </span>
                          )}
                          {!user.canValidateBilling && !user.canDeleteOS && !user.canAccessExecutive && !user.canAccessSettings && (
                            <span className="text-slate-400 text-[10px]">Apenas Campo</span>
                          )}
                        </div>
                      </td>

                      {/* Status & Security */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => toggleUserStatus(user.id)}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border transition-all cursor-pointer ${
                              user.active !== false
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'
                            }`}
                            title="Clique para alternar status"
                          >
                            {user.active !== false ? '● Ativo' : '○ Inativo'}
                          </button>
                          {user.mustChangePassword && (
                            <span className="block text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              ⚠️ 1º Acesso Pendente
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions & Password Reset */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Reset Password Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenResetModal(user)}
                            className="px-2 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Resetar senha e forçar troca no próximo acesso"
                          >
                            <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                            <span className="hidden md:inline">Resetar Senha</span>
                          </button>

                          {/* Edit User Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(user)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
                            title="Editar dados e privilégios"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                          </button>

                          {/* Delete User Button */}
                          <button
                            type="button"
                            disabled={isMaster}
                            onClick={() => handleDeleteUser(user)}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
                            title={isMaster ? 'Conta Mestre protegida' : 'Excluir colaborador'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for User Registration & Edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 text-slate-900 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center font-black shadow-sm">
                  {editingUser ? <Edit3 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {editingUser ? 'Editar Dados & Privilégios do Colaborador' : 'Cadastro de Novo Usuário Corporativo'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Preencha todos os dados corporativos e defina o nível de acesso
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ex: Carlos Alberto Silva"
                    className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
                    E-mail Corporativo (Login de Acesso) *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ex: carlos.silva@wfs.aero"
                    className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
                    Seção / Base
                  </label>
                  <input
                    type="text"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    placeholder="ex: Pista & Rampa"
                    className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
                    Função Específica
                  </label>
                  <input
                    type="text"
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    placeholder="ex: Operador de GSE Especializado"
                    className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
                    Departamento / Setor
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="ex: Operações Solo"
                    className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white"
                  />
                </div>
              </div>

              {!editingUser && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl space-y-1 text-amber-900">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <KeyRound className="w-4 h-4 text-amber-600" />
                    <span>Senha Inicial Temporária: <strong>123456</strong></span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    O colaborador será obrigado a definir sua própria senha definitiva no primeiro acesso.
                  </p>
                </div>
              )}

              {/* Privilege Selection */}
              <div>
                <label className="block text-[11px] font-black text-slate-700 uppercase mb-2">
                  Selecione o Nível de Acesso & Privilégio *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(Object.keys(privilegeConfig) as UserPrivilege[]).map((pKey) => {
                    const cfg = privilegeConfig[pKey];
                    const isSelected = privilege === pKey;
                    return (
                      <div
                        key={pKey}
                        onClick={() => handlePrivilegeSelect(pKey)}
                        className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-red-600 bg-red-50/40 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${cfg.bg} ${cfg.text}`}
                          >
                            {cfg.label}
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-red-600" />}
                        </div>
                        <p className="text-[10px] text-slate-500 leading-snug">{cfg.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Fine-Grained Permissions Toggle */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
                  Permissões Detalhadas do Perfil
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canValidateBilling}
                      onChange={(e) => setCanValidateBilling(e.target.checked)}
                      className="rounded text-red-600 focus:ring-red-500 w-4 h-4"
                    />
                    <span className="font-semibold text-slate-800">Validar Faturamento de OSs</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canDeleteOS}
                      onChange={(e) => setCanDeleteOS(e.target.checked)}
                      className="rounded text-red-600 focus:ring-red-500 w-4 h-4"
                    />
                    <span className="font-semibold text-slate-800">Excluir / Cancelar OS com Motivo</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canAccessExecutive}
                      onChange={(e) => setCanAccessExecutive(e.target.checked)}
                      className="rounded text-red-600 focus:ring-red-500 w-4 h-4"
                    />
                    <span className="font-semibold text-slate-800">Acessar Painel Executivo / Gráficos</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canAccessSettings}
                      onChange={(e) => setCanAccessSettings(e.target.checked)}
                      className="rounded text-red-600 focus:ring-red-500 w-4 h-4"
                    />
                    <span className="font-semibold text-slate-800">Acessar Aba de Configurações</span>
                  </label>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="rounded text-red-600 focus:ring-red-500 w-4 h-4"
                  />
                  <span>Usuário Ativo no Sistema</span>
                </label>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-slate-600 hover:text-slate-900 text-xs font-bold rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl shadow-md shadow-red-600/20 cursor-pointer transition-all"
                >
                  {editingUser ? 'Salvar Alterações no Servidor' : 'Cadastrar Colaborador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Admin Password Reset with Forced First-Access */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-slate-900">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-sm">
                  <KeyRound className="w-5 h-5 text-slate-950" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Resetar Senha de Colaborador</h3>
                  <p className="text-xs text-slate-500">Defina uma senha temporária</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setResetModalUser(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmPasswordReset} className="space-y-4 text-xs">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1 text-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-black block">Colaborador Selecionado</span>
                <strong className="block text-sm text-slate-900 font-black">{resetModalUser.name}</strong>
                <span className="block text-slate-600 font-mono text-[11px]">{resetModalUser.email}</span>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-amber-900 text-[11px]">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  Ao resetar, a senha antiga deixará de funcionar imediatamente. O colaborador usará a senha temporária abaixo e <strong>será obrigado a cadastrar sua nova senha pessoal</strong> no primeiro login.
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
                  Senha Temporária Gerada
                </label>
                <input
                  type="text"
                  required
                  value={temporaryPassword}
                  onChange={(e) => setTemporaryPassword(e.target.value)}
                  placeholder="ex: 123456"
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-amber-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
                  Sua Senha de Administrador (Confirmação de Segurança)
                </label>
                <input
                  type="password"
                  required
                  value={adminPasswordForReset}
                  onChange={(e) => setAdminPasswordForReset(e.target.value)}
                  placeholder="Digite sua senha de administrador..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-red-600 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="px-4 py-2.5 text-slate-600 hover:text-slate-900 text-xs font-bold rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-black rounded-xl shadow-md shadow-amber-600/20 cursor-pointer transition-all disabled:opacity-50"
                >
                  {isResetting ? 'Processando Reset...' : 'Confirmar Reset & Forçar Troca'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
