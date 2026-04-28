let indicateurActif = false;
let classesGlobales = [];
const palette = [
    "#eff3ff",
    "#bdd7e7",
    "#6baed6",
    "#3182bd",
    "#08519c"
];


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

L.easyPrint({
    title: 'Exporter la carte',
    position: 'topleft',
    sizeModes: ['A4Portrait', 'A4Landscape'],
    exportOnly: true,
    filename: 'carte_normandie'
}).addTo(map);


var geojsonLayer = null;
fetch("json/normandie.json")
  .then(r => r.json())
  .then(geojson => {
    geojsonLayer = L.geoJSON(geojson, {
      onEachFeature: onEachFeature
    }).addTo(map);
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


document.getElementById("indicateur").addEventListener("change", function() {
    const ind = this.value;
    
    if (ind === "" || !dataByIndicator[ind]) {
        // Reset des données
        dataIndicateurCourant = {};
        updateMap();
        return;
    }
    
    dataIndicateurCourant = dataByIndicator[ind];
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

    
    // Valuers min et max correspondant à l'indicateur
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

function style(feature) {
    const code = feature.properties.code;
    const brut = dataIndicateurCourant[code];

    if (brut === "Aucune donnée" || brut === "inconnu" || brut === null) {
        return {
            fillColor: "#ff0000",
            color: "#555",
            weight: 1,
            fillOpacity: 0.6
        };
    }

    const val = Number(brut);

    if (!Number.isFinite(val)) {
        return {
            fillColor: "#d9d9d9",
            color: "#555",
            weight: 1,
            fillOpacity: 0.6
        };
    }

    return {
        fillColor: getColor(val, classesGlobales),
        color: "#555",
        weight: 1,
        fillOpacity: 0.7
    };
}


function onEachFeature(feature, layer) {

    layer.on({
        mouseover: function (e) {
            const props = e.target.feature.properties;

            const nom = props.nom || props.NOM || "Commune";
            const code = props.code || props.INSEE || props.CODE;

            // Récupérer la valeur de l’indicateur courant
            const valeur = dataIndicateurCourant[code];

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
    if (!dataIndicateurCourant || Object.keys(dataIndicateurCourant).length === 0) {
        // Pas d'indicateur actif
        indicateurActif = false;
        geojsonLayer.setStyle({
            weight: 1,
            color: "#555",
            fillOpacity: 0.7,
            fillColor: "#3388ff"
        });
        legend.update([]); // Cache la légende
        return;
    }
    
    // Indicateur actif
    indicateurActif = true;
    
    const valeurs = Object.values(dataIndicateurCourant)
        .map(v => Number(v))
        .filter(v => Number.isFinite(v));

    if (valeurs.length === 0) {
        legend.update([]);
        return;
    }

    //classesGlobales = computeQuantileClasses(valeurs, 5);
    classesGlobales = computePercentileClasses(valeurs);

    legend.update(classesGlobales);
    geojsonLayer.setStyle(style);
}

function getColor(value, classes) {
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

/*function computeQuantileClasses(values, n = 5) {
    const validValues = values
        .filter(v => Number.isFinite(v))
        .sort((a, b) => a - b);
    
    if (validValues.length < 2) return [];
    
    const classes = [];
    for (let i = 0; i < n; i++) {
        const startIdx = Math.floor(i * validValues.length / n);
        const endIdx = Math.floor((i + 1) * validValues.length / n) - 1;
        
        classes.push({
            min: validValues[startIdx],
            max: validValues[endIdx]
        });
    }
    
    return classes;
}*/
function computePercentileClasses(values, percentiles = [0, 20, 40, 60, 80, 100]) {
    // 1. Valeurs valides triées
    let validValues = values
        .filter(v => Number.isFinite(v))
        .sort((a, b) => a - b);
    
    if (validValues.length === 0) return [];
    
    // 2. Suppression des doublons consécutifs
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
        
        // 3. SAUT des doublons dans la classe
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
        
        // 4. Classe valide UNIQUEMENT si min < max
        if (minClass < maxClass) {
            classes.push({ min: minClass, max: maxClass });
        }
    }
    
    // 5. Dernière classe = max réel
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
    
    console.table(classesUniques.map((c,i) => ({
        classe: i+1,
        min: c.min,
        max: c.max,
        etendue: c.max - c.min
    })));
    
    return classesUniques;
}


// Pour le chargement initial
function resetMap() {
    document.getElementById("indicateur").value = "";
    dataIndicateurCourant = {};
    indicateurActif = false;
    updateMap();
    map.setView([49.2, 0.5], 8);
}

function exportCarte() {
    html2canvas(document.getElementById('map')).then(canvas => {
        const lien = document.createElement('a');
        lien.download = 'carte_normandie_' + Date.now() + '.png';
        lien.href = canvas.toDataURL();
        lien.click();
    });
}