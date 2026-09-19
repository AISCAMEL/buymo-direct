'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import Link from 'next/link';
import { formatYen } from '@/lib/format';

export type ListingPin = {
  id: string;
  title: string;
  maker: string;
  model: string;
  price: number;
  year: number;
  coverUrl: string | null;
};

export type PrefectureGroup = {
  prefecture: string;
  coords: [number, number];
  count: number;
  listings: ListingPin[];
};

function makeIcon(count: number) {
  const size = count >= 100 ? 48 : count >= 10 ? 42 : 36;
  const fontSize = count >= 100 ? 11 : 13;
  return L.divIcon({
    html: `<div style="
      width:${size}px;height:${size}px;
      border-radius:50%;
      background:#0F766E;
      color:white;
      display:flex;align-items:center;justify-content:center;
      font-weight:700;font-size:${fontSize}px;font-family:sans-serif;
      border:2.5px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.35);
      cursor:pointer;
    ">${count}</div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)],
  });
}

export function MapListingsInner({ groups }: { groups: PrefectureGroup[] }) {
  return (
    <MapContainer
      center={[36.5, 136.0]}
      zoom={5}
      className="h-full w-full rounded-xl"
      scrollWheelZoom
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {groups.map((group) => (
        <Marker key={group.prefecture} position={group.coords} icon={makeIcon(group.count)}>
          <Popup minWidth={220} maxWidth={280}>
            <div style={{ fontFamily: 'sans-serif' }}>
              <p style={{ fontWeight: 700, marginBottom: 8, color: '#0F766E' }}>
                {group.prefecture}（{group.count}件）
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {group.listings.slice(0, 3).map((l) => (
                  <li key={l.id} style={{ marginBottom: 6 }}>
                    <a
                      href={`/listings/${l.id}`}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'inherit' }}
                    >
                      {l.coverUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={l.coverUrl}
                          alt=""
                          style={{ width: 56, height: 40, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
                        />
                      )}
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {l.maker} {l.model} {l.year}年
                        </p>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#059669' }}>
                          {formatYen(l.price)}
                        </p>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
              {group.count > 3 && (
                <a
                  href={`/listings?prefs=${encodeURIComponent(group.prefecture)}`}
                  style={{ display: 'block', marginTop: 8, fontSize: 11, fontWeight: 700, color: '#0F766E', textAlign: 'center' }}
                >
                  {group.prefecture}の出品をすべて見る（{group.count}件）→
                </a>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
