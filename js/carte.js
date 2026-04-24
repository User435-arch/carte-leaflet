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

document.getElementById('indicateur').addEventListener('change', function() {
    const fichier = this.value;
    chargerJson(fichier);
    
});

//Légende adaptative en fonction de l'indicateur
var legend = L.control({position: 'bottomright'});

legend.onAdd = function (map) {
    this._div = L.DomUtil.create("div", "legend");
    this.update();
    return this._div;
};

/*legend.update = function(min, max) {
    if(min === undefined || max === undefined) {
        this._div.innerHTML = "Légende";
        return;
    }

    this._div.innerHTML = `
        <strong>Légende</strong><br>
        <i style="background:${getColor(min, min, max)}"></i> ${min}<br>
        <i style="background:${getColor((min+max)/2, min, max)}"></i> ${(min+max)/2}<br>
        <i style="background:${getColor(max, min, max)}"></i> ${max}
    `;
};*/

legend.update = function (classes) {
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
};


legend.addTo(map);

/*function style(feature) {
    const code = feature.properties.code;
    const brut = dataIndicateurCourant[code];
    const valeur = brut === undefined ? null : Number(brut);

    return {
        weight: 1,
        color: "#555",
        fillOpacity: 0.7,
        fillColor: getColor(valeur, min, max)
    };
}*/

function style(feature) {

    if (!indicateurActif) {
        return {
            weight: 1,
            color: "#555",
            fillOpacity: 0.7,
            fillColor: "#3388ff" // couleur par défaut
        };
    }

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

  /*fetch("json/" + fichier)
      .then(r => r.json())
      .then(data => {
          dataIndicateurCourant = data;

        const valeurs = Object.values(data)
            .map(v => Number(v))
            .filter(v => !isNaN(v));

        min = Math.min(...valeurs);
        max = Math.max(...valeurs);

        legend.update(min, max);
        geojsonLayer.setStyle(style);
        //appliquerIndicateur(data); // recolore la carte
      });*/
    
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

/*function getColor(value, min, max) {
    if (value === null || value === undefined || isNaN(value)) {
        return "#ccc"; // couleur pour "pas de données"
    }

    // Normalisation entre 0 et 1
    const t = (value - min) / (max - min);

    // Interpolation entre deux couleurs (bleu clair → bleu foncé)
    const r = Math.round(200 - 150 * t);
    const g = Math.round(220 - 150 * t);
    const b = Math.round(255 - 150 * t);

    return `rgb(${r}, ${g}, ${b})`;
}*/

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

function expandTinyClasses(classes) {
    for (let i = 0; i < classes.length - 1; i++) {
        if (classes[i].min === classes[i].max) {
            classes[i].max = classes[i + 1].min;
        }
    }
    return classes;
}
