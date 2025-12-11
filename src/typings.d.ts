// Ce fichier est utilisé pour les déclarations de types globales.

// Étend le namespace 'leaflet' pour inclure les types de leaflet.markercluster.
// Cela fournit une meilleure autocomplétion et vérification de type dans tout le projet.
declare module 'leaflet' {
    /**
     * Interface pour un cluster de marqueurs.
     */
    interface MarkerCluster extends Marker {
        getChildCount(): number;
        getAllChildMarkers(): Marker[];
    }

    /**
     * Options pour le MarkerClusterGroup.
     */
    interface MarkerClusterGroupOptions extends LayerOptions {
        maxClusterRadius?: number | ((zoom: number) => number);
        // Correction du type pour correspondre aux définitions de @types/leaflet.markercluster
        iconCreateFunction?: (cluster: MarkerCluster) => DivIcon | Icon<IconOptions>;
        spiderfyOnMaxZoom?: boolean;
        showCoverageOnHover?: boolean;
        zoomToBoundsOnClick?: boolean;
        singleMarkerMode?: boolean;
        disableClusteringAtZoom?: number;
        removeOutsideVisibleBounds?: boolean;
    }

    class MarkerClusterGroup extends FeatureGroup {
        // Ajout de la signature de la méthode pour que TypeScript la reconnaisse.
        getBounds(): LatLngBounds;
    }

    function markerClusterGroup(options?: MarkerClusterGroupOptions): MarkerClusterGroup;
}
