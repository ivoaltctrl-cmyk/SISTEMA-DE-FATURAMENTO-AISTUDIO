import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  HardHat,
  Plus,
  Shield,
  ShieldCheck,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppUser, UserRole } from '../types';

interface UserManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserManagerModal: React.FC<UserManagerModalProps> = ({ isOpen, onClose }) => {
  const { users, currentUser, setCurrentUser, addUser, deleteUser } = useApp();

  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('operador_campo');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  if (!isOpen) return null;

  const roleDetails: Record<UserRole, { label: string; color: string; badge: string }> = {
    operador_campo: {
      label: 'Encarregado de Campo & Pista',
      color: 'bg-amber-500',
      badge: 'bg-amber-100 text-amber-900 border-amber-300',
    },
    tecnico: {
      label: 'Técnico Especialista em Solo / GSE',
      color: 'bg-blue-500',
      badge: 'bg-blue-100 text-blue-900 border-blue-300',
    },
    faturamento: {
      label: 'Analista de Faturamento & Cobrança',
      color: 'bg-emerald-500',
      badge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    },
    supervisor: {
      label: 'Supervisor Geral de Operações',
      color: 'bg-red-500',
      badge: 'bg-red-100 text-red-900 border-red-300',
    },
    master_ti: {
      label: 'Administrador de TI & Governança',
      color: 'bg-slate-800',
      badge: 'bg-slate-100 text-slate-900 border-slate-300',
    },
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const created = addUser({
      name: name.trim(),
      email: email.trim() || `${name.trim().toLowerCase().replace(/\s+/g, '.')}@wfs.aero`,
      password: '123',
      role,
      roleLabel: roleDetails[role].label,
      phone: phone.trim() || undefined,
      avatarColor: roleDetails[role].color,
      department: 'Operações Aeroportuárias GSE',
      section: 'Pista & Pátio',
      roleTitle: roleDetails[role].label,
      privilege: role === 'master_ti' ? 'master_ti' : role === 'supervisor' ? 'supervisor' : role === 'faturamento' ? 'analista' : 'operador',
    });

    // Reset form
    setName('');
    setEmail('');
    setPhone('');
    setShowAddForm(false);
  };

  const handleSelectActiveUser = (u: AppUser) => {
    setCurrentUser(u);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border-2 border-slate-200 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 text-slate-900 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center font-black">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Gestão de Usuários & Rastreabilidade</h3>
              <p className="text-xs text-slate-500">Defina quem está operando para registrar o histórico de cada ação</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 font-bold"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active User Banner */}
        <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${currentUser?.avatarColor || 'bg-red-600'} text-white flex items-center justify-center font-black text-sm`}>
              {currentUser?.name?.slice(0, 2).toUpperCase() || 'OP'}
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Operador Ativo no Momento</span>
              <h4 className="text-sm font-black text-slate-900">{currentUser?.name}</h4>
              <span className="text-xs text-slate-600 font-medium">{currentUser?.roleLabel}</span>
            </div>
          </div>
          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-black rounded-full border border-emerald-300 flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5" /> Ativo
          </span>
        </div>

        {/* Users List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase text-slate-600 tracking-wider">
              Usuários Cadastrados ({users.length})
            </h4>
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="text-xs font-black text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>{showAddForm ? 'Cancelar' : 'Cadastrar Novo Usuário'}</span>
            </button>
          </div>

          {/* Add User Form */}
          {showAddForm && (
            <form
              onSubmit={handleCreateUser}
              className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 text-xs animate-fade-in"
            >
              <h5 className="font-bold text-slate-900 text-xs">Novo Cadastro de Usuário / Operador</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Juliano Santos"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-red-600"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Perfil / Cargo</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-red-600"
                  >
                    <option value="operador_campo">Encarregado de Campo & Pista</option>
                    <option value="tecnico">Técnico Especialista Solo / GSE</option>
                    <option value="faturamento">Analista de Faturamento</option>
                    <option value="supervisor">Supervisor Geral de Operações</option>
                    <option value="master_ti">Administrador de TI</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">E-mail (Opcional)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nome@wfs.aero"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-red-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Celular / WhatsApp</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 98888-7777"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow-xs cursor-pointer"
                >
                  Salvar Usuário
                </button>
              </div>
            </form>
          )}

          {/* List of Registered Users */}
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {users.map((u) => {
              const isCurrent = currentUser?.id === u.id;
              const meta = roleDetails[u.role] || roleDetails.operador_campo;

              return (
                <div
                  key={u.id}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    isCurrent
                      ? 'bg-red-50/50 border-red-300'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${u.avatarColor || meta.color} text-white flex items-center justify-center font-black text-xs`}>
                      {u.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{u.name}</span>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${meta.badge}`}>
                          {u.roleLabel || meta.label}
                        </span>
                      </div>
                      {u.email && <span className="text-[10px] text-slate-500 block">{u.email}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isCurrent ? (
                      <button
                        type="button"
                        onClick={() => handleSelectActiveUser(u)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-red-600 hover:text-white text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                      >
                        Alternar para este Usuário
                      </button>
                    ) : (
                      <span className="text-[11px] font-black text-red-600 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Selecionado
                      </span>
                    )}

                    {users.length > 1 && (
                      <button
                        type="button"
                        onClick={() => deleteUser(u.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                        title="Remover usuário"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-2 flex justify-end border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
