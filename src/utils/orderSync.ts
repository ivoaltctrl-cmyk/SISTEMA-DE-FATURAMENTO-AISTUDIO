import { ServiceOrder, Invoice, OSStatus } from '../types';

/**
 * Realiza o merge inteligente entre a lista de ordens atual (memória/local)
 * e a lista de ordens recém-buscada (Google Sheets ou Servidor).
 * 
 * Regra de Ouro da Esteira WFS:
 * - Se a ordem já foi validada pelo Faturamento ('concluida'), ELA NUNCA VOLTA para 'aguardando_validacao'.
 * - Se a ordem já foi faturada ('faturada'), ELA NUNCA VOLTA para 'aguardando_validacao' ou 'concluida'.
 * - Se a ordem está vinculada a qualquer fatura em `invoices`, ela permanece no mínimo 'faturada' (ou 'paga').
 * - Se a ordem já foi paga ('paga'), preserva 'paga'.
 * - Se a ordem já foi cancelada ('cancelada'), preserva 'cancelada'.
 * - Preserva dados de validação (validatedBy, validatedAt, validationNotes).
 * - Preserva dados de faturamento (invoiceId, invoiceNumber, invoicedAt, paymentMethod, paymentDueDate).
 * - Preserva assinaturas, fotos e logs locais adicionados pelos usuários.
 * - Atualiza os dados de campo vindos da planilha (horários, novos itens, cliente, descrição).
 */
