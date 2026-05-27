// =====================================
// ABAS
// =====================================

const tabButtons = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

tabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    tabButtons.forEach(b => b.classList.remove("active"));
    tabContents.forEach(c => c.classList.remove("active"));

    btn.classList.add("active");

    const tabId = btn.dataset.tab;
    document.getElementById(tabId).classList.add("active");

    // Corrige tamanho do mapa ao mudar de aba
    if(tabId === "mapa"){
      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    }
  });
});

// =====================================
// MAPA
// =====================================

const map = L.map("map").setView([-23.55052, -46.633308], 8);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

let routingControl = null;

// =====================================
// BUSCAR ROTA
// =====================================

async function buscarRota(){
  const origem = document.getElementById("origemInput").value;
  const destino = document.getElementById("destinoInput").value;

  if(!origem || !destino){
    alert("Preencha origem e destino");
    return;
  }

  try {
    // GEOCODIFICAÇÃO
    const origemGeo = await buscarCoordenadas(origem);
    const destinoGeo = await buscarCoordenadas(destino);

    // LIMPA ROTA ANTERIOR
    if(routingControl){
      map.removeControl(routingControl);
    }

    // NOVA ROTA
    routingControl = L.Routing.control({
      waypoints: [
        L.latLng(origemGeo.lat, origemGeo.lon),
        L.latLng(destinoGeo.lat, destinoGeo.lon)
      ],
      routeWhileDragging: false,
      lineOptions: {
        styles: [{color: '#111', opacity: 0.8, weight: 4}] // Linha do mapa escura e moderna
      }
    }).addTo(map);

    // QUANDO ROTA CARREGAR
    routingControl.on("routesfound", function(e){
      const route = e.routes[0];
      
      const distanciaKm = (route.summary.totalDistance / 1000).toFixed(2);
      const tempoMin = Math.floor(route.summary.totalTime / 60);

      atualizarCards(distanciaKm, tempoMin);
      atualizarGraficos(distanciaKm);
      salvarHistorico(origem, destino, distanciaKm);
    });

  } catch(error) {
    console.error(error);
    alert("Erro ao buscar rota. Tente novamente em alguns segundos.");
  }
}

// =====================================
// BUSCAR COORDENADAS
// =====================================

