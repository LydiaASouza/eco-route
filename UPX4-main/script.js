// ========================
// ELEMENTOS DOM
// ========================
const distanciaInput = document.getElementById("distancia");
const kmValue = document.getElementById("kmValue");

console.log ("primeiro");
let graficoTempo, graficoCusto, graficoCO2;


// ========================
// EVENTOS
// ========================
distanciaInput.oninput = () => {
  kmValue.innerText = distanciaInput.value;
};


// ========================
// CÁLCULOS
// ========================
function calcular(d, t) {
  return {
    carro: {
      tempo: t,
      custo: d * 0.75,
      co2: d * 0.21
    },
    onibus: {
      tempo: (d / 18) * 60,
      custo: 4.40,
      co2: d * 0.08
    },
    bike: {
      tempo: (d / 15) * 60,
      custo: 0,
      co2: 0
    },
    caminhada: {
      tempo: (d / 5) * 60,
      custo: 0,
      co2: 0
    }
  };
}

function formatarTempo(min) {
  if (min >= 60) {
    let h = Math.floor(min / 60);
    let m = Math.round(min % 60);
    return `${h}h ${m}min`;
  }
  return `${Math.round(min)} min`;
}


// ========================
// UI (CARDS)
// ========================
function criarCard(nome, dados, destaque="") {
  return `
    <div class="card ${destaque}">
      <h3>${nome}</h3>
      <div class="info">⏱ Tempo: ${formatarTempo(dados.tempo)}</div>
      <div class="info">💰 Custo: R$ ${dados.custo.toFixed(2)}</div>
      <div class="info">🌱 CO₂: ${dados.co2.toFixed(2)} kg</div>
    </div>
  `;
}


// ========================
// GRÁFICOS
// ========================
function gerarGraficos(r) {
  const labels = ["Carro", "Ônibus", "Bicicleta", "Caminhada"];

  const tempo = [r.carro.tempo, r.onibus.tempo, r.bike.tempo, r.caminhada.tempo];
  const custo = [r.carro.custo, r.onibus.custo, r.bike.custo, r.caminhada.custo];
  const co2 = [r.carro.co2, r.onibus.co2, r.bike.co2, r.caminhada.co2];

  if (graficoTempo) graficoTempo.destroy();
  if (graficoCusto) graficoCusto.destroy();
  if (graficoCO2) graficoCO2.destroy();

  graficoTempo = new Chart(document.getElementById("graficoTempo"), {
    type: "bar",
    data: { labels, datasets: [{ data: tempo }] },
    options: { indexAxis: 'y' }
  });

  graficoCusto = new Chart(document.getElementById("graficoCusto"), {
    type: "bar",
    data: { labels, datasets: [{ data: custo }] },
    options: { indexAxis: 'y' }
  });

  graficoCO2 = new Chart(document.getElementById("graficoCO2"), {
    type: "bar",
    data: { labels, datasets: [{ data: co2 }] },
    options: { indexAxis: 'y' }
  });
}


// ========================
// SIMULAÇÃO
// ========================
function simular(distancia, tempoMin) {
  const r = calcular(distancia, tempoMin);

  let maisRapido = Object.keys(r).reduce((a, b) => r[a].tempo < r[b].tempo ? a : b);
  let maisBarato = Object.keys(r).reduce((a, b) => r[a].custo < r[b].custo ? a : b);
  let maisVerde = Object.keys(r).reduce((a, b) => r[a].co2 < r[b].co2 ? a : b);

  let html = "";

  html += criarCard("🚗 Carro", r.carro, maisRapido==="carro" ? "destaque" : "");
  html += criarCard("🚌 Ônibus", r.onibus, maisRapido==="onibus" ? "destaque" : "");
  html += criarCard("🚴 Bicicleta", r.bike, maisBarato==="bike" ? "destaque" : "");
  html += criarCard("🚶 Caminhada", r.caminhada, maisVerde==="caminhada" ? "destaque" : "");

  document.getElementById("resultados").innerHTML = html;

  gerarGraficos(r);
}


// ========================
// MAPA + ROTA
// ========================
let map;
let origem = null;
let destino = null;
let rotaControl = null;
let markerOrigem = null;
let markerDestino = null;

