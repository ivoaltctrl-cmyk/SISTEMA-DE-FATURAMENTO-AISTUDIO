import React, { useState } from 'react';
import {
  Building2,
  Calendar,
  Edit2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Trash2,
  User,
  Users,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Client } from '../types';
import { formatDocument, formatPhone } from '../utils/formatters';

export const ClientsManager: React.FC = () => {
  const { clients, addClient, updateClient, deleteClient, orders } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [document, setDocument] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [paymentTermsDays, setPaymentTermsDays] = useState(15);
  const [workSiteName, setWorkSiteName] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('SP');
  const [zipCode, setZipCode] = useState('');
  const [notes, setNotes] = useState('');

  const openNewClientModal = () => {
    setEditingClient(null);
    setName('');
    setTradeName('');
    setDocument('');
    setEmail('');
    setPhone('');
    setContactPerson('');
    setPaymentTermsDays(15);
    setWorkSiteName('');
    setStreet('');
    setNumber('');
    setNeighborhood('');
    setCity('São Paulo');
    setState('SP');
    setZipCode('');
    setNotes('');
    setShowModal(true);
  };

  const openEditClientModal = (c: Client) => {
    setEditingClient(c);
    setName(c.name);
    setTradeName(c.tradeName || '');
    setDocument(c.document);
    setEmail(c.email);
    setPhone(c.phone);
    setContactPerson(c.contactPerson);
    setPaymentTermsDays(c.paymentTermsDays || 15);
    setWorkSiteName(c.address.workSiteName || '');
    setStreet(c.address.street);
    setNumber(c.address.number);
    setNeighborhood(c.address.neighborhood);
    setCity(c.address.city);
    setState(c.address.state);
    setZipCode(c.address.zipCode);
    setNotes(c.notes || '');
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      name: name.trim(),
      tradeName: tradeName.trim() || undefined,
      document: document.trim(),
      email: email.trim(),
      phone: phone.trim(),
      contactPerson: contactPerson.trim(),
      paymentTermsDays: Number(paymentTermsDays) || 15,
      address: {
        street: street.trim(),
        number: number.trim(),
        neighborhood: neighborhood.trim(),
        city: city.trim(),
        state: state.trim(),
        zipCode: zipCode.trim(),
        workSiteName: workSiteName.trim() || undefined,
      },
      notes: notes.trim() || undefined,
    };

    if (editingClient) {
      updateClient({ ...payload, id: editingClient.id, createdAt: editingClient.createdAt });
    } else {
      addClient(payload);
    }

    setShowModal(false);
  };

  const handleDelete = (id: string, clientName: string) => {
    if (confirm(`Deseja excluir o cliente "${clientName}"?`)) {
      deleteClient(id);
    }
  };

  const filteredClients = clients.filter((c) => {
    return (
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.tradeName && c.tradeName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      c.document.includes(searchTerm) ||
      c.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">Carteira de Clientes</h2>
          <p className="text-xs text-slate-500">
            Cadastre os dados fiscais, locais de atendimento e prazos de pagamento acordados
          </p>
        </div>

        <button
          type="button"
          onClick={openNewClientModal}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-md shadow-blue-500/20 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Novo Cliente
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar cliente por Razão Social, Nome Fantasia, CNPJ ou Contato..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Grid of Clients */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map((client) => {
          const clientOrders = orders.filter((o) => o.clientId === client.id);
          const totalSpent = clientOrders.reduce((s, o) => s + o.totalAmount, 0);

          return (
            <div
              key={client.id}
              className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-black text-blue-700 uppercase bg-blue-50 px-2 py-0.5 rounded-md">
                      Prazo: {client.paymentTermsDays === 0 ? 'À Vista' : `${client.paymentTermsDays} Dias`}
                    </span>
                    <h3 className="text-base font-black text-slate-900 mt-1">{client.name}</h3>
                    {client.tradeName && (
                      <p className="text-xs text-slate-500 font-semibold">{client.tradeName}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditClientModal(client)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-50"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(client.id, client.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <p><strong>CNPJ/CPF:</strong> {formatDocument(client.document)}</p>
                  <p><strong>Contato:</strong> {client.contactPerson}</p>
                  <p className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" /> {formatPhone(client.phone)}
                  </p>
                  <p className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-400" /> {client.email}
                  </p>
                  {client.address.workSiteName && (
                    <p className="flex items-center gap-1 text-slate-800 font-medium pt-1">
                      <MapPin className="w-3 h-3 text-emerald-600" /> Obra/Local: {client.address.workSiteName}
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">{clientOrders.length} OSs Realizadas</span>
                <span className="font-black text-slate-900">
                  Total: R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal CRUD */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
              </h3>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Razão Social / Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Construtora Horizonte Nobre S.A."
                    className="w-full border border-slate-300 rounded-xl p-2.5"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nome Fantasia</label>
                  <input
                    type="text"
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                    placeholder="Ex: Horizonte Engenharia"
                    className="w-full border border-slate-300 rounded-xl p-2.5"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">CNPJ ou CPF *</label>
                  <input
                    type="text"
                    required
                    value={document}
                    onChange={(e) => setDocument(e.target.value)}
                    placeholder="00.000.000/0000-00"
                    className="w-full border border-slate-300 rounded-xl p-2.5"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Telefone / WhatsApp *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 98765-4321"
                    className="w-full border border-slate-300 rounded-xl p-2.5"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">E-mail Financeiro/Compras *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="compras@cliente.com.br"
                    className="w-full border border-slate-300 rounded-xl p-2.5"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Pessoa de Contato / Fiscal</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="Ex: Eng. Ricardo Silveira"
                    className="w-full border border-slate-300 rounded-xl p-2.5"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Prazo de Pagamento Padrão</label>
                  <select
                    value={paymentTermsDays}
                    onChange={(e) => setPaymentTermsDays(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-xl p-2.5 bg-white font-semibold"
                  >
                    <option value="0">À Vista (0 dias)</option>
                    <option value="7">7 Dias</option>
                    <option value="15">15 Dias</option>
                    <option value="28">28 Dias</option>
                    <option value="30">30 Dias</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Nome da Obra / Local Principal</label>
                  <input
                    type="text"
                    value={workSiteName}
                    onChange={(e) => setWorkSiteName(e.target.value)}
                    placeholder="Ex: Obra Torre Sul - Edifício Skyline"
                    className="w-full border border-slate-300 rounded-xl p-2.5"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Endereço da Obra / Entrega</label>
                  <input
                    type="text"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="Rua, Avenida, Rodovia..."
                    className="w-full border border-slate-300 rounded-xl p-2.5"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cidade</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Estado (UF)</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md"
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