async function buscarCoordenadas(local){
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${local}`,
    {
      headers: {
        "User-Agent": "Projeto_Academico_UPX4_Simulador_Mobilidade"
      }
    }
  );

  const data = await response.json();

  if(data.length === 0){
    throw new Error("Local não encontrado");
  }

  return data[0];
}

// =====================================
// CARDS
// =====================================

function atualizarCards(distanciaKm, tempoMin){
  // CARRO
  document.getElementById("tempoCarro").innerText = `${Math.floor(tempoMin / 60)}h ${tempoMin % 60}min`;
  document.getElementById("custoCarro").innerText = `R$ ${(distanciaKm * 0.75).toFixed(2)}`;
  document.getElementById("co2Carro").innerText = `${(distanciaKm * 0.21).toFixed(2)} kg`;

  // ÔNIBUS
  document.getElementById("tempoOnibus").innerText = `${Math.floor((tempoMin * 1.5) / 60)}h ${Math.floor((tempoMin * 1.5) % 60)}min`;
  document.getElementById("custoOnibus").innerText = `R$ 4.40`;
  document.getElementById("co2Onibus").innerText = `${(distanciaKm * 0.08).toFixed(2)} kg`;

  // BIKE
  document.getElementById("tempoBike").innerText = `${Math.floor(distanciaKm / 15)}h ${Math.floor(((distanciaKm / 15) % 1) * 60)}min`;
  document.getElementById("custoBike").innerText = `R$ 0.00`;
  document.getElementById("co2Bike").innerText = `0.00 kg`;

  // WALK
  document.getElementById("tempoWalk").innerText = `${Math.floor(distanciaKm / 5)}h ${Math.floor(((distanciaKm / 5) % 1) * 60)}min`;
  document.getElementById("custoWalk").innerText = `R$ 0.00`;
  document.getElementById("co2Walk").innerText = `0.00 kg`;

  // GAMIFICAÇÃO ESG: Regra de 3 (10kg de CO2 = 1 árvore)
  const emissaoCarro = distanciaKm * 0.21;
  const arvores = (emissaoCarro / 10).toFixed(1);
  document.getElementById("arvoresSalvas").innerText = arvores > 0 ? arvores : "--";
}

// =====================================
// GRÁFICOS (CORES ATUALIZADAS)
// =====================================

let chartTempo = null;
let chartCO2 = null;
let chartCusto = null;

// Configuração global da fonte dos gráficos para bater com a interface
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.color = '#555';

function atualizarGraficos(distanciaKm){
  if(chartTempo){ chartTempo.destroy(); }
  if(chartCO2){ chartCO2.destroy(); }
  if(chartCusto){ chartCusto.destroy(); }

  // TEMPO
  chartTempo = new Chart(
    document.getElementById("graficoTempo"),
    {
      type: "bar",
      data: {
        labels: ["Carro", "Ônibus", "Bike", "Caminhada"],
        datasets: [{
          label: "Tempo (horas estimadas)",
          data: [
            distanciaKm / 60,
            distanciaKm / 40,
            distanciaKm / 15,
            distanciaKm / 5
          ],
          backgroundColor: '#111' 
        }]
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false, 
        borderRadius: 6 
      }
    }
  );

  // CO2
  chartCO2 = new Chart(
    document.getElementById("graficoCO2"),
    {
      type: "doughnut",
      data: {
        labels: ["Carro", "Ônibus", "Bike", "Caminhada"],
        datasets: [{
          data: [
            distanciaKm * 0.21,
            distanciaKm * 0.08,
            0,
            0
          ],
          backgroundColor: ['#111', '#888', '#a3d9b1', '#eaeaea'],
          borderWidth: 0
        }]
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false, 
        cutout: '75%' 
      }
    }
  );

  // CUSTO
  chartCusto = new Chart(
    document.getElementById("graficoCusto"),
    {
      type: "bar",
      data: {
        labels: ["Carro", "Ônibus", "Bike", "Caminhada"],
        datasets: [{
          label: "Custo (R$)",
          data: [
            distanciaKm * 0.75,
            4.40,
            0,
            0
          ],
          backgroundColor: '#a3d9b1' 
        }]
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false, 
        borderRadius: 6 
      }
    }
  );
}

// =====================================
// HISTÓRICO (COM FILTRO DE PERFIL)
// =====================================
let filtroUsuarioAtual = "Todos"; // Começa mostrando as buscas de todo mundo

function renderHistorico(){
  // Pegamos o wrapper inteiro para injetar os botões de filtro no topo
  const wrapper = document.querySelector(".history-wrapper");
  if(!wrapper) return;

  const historico = JSON.parse(localStorage.getItem("historicoRotas")) || [];
  
  // Descobre quem são todas as pessoas que já pesquisaram
  const usuariosUnicos = ["Todos", ...new Set(historico.map(h => h.usuario || "Visitante"))];

  // 1. Cria os botões de filtro
  let botoesHTML = `<div class="history-filters">`;
  usuariosUnicos.forEach(user => {
    const activeClass = user === filtroUsuarioAtual ? "active" : "";
    botoesHTML += `<button class="filter-btn ${activeClass}" onclick="filtrarHistorico('${user}')">${user}</button>`;
  });
  botoesHTML += `</div>`;

  // 2. Filtra a lista com base no botão clicado
  const listaFiltrada = filtroUsuarioAtual === "Todos" 
    ? historico 
    : historico.filter(h => (h.usuario || "Visitante") === filtroUsuarioAtual);

  // 3. Monta os cards do histórico
  let cardsHTML = `<div id="historico-lista">`;
  
  if(listaFiltrada.length === 0) {
    cardsHTML += `<p style="color: #888; font-size: 14px; text-align: center; margin-top: 20px;">Nenhuma rota salva para este perfil.</p>`;
  }

  listaFiltrada.reverse().forEach(item => {
    const nomeUser = item.usuario || "Visitante";
    cardsHTML += `
      <div class="history-card">
        <div class="history-title" style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
          <span style="display: flex; align-items: center; gap: 8px;">
            <i class="ph ph-map-pin" style="color: #555;"></i> ${item.origem} 
            <i class="ph ph-arrow-right" style="color: #ccc;"></i> 
            <i class="ph ph-flag-checkered" style="color: #555;"></i> ${item.destino}
          </span>
        </div>
        <div class="history-sub" style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px;">
          <span>Distância: ${item.distancia} km • ${item.data}</span>
          <span class="user-badge"><i class="ph-fill ph-user"></i> ${nomeUser}</span>
        </div>
      </div>
    `;
  });
  cardsHTML += `</div>`;

  wrapper.innerHTML = botoesHTML + cardsHTML;
}

// Função acionada quando clica no botão de filtro
window.filtrarHistorico = function(usuario) {
  filtroUsuarioAtual = usuario;
  renderHistorico();
}

function salvarHistorico(origem, destino, distancia){
  const historico = JSON.parse(localStorage.getItem("historicoRotas")) || [];
  
  // Resgata o nome de quem está logado no momento
  const usuarioLogado = localStorage.getItem("usuarioAtual") || "Visitante";

  historico.push({ 
    usuario: usuarioLogado,
    origem, 
    destino, 
    distancia, 
    data: new Date().toLocaleString() 
  });
  
  localStorage.setItem("historicoRotas", JSON.stringify(historico));
  renderHistorico();
}

renderHistorico();

// =====================================
// FLUXO DE LOGIN / SAIR
// =====================================

function entrarApp() {
  const nomeDigitado = document.getElementById("inputNomeUsuario").value.trim();
  const textoSaudacao = document.getElementById("nomeDisplay");

  // Define o nome e salva na memória local para o Histórico usar
  const usuarioFinal = nomeDigitado !== "" ? nomeDigitado : "Visitante";
  textoSaudacao.innerText = `Olá, ${usuarioFinal}`;
  localStorage.setItem("usuarioAtual", usuarioFinal);

  const welcomeScreen = document.getElementById("welcome-screen");
  if(welcomeScreen) welcomeScreen.classList.add("hidden");
  
  setTimeout(() => {
    map.invalidateSize();
  }, 300);
}

function sairApp() {
  // Recarrega a página instantaneamente para o estado zero
  window.location.reload();
}

// =====================================
// EVENTOS DE TECLADO (ENTER)
// =====================================

// Enter na tela de Boas-Vindas
document.getElementById("inputNomeUsuario").addEventListener("keypress", function(event) {
  if (event.key === "Enter") {
    event.preventDefault(); // Evita que a página recarregue do nada
    entrarApp();
  }
});

// Enter no campo de Origem
document.getElementById("origemInput").addEventListener("keypress", function(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    buscarRota();
  }
});

// Enter no campo de Destino
document.getElementById("destinoInput").addEventListener("keypress", function(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    buscarRota();
  }
});