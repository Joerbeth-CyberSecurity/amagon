// ===== API CLIENT =====
const API_BASE = '/api';

async function searchPatients(searchTerm) {
  const response = await fetch(`${API_BASE}/patients/search?q=${encodeURIComponent(searchTerm)}`);
  if (!response.ok) throw new Error('Erro ao buscar pacientes');
  return await response.json();
}

async function getPatient(id) {
  const response = await fetch(`${API_BASE}/patients/${id}`);
  if (!response.ok) throw new Error('Erro ao buscar paciente');
  return await response.json();
}

async function getAppointments(id) {
  const response = await fetch(`${API_BASE}/patients/${id}/appointments`);
  if (!response.ok) throw new Error('Erro ao buscar agendamentos');
  return await response.json();
}

async function getClinicalData(id) {
  const response = await fetch(`${API_BASE}/patients/${id}/clinical`);
  if (!response.ok) throw new Error('Erro ao buscar dados clínicos');
  return await response.json();
}

async function getFinancialData(id) {
  const response = await fetch(`${API_BASE}/patients/${id}/financial`);
  if (!response.ok) throw new Error('Erro ao buscar dados financeiros');
  return await response.json();
}

async function getClinicalTeam(id) {
  const response = await fetch(`${API_BASE}/patients/${id}/clinical-team`);
  if (!response.ok) throw new Error('Erro ao buscar corpo clínico');
  return await response.json();
}

async function getAnamnese(id) {
  const response = await fetch(`${API_BASE}/patients/${id}/anamnese`);
  if (!response.ok) throw new Error('Erro ao buscar anamnese');
  return await response.json();
}

async function getImages(id) {
  const response = await fetch(`${API_BASE}/patients/${id}/images`);
  if (!response.ok) throw new Error('Erro ao buscar imagens');
  return await response.json();
}

async function getOrcamentoImages(id) {
  const response = await fetch(`${API_BASE}/patients/${id}/orcamento-images`);
  if (!response.ok) throw new Error('Erro ao buscar imagens de orçamentos');
  return await response.json();
}

async function getOrthodontics(id) {
  const response = await fetch(`${API_BASE}/patients/${id}/orthodontics`);
  if (!response.ok) throw new Error('Erro ao buscar orçamentos ortodônticos');
  return await response.json();
}

// ===== ESTADO DA APLICAÇÃO =====
let currentPatient = null;

// ===== ELEMENTOS DO DOM =====
const searchScreen = document.getElementById('search-screen');
const patientScreen = document.getElementById('patient-screen');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const searchResults = document.getElementById('search-results');
const resultsList = document.getElementById('results-list');
const loading = document.getElementById('loading');
const backBtn = document.getElementById('back-btn');
const patientNameHeader = document.getElementById('patient-name');
const patientDataContainer = document.getElementById('patient-data');
const appointmentsContainer = document.getElementById('appointments-data');
const clinicalTeamContainer = document.getElementById('clinical-team-data');
const clinicalContainer = document.getElementById('clinical-data');
const financialContainer = document.getElementById('financial-data');
const anamneseContainer = document.getElementById('anamnese-data');
const orthodonticsContainer = document.getElementById('orthodontics-data');
const imagesContainer = document.getElementById('images-data');

// ===== FUNÇÕES DE UI =====
function showLoading() {
  loading.classList.remove('hidden');
  searchResults.classList.add('hidden');
}

function hideLoading() {
  loading.classList.add('hidden');
}

function showSearchScreen() {
  searchScreen.classList.remove('hidden');
  patientScreen.classList.add('hidden');
  searchInput.value = '';
  searchResults.classList.add('hidden');
}

function showPatientScreen() {
  searchScreen.classList.add('hidden');
  patientScreen.classList.remove('hidden');
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR');
}

