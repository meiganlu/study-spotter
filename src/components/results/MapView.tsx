"use client";

import React, { useEffect, useRef } from "react";
import type { StudySpot } from "@/types";
import { infoWindowHtml } from "@/lib/google/infoWindow";
import { ensureMapsLoaded } from "@/lib/google/maps";

export default function MapView({ spots, center }: { spots: StudySpot[]; center?: google.maps.LatLng; }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowsRef = useRef<google.maps.InfoWindow[]>([]);

  // Initialize map
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!containerRef.current) return;
      await ensureMapsLoaded();
      if (!mounted) return;
      if (!mapRef.current) {
        // Defaults to San Francisco until spots load
        mapRef.current = new google.maps.Map(containerRef.current, {
          center: center ? center : { lat: 37.7749, lng: -122.4194 },
          zoom: 13,
          gestureHandling: "auto",
        });
      }
    })();
    return () => { mounted = false; };
  }, [center]);

  // Update markers whenever the spots change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach(m => m.setMap(null));
    infoWindowsRef.current.forEach(iw => (typeof iw.close === "function") && iw.close());
    markersRef.current = [];
    infoWindowsRef.current = [];

    spots.forEach(spot => {
      const marker = new google.maps.Marker({
        position: spot.geometry.location,
        map,
        title: spot.name,
      });

      const infow = new google.maps.InfoWindow({
        content: infoWindowHtml({ name: spot.name, vicinity: spot.vicinity, rating: spot.rating }),
      });

      // Show the spot's info when its marker is clicked
      marker.addListener("click", () => infow.open(map, marker));
      markersRef.current.push(marker);
      infoWindowsRef.current.push(infow);
    });

    // Sets initial Map view around the first spot
    if (spots.length && spots[0].geometry?.location) {
      map.panTo(spots[0].geometry.location);
    }
  }, [spots]);

  // Cleanup
  useEffect(() => {
    return () => {
      markersRef.current.forEach(m => m.setMap(null));
      infoWindowsRef.current.forEach(iw => (typeof iw.close === "function") && iw.close());
      markersRef.current = [];
      infoWindowsRef.current = [];
      if (mapRef.current) {
        google.maps.event.clearInstanceListeners(mapRef.current);
      }
    };
  }, []);

  return <div ref={containerRef} className="w-full h-full rounded-2xl shadow-lg" />;
}
