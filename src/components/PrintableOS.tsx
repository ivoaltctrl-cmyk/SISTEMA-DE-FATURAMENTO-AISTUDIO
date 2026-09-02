import React from 'react';
import { ArrowLeft, CheckCircle2, Download, MapPin, Printer, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ServiceOrder } from '../types';
import { formatCurrency, formatDate, formatDateTime, formatDocument, formatPhone } from '../utils/formatters';
import { WFSLogo } from './WFSLogo';

interface PrintableOSProps {
  order: ServiceOrder;
  onBack: () => void;
}

export const PrintableOS: React.FC<PrintableOSProps> = ({ order, onBack }) => {
  const { company } = useApp();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6 print:p-0 print:bg-white">
      {/* Top Action Bar (hidden when printing) */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between print:hidden bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-xl hover:bg-slate-100"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar ao Painel
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 hidden sm:inline">
            Use o botão ao lado para imprimir ou salvar como PDF com todas as assinaturas digitais.
          </span>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl shadow-md shadow-red-600/20"
          >
            <Printer className="w-4 h-4" /> Imprimir / Salvar PDF
          </button>
        </div>
      </div>

      {/* Printable Sheet (A4 Layout Style) */}
      <div className="max-w-4xl mx-auto bg-white p-8 sm:p-12 rounded-3xl shadow-xl border border-slate-200 print:border-none print:shadow-none print:p-0 print:max-w-full text-slate-800">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-slate-900 pb-6 gap-4">
          <div className="space-y-1">
            <WFSLogo size="md" />
            <p className="text-xs font-semibold text-slate-700 mt-2">{company.name}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              CNPJ: {formatDocument(company.cnpj)}{' '}
              {company.stateRegistration ? `| IE: ${company.stateRegistration}` : ''}
            </p>
            <p className="text-[11px] text-slate-500">
              {company.address} - {company.cityState}
            </p>
            <p className="text-[11px] text-slate-500">
              Tel/WhatsApp: {company.phone} | E-mail: {company.email}
            </p>
          </div>

          <div className="text-right sm:border-l-2 sm:border-slate-100 sm:pl-6">
            <span className="inline-block px-3 py-1 bg-red-600 text-white font-black text-xs uppercase tracking-widest rounded-md mb-1">
              ORDEM DE SERVIÇO DIGITAL
            </span>
            <h2 className="text-2xl font-black text-slate-900">{order.osNumber}</h2>
            <p className="text-xs text-slate-500 mt-1">
              <strong>Emissão:</strong> {formatDate(order.createdAt)}
            </p>
            <p className="text-xs text-slate-500">
              <strong>Status:</strong> {order.status.toUpperCase()}
            </p>
          </div>
        </div>

        {/* Client & Service Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-6 border-b border-slate-200 text-xs">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h3 className="font-bold text-slate-900 uppercase tracking-wider mb-2 text-[11px] border-b border-slate-200 pb-1">
              DADOS DO CLIENTE / CONTRATANTE
            </h3>
            <p className="text-sm font-bold text-slate-900">{order.clientName}</p>
            <p className="text-slate-600 mt-1">
              <strong>CNPJ/CPF:</strong> {formatDocument(order.clientDocument)}
            </p>
            <p className="text-slate-600">
              <strong>Telefone:</strong> {formatPhone(order.clientPhone)}
            </p>
            <p className="text-slate-600">
              <strong>E-mail:</strong> {order.clientEmail}
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h3 className="font-bold text-slate-900 uppercase tracking-wider mb-2 text-[11px] border-b border-slate-200 pb-1">
              LOCAL DA PRESTAÇÃO & EXECUÇÃO
            </h3>
            <p className="text-slate-800 font-semibold">{order.workLocation}</p>
            <p className="text-slate-600 mt-1">
              <strong>Data Prevista:</strong> {formatDate(order.scheduledDate)}{' '}
              {order.scheduledTime ? `às ${order.scheduledTime}` : ''}
            </p>
            <p className="text-slate-600">
              <strong>Técnico / Responsável:</strong> {order.technicianName}{' '}
              {order.technicianPhone ? `(${order.technicianPhone})` : ''}
            </p>
            <p className="text-slate-600">
              <strong>Finalização no Campo:</strong> {formatDateTime(order.completedAt)}
            </p>
          </div>
        </div>

        {/* Title & Scope */}
        <div className="py-4 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-900 mb-1">{order.title}</h3>
          {order.description && (
            <p className="text-xs text-slate-600 leading-relaxed">{order.description}</p>
          )}
        </div>

        {/* Items Breakdown Table */}
        <div className="py-6 border-b border-slate-200">
          <h3 className="font-bold text-slate-900 uppercase tracking-wider mb-3 text-xs">
            DISCRIMINAÇÃO DE EQUIPAMENTOS, MÃO DE OBRA E SERVIÇOS
          </h3>

          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-y border-slate-300 text-slate-700 font-bold uppercase text-[10px]">
                <th className="py-2.5 px-3">Tipo / Item</th>
                <th className="py-2.5 px-2 text-center">Unidade</th>
                <th className="py-2.5 px-2 text-center">Qtd</th>
                <th className="py-2.5 px-3 text-right">Valor Unit.</th>
                <th className="py-2.5 px-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {order.equipmentItems.map((eq, i) => (
                <tr key={eq.id || i}>
                  <td className="py-2 px-3">
                    <span className="font-semibold text-slate-900">[LOCAÇÃO] {eq.name}</span>
                    {eq.code && <span className="text-[10px] text-slate-500 ml-1">({eq.code})</span>}
                    {eq.notes && <p className="text-[10px] text-slate-500 italic">{eq.notes}</p>}
                  </td>
                  <td className="py-2 px-2 text-center capitalize">{eq.unit}</td>
                  <td className="py-2 px-2 text-center font-medium">{eq.quantity}</td>
                  <td className="py-2 px-3 text-right">{formatCurrency(eq.unitPrice)}</td>
                  <td className="py-2 px-3 text-right font-bold text-slate-900">
                    {formatCurrency(eq.quantity * eq.unitPrice)}
                  </td>
                </tr>
              ))}

              {order.laborItems.map((lab, i) => (
                <tr key={lab.id || i}>
                  <td className="py-2 px-3">
                    <span className="font-semibold text-slate-900">[MÃO DE OBRA] {lab.name}</span>
                    {lab.technicianName && (
                      <span className="text-[10px] text-slate-500 ml-1">({lab.technicianName})</span>
                    )}
                    {lab.notes && <p className="text-[10px] text-slate-500 italic">{lab.notes}</p>}
                  </td>
                  <td className="py-2 px-2 text-center capitalize">{lab.unit}</td>
                  <td className="py-2 px-2 text-center font-medium">{lab.quantity}</td>
                  <td className="py-2 px-3 text-right">{formatCurrency(lab.unitPrice)}</td>
                  <td className="py-2 px-3 text-right font-bold text-slate-900">
                    {formatCurrency(lab.quantity * lab.unitPrice)}
                  </td>
                </tr>
              ))}

              {order.materialItems.map((mat, i) => (
                <tr key={mat.id || i}>
                  <td className="py-2 px-3">
                    <span className="font-medium text-slate-800">[MATERIAL] {mat.name}</span>
                  </td>
                  <td className="py-2 px-2 text-center">{mat.unit}</td>
                  <td className="py-2 px-2 text-center font-medium">{mat.quantity}</td>
                  <td className="py-2 px-3 text-right">{formatCurrency(mat.unitPrice)}</td>
                  <td className="py-2 px-3 text-right font-bold text-slate-900">
                    {formatCurrency(mat.quantity * mat.unitPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals Box */}
          <div className="mt-4 flex justify-end">
            <div className="w-64 text-xs space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
              {order.discount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Desconto:</span>
                  <span className="text-rose-600 font-semibold">- {formatCurrency(order.discount)}</span>
                </div>
              )}
              {order.addition > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Acréscimo:</span>
                  <span className="font-semibold">+ {formatCurrency(order.addition)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-slate-900 border-t border-slate-200 pt-1.5">
                <span>VALOR TOTAL:</span>
                <span className="text-red-700">{formatCurrency(order.totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Checklist & Photos (if available) */}
        {order.checklist && order.checklist.length > 0 && (
          <div className="py-4 border-b border-slate-200 text-xs">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider mb-2 text-[11px]">
              CHECKLIST DE EXECUÇÃO & CONFERÊNCIA
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {order.checklist.map((chk) => (
                <div key={chk.id} className="flex items-center gap-2 text-slate-700">
                  <CheckCircle2
                    className={`w-3.5 h-3.5 shrink-0 ${
                      chk.completed ? 'text-emerald-600' : 'text-slate-300'
                    }`}
                  />
                  <span className={chk.completed ? 'font-medium' : 'line-through text-slate-400'}>
                    {chk.task}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Evidences Photos Thumbnail */}
        {order.photos && order.photos.length > 0 && (
          <div className="py-4 border-b border-slate-200 text-xs">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider mb-2 text-[11px]">
              EVIDÊNCIAS FOTOGRÁFICAS REGISTRADAS NO LOCAL ({order.photos.length})
            </h4>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {order.photos.map((ph) => (
                <div key={ph.id} className="border border-slate-200 rounded-lg p-1 text-center bg-slate-50">
                  <img src={ph.url} alt={ph.title} className="w-full h-20 object-cover rounded" />
                  <p className="text-[9px] font-semibold text-slate-700 truncate mt-1">{ph.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Terms of Acceptance */}
        <div className="py-4 border-b border-slate-200 text-[11px] text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl mt-4">
          <p className="font-bold text-slate-800 mb-1">TERMO DE ACEITE E RESPONSABILIDADE WFS:</p>
          <p>{order.termsAcceptedText || company.defaultTerms}</p>
        </div>

        {/* Signatures Section */}
        <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs">
          {/* Client Digital Signature */}
          <div className="border border-slate-300 rounded-2xl p-4 bg-white text-center flex flex-col items-center justify-between min-h-[160px]">
            <span className="font-bold text-slate-900 uppercase text-[10px] tracking-wider mb-1">
              ASSINATURA DIGITAL DO CLIENTE / RECEBEDOR
            </span>

            {order.clientSignature ? (
              <div className="w-full flex flex-col items-center">
                <div className="h-16 flex items-center justify-center">
                  <img
                    src={order.clientSignature.signatureImage}
                    alt="Assinatura do Cliente"
                    className="max-h-14 object-contain"
                  />
                </div>
                <div className="w-full border-t border-slate-300 pt-2 mt-1">
                  <p className="font-bold text-slate-900 text-xs">
                    {order.clientSignature.signerName}
                  </p>
                  <p className="text-[10px] text-slate-600">
                    CPF/RG: {order.clientSignature.signerDocument || 'Não informado'} |{' '}
                    {order.clientSignature.signerRole || 'Responsável'}
                  </p>
                  <p className="text-[9px] text-emerald-700 font-semibold mt-0.5 flex items-center justify-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Assinado em{' '}
                    {formatDateTime(order.clientSignature.signedAt)}
                  </p>
                  {order.clientSignature.locationGeo && (
                    <p className="text-[8px] text-slate-400">
                      {order.clientSignature.locationGeo.addressDescription}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-end w-full">
                <div className="w-48 border-b border-slate-400 mb-2"></div>
                <p className="text-slate-500 italic">Pendente de assinatura no campo</p>
              </div>
            )}
          </div>

          {/* Technician / Company Signature */}
          <div className="border border-slate-300 rounded-2xl p-4 bg-white text-center flex flex-col items-center justify-between min-h-[160px]">
            <span className="font-bold text-slate-900 uppercase text-[10px] tracking-wider mb-1">
              RESPONSÁVEL TÉCNICO / PRESTADOR WFS
            </span>

            {order.technicianSignature ? (
              <div className="w-full flex flex-col items-center">
                <div className="h-16 flex items-center justify-center">
                  <img
                    src={order.technicianSignature.signatureImage}
                    alt="Assinatura do Técnico"
                    className="max-h-14 object-contain"
                  />
                </div>
                <div className="w-full border-t border-slate-300 pt-2 mt-1">
                  <p className="font-bold text-slate-900 text-xs">
                    {order.technicianSignature.signerName}
                  </p>
                  <p className="text-[10px] text-slate-600">
                    {order.technicianSignature.signerRole || 'Técnico Especializado'}
                  </p>
                  <p className="text-[9px] text-emerald-700 font-semibold mt-0.5">
                    Validado em {formatDateTime(order.technicianSignature.signedAt)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-end w-full">
                <div className="w-48 border-b border-slate-400 mb-2"></div>
                <p className="font-semibold text-slate-800">{order.technicianName}</p>
                <p className="text-[10px] text-slate-500">{company.name}</p>
              </div>
            )}
          </div>
        </div>

        {/* Document Footer */}
        <div className="mt-8 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400">
          Este documento foi emitido e assinado digitalmente pelo sistema WFS OS Digital. Possui validade jurídica como comprovante de entrega e prestação.
        </div>
      </div>
    </div>
  );
};
