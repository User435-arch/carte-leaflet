// Initialisation de la carte
        const map = L.map('map').setView([49.2, 0.5], 8); // Centre approximatif de la Normandie

        // Fond de carte OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
            attribution: '© OpenStreetMap'
        }).addTo(map);