// Initialisation de la carte
var map = L.map('map').setView([49.2, 0.5], 8); // Centre approximatif de la Normandie

// Design de la carte
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '© OpenStreetMap'
}).addTo(map);

var geojsonLayer = null;
fetch("json/normandie.json")
  .then(r => r.json())
  .then(geojson => {
    geojsonLayer = L.geoJSON(geojson, {
      onEachFeature: onEachFeature
    }).addTo(map);
});

//Fenêtre d'affichage des données
var info = L.control();

  info.onAdd = function (map) {
      this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
      this.update();
      return this._div;
  };

  // methode pour mettre à jour la fenêtre en utilisant les propriétes passées en paramètre
  info.update = function (props) {
    this._div.innerHTML = props
        ? `<strong>${props.nom}</strong><br>${props.valeur ?? "Aucune donnée"}`
        : "Survolez une commune";
  };

  info.addTo(map);

let dataIndicateurCourant = {};

document.getElementById('indicateur').addEventListener('change', function() {
    const fichier = this.value;
    chargerJson(fichier);
    
});

function onEachFeature(feature, layer) {

    layer.on({
        mouseover: function (e) {
            const props = e.target.feature.properties;

            const nom = props.nom || props.NOM || "Commune";
            const code = props.code || props.INSEE || props.CODE;

            // Récupérer la valeur de l’indicateur courant
            const valeur = dataIndicateurCourant[code];

            // Mise à jour du L.control()
            info.update({ nom, valeur });

            // Optionnel : highlight
            e.target.setStyle({
                weight: 2,
                color: "#000",
                fillOpacity: 0.8
            });
        },

        mouseout: function (e) {
            geojsonLayer.resetStyle(e.target);
            info.update(); // revient au placeholder
        }
    });
}


function chargerJson(fichier)
{

  fetch("json/" + fichier)
      .then(r => r.json())
      .then(data => {
          dataIndicateurCourant = data;
      });

}