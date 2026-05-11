let indicateurActif = false;
let classesGlobales = [];

//Palette de couleurs pour la légende
const palette = [
    "#eff3ff",
    "#bdd7e7",
    "#6baed6",
    "#3182bd",
    "#08519c"
];

const regions = {
    "01": { // Guadeloupe
        center: [16.25, -61.55],
        zoom: 10,
        bounds: [[15.8, -61.8], [16.6, -61.2]]
    },
    "02": { // Martinique
        center: [14.65, -61.0],
        zoom: 10,
        bounds: [[14.3, -61.3], [14.9, -60.7]]
    },
    "03": { // Guyane
        center: [4.5, -53.2],
        zoom: 6,
        bounds: [[2.1, -54.6], [6.0, -51.6]]
    },
    "04": { // La Réunion
        center: [-21.12, 55.53],
        zoom: 10,
        bounds: [[-21.4, 55.2], [-20.9, 55.8]]
    },
    "06": { // Mayotte
        center: [-12.82, 45.15],
        zoom: 11,
        bounds: [[-13.1, 44.9], [-12.6, 45.4]]
    },

    "11": { // Île-de-France
        center: [48.85, 2.35],
        zoom: 9,
        bounds: [[48.0, 1.5], [49.2, 3.4]]
    },
    "24": { // Centre-Val de Loire
        center: [47.8, 1.5],
        zoom: 8,
        bounds: [[46.5, -0.2], [48.6, 3.0]]
    },
    "27": { // Bourgogne-Franche-Comté
        center: [47.2, 5.3],
        zoom: 8,
        bounds: [[46.2, 3.0], [48.3, 7.6]]
    },
    "28": { // Normandie
        center: [49.2, 0.5],
        zoom: 8,
        bounds: [[48.2, -2.1], [50.0, 1.8]]
    },
    "32": { // Hauts-de-France
        center: [50.3, 2.8],
        zoom: 8,
        bounds: [[49.8, 1.4], [51.1, 4.3]]
    },
    "44": { // Grand Est
        center: [48.7, 6.2],
        zoom: 7,
        bounds: [[47.4, 4.2], [49.6, 8.4]]
    },
    "52": { // Pays de la Loire
        center: [47.4, -0.7],
        zoom: 8,
        bounds: [[46.5, -2.5], [48.6, 0.7]]
    },
    "53": { // Bretagne
        center: [48.2, -3.0],
        zoom: 8,
        bounds: [[47.3, -5.2], [48.9, -1.0]]
    },
    "75": { // Nouvelle-Aquitaine
        center: [45.5, 0.2],
        zoom: 7,
        bounds: [[43.5, -2.0], [47.4, 2.0]]
    },
    "76": { // Occitanie
        center: [43.8, 1.5],
        zoom: 7,
        bounds: [[41.3, -1.5], [45.3, 4.0]]
    },
    "84": { // Auvergne-Rhône-Alpes
        center: [45.5, 4.0],
        zoom: 7,
        bounds: [[44.0, 2.0], [46.8, 7.5]]
    },
    "93": { // Provence-Alpes-Côte d’Azur
        center: [43.8, 6.2],
        zoom: 8,
        bounds: [[42.9, 4.0], [44.4, 7.7]]
    },
    "94": { // Corse
        center: [42.15, 9.0],
        zoom: 9,
        bounds: [[41.3, 8.5], [43.0, 9.6]]
    }
};


// Initialisation de la carte
var map = L.map('map').setView([49.2, 0.5], 8); // Centre de la Normandie

// Design de la carte
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '© OpenStreetMap'
}).addTo(map);

L.control.resetView({
        position: "topleft",
        title: "Reset view",
        latlng: L.latLng([49.2, -0.5]),
        zoom: 8,
    }).addTo(map);

//Définit les frontières des communes de la Normandie par défaut
var geojsonLayer = null;
fetch("json/normandie.json")
  .then(r => r.json())
  .then(geojson => {
    geojsonLayer = L.geoJSON(geojson, {
      style: style,  // ✅ LIÉ au style dynamique
      onEachFeature: onEachFeature,
    }).addTo(map);
  });

let jsonFrance = null;

fetch("json/france-complete.json")
    .then(r => r.json())
    .then(data => {
        jsonFrance = data;
    });