function formatCurrency(value) {
  if (!value) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// ===== BUSCA DE PACIENTES =====
async function performSearch() {
  const searchTerm = searchInput.value.trim();
  
  if (searchTerm.length < 2) {
    alert('Digite pelo menos 2 caracteres para buscar');
    return;
  }
  
  showLoading();
  
  try {
    const patients = await searchPatients(searchTerm);
    displaySearchResults(patients);
  } catch (error) {
    alert('Erro ao buscar pacientes: ' + error.message);
    hideLoading();
  }
}

function displaySearchResults(patients) {
  hideLoading();
  searchResults.classList.remove('hidden');
  
  if (patients.length === 0) {
    resultsList.innerHTML = '<p class="no-results">Nenhum paciente encontrado</p>';
    return;
  }
  
  resultsList.innerHTML = patients.map(patient => `
    <div class="patient-card" data-id="${patient.IDPESSOA}">
      <div class="patient-info">
        <h3>${patient.NOMEPESSOA || 'Sem nome'}</h3>
        <p><strong>CPF:</strong> ${patient.CPF || '-'}</p>
        <p><strong>Data Nasc:</strong> ${formatDate(patient.DTNASC)}</p>
        <p><strong>Telefone:</strong> ${patient.TELEFONE || patient.CELULAR || '-'}</p>
        <p><strong>Email:</strong> ${patient.EMAIL || '-'}</p>
      </div>
      <button class="view-btn" onclick="viewPatient(${patient.IDPESSOA})">
        Ver Detalhes →
      </button>
    </div>
  `).join('');
}

// ===== VISUALIZAÇÃO DO PACIENTE =====
async function viewPatient(idPessoa) {
  showLoading();
  
  try {
    const patientPromise = getPatient(idPessoa);
    
    const [patient, appointments, clinical, financial, clinicalTeam, anamnese, images, orcamentoImages, orthodontics] = await Promise.all([
      patientPromise,
      getAppointments(idPessoa),
      getClinicalData(idPessoa),
      getFinancialData(idPessoa),
      getClinicalTeam(idPessoa),
      getAnamnese(idPessoa).catch(() => null),
      getImages(idPessoa).catch(() => []),
      getOrcamentoImages(idPessoa).catch(() => []),
      getOrthodontics(idPessoa).catch(() => [])
    ]);

    currentPatient = patient;
    patientNameHeader.textContent = currentPatient.NOMEPESSOA || 'Paciente';
    
    displayCadastroSection();
    displayAgendaSection(appointments);
    displayCorpoClinicoSection(clinicalTeam);
    displayClinicoSection(clinical);
    displayFinanceiroSection(financial);
    displayAnamneseSection(anamnese);
    displayOrthodonticsSection(orthodontics);
    displayImagesSection(images, orcamentoImages);
    
    showPatientScreen();
    hideLoading();
    
  } catch (error) {
    alert('Erro ao carregar dados do paciente: ' + error.message);
    hideLoading();
  }
}

function displayCadastroSection() {
  patientDataContainer.innerHTML = `
    <div class="data-section">
      <h3>Dados Pessoais</h3>
      <div class="data-grid">
        <div class="data-item">
          <label>Nome:</label>
          <span>${currentPatient.NOMEPESSOA || '-'}</span>
        </div>
        <div class="data-item">
          <label>CPF:</label>
          <span>${currentPatient.CPF || '-'}</span>
        </div>
        <div class="data-item">
          <label>Data de Nascimento:</label>
          <span>${formatDate(currentPatient.DTNASC)}</span>
        </div>
        <div class="data-item">
          <label>Telefone:</label>
          <span>${currentPatient.TELEFONE || '-'}</span>
        </div>
        <div class="data-item">
          <label>Celular:</label>
          <span>${currentPatient.CELULAR || '-'}</span>
        </div>
        <div class="data-item">
          <label>Email:</label>
          <span>${currentPatient.EMAIL || '-'}</span>
        </div>
      </div>
    </div>
  `;
}

function displayAgendaSection(appointments) {
  if (!appointments || appointments.length === 0) {
    appointmentsContainer.innerHTML = '<p class="no-data">Nenhum agendamento encontrado</p>';
    return;
  }

  appointmentsContainer.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Data</th>
          <th>Hora</th>
          <th>Dentista</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${appointments.map(apt => `
          <tr>
            <td>${formatDate(apt.DTMARCACAO)}</td>
            <td>${apt.HRMARCACAO || '-'}</td>
            <td>${apt.NOME_DENTISTA || '-'}</td>
            <td>${apt.STATUS || '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function displayCorpoClinicoSection(team) {
  if (!team || team.length === 0) {
    clinicalTeamContainer.innerHTML = '<p class="no-data">Nenhum profissional associado</p>';
    return;
  }

  clinicalTeamContainer.innerHTML = `
    <div class="clinical-team-grid">
      ${team.map(member => `
        <div class="clinical-team-card">
          <h3>${member.NOME_DENTISTA || 'Profissional'}</h3>
          <p><strong>CRO:</strong> ${member.CRO || '-'}</p>
          <p><strong>Sigla:</strong> ${member.SIGLA || '-'}</p>
        </div>
      `).join('')}
    </div>
  `;
}

function displayClinicoSection(clinical) {
  if (!clinical || clinical.length === 0) {
    clinicalContainer.innerHTML = '<p class="no-data">Nenhum dado clínico encontrado</p>';
    return;
  }
  
  clinicalContainer.innerHTML = clinical.map(orc => {
    const tipoContrato = orc.TPREGISTRO === 0 ? 'Clínico' : orc.TPREGISTRO === 1 ? 'Ortodôntico' : 'Mensal';
    
    return `
      <div class="clinical-item">
        <h3>Orçamento #${orc.IDORCAMENTO} - ${tipoContrato}</h3>
        <p><strong>Data:</strong> ${formatDate(orc.DTORCAMENTO)}</p>
        <p><strong>Dentista:</strong> ${orc.NOME_DENTISTA || '-'}</p>
        <p><strong>Valor Total:</strong> ${formatCurrency(orc.VALORTOTAL)}</p>
        
        ${orc.ITENS && orc.ITENS.length > 0 ? `
          <h4>Procedimentos:</h4>
          <table class="data-table">
            <thead>
              <tr>
                <th>Proc</th>
                <th>Descrição</th>
                <th>Quantidade</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              ${orc.ITENS.map(item => `
                <tr>
                  <td>${item.ITEM || '-'}</td>
                  <td>${item.NOME_PROCEDIMENTO || '-'}</td>
                  <td>${item.QUANTIDADE || 1}</td>
                  <td>${formatCurrency(item.VALOR)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}
      </div>
    `;
  }).join('');
}

function displayFinanceiroSection(financial) {
  if (!financial) {
    financialContainer.innerHTML = '<p class="no-data">Dados financeiros não disponíveis</p>';
    return;
  }

  financialContainer.innerHTML = `
    <div class="data-section">
      <h3>Contas a Receber</h3>
      ${financial.lancamentos.length === 0 ? '<p class="no-data">Nenhum lançamento encontrado</p>' : `
        <table class="data-table">
          <thead>
            <tr>
              <th>Vencimento</th>
              <th>Valor</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${financial.lancamentos.slice(0, 10).map(lanc => `
              <tr>
                <td>${formatDate(lanc.DTVENCIMENTO)}</td>
                <td>${formatCurrency(lanc.VALORLANCAMENTO)}</td>
                <td>${lanc.STATUS || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}
    </div>
    
    <div class="data-section">
      <h3>Recebimentos</h3>
      ${financial.movimentacoes.length === 0 ? '<p class="no-data">Nenhuma movimentação encontrada</p>' : `
        <table class="data-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Valor</th>
              <th>Tipo</th>
            </tr>
          </thead>
          <tbody>
            ${financial.movimentacoes.slice(0, 10).map(mov => `
              <tr>
                <td>${formatDate(mov.DTMOVIMENTO)}</td>
                <td>${formatCurrency(mov.VALORMOVIMENTO)}</td>
                <td>${mov.ISCREDITO ? 'Crédito' : 'Débito'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}
    </div>
  `;
}

function displayAnamneseSection(anamnese) {
  if (!anamnese) {
    anamneseContainer.innerHTML = '<p class="no-data">Nenhum dado de anamnese encontrado</p>';
    return;
  }

  const hasData = anamnese.QUEIXA || anamnese.SOFREDOENCA || anamnese.ALERGIA || 
                  anamnese.MEDICOASSIST || anamnese.OBSERVACOES;

  if (!hasData) {
    anamneseContainer.innerHTML = '<p class="no-data">Nenhum dado de anamnese preenchido</p>';
    return;
  }

  anamneseContainer.innerHTML = `
    <div class="data-section">
      <div class="data-grid">
        ${anamnese.QUEIXA ? `
          <div class="data-item">
            <label>Queixa Principal:</label>
            <span>${anamnese.QUEIXA}</span>
          </div>
        ` : ''}
        ${anamnese.SOFREDOENCA ? `
          <div class="data-item">
            <label>Sofre de Doença:</label>
            <span>${anamnese.SOFREDOENCA === 1 ? 'Sim' : 'Não'}</span>
          </div>
        ` : ''}
        ${anamnese.QUALDOENCA ? `
          <div class="data-item">
            <label>Qual Doença:</label>
            <span>${anamnese.QUALDOENCA}</span>
          </div>
        ` : ''}
        ${anamnese.ALERGIA ? `
          <div class="data-item">
            <label>Tem Alergia:</label>
            <span>${anamnese.ALERGIA === 1 ? 'Sim' : 'Não'}</span>
          </div>
        ` : ''}
        ${anamnese.QUALALERGIA ? `
          <div class="data-item">
            <label>Qual Alergia:</label>
            <span>${anamnese.QUALALERGIA}</span>
          </div>
        ` : ''}
        ${anamnese.MEDICOASSIST ? `
          <div class="data-item">
            <label>Médico Assistente:</label>
            <span>${anamnese.MEDICOASSIST === 1 ? 'Sim' : 'Não'}</span>
          </div>
        ` : ''}
        ${anamnese.DOENCASEXUAL ? `
          <div class="data-item">
            <label>Doença Sexual:</label>
            <span>${anamnese.DOENCASEXUAL === 1 ? 'Sim' : 'Não'}</span>
          </div>
        ` : ''}
        ${anamnese.QUALDOENCASEXUAL ? `
          <div class="data-item">
            <label>Qual Doença Sexual:</label>
            <span>${anamnese.QUALDOENCASEXUAL}</span>
          </div>
        ` : ''}
        ${anamnese.OBSERVACOES ? `
          <div class="data-item" style="grid-column: 1 / -1;">
            <label>Observações:</label>
            <span>${anamnese.OBSERVACOES}</span>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function displayOrthodonticsSection(orthodontics) {
  if (!orthodontics || orthodontics.length === 0) {
    orthodonticsContainer.innerHTML = '<p class="no-data">Nenhum orçamento ortodôntico encontrado</p>';
    return;
  }
  
  orthodonticsContainer.innerHTML = orthodontics.map(orc => {
    return `
      <div class="clinical-item">
        <h3>Orçamento Ortodôntico #${orc.IDORCAMENTO}</h3>
        <p><strong>Data:</strong> ${formatDate(orc.DTORCAMENTO)}</p>
        <p><strong>Dentista:</strong> ${orc.NOME_DENTISTA || '-'}</p>
        <p><strong>Data Início:</strong> ${formatDate(orc.DTINICIO)}</p>
        <p><strong>Parcelas:</strong> ${orc.NUMPARCELAS || '-'}</p>
        <p><strong>Valor Total:</strong> ${formatCurrency(orc.VALORTOTAL)}</p>
        
        ${orc.ITENS && orc.ITENS.length > 0 ? `
          <h4>Procedimentos:</h4>
          <table class="data-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Descrição</th>
                <th>Quantidade</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              ${orc.ITENS.map(item => `
                <tr>
                  <td>${item.ITEM || '-'}</td>
                  <td>${item.NOME_PROCEDIMENTO || '-'}</td>
                  <td>${item.QUANTIDADE || 1}</td>
                  <td>${formatCurrency(item.VALOR)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}
      </div>
    `;
  }).join('');
}

function displayImagesSection(images, orcamentoImages = []) {
  const hasImages = images && images.length > 0;
  const hasOrcamentoImages = orcamentoImages && orcamentoImages.length > 0;
  
  if (!hasImages && !hasOrcamentoImages) {
    imagesContainer.innerHTML = '<p class="no-data">Nenhuma imagem encontrada</p>';
    return;
  }

  let html = '';

  // Imagens gerais do paciente
  if (hasImages) {
    html += `
      <div class="data-section">
        <h3>Raios-X / Imagens do Paciente</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Dentista</th>
              <th>Histórico</th>
              <th>Dente</th>
              <th>Face</th>
              <th>Caminho</th>
            </tr>
          </thead>
          <tbody>
            ${images.map(img => `
              <tr>
                <td>${formatDate(img.DATA)}</td>
                <td>${img.NOME_DENTISTA || '-'}</td>
                <td>${img.HISTORICO || '-'}</td>
                <td>${img.IDDENTE || '-'}</td>
                <td>${img.IDFACE || '-'}</td>
                <td>${img.PATHIMAGEM ? `<a href="${img.PATHIMAGEM}" target="_blank">Ver imagem</a>` : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // Imagens de orçamentos
  if (hasOrcamentoImages) {
    html += `
      <div class="data-section">
        <h3>Imagens de Orçamentos</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Orçamento</th>
              <th>Dentista</th>
              <th>Histórico</th>
              <th>Dente</th>
              <th>Face</th>
              <th>Caminho</th>
            </tr>
          </thead>
          <tbody>
            ${orcamentoImages.map(img => `
              <tr>
                <td>${formatDate(img.DATA)}</td>
                <td>#${img.IDORCAMENTO} (${formatDate(img.DTORCAMENTO)})</td>
                <td>${img.NOME_DENTISTA || '-'}</td>
                <td>${img.HISTORICO || '-'}</td>
                <td>${img.IDDENTE || '-'}</td>
                <td>${img.IDFACE || '-'}</td>
                <td>${img.PATHIMAGEM ? `<a href="${img.PATHIMAGEM}" target="_blank">Ver imagem</a>` : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  imagesContainer.innerHTML = html;
}

// ===== EVENT LISTENERS =====
searchBtn.addEventListener('click', performSearch);
searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') performSearch();
});
backBtn.addEventListener('click', showSearchScreen);

// Torna viewPatient global para os botões inline
window.viewPatient = viewPatient;

console.log('✅ Sistema carregado');
