import React, { useState } from 'react';
import {
  DollarSign,
  Edit2,
  HardHat,
  Plus,
  Search,
  Trash2,
  Truck,
  Users,
  Wrench,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Equipment, LaborService } from '../types';
import { formatCurrency } from '../utils/formatters';

export const CatalogManager: React.FC = () => {
  const {
    equipments,
    addEquipment,
    updateEquipment,
    deleteEquipment,
    laborServices,
    addLaborService,
    updateLaborService,
    deleteLaborService,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'equipamentos' | 'mao_de_obra'>('equipamentos');
  const [searchTerm, setSearchTerm] = useState('');

  // Equipment Modal State
  const [showEqModal, setShowEqModal] = useState(false);
  const [editingEq, setEditingEq] = useState<Equipment | null>(null);
  const [eqCode, setEqCode] = useState('');
  const [eqName, setEqName] = useState('');
  const [eqCategory, setEqCategory] = useState('Geradores & Energia');
  const [eqDailyRate, setEqDailyRate] = useState<number>(300);
  const [eqMonthlyRate, setEqMonthlyRate] = useState<number>(4500);
  const [eqHourlyRate, setEqHourlyRate] = useState<number>(50);
  const [eqStatus, setEqStatus] = useState<Equipment['status']>('disponivel');
  const [eqSpecs, setEqSpecs] = useState('');

  // Labor Modal State
  const [showLbModal, setShowLbModal] = useState(false);
  const [editingLb, setEditingLb] = useState<LaborService | null>(null);
  const [lbCode, setLbCode] = useState('');
  const [lbName, setLbName] = useState('');
  const [lbCategory, setLbCategory] = useState('Mão de Obra Especializada');
  const [lbUnit, setLbUnit] = useState<LaborService['unit']>('hora');
  const [lbUnitPrice, setLbUnitPrice] = useState<number>(85);
  const [lbDescription, setLbDescription] = useState('');

  // Open Equipment Modal
  const openNewEqModal = () => {
    setEditingEq(null);
    setEqCode(`EQ-${String(equipments.length + 1).padStart(3, '0')}`);
    setEqName('');
    setEqCategory('Geradores & Energia');
    setEqDailyRate(350);
    setEqMonthlyRate(5000);
    setEqHourlyRate(45);
    setEqStatus('disponivel');
    setEqSpecs('');
    setShowEqModal(true);
  };

  const openEditEqModal = (eq: Equipment) => {
    setEditingEq(eq);
    setEqCode(eq.code);
    setEqName(eq.name);
    setEqCategory(eq.category);
    setEqDailyRate(eq.dailyRate);
    setEqMonthlyRate(eq.monthlyRate || 0);
    setEqHourlyRate(eq.hourlyRate || 0);
    setEqStatus(eq.status);
    setEqSpecs(eq.specifications || '');
    setShowEqModal(true);
  };

  const handleSaveEq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eqName.trim()) return;

    const data = {
      code: eqCode.trim(),
      name: eqName.trim(),
      category: eqCategory.trim(),
      dailyRate: Number(eqDailyRate) || 0,
      monthlyRate: Number(eqMonthlyRate) || undefined,
      hourlyRate: Number(eqHourlyRate) || undefined,
      status: eqStatus,
      specifications: eqSpecs.trim() || undefined,
    };

    if (editingEq) {
      updateEquipment({ ...data, id: editingEq.id });
    } else {
      addEquipment(data);
    }
    setShowEqModal(false);
  };

  // Open Labor Modal
  const openNewLbModal = () => {
    setEditingLb(null);
    setLbCode(`MO-${String(laborServices.length + 1).padStart(2, '0')}`);
    setLbName('');
    setLbCategory('Mão de Obra Especializada');
    setLbUnit('hora');
    setLbUnitPrice(85);
    setLbDescription('');
    setShowLbModal(true);
  };

  const openEditLbModal = (lb: LaborService) => {
    setEditingLb(lb);
    setLbCode(lb.code);
    setLbName(lb.name);
    setLbCategory(lb.category);
    setLbUnit(lb.unit);
    setLbUnitPrice(lb.unitPrice);
    setLbDescription(lb.description || '');
    setShowLbModal(true);
  };

  const handleSaveLb = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lbName.trim()) return;

    const data = {
      code: lbCode.trim(),
      name: lbName.trim(),
      category: lbCategory.trim(),
      unit: lbUnit,
      unitPrice: Number(lbUnitPrice) || 0,
      description: lbDescription.trim() || undefined,
    };

    if (editingLb) {
      updateLaborService({ ...data, id: editingLb.id });
    } else {
      addLaborService(data);
    }
    setShowLbModal(false);
  };

  const filteredEquipments = equipments.filter((e) => {
    return (
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const filteredLabor = laborServices.filter((l) => {
    return (
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">Equipamentos & Serviços</h2>
          <p className="text-xs text-slate-500">
            Cadastro de máquinas, equipamentos para locação e operadores
          </p>
        </div>

        <button
          type="button"
          onClick={activeTab === 'equipamentos' ? openNewEqModal : openNewLbModal}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-md shadow-blue-500/20 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {activeTab === 'equipamentos' ? 'Novo Equipamento' : 'Nova Mão de Obra'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white p-1 rounded-2xl shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab('equipamentos')}
          className={`flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'equipamentos'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Equipamentos para Locação ({equipments.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('mao_de_obra')}
          className={`flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'mao_de_obra'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Mão de Obra Especializada & Serviços ({laborServices.length})</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs">
        <div className="relative">
          <input
            type="text"
            placeholder={
              activeTab === 'equipamentos'
                ? 'Buscar equipamento por nome, código ou categoria...'
                : 'Buscar função, profissional ou categoria...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* TAB 1: EQUIPMENTS */}
      {activeTab === 'equipamentos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEquipments.map((eq) => (
            <div
              key={eq.id}
              className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-black text-blue-700 uppercase bg-blue-50 px-2 py-0.5 rounded-md">
                      {eq.code}
                    </span>
                    <h3 className="text-base font-black text-slate-900 mt-1">{eq.name}</h3>
                    <p className="text-xs text-slate-500 font-semibold">{eq.category}</p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditEqModal(eq)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-50"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Excluir equipamento "${eq.name}"?`)) deleteEquipment(eq.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-100 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Diária</span>
                    <span className="font-black text-slate-900 text-xs">{formatCurrency(eq.dailyRate)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Mensal</span>
                    <span className="font-bold text-slate-700 text-xs">
                      {eq.monthlyRate ? formatCurrency(eq.monthlyRate) : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Hora</span>
                    <span className="font-bold text-slate-700 text-xs">
                      {eq.hourlyRate ? formatCurrency(eq.hourlyRate) : '-'}
                    </span>
                  </div>
                </div>

                {eq.specifications && (
                  <p className="text-[11px] text-slate-600 mt-3 italic line-clamp-2">
                    {eq.specifications}
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    eq.status === 'disponivel'
                      ? 'bg-emerald-100 text-emerald-800'
                      : eq.status === 'em_uso'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {eq.status === 'disponivel'
                    ? 'Disponível'
                    : eq.status === 'em_uso'
                    ? 'Em Locação'
                    : 'Em Manutenção'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: LABOR & SERVICES */}
      {activeTab === 'mao_de_obra' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLabor.map((lb) => (
            <div
              key={lb.id}
              className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-black text-indigo-700 uppercase bg-indigo-50 px-2 py-0.5 rounded-md">
                      {lb.code}
                    </span>
                    <h3 className="text-base font-black text-slate-900 mt-1">{lb.name}</h3>
                    <p className="text-xs text-slate-500 font-semibold">{lb.category}</p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditLbModal(lb)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-50"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Excluir serviço "${lb.name}"?`)) deleteLaborService(lb.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">Preço Padrão ({lb.unit}):</span>
                  <span className="font-black text-indigo-700 text-base">
                    {formatCurrency(lb.unitPrice)}
                  </span>
                </div>

                {lb.description && (
                  <p className="text-[11px] text-slate-600 mt-3 leading-relaxed">
                    {lb.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Equipment Modal */}
      {showEqModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">
                {editingEq ? 'Editar Equipamento' : 'Novo Equipamento para Locação'}
              </h3>
              <button type="button" onClick={() => setShowEqModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEq} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Código / Patrimônio *</label>
                  <input
                    type="text"
                    required
                    value={eqCode}
                    onChange={(e) => setEqCode(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={eqStatus}
                    onChange={(e) => setEqStatus(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 bg-white font-semibold"
                  >
                    <option value="disponivel">Disponível</option>
                    <option value="em_uso">Em Locação</option>
                    <option value="manutencao">Em Manutenção</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome do Equipamento *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Gerador Silenciado 50 kVA Diesel"
                  value={eqName}
                  onChange={(e) => setEqName(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Categoria</label>
                <input
                  type="text"
                  value={eqCategory}
                  onChange={(e) => setEqCategory(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Diária (R$) *</label>
                  <input
                    type="number"
                    required
                    value={eqDailyRate}
                    onChange={(e) => setEqDailyRate(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-xl p-2.5 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mensal (R$)</label>
                  <input
                    type="number"
                    value={eqMonthlyRate}
                    onChange={(e) => setEqMonthlyRate(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hora (R$)</label>
                  <input
                    type="number"
                    value={eqHourlyRate}
                    onChange={(e) => setEqHourlyRate(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-xl p-2.5"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Especificações Técnicas</label>
                <textarea
                  rows={2}
                  value={eqSpecs}
                  onChange={(e) => setEqSpecs(e.target.value)}
                  placeholder="Voltagem, capacidade, acessórios inclusos..."
                  className="w-full border border-slate-300 rounded-xl p-2.5"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEqModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl"
                >
                  Salvar Equipamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Labor Modal */}
      {showLbModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">
                {editingLb ? 'Editar Mão de Obra / Serviço' : 'Nova Função / Serviço'}
              </h3>
              <button type="button" onClick={() => setShowLbModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLb} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Código *</label>
                  <input
                    type="text"
                    required
                    value={lbCode}
                    onChange={(e) => setLbCode(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unidade Cobrada</label>
                  <select
                    value={lbUnit}
                    onChange={(e) => setLbUnit(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 bg-white font-semibold"
                  >
                    <option value="hora">Por Hora (R$/h)</option>
                    <option value="diaria">Por Diária (R$/dia)</option>
                    <option value="servico_fechado">Serviço Fechado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Função / Título do Profissional *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Soldador TIG Alta Pressão"
                  value={lbName}
                  onChange={(e) => setLbName(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Categoria</label>
                  <input
                    type="text"
                    value={lbCategory}
                    onChange={(e) => setLbCategory(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Valor Unitário (R$) *</label>
                  <input
                    type="number"
                    required
                    value={lbUnitPrice}
                    onChange={(e) => setLbUnitPrice(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-xl p-2.5 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Requisitos / Certificações (NRs)</label>
                <textarea
                  rows={2}
                  value={lbDescription}
                  onChange={(e) => setLbDescription(e.target.value)}
                  placeholder="NR-10, NR-35, ASME, EPIs inclusos..."
                  className="w-full border border-slate-300 rounded-xl p-2.5"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLbModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl"
                >
                  Salvar Função
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
