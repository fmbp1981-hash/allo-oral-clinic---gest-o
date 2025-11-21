
// Declaração de tipos para as bibliotecas carregadas via CDN (window)
declare global {
  interface Window {
    XLSX: any;
    jspdf: any;
  }
}

// Mapeamento de nomes de colunas para ficar amigável ao usuário
const HEADERS_MAP: Record<string, string> = {
  id: 'ID Sistema',
  name: 'Nome do Paciente',
  phone: 'Telefone',
  status: 'Status Atual',
  keywordFound: 'Motivo / Tag',
  lastContact: 'Último Contato',
  createdAt: 'Data de Criação',
  history: 'Histórico Clínico',
  lastVisit: 'Última Visita',
  patientId: 'ID Paciente'
};

// Função auxiliar para formatar os dados antes de exportar
const formatData = (data: any[]) => {
  return data.map(row => {
    const newRow: Record<string, any> = {};
    
    Object.keys(row).forEach(key => {
      let val = row[key];
      const header = HEADERS_MAP[key] || key;

      // Tratamento de Arrays (ex: tags de histórico)
      if (Array.isArray(val)) {
        val = val.join(', ');
      }
      
      // Tratamento de Datas
      if (key === 'createdAt' || key === 'lastContact' || key === 'lastVisit') {
        if (val) {
          try {
            val = new Date(val).toLocaleDateString('pt-BR');
          } catch (e) { /* ignorar erro de data */ }
        } else {
          val = '-';
        }
      }
      
      // Traduz status se for o campo status
      if (key === 'status') {
        const statusMap: Record<string, string> = {
          'NEW': 'Novo',
          'SENT': 'Contatado',
          'RESPONDED': 'Respondeu',
          'SCHEDULED': 'Agendado',
          'ARCHIVED': 'Arquivado'
        };
        val = statusMap[val] || val;
      }

      newRow[header] = val === null || val === undefined ? '' : val;
    });
    return newRow;
  });
};

export const exportToCSV = (data: any[], filename: string) => {
  if (!data.length) return;
  const formatted = formatData(data);
  
  const worksheet = window.XLSX.utils.json_to_sheet(formatted);
  const csv = window.XLSX.utils.sheet_to_csv(worksheet);
  
  const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToExcel = (data: any[], filename: string) => {
  if (!data.length || !window.XLSX) {
    alert("Biblioteca Excel não carregada ou sem dados.");
    return;
  }

  const formatted = formatData(data);
  
  // Cria Workbook e Worksheet
  const wb = window.XLSX.utils.book_new();
  const ws = window.XLSX.utils.json_to_sheet(formatted);

  // Ajusta largura das colunas automaticamente
  const colWidths = Object.keys(formatted[0] || {}).map(key => ({ wch: 20 }));
  ws['!cols'] = colWidths;

  window.XLSX.utils.book_append_sheet(wb, ws, "Dados");
  
  // Gera arquivo .xlsx
  window.XLSX.writeFile(wb, `${filename}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`);
};

export const exportToPDF = (data: any[], filename: string, title: string) => {
  if (!data.length || !window.jspdf) {
    alert("Biblioteca PDF não carregada ou sem dados.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape' });

  const formatted = formatData(data);
  const headers = Object.keys(formatted[0] || {});
  const rows = formatted.map(obj => Object.values(obj));

  // Título
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 30);

  // Tabela
  doc.autoTable({
    head: [headers],
    body: rows,
    startY: 40,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [66, 135, 245] }, // Azul
    alternateRowStyles: { fillColor: [245, 245, 245] }
  });

  doc.save(`${filename}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`);
};
