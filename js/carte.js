// Initialisation de la carte
var map = L.map('map').setView([49.2, 0.5], 8); // Centre approximatif de la Normandie

// Design de la carte
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '© OpenStreetMap'
}).addTo(map);

fetch("json/normandie.json")
  .then(r => r.json())
  .then(geojson => {
    L.geoJSON(geojson).addTo(map);
});


document.getElementById('indicateur').addEventListener('change', function() {
    const fichier = this.value;
    chargerJson(fichier);
    setBoxInfo()
});

function chargerJson(fichier)
{
  console.log(fichier);
}
