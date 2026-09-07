import countries from "world-atlas/countries-50m.json";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";

export type WorldCountry = {
  id: string;
  geometry: GeoJSON.MultiPolygon | GeoJSON.Polygon;
};

export function getWorldCountries(): WorldCountry[] {
  const topology = countries as unknown as Topology;
  const collection = feature(
    topology,
    topology.objects.countries as GeometryCollection,
  ) as GeoJSON.FeatureCollection<GeoJSON.MultiPolygon | GeoJSON.Polygon>;

  return collection.features.map((item) => ({
    id: String(item.id),
    geometry: item.geometry,
  }));
}

export function getUnitedStatesGeometry() {
  return getWorldCountries().find((country) => country.id === "840")?.geometry;
}
