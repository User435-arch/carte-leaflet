let fichierValide;
const reader = new FileReader();

//Lecture du CSV par défaut
document.addEventListener("DOMContentLoaded", (event) => {
    loadCSVAuto();
});

document.getElementById("fileSelect").addEventListener("input", (event) => {
    const file = event.target.files[0];
    if (!file) return;

    reader.readAsText(file, "UTF-8");
});

reader.onload = (event) => {
    fichierValide = true;

    const csvText = event.target.result;    

    const { headers, rows } = parseCSV(csvText);

    if(fichierValide)
    {
        const { indicateurs, dataByIndicator } = buildIndicators(headers, rows);

        document.getElementById("csvStatus").innerHTML   = `CSV chargé : <b>${document.getElementById('fileSelect').files[0].name}<b/>`;
        document.getElementById("csvStatus").style.color = "#28a745";
        updateSelect(indicateurs);
    }

};

async function loadCSVAuto() {
    try {
        document.getElementById("csvStatus").innerHTML = "Chargement CSV auto...";
        
        const response = await fetch('csv/data_generales.csv');
        const csvText = await response.text();
        
        const { headers, rows } = parseCSV(csvText);
        const { indicateurs } = buildIndicators(headers, rows);
        
        document.getElementById("csvStatus").innerHTML = 
            'CSV auto: data_generales.csv';
        document.getElementById("csvStatus").style.color = "#28a745";
        
        updateSelect(indicateurs);
        
    } catch (err) {
        console.warn("CSV auto échoué:", err);
        document.getElementById("csvStatus").innerHTML = 
            'CSV auto introuvable';
        document.getElementById("csvStatus").style.color = "#ffc107";
    }
}

function cleanInseeCsv(rawText) {
    const lines = rawText.split(/\r?\n/);

    // Trouver la ligne qui commence par "code" (insensible à la casse)
    const headerIndex = lines.findIndex(line =>
        line.trim().toLowerCase().startsWith("code")
    );

    if (headerIndex === -1) {
        fichierValide = false;
        alert("CSV invalide : aucune ligne d'en-têtes commençant par 'code'.");
    }

    // On supprime TOUT ce qui est avant l'en-tête
    const cleanedLines = lines.slice(headerIndex);

    return cleanedLines.join("\n");
}

function parseCSV(text) {
    // 1. Nettoyage global
    text = text.replace(/\uFEFF/g, "");

    // 2. Découper en lignes
    const rawLines = text
        .split(/\r?\n/)
        .map(l => l.replace(/\uFEFF/g, "").trim())
        .filter(l => l.length > 0);

    if (rawLines.length === 0) {
        fichierValide = false;
        alert("CSV vide");
    }

    // 3. Trouver la vraie ligne d'en-têtes :
    //    - commence par "code" (insensible à la casse)
    //    - contient au moins un point-virgule
    // ✅ APRÈS (trouve "Code", "code", "CODE"...)
    const headerIndex = rawLines.findIndex(line => {
        const lower = line.toLowerCase().trim();
        return lower.startsWith("code") && line.split(";").length >= 6; // Au moins 6 colonnes
    });


    if (headerIndex === -1) {
        fichierValide = false;
        alert("CSV invalide : aucune ligne d'en-têtes commençant par 'code'.");
    }

    // 4. Garder uniquement les lignes utiles
    const lines = rawLines.slice(headerIndex);

    // 5. Lire les en-têtes
    const headers = lines[0]
        .split(";")
        .map(h => h.trim());

    // 6. Lire les données
    const rows = lines.slice(1).map(line => {
    const cols = line.split(";").map(c => c.trim());

    // Ignorer les lignes qui n'ont pas le bon nombre de colonnes
    if (cols.length !== headers.length) {
        console.warn("Ligne ignorée (colonnes incorrectes) :", line);
        return null;
    }

    const obj = {};
    headers.forEach((h, i) => {
        obj[h] = cols[i] ?? "";
    });
    return obj;
}).filter(r => r !== null);


    return { headers, rows };
}

function buildIndicators(headers, rows) {
    const normalizeKey = (str) => 
        str.toLowerCase().trim().replace(/_+/g, '_');

    const normalizedHeaders = headers.map(normalizeKey);
    
    // 🔥 FIX 1 : Mapping index → nom normalisé
    const headerIndexMap = {};
    normalizedHeaders.forEach((normKey, index) => {
        headerIndexMap[normKey] = index;
    });

    indicateurs = normalizedHeaders.slice(2);
    dataByIndicator = {};

    indicateurs.forEach(ind => {
        dataByIndicator[ind] = {};
        
        const colIndex = headerIndexMap[ind];
        
        rows.forEach(r => {
            const code = r.Code || r.code || Object.keys(r)[0];
            const rawValue = r[headers[colIndex]] || "";
            
            const raw = rawValue.toString().trim().toLowerCase();
            dataByIndicator[ind][code] = raw.includes("n/a") || 
                                       raw.includes("division") || 
                                       raw.includes("non disponible")
                ? "Aucune donnée" 
                : rawValue;
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
        option.textContent = formatLibelleUniversel(ind.replace(/_/g, ' '));
        select.appendChild(option);
    });
}
