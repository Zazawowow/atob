'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { MapPin } from 'lucide-react';
import { type PackageData, type JobData } from '@/lib/nostr-types';

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const useMap = dynamic(() => import('react-leaflet').then(mod => mod.useMap), { ssr: false });

// Dynamically import Leaflet CSS
if (typeof window !== 'undefined') {
  import('leaflet/dist/leaflet.css');
}

let L: any;
if (typeof window !== 'undefined') {
  L = require('leaflet');
}

// Helper function to create icons safely
const createIcon = (color: string, className: string) => {
  if (typeof window === 'undefined' || !L) return null;
  
  return L.divIcon({
    className,
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="${color}" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });
};

// Helper component to recenter map
function RecenterMap({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (map && typeof map.setView === 'function' && typeof map.getZoom === 'function') {
      // Use setView with animation options for smooth centering
      map.setView([lat, lng], zoom ?? map.getZoom(), {
        animate: true,
        duration: 0.25 // 250ms animation duration
      });
    }
  }, [lat, lng, zoom, map]);
  return null;
}

// Helper component to center on user's location
function CenterOnMe() {
  const map = useMap();

  const handleClick = () => {
    if (map && typeof map.locate === 'function') {
      map.locate({ setView: true, maxZoom: 16 });
    }
  };

  return (
    <button
      onClick={handleClick}
      className='absolute bottom-4 right-4 z-[999] px-3 py-2 rounded-lg border bg-black/60 border-purple-400/30 text-[#FAFAFA] text-sm font-medium shadow-purple-glow/10 backdrop-blur-sm hover:bg-purple-400/10 hover:border-purple-400/40 transition-colors'
      style={{ zIndex: 999 }}
    >
      Center on Me
    </button>
  );
}

// Geocoding cache with basic TTL for failed lookups to prevent stale nulls
type CachedGeocode = {
  coords: [number, number] | null;
  timestamp: number;
  attempts: number;
};
const geocodingCache = new Map<string, CachedGeocode>();
const NULL_TTL_MS = 5 * 60 * 1000; // retry failed addresses after 5 minutes

// Convert address to coordinates using OpenStreetMap Nominatim with caching
async function getCoordinates(address: string, options?: { force?: boolean }): Promise<[number, number] | null> {
  const force = options?.force === true;
  // Guard against missing/empty addresses
  if (!address || address.trim().length === 0) {
    return null;
  }
  // Check cache first unless forcing
  if (!force && geocodingCache.has(address)) {
    const entry = geocodingCache.get(address)!;
    // If we have valid coords and they're fresh, return immediately
    if (entry.coords) {
      return entry.coords;
    }
    // For null entries, only retry if TTL expired
    const ageMs = Date.now() - entry.timestamp;
    if (ageMs < NULL_TTL_MS) {
      return null;
    }
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
    if (!response.ok) {
      throw new Error(`Geocoding HTTP ${response.status}`);
    }
    const data = await response.json();
    
    if (data && data.length > 0) {
      const coords: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      geocodingCache.set(address, { coords, timestamp: Date.now(), attempts: (geocodingCache.get(address)?.attempts || 0) + 1 });
      return coords;
    }
    
    console.warn(`Geocoding failed for address: ${address}`);
    // Cache null results with timestamp so we can retry later
    geocodingCache.set(address, { coords: null, timestamp: Date.now(), attempts: (geocodingCache.get(address)?.attempts || 0) + 1 });
    return null;
  } catch (error) {
    // Use warn instead of error to avoid Next dev overlay while still surfacing issues
    if (typeof window !== 'undefined') {
      console.warn('Geocoding request failed; continuing without pin:', error);
    }
    // Cache null results for failed requests too, with timestamp
    geocodingCache.set(address, { coords: null, timestamp: Date.now(), attempts: (geocodingCache.get(address)?.attempts || 0) + 1 });
    return null;
  }
}

interface ActivityMapProps {
  deliveries?: PackageData[];
  jobs?: JobData[];
  packages?: PackageData[];
  selectedDelivery?: PackageData | null;
  selectedJob?: JobData | null;
  selectedPackage?: PackageData | null;
  onSelectJob?: (job: JobData) => void;
  onSelectPackage?: (pkg: PackageData) => void;
  onSelectDelivery?: (delivery: PackageData) => void;
}

