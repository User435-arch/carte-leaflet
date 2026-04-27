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
var map = L.map('map').setView([49.2, 0.5], 8); // Centre approximatif de la Normandie

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

/*document.getElementById('indicateur').addEventListener('change', function() {
    const fichier = this.value;
    chargerJson(fichier);
    
});*/

/*document.getElementById("indicateur").addEventListener("change", function() {
    const ind = this.value;

    dataIndicateurCourant = dataByIndicator[ind];
    updateMap();
});*/

document.getElementById("indicateur").addEventListener("change", function() {
    const ind = this.value;
    
    if (ind === "" || !dataByIndicator[ind]) {
        // Reset
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

/*legend.update = function (classes) {
    this._div.innerHTML = "<strong>Légende</strong><br>";

    if(classes !== undefined)
    {
        var lstIndicateurs = document.getElementById("indicateur");
        var nomIndicateur = lstIndicateurs.options[lstIndicateurs.selectedIndex].text;

        this._div.innerHTML = `<strong>${nomIndicateur}</strong><br>`;

        classes.forEach((c, i) => {
            this._div.innerHTML += `
                <i style="background:${palette[i]}"></i>
                ${c.min.toFixed(0)} - ${c.max.toFixed(0)}<br>
            `;
        });
    }
};*/

legend.update = function (classes) {
    // CORRECTION : Remplacez "if(classes !== )" par :
    if (!classes || classes.length === 0) {
        this._div.innerHTML = "<strong>Légende</strong><br><i>Aucun indicateur sélectionné</i>";
        return;
    }
    
    var lstIndicateurs = document.getElementById("indicateur");
    var nomIndicateur = lstIndicateurs.options[lstIndicateurs.selectedIndex].text;

    this._div.innerHTML = `<strong>${nomIndicateur}</strong><br>`;

    // Amélioration du style des cases couleur
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
                ${c.min.toLocaleString()} - ${c.max.toLocaleString()}
            </div>
        `;
    });
    
    // Bonus : stats min/max
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

    /*if (!indicateurActif) {
        return {
            weight: 1,
            color: "#555",
            fillOpacity: 0.7,
            fillColor: "#3388ff" // couleur par défaut
        };
    }*/

    const code = feature.properties.code;
    const brut = dataIndicateurCourant[code];
    const valeur = brut === undefined ? null : Number(brut);

    return {
        weight: 1,
        color: "#555",
        fillOpacity: 0.7,
        fillColor: getColor(valeur, classesGlobales)
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

            // Mise à jour du L.control()
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
            info.update(); // revient au placeholder
        }
    });
}


function chargerJson(fichier)
{
  
    fetch("json/" + fichier)
    .then(r => r.json())
    .then(data => {
        indicateurActif = true;
        dataIndicateurCourant = data;

        const valeurs = Object.values(data)
            .map(v => Number(v))
            .filter(v => Number.isFinite(v));


        classesGlobales = computeLogQuantileClasses(valeurs, 5);

        legend.update(classesGlobales);
        geojsonLayer.setStyle(style);
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

    classesGlobales = computeLogQuantileClasses(valeurs, 5);
    legend.update(classesGlobales);
    geojsonLayer.setStyle(style);
}

function getColor(value, classes) {
    if (value === null || isNaN(value)) return "#ccc";

    for (let i = 0; i < classes.length; i++) {
        if (value >= classes[i].min && value < classes[i].max) {
            return palette[i];
        }
    }

    return palette[palette.length - 1];
}


//Répartition équitable des communes
function computeLogQuantileClasses(values, n = 5) {
    // 1) Transformation logarithmique
    const logValues = values.map(v => Math.log10(v + 1));

    // 2) Tri
    const sorted = [...logValues].sort((a, b) => a - b);

    // 3) Quantiles sur les valeurs log
    const classesLog = [];
    for (let i = 0; i < n; i++) {
        const qMin = sorted[Math.floor((i / n) * sorted.length)];
        const qMax = sorted[Math.floor(((i + 1) / n) * sorted.length) - 1];

        classesLog.push({ min: qMin, max: qMax });
    }

    // 4) Reconversion en valeurs réelles
    let classes = classesLog.map(c => ({
        min: Math.pow(10, c.min) - 1,
        max: Math.pow(10, c.max) - 1
    }));

    // 5) Fusion des classes identiques
    classes = mergeIdenticalClasses(classes);

    return classes;
}

function cleanClasses(classes) {
    const cleaned = [];

    for (const c of classes) {
        if (!Number.isFinite(c.min) || !Number.isFinite(c.max)) continue;
        if (c.min === c.max) continue; // classe vide
        cleaned.push(c);
    }

    // Fusionner les classes identiques
    const merged = [];
    for (const c of cleaned) {
        if (
            merged.length > 0 &&
            merged[merged.length - 1].max === c.min
        ) {
            merged[merged.length - 1].max = c.max;
        } else {
            merged.push({ ...c });
        }
    }

    return merged;
}


function mergeIdenticalClasses(classes) {
    const merged = [];

    classes.forEach(c => {
        const last = merged[merged.length - 1];

        if (!last || last.max !== c.max || last.min !== c.min) {
            merged.push(c);
        }
    });

    return merged;
}

// Pour le bouton reset ou au chargement initial
function resetMap() {
    document.getElementById("indicateur").value = "";
    dataIndicateurCourant = {};
    indicateurActif = false;
    updateMap();
    map.setView([49.2, 0.5], 8);
}

function expandTinyClasses(classes) {
    for (let i = 0; i < classes.length - 1; i++) {
        if (classes[i].min === classes[i].max) {
            classes[i].max = classes[i + 1].min;
        }
    }
    return classes;
}
