import L, { Map } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import mockMap from '@/assets/sample-img.jpg'; // Default map image if needed
import { toRaw, type Ref, ref } from 'vue'; // Import ref for reactive marker state

// --- Define SVG Arrow Icon ---
// This creates a custom Leaflet icon using HTML (specifically an SVG).
const headingArrowIcon = L.divIcon({
  className: 'user-heading-indicator', // Class for CSS styling
  // Smaller SVG arrow, maybe just the arrowhead part
  html: `<svg viewBox="0 0 10 10" width="12px" height="12px" style="transform: rotate(0deg); transform-origin: center center;">
           <path d="M5 0 L10 10 L5 8 L0 10 Z" fill="#278cea" stroke="#ffffff" stroke-width="1"/>
         </svg>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6], // Center it
});
// --- End Icon ---

// --- Keep your Blue Dot for User Position ---
const userPosition = L.circleMarker([0, 0], {
  radius: 10,
  fillColor: '#278cea',
  color: '#fffbf3',
  weight: 2,
  opacity: 1,
  fillOpacity: 1,
  pane: 'userPane', // Ensure this pane exists and has a high z-index
});

// Old red line for heading direction
// const headingLine = L.polyline([], {
//   color: '#ff0000',
//   weight: 3,
//   opacity: 0.9,
//   pane: 'userPane',
// });
// --- End Commented Out ---

// Debug marker (Orange circle, keep if needed for testing)
const userDebugPosition = L.circleMarker([0, 0], {
  radius: 10,
  fillColor: '#ED7117',
  color: '#fffbf3',
  weight: 2,
  opacity: 1,
  fillOpacity: 1,
  pane: 'userPane',
});

/**
 * Composable function to manage Leaflet map interactions including user position display.
 * @param map - A Vue Ref object holding the Leaflet Map instance (or null).
 */
export function useMap(map: Ref<Map | null>) {
  // Internal state for map bounds and the image overlay layer
  let _mapBound = L.latLngBounds([0, 1], [1, 0]); // Default initial bounds
  let _mapImageOverlay: L.ImageOverlay | null = null;

  // --- State for the User Arrow Marker ---
  const userMarker = ref<L.Marker | null>(null);
  const headingMarker = ref<L.Marker | null>(null);
  // --- End Marker State ---

  /**
   * Initializes the Leaflet map, creates panes, and adds initial layers.
   * @param mapContainer - The HTMLElement where the map will be rendered.
   * @param poiLayer - Optional LayerGroup for Point of Interest markers.
   * @param pathLayer - Optional LayerGroup for navigation path polylines.
   * @returns A Promise that resolves when the map and initial image overlay are loaded.
   */
  async function init(mapContainer: HTMLElement, poiLayer?: L.LayerGroup, pathLayer?: L.LayerGroup): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // Create the Leaflet map instance, disable default controls.
      map.value = L.map(mapContainer, {
        zoomControl: false,
        attributionControl: false,
      }).fitBounds(_mapBound); // Set initial view based on default bounds

      // Create a dedicated pane for the user marker to control its Z-index.
      // 650 is typically above tile layers and overlays but below controls/popups.
      map.value.createPane('userPane').style.zIndex = '650';

      // Create the image overlay with a default image and bounds.
      _mapImageOverlay = L.imageOverlay(mockMap, _mapBound);

      // Add event listeners to the overlay to know when it's ready or failed.
      _mapImageOverlay.once('load', () => resolve()); // Resolve the Promise on successful load.
      _mapImageOverlay.once('error', (err) => {
        console.error('Failed to load initial map image overlay', err);
        reject(new Error('Failed to load initial map image overlay'));
      });

      // Add the created layers to the map.
      _mapImageOverlay.addTo(toRaw(map.value) as L.Map);
      // userMarkerLayer.addTo(toRaw(map.value) as L.Map);   // Add the group for the user arrow.
      userDebugPosition.addTo(toRaw(map.value) as L.Map); // Add the debug marker if needed.
      poiLayer?.addTo(toRaw(map.value) as L.Map);         // Add POI layer if provided.
      pathLayer?.addTo(toRaw(map.value) as L.Map);        // Add path layer if provided.

      console.log('Leaflet map initialized');
    });
  }

  /**
   * Ensures the user arrow marker exists and is added to the map via its layer group.
   * Creates the marker if it doesn't exist yet.
   */
  function showUserPosition() {
    if (!map.value) return;

    // Add user position circle if not present
    if (!map.value.hasLayer(userPosition)) {
      userPosition.addTo(map.value);
    }

    // Create heading marker if it doesn't exist
    if (!headingMarker.value) {
      headingMarker.value = L.marker([0, 0], { // Dummy position
        icon: headingArrowIcon,
        pane: 'userPane',
        zIndexOffset: 1001, // Slightly above the blue dot
        interactive: false,
      });
    }
    // Add heading marker if not present
    if (!map.value.hasLayer(headingMarker.value as L.Marker)) {
      headingMarker.value.addTo(map.value);
    }
  }

  /**
   * Removes the user arrow marker from the map by removing it from its layer group.
   */
  function hideUserPosition() {
    // Remove user position circle
    if (map.value && map.value.hasLayer(userPosition)) {
      map.value.removeLayer(userPosition);
    }
    // Remove heading marker
    if (headingMarker.value && map.value && map.value.hasLayer(headingMarker.value as L.Marker)) {
      map.value.removeLayer(headingMarker.value as L.Marker);
    }
  }

  /**
   * Sets the geographical bounds for the map and the image overlay.
   * @param sw - South-West corner coordinates [latitude, longitude].
   * @param ne - North-East corner coordinates [latitude, longitude].
   */
  function setMapBound(sw: [number, number], ne: [number, number]) {
    _mapBound = L.latLngBounds(sw, ne);      // Update the internal bounds variable.
    toRaw(map.value)?.fitBounds(_mapBound); // Adjust map view to show the new bounds.
    _mapImageOverlay?.setBounds(_mapBound);  // Resize the image overlay to match.
  }

  /**
   * (Deprecated - Use changeImageOverlay for better loading feedback)
   * Sets the URL for the image overlay.
   * @param filepath - The new image URL.
   */
  function setMapOverlay(filepath: string) {
    _mapImageOverlay?.setUrl(filepath);
  }

  /**
   * Updates the position of the user marker and rotates its SVG icon based on heading.
   * @param newLatLng - The user's new coordinates [latitude, longitude].
   * @param headingRad - The user's heading in radians, where 0 is North.
   */
  function setUserPosition(newLatLng: [number, number], headingRad: number) {
    showUserPosition(); // Ensure both markers are visible.

    // Update the blue dot position
    userPosition.setLatLng(newLatLng);

    if (headingMarker.value) {
      // --- Calculate Position for Arrow ---
      // Place the arrow slightly in front of the blue dot
      const offsetDistance = 0.00005; // Adjust as needed for visual spacing (~1 meter)
      // *** FIX: Use -headingRad like in your old code ***
      const arrowLat = newLatLng[0] + offsetDistance * Math.cos(-headingRad);
      const arrowLng = newLatLng[1] + offsetDistance * Math.sin(-headingRad);
      headingMarker.value.setLatLng([arrowLat, arrowLng]);
      // --- End Arrow Position ---

      // --- Rotate the Arrow Icon ---
      const element = headingMarker.value.getElement();
      if (element) {
        const svgElement = element.querySelector('svg');
        if (svgElement) {
          // *** FIX: Use -headingRad for rotation angle ***
          const headingDeg = -headingRad * (180 / Math.PI); // Convert NEGATED radians to degrees
          svgElement.style.transform = `rotate(${headingDeg}deg)`;
        }
      }
      // --- End Rotation ---
    }
  }

  /**
   * Updates the position of the orange debug marker.
   * @param newLatLng - The debug coordinates [latitude, longitude].
   */
  function setUserDebugPosition(newLatLng: [number, number]) {
    userDebugPosition.setLatLng(newLatLng);
  }

  /**
   * Centers the map view on the user's current position.
   */
  function setViewToUser() {
    if (userMarker.value) {
      map.value?.setView(userMarker.value.getLatLng());
    }
  }

  /**
   * Sets the center of the map view to specific coordinates.
   * @param latlng - The target coordinates [latitude, longitude].
   */
  function setView(latlng: [number, number]) {
    const loc = L.latLng(latlng[0], latlng[1]);
    map.value?.setView(loc);
  }

  /**
   * Changes the URL of the map's image overlay and returns a Promise
   * that resolves when the new image has loaded successfully.
   * @param newImageUrl - The URL of the new floor plan image.
   * @returns A Promise that resolves on successful load or rejects on error.
   */
  async function changeImageOverlay(newImageUrl: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (_mapImageOverlay) {
        // Temporarily attach 'load' and 'error' listeners for this specific change.
        _mapImageOverlay.once('load', () => resolve());
        _mapImageOverlay.once('error', (err) => {
          console.error('Failed to load new map image overlay', err);
          reject(new Error('Failed to load new map image overlay'));
        });
        // Set the new URL, which triggers Leaflet to fetch and display the image.
        _mapImageOverlay.setUrl(newImageUrl);
      } else {
        // If the overlay hasn't been created yet (e.g., init failed), reject.
        reject(new Error('Image overlay is not initialized'));
      }
    });
  }

  // Expose the functions that other parts of the application can use.
  return {
    init,
    setMapBound,
    setMapOverlay, // Included for completeness, though changeImageOverlay is preferred
    setUserPosition,
    setUserDebugPosition,
    setViewToUser,
    setView,
    changeImageOverlay,
    hideUserPosition, // Expose the function to hide the user marker
  };
}