export default function ActivityMap({
  deliveries = [],
  jobs = [],
  packages = [],
  selectedDelivery,
  selectedJob,
  selectedPackage,
  onSelectJob,
  onSelectPackage,
  onSelectDelivery,
}: ActivityMapProps) {
  const [center, setCenter] = useState<[number, number]>([20, 0]);
  const [zoom, setZoom] = useState<number>(2);
  const [coordinates, setCoordinates] = useState<Record<string, [number, number]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [geocodingErrors, setGeocodingErrors] = useState<string[]>([]);
  const [lastAddressById, setLastAddressById] = useState<Record<string, string>>({});
  
  // Refs for markers to enable programmatic popup control
  const markerRefs = useRef<Record<string, any>>({});

  // Create icons safely
  const deliveryIcon = createIcon('#06B6D4', 'delivery-marker');
  const jobIcon = createIcon('#10B981', 'job-marker');
  const packageIcon = createIcon('#8B5CF6', 'package-marker');

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

  // Collect all items that need geocoding
  const itemsToGeocode = useMemo(() => {
    const items: Array<{ id: string; location: string; type: string; force: boolean }> = [];
    
    // Add deliveries
    deliveries.forEach(delivery => {
      const id = `delivery-${delivery.id}`;
      const location = delivery.pickupLocation;
      const addressChanged = lastAddressById[id] !== location;
      if (!coordinates[id] || addressChanged) {
        items.push({ id, location, type: 'delivery', force: addressChanged });
      }
    });
    
    // Add jobs
    jobs.forEach(job => {
      const id = `job-${job.id}`;
      const location = job.location;
      const addressChanged = lastAddressById[id] !== location;
      if (!coordinates[id] || addressChanged) {
        items.push({ id, location, type: 'job', force: addressChanged });
      }
    });
    
    // Add packages
    packages.forEach(pkg => {
      const id = `package-${pkg.id}`;
      const location = pkg.pickupLocation;
      const addressChanged = lastAddressById[id] !== location;
      if (!coordinates[id] || addressChanged) {
        items.push({ id, location, type: 'package', force: addressChanged });
      }
    });
    
    return items;
  }, [deliveries, jobs, packages, coordinates, lastAddressById]);

  // Geocode locations
  useEffect(() => {
    if (itemsToGeocode.length === 0) {
      setIsLoading(false);
      return;
    }

    const geocodeItems = async () => {
      setIsLoading(true);
      const newCoordinates: Record<string, [number, number]> = {};
      const errors: string[] = [];
      const newLastAddresses: Record<string, string> = {};

      // Process items in batches
      const BATCH_SIZE = 3;
      for (let i = 0; i < itemsToGeocode.length; i += BATCH_SIZE) {
        const batch = itemsToGeocode.slice(i, i + BATCH_SIZE);
        
        const batchPromises = batch.map(async (item) => {
          const coords = await getCoordinates(item.location, { force: item.force });
          if (coords) {
            newCoordinates[item.id] = coords;
          } else {
            errors.push(`Could not geocode address: ${item.location}`);
          }
          newLastAddresses[item.id] = item.location;
        });

        await Promise.all(batchPromises);
        
        if (i + BATCH_SIZE < itemsToGeocode.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      setCoordinates(prev => ({ ...prev, ...newCoordinates }));
      setGeocodingErrors(errors);
      if (Object.keys(newLastAddresses).length > 0) {
        setLastAddressById(prev => ({ ...prev, ...newLastAddresses }));
      }
      setIsLoading(false);
    };

    const timeoutId = setTimeout(geocodeItems, 300);
    return () => clearTimeout(timeoutId);
  }, [itemsToGeocode]);

  // Update center when selected item changes
  useEffect(() => {
    if (selectedDelivery && coordinates[`delivery-${selectedDelivery.id}`]) {
      setCenter(coordinates[`delivery-${selectedDelivery.id}`]);
      setZoom(13);
    } else if (selectedJob && coordinates[`job-${selectedJob.id}`]) {
      setCenter(coordinates[`job-${selectedJob.id}`]);
      setZoom(13);
    } else if (selectedPackage && coordinates[`package-${selectedPackage.id}`]) {
      setCenter(coordinates[`package-${selectedPackage.id}`]);
      setZoom(13);
    } else {
      // No selection: try to center on all items or fall back to user location
      const allCoords = Object.values(coordinates);
      if (allCoords.length > 0) {
        // Calculate center of all items
        const avgLat = allCoords.reduce((sum, coord) => sum + coord[0], 0) / allCoords.length;
        const avgLng = allCoords.reduce((sum, coord) => sum + coord[1], 0) / allCoords.length;
        setCenter([avgLat, avgLng]);
      }
      setZoom(3);
    }
  }, [selectedDelivery, selectedJob, selectedPackage, coordinates]);

  // Auto-open popup when item is selected
  useEffect(() => {
    if (selectedDelivery && markerRefs.current[`delivery-${selectedDelivery.id}`]) {
      setTimeout(() => {
        markerRefs.current[`delivery-${selectedDelivery.id}`]?.openPopup();
      }, 300); // Increased delay to ensure map has recentered
    } else if (selectedJob && markerRefs.current[`job-${selectedJob.id}`]) {
      setTimeout(() => {
        markerRefs.current[`job-${selectedJob.id}`]?.openPopup();
      }, 300);
    } else if (selectedPackage && markerRefs.current[`package-${selectedPackage.id}`]) {
      setTimeout(() => {
        markerRefs.current[`package-${selectedPackage.id}`]?.openPopup();
      }, 300);
    }
  }, [selectedDelivery, selectedJob, selectedPackage]);

  const allItems = [...deliveries, ...jobs, ...packages];

  return (
    <div className='relative h-full w-full' style={{ zIndex: 1 }}>
      {allItems.length === 0 ? (
        <div className='flex justify-center items-center h-full text-gray-400'>
          <div className='text-center'>
            <MapPin className='h-16 w-16 mx-auto mb-4 text-purple-400' />
            <p>No locations to display</p>
            <p className='text-sm text-gray-500 mt-2'>
              Items with locations will appear here
            </p>
          </div>
        </div>
      ) : (
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: '100%', width: '100%', display: 'block' }}
          className='z-0'
          attributionControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url='https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
          />

          {!isLoading && (
            <>
              {/* Delivery markers */}
              {deliveries.map((delivery) => {
                const coords = coordinates[`delivery-${delivery.id}`];
                if (!coords || !deliveryIcon) return null;
                
                const isSelected = selectedDelivery?.id === delivery.id;
                return (
                  <Marker
                    key={`delivery-${delivery.id}`}
                    position={coords}
                    icon={deliveryIcon}
                    ref={(ref) => {
                      if (ref) markerRefs.current[`delivery-${delivery.id}`] = ref;
                    }}
                    eventHandlers={{
                      click: () => {
                        if (onSelectDelivery) onSelectDelivery(delivery);
                      },
                    }}
                  >
                    <Popup>
                      <div className='p-1'>
                        <h3 className='font-medium text-cyan-400'>Delivery</h3>
                        <h4 className='font-medium'>{delivery.title}</h4>
                        <p className='text-xs text-gray-500'>
                          From: {delivery.pickupLocation}
                        </p>
                        <p className='text-xs text-gray-500'>
                          To: {delivery.destination}
                        </p>
                        <p className='text-xs font-medium mt-1'>{delivery.cost} sats</p>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {/* Job markers */}
              {jobs.map((job) => {
                const coords = coordinates[`job-${job.id}`];
                if (!coords || !jobIcon) return null;
                
                const isSelected = selectedJob?.id === job.id;
                return (
                  <Marker
                    key={`job-${job.id}`}
                    position={coords}
                    icon={jobIcon}
                    ref={(ref) => {
                      if (ref) markerRefs.current[`job-${job.id}`] = ref;
                    }}
                    eventHandlers={{
                      click: () => {
                        if (onSelectJob) onSelectJob(job);
                      },
                    }}
                  >
                    <Popup>
                      <div className='p-1'>
                        <h3 className='font-medium text-green-400'>Job</h3>
                        <h4 className='font-medium'>{job.title}</h4>
                        <p className='text-xs text-gray-500'>
                          Location: {job.location}
                        </p>
                        <p className='text-xs text-gray-500'>
                          People needed: {job.peopleNeeded}
                        </p>
                        <p className='text-xs font-medium mt-1'>{job.compensation} sats</p>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {/* Package markers */}
              {packages.map((pkg) => {
                const coords = coordinates[`package-${pkg.id}`];
                if (!coords || !packageIcon) return null;
                
                const isSelected = selectedPackage?.id === pkg.id;
                return (
                  <Marker
                    key={`package-${pkg.id}`}
                    position={coords}
                    icon={packageIcon}
                    ref={(ref) => {
                      if (ref) markerRefs.current[`package-${pkg.id}`] = ref;
                    }}
                    eventHandlers={{
                      click: () => {
                        if (onSelectPackage) onSelectPackage(pkg);
                      },
                    }}
                  >
                    <Popup>
                      <div className='p-1'>
                        <h3 className='font-medium text-purple-400'>Package</h3>
                        <h4 className='font-medium'>{pkg.title}</h4>
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
            </>
          )}

          <RecenterMap lat={center[0]} lng={center[1]} zoom={zoom} />
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