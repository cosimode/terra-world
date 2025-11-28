import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

const MapUtilities = ({ centerTo }) => {
    const map = useMap();

    useEffect(() => {
        if (centerTo) {
            // Crea un layer temporaneo per calcolare dove si trova l'oggetto
            const layer = L.geoJSON(centerTo);

            // Controlla se è un Punto (Micronazione) o un'Area (Nazione)
            const type = centerTo.geometry.type;

            if (type === 'Point' || type === 'MultiPoint') {
                // SE È UN PUNTO (es. Molossia, Sealand):
                // Usa flyTo per andare alle coordinate esatte con uno zoom alto
                const center = layer.getBounds().getCenter();
                map.flyTo(center, 13, {
                    duration: 1.5,
                    easeLinearity: 0.25
                });
            } else {
                // SE È UN'AREA (es. Somaliland, Italia):
                // Usa fitBounds per inquadrare tutti i confini
                map.fitBounds(layer.getBounds(), {
                    padding: [50, 50],
                    duration: 1.5,
                    maxZoom: 6 // Evita di zoomare troppo se il paese è piccolo ma è un poligono
                });
            }
        }
    }, [centerTo, map]);

    return null;
};

export default MapUtilities;