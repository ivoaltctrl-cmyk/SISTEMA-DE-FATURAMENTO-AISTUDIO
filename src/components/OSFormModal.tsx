import React, { useState } from 'react';
import {
  Calendar,
  CheckSquare,
  Clock,
  HardHat,
  MapPin,
  Package,
  Plus,
  Trash2,
  Truck,
  User,
  Users,
  Wrench,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  ChecklistItem,
  OSEquipmentItem,
  OSLaborItem,
  OSMaterialItem,
  ServiceOrder,
  ServiceTypeCategory
} from '../types';
import { formatCurrency } from '../utils/formatters';

interface OSFormModalProps {
  initialOrder?: ServiceOrder | null;
  onClose: () => void;
  onSave: (orderData: any) => void;
}

export const OSFormModal: React.FC<OSFormModalProps> = ({
  initialOrder,
  onClose,
  onSave,
}) => {
  const { clients, equipments, laborServices } = useApp();

  const [clientId, setClientId] = useState(initialOrder?.clientId || (clients[0]?.id ?? ''));
  const [title, setTitle] = useState(initialOrder?.title || '');
  const [category, setCategory] = useState<ServiceTypeCategory>(initialOrder?.category || 'misto');
  const [description, setDescription] = useState(initialOrder?.description || '');
  const [scheduledDate, setScheduledDate] = useState(
    initialOrder?.scheduledDate || new Date().toISOString().split('T')[0]
  );
  const [scheduledTime, setScheduledTime] = useState(initialOrder?.scheduledTime || '08:00');
  const [technicianName, setTechnicianName] = useState(
    initialOrder?.technicianName || 'Rodrigo Vasconcelos'
  );
  const [technicianPhone, setTechnicianPhone] = useState(
    initialOrder?.technicianPhone || '(11) 98765-4321'
  );

  // Address
  const selectedClient = clients.find((c) => c.id === clientId);
  const defaultWorkLoc =
    initialOrder?.workLocation ||
    (selectedClient
      ? `${selectedClient.address.workSiteName || selectedClient.name} - ${selectedClient.address.street}, ${selectedClient.address.number} - ${selectedClient.address.city}/${selectedClient.address.state}`
      : '');
  const [workLocation, setWorkLocation] = useState(defaultWorkLoc);

  // Equipment Items
  const [equipmentItems, setEquipmentItems] = useState<OSEquipmentItem[]>(
    initialOrder?.equipmentItems || []
  );

  // Labor Items
  const [laborItems, setLaborItems] = useState<OSLaborItem[]>(
    initialOrder?.laborItems || []
  );

  // Material Items
  const [materialItems, setMaterialItems] = useState<OSMaterialItem[]>(
    initialOrder?.materialItems || []
  );

  // Checklist
  const defaultChecklist: ChecklistItem[] = [
    { id: 'chk-' + Math.random(), task: 'Check-in no canteiro e alinhamento com encarregado', completed: false },
    { id: 'chk-' + Math.random(), task: 'Conferência de EPIs e Liberação de Trabalho (PT/APR)', completed: false },
    { id: 'chk-' + Math.random(), task: 'Vistoria e teste de funcionamento dos equipamentos', completed: false },
    { id: 'chk-' + Math.random(), task: 'Execução do serviço técnico / horas apontadas', completed: false },
    { id: 'chk-' + Math.random(), task: 'Coleta de assinatura digital do cliente no campo', completed: false },
  ];

  const [checklist, setChecklist] = useState<ChecklistItem[]>(
    initialOrder?.checklist || defaultChecklist
  );
  const [newChecklistText, setNewChecklistText] = useState('');

  // Discount & Addition
  const [discount, setDiscount] = useState(initialOrder?.discount || 0);
  const [addition, setAddition] = useState(initialOrder?.addition || 0);

  // Update work location when client changes
  const handleClientChange = (newClientId: string) => {
    setClientId(newClientId);
    const cl = clients.find((c) => c.id === newClientId);
    if (cl && (!workLocation || workLocation === defaultWorkLoc)) {
      setWorkLocation(
        `${cl.address.workSiteName || cl.name} - ${cl.address.street}, ${cl.address.number} - ${cl.address.city}/${cl.address.state}`
      );
    }
  };

  // Equipment helpers
  const handleAddEquipment = (eqId?: string) => {
    const eq = equipments.find((e) => e.id === eqId);
    const newItem: OSEquipmentItem = {
      id: 'eq-item-' + Date.now() + Math.random().toString(36).substr(2, 4),
      equipmentId: eq?.id,
      name: eq ? eq.name : 'Equipamento Personalizado',
      code: eq?.code,
      unit: 'diaria',
      quantity: 1,
      unitPrice: eq?.dailyRate || 250,
      notes: '',
    };
    setEquipmentItems([...equipmentItems, newItem]);
  };

  const handleUpdateEquipment = (index: number, field: keyof OSEquipmentItem, val: any) => {
    const updated = [...equipmentItems];
    updated[index] = { ...updated[index], [field]: val };
    
    // If equipmentId changed, update name and price
    if (field === 'equipmentId') {
      const eq = equipments.find((e) => e.id === val);
      if (eq) {
        updated[index].name = eq.name;
        updated[index].code = eq.code;
        updated[index].unitPrice = eq.dailyRate;
      }
    }
    setEquipmentItems(updated);
  };

  const handleRemoveEquipment = (index: number) => {
    setEquipmentItems(equipmentItems.filter((_, i) => i !== index));
  };

  // Labor helpers
  const handleAddLabor = (lbId?: string) => {
    const lb = laborServices.find((l) => l.id === lbId);
    const newItem: OSLaborItem = {
      id: 'lab-item-' + Date.now() + Math.random().toString(36).substr(2, 4),
      laborServiceId: lb?.id,
      name: lb ? lb.name : 'Mão de Obra Especializada',
      unit: lb?.unit === 'diaria' ? 'diaria' : 'hora',
      quantity: lb?.unit === 'diaria' ? 1 : 8,
      unitPrice: lb?.unitPrice || 80,
      technicianName: technicianName || '',
      notes: '',
    };
    setLaborItems([...laborItems, newItem]);
  };

  const handleUpdateLabor = (index: number, field: keyof OSLaborItem, val: any) => {
    const updated = [...laborItems];
    updated[index] = { ...updated[index], [field]: val };
    if (field === 'laborServiceId') {
      const lb = laborServices.find((l) => l.id === val);
      if (lb) {
        updated[index].name = lb.name;
        updated[index].unitPrice = lb.unitPrice;
        updated[index].unit = lb.unit === 'diaria' ? 'diaria' : 'hora';
      }
    }
    setLaborItems(updated);
  };

  const handleRemoveLabor = (index: number) => {
    setLaborItems(laborItems.filter((_, i) => i !== index));
  };

  // Material helpers
  const handleAddMaterial = () => {
    const newItem: OSMaterialItem = {
      id: 'mat-item-' + Date.now(),
      name: 'Insumo / Peça / Acessório',
      unit: 'un',
      quantity: 1,
      unitPrice: 50,
    };
    setMaterialItems([...materialItems, newItem]);
  };

  const handleUpdateMaterial = (index: number, field: keyof OSMaterialItem, val: any) => {
    const updated = [...materialItems];
    updated[index] = { ...updated[index], [field]: val };
    setMaterialItems(updated);
  };

  const handleRemoveMaterial = (index: number) => {
    setMaterialItems(materialItems.filter((_, i) => i !== index));
  };

  // Checklist item add/remove
  const handleAddChecklist = () => {
    if (!newChecklistText.trim()) return;
    setChecklist([
      ...checklist,
      { id: 'chk-' + Date.now(), task: newChecklistText.trim(), completed: false },
    ]);
    setNewChecklistText('');
  };

  const handleRemoveChecklist = (id: string) => {
    setChecklist(checklist.filter((c) => c.id !== id));
  };

  // Calculations
  const totalEquipments = equipmentItems.reduce((s, it) => s + (it.quantity * it.unitPrice || 0), 0);
  const totalLabor = laborItems.reduce((s, it) => s + (it.quantity * it.unitPrice || 0), 0);
  const totalMaterials = materialItems.reduce((s, it) => s + (it.quantity * it.unitPrice || 0), 0);
  const subtotal = totalEquipments + totalLabor + totalMaterials;
  const finalTotal = Math.max(0, subtotal - Number(discount || 0) + Number(addition || 0));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClient) {
      alert('Selecione um cliente.');
      return;
    }
    if (!title.trim()) {
      alert('Informe o título/resumo do serviço.');
      return;
    }
    if (equipmentItems.length === 0 && laborItems.length === 0 && materialItems.length === 0) {
      alert('Adicione pelo menos um item de equipamento, mão de obra ou serviço nesta OS.');
      return;
    }

    const orderData = {
      ...(initialOrder || {}),
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      clientDocument: selectedClient.document,
      clientPhone: selectedClient.phone,
      clientEmail: selectedClient.email,
      workLocation: workLocation.trim(),
      category,
      title: title.trim(),
      description: description.trim(),
      status: initialOrder?.status || 'agendada',
      scheduledDate,
      scheduledTime,
      technicianName: technicianName.trim(),
      technicianPhone: technicianPhone.trim(),
      equipmentItems,
      laborItems,
      materialItems,
      discount: Number(discount || 0),
      addition: Number(addition || 0),
      totalAmount: finalTotal,
      checklist,
      photos: initialOrder?.photos || [],
      clientSignature: initialOrder?.clientSignature,
      technicianSignature: initialOrder?.technicianSignature,
    };

    onSave(orderData);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-600 rounded-xl text-white">
              <HardHat className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {initialOrder ? `Editar ${initialOrder.osNumber}` : 'Nova Ordem de Serviço Digital'}
              </h2>
              <p className="text-xs text-slate-500">
                Cadastre a prestação, locação e técnicos para execução em campo e faturamento rápido
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1">
          {/* Section 1: Client & Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Cliente *
              </label>
              <select
                value={clientId}
                onChange={(e) => handleClientChange(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2.5 bg-white font-medium focus:ring-2 focus:ring-blue-500"
                required
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.tradeName || 'CNPJ/CPF: ' + c.document})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Tipo da Atividade
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ServiceTypeCategory)}
                className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2.5 bg-white font-medium focus:ring-2 focus:ring-blue-500"
              >
                <option value="locacao">Locação de Equipamentos</option>
                <option value="mao_de_obra">Mão de Obra Especializada</option>
                <option value="servico_tecnico">Serviço Técnico / Manutenção</option>
                <option value="misto">Misto (Locação + Mão de Obra)</option>
              </select>
            </div>

            <div className="lg:col-span-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Título / Resumo da OS *
              </label>
              <input
                type="text"
                placeholder="Ex: Locação de Gerador 50kVA + Operador e Eletricista para Obra"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-sm font-semibold border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="lg:col-span-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Local de Execução / Obra *
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Endereço ou nome do canteiro onde o serviço/equipamento será operado"
                  value={workLocation}
                  onChange={(e) => setWorkLocation(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  required
                />
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Data Agendada
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  required
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Horário Previsto
              </label>
              <div className="relative">
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Técnico / Responsável Campo
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Nome do técnico responsável"
                  value={technicianName}
                  onChange={(e) => setTechnicianName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  required
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div className="lg:col-span-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Escopo / Descrição Detalhada dos Serviços
              </label>
              <textarea
                rows={2}
                placeholder="Detalhes operacionais, requisitos de segurança, orientações para os técnicos..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Section 2: Equipment Rental Items */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-800">
                  Equipamentos para Locação
                </h3>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleAddEquipment()}
                  className="text-xs font-semibold px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Equipamento
                </button>
              </div>
            </div>

            {equipmentItems.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">
                Nenhum equipamento adicionado a esta ordem de serviço.
              </p>
            ) : (
              <div className="space-y-2">
                {equipmentItems.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs items-center"
                  >
                    <div className="sm:col-span-5">
                      <select
                        value={item.equipmentId || ''}
                        onChange={(e) => handleUpdateEquipment(idx, 'equipmentId', e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded-lg p-2 font-medium"
                      >
                        <option value="">-- Equipamento Personalizado --</option>
                        {equipments.map((eq) => (
                          <option key={eq.id} value={eq.id}>
                            [{eq.code}] {eq.name} - Diária {formatCurrency(eq.dailyRate)}
                          </option>
                        ))}
                      </select>
                      {!item.equipmentId && (
                        <input
                          type="text"
                          placeholder="Nome do Equipamento"
                          value={item.name}
                          onChange={(e) => handleUpdateEquipment(idx, 'name', e.target.value)}
                          className="w-full text-xs border border-slate-300 rounded-lg p-1.5 mt-1 font-semibold"
                        />
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <select
                        value={item.unit}
                        onChange={(e) => handleUpdateEquipment(idx, 'unit', e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded-lg p-2"
                      >
                        <option value="diaria">Diária</option>
                        <option value="hora">Hora</option>
                        <option value="semana">Semana</option>
                        <option value="mes">Mês</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <input
                        type="number"
                        min="1"
                        step="0.5"
                        placeholder="Qtd"
                        value={item.quantity}
                        onChange={(e) => handleUpdateEquipment(idx, 'quantity', Number(e.target.value))}
                        className="w-full text-xs border border-slate-300 rounded-lg p-2 text-center"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <input
                        type="number"
                        min="0"
                        step="10"
                        placeholder="Preço Unit (R$)"
                        value={item.unitPrice}
                        onChange={(e) => handleUpdateEquipment(idx, 'unitPrice', Number(e.target.value))}
                        className="w-full text-xs border border-slate-300 rounded-lg p-2 font-semibold text-slate-800"
                      />
                      <div className="text-[10px] text-slate-500 text-right mt-0.5">
                        Total: {formatCurrency(item.quantity * item.unitPrice)}
                      </div>
                    </div>

                    <div className="sm:col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveEquipment(idx)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Specialized Labor & Services */}
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-800">
                  Mão de Obra Especializada & Serviços
                </h3>
              </div>
              <button
                type="button"
                onClick={() => handleAddLabor()}
                className="text-xs font-semibold px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar Profissional / Serviço
              </button>
            </div>

            {laborItems.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">
                Nenhum serviço ou profissional especializado adicionado.
              </p>
            ) : (
              <div className="space-y-2">
                {laborItems.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs items-center"
                  >
                    <div className="sm:col-span-5">
                      <select
                        value={item.laborServiceId || ''}
                        onChange={(e) => handleUpdateLabor(idx, 'laborServiceId', e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded-lg p-2 font-medium"
                      >
                        <option value="">-- Mão de Obra Personalizada --</option>
                        {laborServices.map((lb) => (
                          <option key={lb.id} value={lb.id}>
                            [{lb.code}] {lb.name} ({formatCurrency(lb.unitPrice)}/{lb.unit})
                          </option>
                        ))}
                      </select>
                      {!item.laborServiceId && (
                        <input
                          type="text"
                          placeholder="Função / Nome do Serviço"
                          value={item.name}
                          onChange={(e) => handleUpdateLabor(idx, 'name', e.target.value)}
                          className="w-full text-xs border border-slate-300 rounded-lg p-1.5 mt-1 font-semibold"
                        />
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <select
                        value={item.unit}
                        onChange={(e) => handleUpdateLabor(idx, 'unit', e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded-lg p-2"
                      >
                        <option value="hora">Horas</option>
                        <option value="diaria">Diária</option>
                        <option value="homem_hora">H.H.</option>
                        <option value="servico">Fechado</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <input
                        type="number"
                        min="1"
                        step="0.5"
                        placeholder="Qtd"
                        value={item.quantity}
                        onChange={(e) => handleUpdateLabor(idx, 'quantity', Number(e.target.value))}
                        className="w-full text-xs border border-slate-300 rounded-lg p-2 text-center"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <input
                        type="number"
                        min="0"
                        step="5"
                        placeholder="Preço Unit (R$)"
                        value={item.unitPrice}
                        onChange={(e) => handleUpdateLabor(idx, 'unitPrice', Number(e.target.value))}
                        className="w-full text-xs border border-slate-300 rounded-lg p-2 font-semibold text-slate-800"
                      />
                      <div className="text-[10px] text-slate-500 text-right mt-0.5">
                        Total: {formatCurrency(item.quantity * item.unitPrice)}
                      </div>
                    </div>

                    <div className="sm:col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveLabor(idx)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Materials & Insumos */}
          <div className="bg-amber-50/40 border border-amber-200/60 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-700" />
                <h3 className="text-sm font-bold text-slate-800">
                  Materiais, Peças & Insumos Extras
                </h3>
              </div>
              <button
                type="button"
                onClick={handleAddMaterial}
                className="text-xs font-semibold px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg flex items-center gap-1 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar Item
              </button>
            </div>

            {materialItems.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-1">
                Nenhum material extra cadastrado (cabos, conexões, varetas, óleos, etc).
              </p>
            ) : (
              <div className="space-y-2">
                {materialItems.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-white p-2 rounded-xl border border-slate-200 items-center"
                  >
                    <div className="sm:col-span-6">
                      <input
                        type="text"
                        placeholder="Nome do Insumo / Peça"
                        value={item.name}
                        onChange={(e) => handleUpdateMaterial(idx, 'name', e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded-lg p-2"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        placeholder="Un (m, un, kg)"
                        value={item.unit}
                        onChange={(e) => handleUpdateMaterial(idx, 'unit', e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded-lg p-2 text-center"
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleUpdateMaterial(idx, 'quantity', Number(e.target.value))}
                        className="w-full text-xs border border-slate-300 rounded-lg p-2 text-center"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="number"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) => handleUpdateMaterial(idx, 'unitPrice', Number(e.target.value))}
                        className="w-full text-xs border border-slate-300 rounded-lg p-2 font-semibold"
                      />
                    </div>
                    <div className="sm:col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveMaterial(idx)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 5: Checklist for Field Execution */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-800">
                Checklist Operacional de Campo
              </h3>
            </div>
            <div className="space-y-1.5">
              {checklist.map((item) => (
                <div key={item.id} className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
                  <span className="text-slate-700 font-medium">{item.task}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveChecklist(item.id)}
                    className="text-slate-400 hover:text-rose-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Adicionar nova etapa de verificação ou teste..."
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddChecklist();
                  }
                }}
                className="flex-1 text-xs border border-slate-300 rounded-xl px-3 py-2"
              />
              <button
                type="button"
                onClick={handleAddChecklist}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl"
              >
                Adicionar
              </button>
            </div>
          </div>

          {/* Section 6: Totals & Summary */}
          <div className="bg-slate-100 border border-slate-200 text-slate-800 rounded-2xl p-5 shadow-2xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block">Locação Equipamentos</span>
                <span className="text-sm font-bold text-slate-900">{formatCurrency(totalEquipments)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Mão de Obra / Serviços</span>
                <span className="text-sm font-bold text-slate-900">{formatCurrency(totalLabor)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Materiais / Insumos</span>
                <span className="text-sm font-bold text-slate-900">{formatCurrency(totalMaterials)}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block">Subtotal</span>
                <span className="text-sm font-bold text-slate-700">{formatCurrency(subtotal)}</span>
              </div>
            </div>

            <div className="border-t border-slate-200 mt-4 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div>
                  <label className="text-[11px] text-slate-600 block font-bold">Desconto (R$)</label>
                  <input
                    type="number"
                    min="0"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="w-24 px-2 py-1 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-600 block font-bold">Acréscimo (R$)</label>
                  <input
                    type="number"
                    min="0"
                    value={addition}
                    onChange={(e) => setAddition(Number(e.target.value))}
                    className="w-24 px-2 py-1 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold"
                  />
                </div>
              </div>

              <div className="text-right w-full sm:w-auto flex items-center justify-between sm:justify-end gap-4">
                <span className="text-xs text-slate-600 uppercase tracking-widest font-bold">
                  Total Final da OS:
                </span>
                <span className="text-2xl font-black text-emerald-600">
                  {formatCurrency(finalTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-7 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/20"
            >
              {initialOrder ? 'Salvar Alterações da OS' : 'Gerar Ordem de Serviço'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