export function mergeOrdersPreservingBillingStatus(
  currentOrders: ServiceOrder[],
  incomingOrders: ServiceOrder[],
  currentInvoices: Invoice[]
): ServiceOrder[] {
  if (!incomingOrders || incomingOrders.length === 0) {
    return currentOrders || [];
  }

  // Mapa das ordens atuais por ID e por Número da OS (normalizado em maiúsculo)
  const currentMap = new Map<string, ServiceOrder>();
  (currentOrders || []).forEach((o) => {
    if (o.id) currentMap.set(o.id, o);
    if (o.osNumber) {
      currentMap.set(o.osNumber.trim().toUpperCase(), o);
      // Remove caracteres não-alfanuméricos para matching flexível (ex: "OS-31877" vs "31877")
      const cleanNum = o.osNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      if (cleanNum) currentMap.set(cleanNum, o);
    }
  });

  // Mapa de Faturas por Número de OS e por ID de OS
  const invoiceByOsNumber = new Map<string, Invoice>();
  const invoiceByOsId = new Map<string, Invoice>();
  (currentInvoices || []).forEach((inv) => {
    (inv.osNumbers || []).forEach((num) => {
      if (num) {
        invoiceByOsNumber.set(num.trim().toUpperCase(), inv);
        const cleanNum = num.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        if (cleanNum) invoiceByOsNumber.set(cleanNum, inv);
      }
    });
    (inv.osIds || []).forEach((id) => {
      if (id) invoiceByOsId.set(id, inv);
    });
  });

  // Itera sobre as ordens que vieram da planilha/servidor
  const mergedList = incomingOrders.map((incoming) => {
    const rawNum = incoming.osNumber ? incoming.osNumber.trim().toUpperCase() : '';
    const cleanNum = rawNum.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    const existing =
      (incoming.id ? currentMap.get(incoming.id) : undefined) ||
      (rawNum ? currentMap.get(rawNum) : undefined) ||
      (cleanNum ? currentMap.get(cleanNum) : undefined);

    const linkedInvoice =
      (rawNum ? invoiceByOsNumber.get(rawNum) : undefined) ||
      (cleanNum ? invoiceByOsNumber.get(cleanNum) : undefined) ||
      (incoming.id ? invoiceByOsId.get(incoming.id) : undefined);

    if (existing) {
      // Determina o status final mais avançado da esteira operacional/financeira
      let finalStatus: OSStatus = incoming.status;

      // Se houver fatura vinculada ou já estiver como faturada
      if (linkedInvoice || existing.invoiceId || existing.status === 'faturada') {
        const isPaid = linkedInvoice?.status === 'paga' || existing.status === 'paga';
        finalStatus = isPaid ? 'paga' : 'faturada';
      } else if (existing.status === 'paga') {
        finalStatus = 'paga';
      } else if (existing.status === 'cancelada') {
        finalStatus = 'cancelada';
      } else if (existing.status === 'concluida') {
        // Aprovada e validada pelo analista de faturamento
        finalStatus = 'concluida';
      }

      // Se a própria planilha tiver número de fatura preenchido (diferente de '-' e não vazio)
      const sheetInvoiceNum =
        incoming.invoiceNumber && incoming.invoiceNumber !== '-' && incoming.invoiceNumber.trim() !== ''
          ? incoming.invoiceNumber.trim()
          : undefined;

      const finalInvoiceNumber = sheetInvoiceNum || linkedInvoice?.invoiceNumber || existing.invoiceNumber;
      const finalInvoiceId = linkedInvoice?.id || existing.invoiceId;

      if (finalInvoiceNumber && finalStatus === 'aguardando_validacao') {
        finalStatus = (linkedInvoice?.status === 'paga' || existing.status === 'paga') ? 'paga' : 'faturada';
      }

      return {
        ...incoming,
        id: existing.id || incoming.id, // Preserva ID estável se já existente
        status: finalStatus,
        // Preserva dados de aprovação/validação de faturamento
        validatedBy:
          existing.validatedBy ||
          (finalStatus === 'concluida' || finalStatus === 'faturada' ? 'Faturamento WFS' : undefined),
        validatedAt:
          existing.validatedAt ||
          (finalStatus === 'concluida' || finalStatus === 'faturada'
            ? existing.createdAt || new Date().toISOString()
            : undefined),
        validationNotes: existing.validationNotes || incoming.validationNotes,
        // Preserva dados de faturamento
        invoiceId: finalInvoiceId,
        invoiceNumber: finalInvoiceNumber,
        invoicedAt: linkedInvoice?.issueDate || existing.invoicedAt,
        paymentMethod: linkedInvoice?.paymentMethod || existing.paymentMethod,
        paymentDueDate: linkedInvoice?.dueDate || existing.paymentDueDate,
        paidAt: linkedInvoice?.paidAt || existing.paidAt,
        // Preserva fotos locais / evidências / logs
        photos:
          existing.photos && existing.photos.length > (incoming.photos?.length || 0)
            ? existing.photos
            : incoming.photos,
        clientSignature: existing.clientSignature || incoming.clientSignature,
        checklist:
          existing.checklist && existing.checklist.length > 0 ? existing.checklist : incoming.checklist,
        auditLogs:
          existing.auditLogs && existing.auditLogs.length > 0 ? existing.auditLogs : incoming.auditLogs,
        deletionReason: existing.deletionReason || incoming.deletionReason,
      };
    }

    // Se é nova da planilha mas já existe uma fatura vinculada a essa OS no sistema
    if (linkedInvoice) {
      const invoiceStatus: OSStatus = linkedInvoice.status === 'paga' ? 'paga' : 'faturada';
      return {
        ...incoming,
        status: invoiceStatus,
        invoiceId: linkedInvoice.id,
        invoiceNumber: linkedInvoice.invoiceNumber,
        invoicedAt: linkedInvoice.issueDate,
        paymentMethod: linkedInvoice.paymentMethod,
        paymentDueDate: linkedInvoice.dueDate,
        paidAt: linkedInvoice.paidAt,
      };
    }

    return incoming;
  });

  // Preserva eventuais ordens locais criadas manualmente no app ou via Teams que ainda não constem na planilha
  const incomingIdSet = new Set(incomingOrders.map((o) => o.id));
  const incomingNumSet = new Set(
    incomingOrders.map((o) => (o.osNumber ? o.osNumber.trim().toUpperCase() : '')).filter(Boolean)
  );

  const localKeepers = (currentOrders || []).filter((o) => {
    const num = o.osNumber ? o.osNumber.trim().toUpperCase() : '';
    const exists = incomingIdSet.has(o.id) || (num && incomingNumSet.has(num));
    if (exists) return false;
    // Mantém ordens com fatura gerada, ordens manuais ou enviadas via teams
    return Boolean(o.invoiceId || o.createdOrigin === 'teams_upload' || o.createdOrigin === 'painel_web');
  });

  return [...mergedList, ...localKeepers];
}
