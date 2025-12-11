import { Component, Inject, OnDestroy, PLATFORM_ID, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { environment } from 'src/environments/environment';
import { PlacesService, LocationData } from '../../services/places.service';


// Import de type uniquement (ne charge pas la librairie tout de suite)
import type { Map, GeoJSONSource, MapLayerMouseEvent } from 'mapbox-gl';

const TABS = ['facebook', 'instagram', 'linkedin', 'maps'] as const;
type SocialTab = typeof TABS[number];

@Component({
  selector: 'app-rs',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './rs.component.html',
  styleUrl: './rs.component.css'
})
export class RsComponent implements OnDestroy, AfterViewInit {
  // Le token est récupéré depuis le fichier d'environnement.
  private readonly MAPBOX_TOKEN = environment.mapboxAccessToken;
  @ViewChild('mapContainer') private mapContainer!: ElementRef<HTMLDivElement>;

  private map: Map | undefined;


  public readonly tabs = TABS;
  public readonly tabLabels: Record<SocialTab, string> = {
    facebook: 'Facebook',
    instagram: 'Instagram',
    linkedin: 'LinkedIn',
    maps: 'Carte'
  };

  public activeTab: SocialTab = 'facebook';
  public isLoadingMap = false;

  constructor(private placesService: PlacesService, @Inject(PLATFORM_ID) private platformId: object) { }

  ngAfterViewInit(): void {
    // Initialiser la carte uniquement si l'onglet "maps" est actif au chargement
    // et que nous sommes dans un environnement navigateur.
    if (this.activeTab === 'maps' && isPlatformBrowser(this.platformId)) {
      this.initMap();
    }
  }

  selectTab(tab: SocialTab): void {
    if (this.activeTab === tab) {
      return;
    }
    this.activeTab = tab;

    // Initialiser la carte la première fois que l'on clique sur l'onglet "maps"
    if (tab === 'maps' && !this.map && isPlatformBrowser(this.platformId)) {
      this.initMap();
    }
  }

  private async initMap() {
    if (!this.MAPBOX_TOKEN) {
      console.error('Mapbox access token is not set. Please add it to your environment file.');
      return;
    }

    // Si la carte est déjà en cours d'initialisation ou déjà initialisée, on ne fait rien.
    if (this.isLoadingMap || this.map) {
      return;
    }

    this.isLoadingMap = true;

    // 1. Import dynamique pour éviter l'erreur "window is not defined" en SSR
    const mapboxgl = await import('mapbox-gl');

    // 3. Initialisation de la carte
    this.map = new mapboxgl.Map({
      accessToken: this.MAPBOX_TOKEN, // On passe le token directement ici
      container: this.mapContainer.nativeElement,
      style: 'mapbox://styles/mapbox/streets-v12', // Style par défaut
      center: [4.3517, 50.8503], // [Lng, Lat] (Attention: Mapbox c'est Longitude, Latitude !)
      zoom: 12,
      attributionControl: false // Optionnel : nettoie un peu la carte
    });

    // Ajout des contrôles de navigation (+/-)
    this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    this.map.on('load', () => {
      this.placesService.getLocations().then((locations: LocationData[]) => {
        if (!this.map) return; // Garde-fou si la carte est détruite entre-temps

        const features = locations.map(location => ({
          type: 'Feature' as const,
          properties: { ...location }, // On passe toutes les données du lieu (ex: nom)
          geometry: {
            type: 'Point' as const,
            coordinates: [location.longitude, location.latitude]
          }
        }));

        // Ajout de la source de données GeoJSON avec clustering
        this.map.addSource('places', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: features
          },
          cluster: true,
          clusterMaxZoom: 14, // Zoom max où les points sont clusterisés
          clusterRadius: 50    // Rayon de chaque cluster
        });

        // Couche pour les clusters (cercles)
        this.map.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'places',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': ['step', ['get', 'point_count'], '#51bbd6', 10, '#f1f075', 100, '#f28cb1'],
            'circle-radius': ['step', ['get', 'point_count'], 20, 10, 30, 100, 40]
          }
        });

        // Couche pour le nombre de points dans un cluster
        this.map.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'places',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 12
          }
        });

        // Couche pour les points non clusterisés (marqueurs individuels)
        this.map.addLayer({
          id: 'unclustered-point',
          type: 'circle',
          source: 'places',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': '#FF0000', // Couleur des points individuels
            'circle-radius': 6,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#fff'
          }
        });

        // Interaction: cliquer sur un cluster pour zoomer
        this.map.on('click', 'clusters', (e: MapLayerMouseEvent) => {
          const features = this.map?.queryRenderedFeatures(e.point, { layers: ['clusters'] });
          if (!features?.length) return;
          const clusterId = features[0].properties?.['cluster_id'];
          const source = this.map?.getSource('places') as GeoJSONSource;
          source.getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err || zoom == null) return;
            this.map?.easeTo({ center: (features[0].geometry as any).coordinates, zoom });
          });
        });

        // Interaction: cliquer sur un point pour afficher une popup
        this.map.on('click', 'unclustered-point', (e: MapLayerMouseEvent) => {
          if (!e.features?.length || !this.map) return;
          const coordinates = (e.features[0].geometry as any).coordinates.slice();
          const properties = e.features[0].properties;

          // Le rayon du cercle est de 6px. On ajoute une marge pour que la popup ne le touche pas.
          const offset = 12; // Décalage en pixels.
          const popupOffsets: Record<'top' | 'bottom' | 'left' | 'right', [number, number]> = {
            // Mapbox place la popup intelligemment. On définit un décalage pour chaque position possible.
            // [x, y] : +x est à droite, +y est en bas.
            top: [0, offset], // Si la popup est en dessous, on la décale vers le bas.
            bottom: [0, -offset], // Si la popup est au-dessus, on la décale vers le haut.
            left: [offset, 0], // Si la popup est à droite, on la décale vers la droite.
            right: [-offset, 0] // Si la popup est à gauche, on la décale vers la gauche.
          };

          // Construire le HTML pour la popup avec les données disponibles
          const html = `
            <div class="popup-content">
              <h3 class="font-bold text-lg mb-1">${properties?.['nom']}</h3>
              ${properties?.['adresse'] ? `<p class="text-gray-600 text-sm">${properties?.['adresse']}</p>` : ''}
            </div>`;

          new mapboxgl.Popup({ closeButton: false, className: 'assurkin-popup', offset: popupOffsets }).setLngLat(coordinates).setHTML(html).addTo(this.map);
        });

        // Interaction: changer le curseur au survol
        this.map.on('mouseenter', 'clusters', () => this.map && (this.map.getCanvas().style.cursor = 'pointer'));
        this.map.on('mouseleave', 'clusters', () => this.map && (this.map.getCanvas().style.cursor = ''));
        this.map.on('mouseenter', 'unclustered-point', () => this.map && (this.map.getCanvas().style.cursor = 'pointer'));
        this.map.on('mouseleave', 'unclustered-point', () => this.map && (this.map.getCanvas().style.cursor = ''));

        this.isLoadingMap = false;
      }).catch(error => {
        console.error("Erreur lors du chargement des points d'intérêt :", error);
        this.isLoadingMap = false;
      });
    });
  }

  ngOnDestroy(): void {
    // Nettoyage impératif pour éviter les fuites de mémoire WebGL
    this.map?.remove();
  }
}