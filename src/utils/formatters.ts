// Utility formatters and helper functions

export const formatCurrency = (val: number | undefined | null): string => {
  if (val === undefined || val === null || isNaN(val)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val);
};

export const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('pt-BR');
  } catch {
    return dateStr;
  }
};

export const formatDateTime = (dateStr?: string): string => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return dateStr;
  }
};

export const formatDocument = (doc: string): string => {
  const clean = doc.replace(/\D/g, '');
  if (clean.length === 11) {
    // CPF: 000.000.000-00
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else if (clean.length === 14) {
    // CNPJ: 00.000.000/0000-00
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return doc;
};

export const formatPhone = (phone: string): string => {
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 11) {
    return clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (clean.length === 10) {
    return clean.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return phone;
};

export const getHoursSinceCompletion = (completedAt?: string): number => {
  if (!completedAt) return 0;
  const comp = new Date(completedAt).getTime();
  const now = new Date().getTime();
  const diffHours = (now - comp) / (1000 * 60 * 60);
  return Math.max(0, Math.floor(diffHours));
};

export const generateWhatsAppBillingMessage = (
  clientName: string,
  osNumber: string,
  title: string,
  totalAmount: number,
  companyName: string,
  pixKey?: string,
  dueDate?: string
): string => {
  const formattedVal = formatCurrency(totalAmount);
  const formattedDue = dueDate ? formatDate(dueDate) : 'Conforme acordado';
  
  let msg = `Olá *${clientName}*! Tudo bem?\n\n`;
  msg += `Aqui é da *${companyName}*. Segue o resumo do serviço/locação finalizado com sucesso:\n\n`;
  msg += `📋 *OS:* ${osNumber}\n`;
  msg += `🔧 *Serviço/Equipamento:* ${title}\n`;
  msg += `💰 *Valor Total:* ${formattedVal}\n`;
  msg += `📅 *Vencimento:* ${formattedDue}\n\n`;
  
  if (pixKey) {
    msg += `🔑 *Chave PIX para pagamento:* \`${pixKey}\`\n\n`;
  }
  
  msg += `A Ordem de Serviço foi devidamente assinada no campo e o comprovante digital já está emitido.\n`;
  msg += `Caso precise de nota fiscal ou detalhamento adicional, estamos à inteira disposição!`;
  
  return encodeURIComponent(msg);
};

export const formatMinutesToHours = (totalMinutes: number): string => {
  if (!totalMinutes || isNaN(totalMinutes) || totalMinutes <= 0) return '0h 00m';
  const h = Math.floor(totalMinutes / 60);
  const m = Math.floor(totalMinutes % 60);
  return `${h}h ${m < 10 ? '0' : ''}${m}m`;
};

export const generateOSShareWhatsApp = (
  osNumber: string,
  clientName: string,
  title: string,
  technicianName: string,
  totalAmount: number,
  companyName: string
): string => {
  let msg = `*${companyName}* - Ordem de Serviço Digital\n\n`;
  msg += `📋 *OS Nº:* ${osNumber}\n`;
  msg += `👤 *Cliente:* ${clientName}\n`;
  msg += `🛠️ *Atividade:* ${title}\n`;
  msg += `👷 *Técnico Resp.:* ${technicianName}\n`;
  msg += `💵 *Total:* ${formatCurrency(totalAmount)}\n\n`;
  msg += `Acesse o sistema para visualizar o canhoto digital com fotos e assinatura.`;
  return encodeURIComponent(msg);
};