//Infobox pour l'affichage des données
var info = L.control();

  info.onAdd = function (map) {
      this._div = L.DomUtil.create('div', 'info');
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

//Bouton plein écran
map.addControl(new L.Control.Fullscreen());

document.getElementById("selectRegion").addEventListener("change", e => {
    const code = e.target.value;
   
    const region = filterRegion(jsonFrance, code);
    loadGeojson(region, code);
});

function filterRegion(jsonFrance, regCode) {
    return {
        type: "FeatureCollection",
        features: jsonFrance.features.filter(f => {
            return f.properties.region === regCode;
        })
    };
}


function loadGeojson(json, code) {
    console.log(" Chargement région:", json.features?.length || 0, "communes");
    
    // SUPPRIME l'ancienne couche
    if (geojsonLayer) {
        map.removeLayer(geojsonLayer);
    }
    
    // CRÉE nouvelle couche avec BON style/onEachFeature
    geojsonLayer = L.geoJSON(json, {
        style: style,
        onEachFeature: onEachFeature
    }).addTo(map);
    
    // Auto-zoom sur la région
    if (json.features && json.features.length > 0) {
        //map.fitBounds(geojsonLayer.getBounds().pad(0.05)); // Petit padding
        map.flyTo(regions[code].center, regions[code].zoom);
    }
    
    // Reset indicateur (évite bug coloration)
    resetMap();
    updateMap();
    
    console.log(" Région chargée:", geojsonLayer.getLayers().length, "couches");
}

document.getElementById("indicateur").addEventListener("change", function() {
    const ind = this.value;
    
    if (ind === "" || !dataByIndicator[ind]) {
        dataIndicateurCourant = {};
        indicateurActif = false;
        legend.update([]);
        geojsonLayer.setStyle(styleParDefaut);
        return;
    }
    
    dataIndicateurCourant = dataByIndicator[ind];
    indicateurActif = true;
    updateMap();
});


//Légende adaptative en fonction de l'indicateur
var legend = L.control({position: 'bottomright'});

legend.onAdd = function (map) {
    this._div = L.DomUtil.create("div", "legend");
    this.update();
    return this._div;
};

legend.update = function (classes) {

    if (!classes || classes.length === 0) {
        this._div.innerHTML = "<strong>Légende</strong><br>";
        return;
    }
    
    var lstIndicateurs = document.getElementById("indicateur");
    var nomIndicateur = lstIndicateurs.options[lstIndicateurs.selectedIndex].text;

    this._div.innerHTML = `<strong>${nomIndicateur}</strong><br>`;

    classes.forEach((c, i) => {
        this._div.innerHTML += `
            <div style="display: flex; align-items: center; margin: 3px 0;">
                <i style="
                    background: ${palette[i]};
                    width: 18px; height: 14px; 
                    margin-right: 8px; 
                    border: 1px solid #ccc;
                    display: inline-block;
                    border-radius: 2px;
                "></i>
                ${Math.round(c.min).toLocaleString()} - ${Math.round(c.max).toLocaleString()}
            </div>
        `;
    });
    this._div.innerHTML += `
    <i style="background:#ff0000"></i> Aucune donnée<br>
`;

    
    // Valuers min et max correspondant aux valeurs de l'indicateur
    const minVal = Math.min(...classes.map(c => c.min));
    const maxVal = Math.max(...classes.map(c => c.max));
    this._div.innerHTML += `
        <hr style="margin: 8px -12px 8px -12px; border: none; border-top: 1px solid #eee;">
        <small style="color: #666;">
            Min: ${minVal.toLocaleString()}<br>
            Max: ${maxVal.toLocaleString()}
        </small>
    `;
};


legend.addTo(map);

function styleParDefaut()
{
    return { fillColor: "#ff0000", color: "#555", weight: 1, fillOpacity: 0.6 };
}

function style(feature) {
    const code = normalizeCode(feature.properties.code);
    const brut = dataIndicateurCourant[code];
    
    if (!brut || brut === "Aucune donnée" || !Number.isFinite(Number(brut))) {
        return { fillColor: "#ff0000", color: "#555", weight: 1, fillOpacity: 0.6 };
    }
    
    return {
        fillColor: getColor(Number(brut), classesGlobales),
        color: "#555",
        weight: 1,
        fillOpacity: 0.7
    };
}

function normalizeCode(code) {
    // Paris
    if (code.startsWith("75") && code !== "75056") return "75056";

    // Marseille
    if (code.startsWith("13") && code !== "13055") return "13055";

    // Lyon (si ton JSON découpe aussi)
    if (code.startsWith("69") && code !== "69123") return "69123";

    return code;
}



function onEachFeature(feature, layer) {

    layer.on({
        mouseover: function (e) {
            const props = e.target.feature.properties;

            const nom = props.nom || props.NOM || "Commune";
            const code = props.code || props.INSEE || props.CODE;

            // Récupérer la valeur de l’indicateur courant
            const valeur = dataIndicateurCourant[normalizeCode(code)];

            // Mise à jour de l'infobox
            info.update({ nom, valeur });

            // la commune sur laquelle on place la souris devient verte
            e.target.setStyle({
                weight: 2,
                color: "#0f0",
                fillOpacity: 0.8
            });
        },

        mouseout: function (e) {
            geojsonLayer.resetStyle(e.target);

            if (indicateurActif) {
                e.target.setStyle(style(e.target.feature));
            }
            info.update();
        }
    });
}

function updateMap() {
    if (!geojsonLayer) return;
    
    if (!indicateurActif || Object.keys(dataIndicateurCourant).length === 0) {
        legend.update([]);
        return;
    }
    
    // Calcule classes
    const valeurs = Object.values(dataIndicateurCourant)
        .map(v => Number(v))
        .filter(v => Number.isFinite(v));
    
    classesGlobales = computePercentileClasses(valeurs);
    legend.update(classesGlobales);
    
    // ✅ RECRÉE le style (force mise à jour)
    geojsonLayer.setStyle(style);
    geojsonLayer.bringToFront();
}

function getColor(value, classes) {
    console.log("valeur : ", value);
    if (value === "Aucune donnée" || value === null || value === undefined || !Number.isFinite(value)) {
        return "#ff0000";
    }
    
    for (let i = 0; i < classes.length; i++) {
        if (value >= classes[i].min && value <= classes[i].max) {
            return palette[i];
        }
    }
    
    return palette[palette.length - 1];
}

function computePercentileClasses(values, percentiles = [0, 20, 40, 60, 80, 100]) {
    // 1. Valeurs valides triées
    let validValues = values
        .filter(v => Number.isFinite(v))
        .sort((a, b) => a - b);
    
    if (validValues.length === 0) return [];
    
    // Suppression des classes en double
    validValues = validValues.filter((v, i) => i === 0 || v !== validValues[i-1]);
    
    if (validValues.length < 2) {
        return [{ min: validValues[0], max: validValues[0] }];
    }
    
    const classes = [];
    const n = percentiles.length;
    
    for (let i = 0; i < n - 1; i++) {
        const p1 = percentiles[i] / 100;
        const p2 = percentiles[i + 1] / 100;
        
        const idx1 = Math.floor(p1 * validValues.length);
        const idx2 = Math.floor(p2 * validValues.length) - 1;
        
        let minClass = validValues[idx1];
        let maxClass = validValues[Math.min(idx2, validValues.length - 1)];
        
        // Ignore les doublons
        if (minClass === maxClass) {
            // Cherche prochaine valeur différente AVANT
            let j = idx2 + 1;
            while (j < validValues.length && validValues[j] === minClass) j++;
            if (j < validValues.length) {
                maxClass = validValues[j];
            }
            
            // Cherche précédente valeur différente APRÈS
            let k = idx1 - 1;
            while (k >= 0 && validValues[k] === minClass) k--;
            if (k >= 0) {
                minClass = validValues[k];
            }
        }
        
        // Classe valide uniquement si min < max
        if (minClass < maxClass) {
            classes.push({ min: minClass, max: maxClass });
        }
    }
    
    // La dernière classe contient la valeur max
    if (classes.length > 0) {
        classes[classes.length - 1].max = validValues[validValues.length - 1];
    }
    
    // 6. SUPPRESSION DES DOUBLONS FINAUX
    const classesUniques = [];
    classes.forEach(c => {
        const last = classesUniques[classesUniques.length - 1];
        if (!last || last.max !== c.max || last.min !== c.min) {
            classesUniques.push(c);
        }
    });
    
    return classesUniques;
}


// Pour le chargement initial
function resetMap() {
    //document.getElementById("indicateur").value = "";
    //indicateurActif = false;
    legend.update([]);
}