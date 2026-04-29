const reader = new FileReader();

document.getElementById("fileSelect").addEventListener("input", (event) => {
    const file = event.target.files[0];
    if (!file) return;

    reader.readAsText(file, "UTF-8");
});

reader.onload = (event) => {

    const csvText = event.target.result;

    const { headers, rows } = parseCSV(csvText);
    const { indicateurs, dataByIndicator } = buildIndicators(headers, rows);


    document.getElementById("csvStatus").innerHTML   = `CSV chargé : <b>${document.getElementById('fileSelect').files[0].name}<b/>`;
    document.getElementById("csvStatus").style.color = "#28a745";
    updateSelect(indicateurs);

};


function parseCSV(text) {
    const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    const headers = lines[0].split(";").map(h => h.trim());

    const rows = lines.slice(1).map(line => {
        const cols = line.split(";").map(c => c.trim());
        const obj = {};
        headers.forEach((h, i) => obj[h] = cols[i]);
        return obj;
    });

    return { headers, rows };
}

function buildIndicators(headers, rows) {
    indicateurs = headers.slice(2);
    dataByIndicator = {};

    indicateurs.forEach(ind => {
        dataByIndicator[ind] = {};

        rows.forEach(r => {
            const raw = (r[ind] || "").toString().trim().toLowerCase();

            if (
                raw.includes("n/a") ||
                raw.includes("division par") ||
                raw.includes("résultat non disponible")
            ) {
                dataByIndicator[ind][r.code] = "Aucune donnée";
            } else {
                dataByIndicator[ind][r.code] = r[ind];
            }
        });

    });

    return { indicateurs, dataByIndicator };
}

function formatLibelleUniversel(csvLibelle) {
    if (!csvLibelle || typeof csvLibelle !== 'string') return "Indicateur";
    
    let libelle = csvLibelle.trim();
    
    // Remplacement des underscores par des espaces
    libelle = libelle.replace(/_+/g, ' ').trim();
    
    // Détection et remplacement des abréviations
    const abrevs = {
        // Démographie
        'pop': 'Population',
        'hab': 'Habitant',
        'dem': 'Démographie',
        
        // Économie
        'tx': 'Taux',
        'rev': 'Revenu',
        'sal': 'Salaire',
        'pib': 'PIB',
        'chom': 'Chômage',
        
        // Territoire
        'dens': 'Densité',
        'surf': 'Surface',
        'km2': 'km²',
        
        // Stats
        'moy': 'Moyen',
        'med': 'Médian',
        'min': 'Minimum',
        'max': 'Maximum',
        'nb': 'Nombre',
        'tot': 'Total',
        'evol': 'Évolution',
        'var': 'Variation',
        
        // Temps
        'an': 'Année',
        'mois': 'Mois'
    };
    
    Object.keys(abrevs).forEach(abrev => {
        const regex = new RegExp(`\\b${abrev}\\b`, 'gi');
        libelle = libelle.replace(regex, abrevs[abrev]);
    });
    
    libelle = libelle
        .toLowerCase()
        .split(/\s+/)
        .map(word => {
            // Première lettre en majuscule (sauf articles/prépositions)
            const petitsMots = ['de', 'du', 'du', 'des', 'le', 'la', 'les', 'et', 'ou', 'en', 'sur'];
            if (petitsMots.includes(word.toLowerCase())) return word.toLowerCase();
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ');
    
    libelle = libelle
        .replace(/Km2/g, 'km²')
        .replace(/([0-9]{4})\s+([0-9]{4})/g, '$1-$2')
        .replace(/\s+/g, ' ')
        .trim();
    
    return libelle || "Indicateur";
}

//Initialisation du menu déroulant une fois le CSV importé
function updateSelect(indicateurs) {
    const select = document.getElementById("indicateur");
    select.innerHTML = "<option value=''>-- Choisissez un indicateur --</option>";

    indicateurs.forEach(ind => {
        const option = document.createElement("option");
        option.value = ind;
        option.textContent = formatLibelleUniversel(ind);
        select.appendChild(option);
    });
}