document.addEventListener("DOMContentLoaded", function () {
  map = L.map('map').setView([-23.5505, -46.6333], 13);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
  
  //Evento de clique
  map.on('click', function(e) {

    //Primeiro clique -> Origem
    if (!origem) {
      origem = e.latlng;

      L.maker(origem).addTo(map)
      .binfPopup("Origem")
      .openPopup();

    //Segundo clique -> Destino
    } else if (!destino) {
      destino = e.latlng;

      desenharRota();

    //Terceiro clique -> reset
    } else {
      limparMapa();

      origem = e.latlng;
      destino = null;

      L.marker(origem).addTo(map)
      .bindPopup("Origem")
      .openPopup();
    }
  });
});

function desenharRota () {
  if (rotaControl) {
    map.removeControl(rotaControl);
  }

  rotaControl = L.Routing.control({
    waypoints: [
      L.latLng(origem.lat, origem.lng),
      L.latLng(destino.lat, destino.lng)
    ],
    routeWhileDragging: false
  }).addTo(map);

  rotaControl.on('routesfound', function(e) {
    const rota = e.routes[0];

    const distanciaKm = rota.summary.totalDistance / 1000;
    const tempoMin = rota.summary.totalTime / 60;

    console.log("Distância:", distanciaKm);
    console.log("Tempo:", tempoMin);
  });
}

function limparMapa() {
  map.eachLayer(layer => {
    if (layer instanceof L.Maker || layer instanceof L.Polyline) {
    }
  });

  if (rotaControl) {
    map.removeControl(rotaControl);
  }
}

async function buscarCoordenadas(endereco) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(endereco)}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!data || data.length === 0) {
    alert("Endereço não encontrado!");
    return null;
  }

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    nome: data[0].display_name
  };
}

async function buscarRota() {
  const origemTexto = document.getElementById("origemInput").value;
  const destinoTexto = document.getElementById("destinoInput").value;

  if (!origemTexto || !destinoTexto) {
    alert("Preencha origem e destino!");
    return;
  }

  const origemCoord = await buscarCoordenadas(origemTexto);
  const destinoCoord = await buscarCoordenadas(destinoTexto);

  if (!origemCoord || !destinoCoord) return;

  desenharRotaManual(origemCoord, destinoCoord);
}

function desenharRotaManual(origem, destino) {

  // remove rota antiga
  if (rotaControl) {
    map.removeControl(rotaControl);
  }

  // remove marcadores antigos
  if (markerOrigem) map.removeLayer(markerOrigem);
  if (markerDestino) map.removeLayer(markerDestino);

  // cria novos marcadores
  markerOrigem = L.marker([origem.lat, origem.lng])
    .addTo(map)
    .bindPopup("Origem")
    .openPopup();

  markerDestino = L.marker([destino.lat, destino.lng])
    .addTo(map)
    .bindPopup("Destino");

  // cria rota
  rotaControl = L.Routing.control({
    waypoints: [
      L.latLng(origem.lat, origem.lng),
      L.latLng(destino.lat, destino.lng)
    ],
    routeWhileDragging: false
  }).addTo(map);

  rotaControl.on('routesfound', function(e) {
    const rota = e.routes[0];

    const distanciaKm = rota.summary.totalDistance / 1000;
    const tempoMin = rota.summary.totalTime / 60;
    simular(distanciaKm, tempoMin);

    console.log("Rota", rota.summary);
  });

  // centraliza no mapa
  map.setView([origem.lat, origem.lng], 13);
}

function simularLogin(nomeUsuario) {
    // Salva o usuário no navegador
    localStorage.setItem('usuarioAtivo', nomeUsuario);
    atualizarInterface();
}

function verificarSessao() {
    const usuario = localStorage.getItem('usuarioAtivo');
    if (usuario) {
        console.log(`Bem-vindo de volta, ${usuario}`);
        // Esconder formulário de login e mostrar o simulador
    }
}

function fazerLogout() {
    localStorage.removeItem('usuarioAtivo');
    // Voltar para a tela de login
}

function salvarSimulacao(origem, destino, resultados) {
    // Puxa o histórico atual ou cria um array vazio se não existir
    let historico = JSON.parse(localStorage.getItem('historicoSimulacoes')) || [];
    
    // Cria o novo registro
    const novaSimulacao = {
        data: new Date().toLocaleDateString(),
        origem,
        destino,
        ...resultados
    };
    
    // Adiciona ao início do array e salva novamente
    historico.unshift(novaSimulacao);
    localStorage.setItem('historicoSimulacoes', JSON.stringify(historico));
}

function carregarHistorico() {
    const historico = JSON.parse(localStorage.getItem('historicoSimulacoes')) || [];
    // Aqui você iteraria sobre o 'historico' para popular uma <table> ou <ul> no HTML
    console.log(historico);
}