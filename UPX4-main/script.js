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
          backgroundColor: '#111' // Preto elegante
        }]
      },
      options: { borderRadius: 6 }
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
      options: { cutout: '75%' }
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
          backgroundColor: '#a3d9b1' // Verde menta suave
        }]
      },
      options: { borderRadius: 6 }
    }
  );
}

// =====================================
// HISTÓRICO (ÍCONES ATUALIZADOS)
// =====================================

function renderHistorico(){
  const container = document.getElementById("historico-lista");
  const historico = JSON.parse(localStorage.getItem("historicoRotas")) || [];

  container.innerHTML = "";

  historico.reverse().forEach(item => {
    container.innerHTML += `
      <div class="history-card">
        <div class="history-title" style="display: flex; align-items: center; gap: 8px;">
          <i class="ph ph-map-pin" style="color: #555;"></i> ${item.origem} 
          <i class="ph ph-arrow-right" style="color: #ccc;"></i> 
          <i class="ph ph-flag-checkered" style="color: #555;"></i> ${item.destino}
        </div>
        <div class="history-sub">
          Distância: ${item.distancia} km • ${item.data}
        </div>
      </div>
    `;
  });
}

function salvarHistorico(origem, destino, distancia){
  const historico = JSON.parse(localStorage.getItem("historicoRotas")) || [];

  historico.push({
    origem,
    destino,
    distancia,
    data: new Date().toLocaleString()
  });

  localStorage.setItem("historicoRotas", JSON.stringify(historico));
  renderHistorico();
}

// Inicializa o histórico ao carregar a página
renderHistorico();

// =====================================
// FLUXO DE LOGIN / SAIR
// =====================================

function entrarApp() {
  // Esconde a tela de boas-vindas
  document.getElementById("welcome-screen").classList.add("hidden");
  
  // Recalcula o tamanho do mapa para evitar bugs visuais ao entrar
  setTimeout(() => {
    map.invalidateSize();
  }, 300);
}

function sairApp() {
  if(confirm("Deseja encerrar a sessão? O mapa será reiniciado.")) {
    // Recarrega a página para o estado zero (volta para a tela de boas-vindas)
    window.location.reload();
  }
}