let fichierValide;
const reader = new FileReader();

//Permet l'affichage des unités
const unites = {
    "flux_domicile_etude": "nombre",
    "sur_occupation": "%",
    "evol_pop_pct": "%", 
    "population": "hab.",
    "taux_natalite": "‰",
    "taux_mortalite": "‰",
    "evol_pop": "%",
    "evol_pop_solde_naturel": "%",
    "evol_pop_solde_migratoire": "%",
    "population_hist": "hab.",
    "densite_hist": "hab./km²",
    "nb_75plus": "hab.",
    "naissances": "nombre",
    "deces": "nombre",
    "part_celibataires": "%",
    "nb_menages": "ménages",
    "part_veuves": "%",
    "part_pacses": "%",
    "part_maries": "%",
    "part_divorces": "%",
    "part_concubinage": "%",
    "menages_fiscaux": "ménages",
    "mediane_niveau_vie": "€",
    "electeurs": "nombre",
    "nb_non_scolarises": "nombre",
    "part_peu_diplomes": "%",
    "part_bepc": "%",
    "part_cap_bep": "%",
    "part_bac": "%",
    "part_bac2": "%",
    "part_bac3_4": "%",
    "logements": "logements",
    "residences_principales": "logements",
    "part_res_principales": "%",
    "part_res_secondaires": "%",
    "part_logements_vacants": "%",
    "emplois_lt": "emplois",
    "part_emplois_salaries": "%",
    "taux_activite": "%",
    "creations_entreprises": "nombre",
    "etablissements": "nombre",
    "part_etab_sans_salarie": "%",
    "part_etab_1_9": "%",
    "part_etab_10plus": "%",
    "effectifs_salaries": "salariés",
    "part_agriculture": "%",
    "part_industrie": "%",
    "part_construction": "%",
    "part_commerces_services": "%",
    "part_admin_sante_social": "%",
    "part_hotels_haut": "%",
    "part_hotels_milieu": "%",
    "part_hotels_entree": "%",
    "part_campings_haut": "%",
    "part_campings_milieu": "%",
    "part_campings_entree": "%",
    "police_gendarmerie": "nombre",
    "banques": "nombre",
    "grandes_surfaces": "nombre",
    "superettes": "nombre",
    "boulangeries": "nombre",
    "ecoles": "nombre",
    "colleges": "nombre",
    "lycees": "nombre",
    "urgences": "nombre",
    "medecins": "nombre",
    "dentistes": "nombre",
    "kines": "nombre",
    "infirmiers": "nombre",
    "pharmacies": "nombre",
    "hebergement_personnes_agees": "places",
    "eaje": "places",
    "bassins_natation": "nombre",
    "salles_multisports": "nombre",
    "flux_domicile_travail": "nombre",
    "flux_migration": "nombre",
    "part_tc": "%",
    "part_velo": "%",
    "part_voiture": "%",
    "part_non_diplomes": "%",
    "taux_emploi_femmes": "%",
    "taux_emploi_hommes": "%"
};


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

    // Trouver la ligne qui commence par "code" 
    const headerIndex = lines.findIndex(line =>
        line.trim().toLowerCase().startsWith("code")
    );

    if (headerIndex === -1) {
        fichierValide = false;
        alert("CSV invalide : aucune ligne d'en-têtes commençant par 'code'.");
    }

    // On supprime tout ce qui est avant l'en-tête
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
    //    commence par "code" et contient au moins un point-virgule
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
            const rawCode = r.Code || r.code || Object.keys(r)[0];

            const code = rawCode.trim().padStart(5, "0");

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

function getUnite(ind)
{

    ind = ind.replace(/(_\d+)*_\d{4}[a-zA-Z_]*$/, "")
              .replace(/_\d+$/, "");

    return unites[ind];
}

//Initialisation du menu déroulant une fois le CSV importé
function updateSelect(indicateurs) {
    const select = document.getElementById("indicateur");
    select.innerHTML = "<option value=''>-- Choisissez un indicateur --</option>";

    indicateurs.forEach(ind => {
        const option = document.createElement("option");
        option.value = ind;
        option.textContent = formatLibelleUniversel(ind.replace(/_/g, ' ')) + " (" + getUnite(ind) + ")";
        select.appendChild(option);
    });
}
