'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import type { CircleMarker, Map as LeafletMap } from 'leaflet'
import { CAMPUS_CENTER, CAMPUS_SPOTS } from '@/lib/campus-spots'

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

function token(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

// Supplementary map: the "Pick a spot" select next to it is the accessible
// control; pins mirror it. Pins are approximate (see lib/campus-spots.ts).
export function CampusMap({
  selectedSpotId,
  onSelectSpot,
}: {
  selectedSpotId: string | null
  onSelectSpot: (id: string | null) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<Map<string, CircleMarker>>(new Map())
  const onSelectRef = useRef(onSelectSpot)
  const selectedRef = useRef(selectedSpotId)

  useEffect(() => {
    onSelectRef.current = onSelectSpot
    selectedRef.current = selectedSpotId
  })

  // Leaflet touches window, so it loads only in the browser.
  useEffect(() => {
    let map: LeafletMap | null = null
    let cancelled = false
    const markers = markersRef.current
    import('leaflet').then((L) => {
      if (cancelled || !containerRef.current) return
      map = L.map(containerRef.current, { scrollWheelZoom: false }).setView(
        [CAMPUS_CENTER.lat, CAMPUS_CENTER.lng],
        CAMPUS_CENTER.zoom
      )
      L.tileLayer(TILE_URL, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(map)
      for (const spot of CAMPUS_SPOTS) {
        const marker = L.circleMarker([spot.lat, spot.lng], {
          radius: 10,
          weight: 2,
          color: token('--card', '#ffffff'),
          fillColor: token('--foreground', '#1d1d1f'),
          fillOpacity: 0.9,
        })
          .addTo(map)
          .bindTooltip(`${spot.name} (approximate)`)
          .on('click', () => onSelectRef.current(selectedRef.current === spot.id ? null : spot.id))
        markers.set(spot.id, marker)
      }
    })
    return () => {
      cancelled = true
      markers.clear()
      map?.remove()
    }
  }, [])

  // The chosen spot uses the selection colour (violet = selection).
  useEffect(() => {
    for (const [id, marker] of markersRef.current) {
      marker.setStyle({
        fillColor: id === selectedSpotId ? token('--primary', '#4d34d5') : token('--foreground', '#1d1d1f'),
        radius: id === selectedSpotId ? 13 : 10,
      })
    }
  }, [selectedSpotId])

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Campus map of photo spots (pins are approximate)"
      className="relative isolate z-0 h-72 w-full overflow-hidden rounded-2xl bg-muted"
    />
  )
}
