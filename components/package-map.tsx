'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useRouter } from 'next/navigation';
import { MapPin } from 'lucide-react';
import { type PackageData } from '@/lib/nostr-types';
import { getEffectiveStatus } from '@/lib/nostr';

// Custom default marker icon for Leaflet with Next.js
const DefaultIcon = L.divIcon({
  className: 'default-marker',
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#3B82F6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

// Custom marker icon for packages
const PackageIcon = L.divIcon({
  className: 'custom-package-marker',
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

// Custom marker icon for selected package
const SelectedPackageIcon = L.divIcon({
  className: 'selected-package-marker',
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});

// Helper component to recenter map
function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

// Helper component to center on user's location
function CenterOnMe() {
  const map = useMap();

  const handleClick = () => {
    map.locate({ setView: true, maxZoom: 16 });
  };

  return (
    <button
      onClick={handleClick}
      className='absolute bottom-4 right-4 z-[999] bg-white px-4 py-2 rounded-md shadow-md text-sm font-medium hover:bg-gray-100 transition-colors'
      style={{ zIndex: 999 }}
    >
      Center on Me
    </button>
  );
}

// Geocoding cache to prevent repeated API calls
const geocodingCache = new Map<string, [number, number] | null>();

// Convert address to coordinates using OpenStreetMap Nominatim with caching
async function getCoordinates(address: string): Promise<[number, number] | null> {
  // Check cache first
  if (geocodingCache.has(address)) {
    return geocodingCache.get(address) || null;
  }
  try {
    // Check if input is already coordinates
    const coordRegex = /^\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*$/;
    const match = address.match(coordRegex);

    if (match) {
      const lat = Number.parseFloat(match[1]);
      const lng = Number.parseFloat(match[2]);

      // Validate coordinates
      if (
        !isNaN(lat) &&
        !isNaN(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
      ) {
        return [lat, lng];
      }
    }

    // If not coordinates, try geocoding
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        address
      )}&limit=1`,
      {
        headers: {
          'User-Agent': 'AtoBApp/1.0',
        },
      }
    );

    const data = await response.json();
    
    if (data && data.length > 0) {
      const coords: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      geocodingCache.set(address, coords);
      return coords;
    }
    
    console.warn(`Geocoding failed for address: ${address}`);
    // Cache null results to prevent repeated failed requests
    geocodingCache.set(address, null);
    return null;
  } catch (error) {
    console.error('Error geocoding address:', error);
    // Cache null results for failed requests too
    geocodingCache.set(address, null);
    return null;
  }
}

interface PackageMapProps {
  packages: PackageData[];
  onSelectPackage?: (pkg: PackageData) => void;
  selectedPackage?: PackageData | null;
}

export default function PackageMap({
  packages,
  onSelectPackage,
  selectedPackage,
}: PackageMapProps) {
  const router = useRouter();
  const [center, setCenter] = useState<[number, number]>([20, 0]);
  const [packageCoordinates, setPackageCoordinates] = useState<Record<string, [number, number]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [geocodingErrors, setGeocodingErrors] = useState<string[]>([]);

  // Set initial center based on user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCenter([position.coords.latitude, position.coords.longitude]);
        },
        () => {
          // If geolocation fails, keep default center
          console.warn('Failed to get user location');
        }
      );
    }
  }, []);

  // Memoize packages that need geocoding to prevent unnecessary API calls
  const packagesToGeocode = useMemo(() => {
    return packages.filter(pkg => !packageCoordinates[pkg.id]);
  }, [packages, packageCoordinates]);

  // Geocode package locations with debouncing and batch processing
  useEffect(() => {
    if (packagesToGeocode.length === 0) return;

    const geocodePackages = async () => {
      setIsLoading(true);
      const newCoordinates: Record<string, [number, number]> = {};
      const errors: string[] = [];

      // Process packages in batches to avoid overwhelming the API
      const BATCH_SIZE = 3;
      for (let i = 0; i < packagesToGeocode.length; i += BATCH_SIZE) {
        const batch = packagesToGeocode.slice(i, i + BATCH_SIZE);
        
        // Process batch in parallel but with small delay between batches
        const batchPromises = batch.map(async (pkg) => {
          const coords = await getCoordinates(pkg.pickupLocation);
          if (coords) {
            newCoordinates[pkg.id] = coords;
          } else {
            errors.push(`Could not geocode address: ${pkg.pickupLocation}`);
          }
        });

        await Promise.all(batchPromises);
        
        // Small delay between batches to be nice to the API
        if (i + BATCH_SIZE < packagesToGeocode.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      setPackageCoordinates(prev => ({ ...prev, ...newCoordinates }));
      setGeocodingErrors(errors);
      setIsLoading(false);
    };

    // Debounce geocoding requests
    const timeoutId = setTimeout(geocodePackages, 300);
    return () => clearTimeout(timeoutId);
  }, [packagesToGeocode]); // Only depend on packages that need geocoding

  // Update center when selected package changes
  useEffect(() => {
    if (selectedPackage && packageCoordinates[selectedPackage.id]) {
      setCenter(packageCoordinates[selectedPackage.id]);
    }
  }, [selectedPackage, packageCoordinates]);

  return (
    <div className='relative h-full w-full' style={{ zIndex: 1 }}>
      {packages.length === 0 ? (
        <div className='flex justify-center items-center h-full text-gray-400'>
          <div className='text-center'>
            <MapPin className='h-16 w-16 mx-auto mb-4 text-purple-400' />
            <p>No packages available</p>
            <p className='text-sm text-gray-500 mt-2'>
              Packages will appear here when posted
            </p>
          </div>
        </div>
      ) : (
        <MapContainer
          center={center}
          zoom={2}
          style={{ height: '100%', width: '100%', display: 'block' }}
          className='z-0'
          attributionControl={true}
        >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url='https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        />

        {!isLoading && packages
          .filter((pkg) => getEffectiveStatus(pkg) === 'available')
          .map((pkg) => {
            const coords = packageCoordinates[pkg.id];
            if (!coords) return null; // Skip packages without valid coordinates
            
            const isSelected = selectedPackage?.id === pkg.id;
            return (
              <Marker
                key={pkg.id}
                position={coords}
                icon={isSelected ? SelectedPackageIcon : PackageIcon}
                eventHandlers={{
                  click: () => {
                    if (onSelectPackage) {
                      onSelectPackage(pkg);
                    }
                  },
                }}
              >
                <Popup>
                  <div className='p-1'>
                    <h3 className='font-medium'>{pkg.title}</h3>
                    <p className='text-xs text-gray-500'>
                      From: {pkg.pickupLocation}
                    </p>
                    <p className='text-xs text-gray-500'>
                      To: {pkg.destination}
                    </p>
                    <p className='text-xs font-medium mt-1'>{pkg.cost} sats</p>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        <RecenterMap lat={center[0]} lng={center[1]} />
        <CenterOnMe />
        </MapContainer>
      )}
      {isLoading && (
        <div className='absolute inset-0 bg-white/50 flex items-center justify-center'>
          <div className='animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full'></div>
        </div>
      )}
      {geocodingErrors.length > 0 && (
        <div className='absolute bottom-4 left-4 bg-black/60 border border-white/20 rounded-lg px-3 py-2 text-xs text-gray-300 backdrop-blur-sm'>
          Some locations couldn't be mapped
        </div>
      )}
    </div>
  );
}
