
  // School location (Ediofe Roman Catholic Cathedral area)
  const schoolLocation = [3.016733138874593, 30.899142808208286];

  // Create map
  const map = L.map('map').setView(schoolLocation, 16);

  // OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // Custom marker
  const marker = L.marker(schoolLocation).addTo(map);

  marker.bindPopup(`
    <b>Bishop Angelo Tarantino Memorial Secondary School</b><br>
    Near Ediofe Roman Catholic Cathedral, Arua
  `).openPopup();

  // Optional circle (highlight area)
  L.circle(schoolLocation, {
    radius: 120,
    color: "#004080",
    fillColor: "#4d749b",
    fillOpacity: 0.3
  }).addTo(map);
  
  window.addEventListener("load", () => {
  setTimeout(() => {
    map.invalidateSize();
  }, 200);
});
