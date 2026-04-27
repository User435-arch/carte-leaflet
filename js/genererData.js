const reader = new FileReader();

document.getElementById("fileSelect").addEventListener("input", (event) => {
    const file = event.target.files[0];
    if (!file) return;

    reader.readAsText(file, "UTF-8");
});

reader.onload = (event) => {

    const csvText = event.target.result;

    const parsed = parseCSV(csvText);

    const { headers, rows } = parseCSV(csvText);
    const { indicateurs, dataByIndicator } = buildIndicators(headers, rows);

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
    indicateurs = headers.slice(2); // code, libelle → le reste = indicateurs
    dataByIndicator = {};

    indicateurs.forEach(ind => {
        console.log(indicateurs);
        dataByIndicator[ind] = {};
        rows.forEach(r => {
            dataByIndicator[ind][r.code] = r[ind];
        });
    });

    return { indicateurs, dataByIndicator };
}

function updateSelect(indicateurs) {
    const select = document.getElementById("indicateur");
    select.innerHTML = "<option value=''>-- Choisissez un indicateur --</option>";

    indicateurs.forEach(ind => {
        const option = document.createElement("option");
        option.value = ind;
        option.textContent = ind; // tu pourras mettre formatLabel(ind)
        select.appendChild(option);
    });
}
