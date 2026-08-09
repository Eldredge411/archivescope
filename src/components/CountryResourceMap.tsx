"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import type { Country, Institution, Resource } from "@/types";
import { countryStatusZh } from "@/lib/display";

type CountryResourceMapProps = {
  countries: Country[];
  institutions: Institution[];
  resources: Resource[];
};

type MetricKey =
  | "allResources"
  | "laws"
  | "policies"
  | "digitalResources"
  | "publicAccess"
  | "institutions"
  | "backups";

type MetricOption = {
  key: MetricKey;
  label: string;
  description: string;
};

type Topology = {
  type: "Topology";
  transform?: {
    scale: [number, number];
    translate: [number, number];
  };
  arcs: [number, number][][];
  objects: {
    countries: {
      geometries: TopoGeometry[];
    };
  };
};

type TopoGeometry = {
  type: "Polygon" | "MultiPolygon";
  id?: string | number;
  properties?: Record<string, unknown>;
  arcs: number[][] | number[][][];
};

type WorldFeature = {
  id: string;
  name: string;
  displayName: string;
  numericId?: string;
  iso2?: string;
  iso3?: string;
  path: string;
  properties?: Record<string, unknown>;
};

type RenderFeature = WorldFeature & {
  country: Country | null;
  value: number;
};

type HoverState = {
  feature: RenderFeature;
  x: number;
  y: number;
  flipX: boolean;
};

const mapWidth = 960;
const mapHeight = 500;
const mapViewBoxY = 0;
const mapViewBoxHeight = 500;
const worldMapUrl =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const zhRegionNames =
  typeof Intl !== "undefined"
    ? new Intl.DisplayNames(["zh-CN"], { type: "region" })
    : null;

const metricOptions: MetricOption[] = [
  {
    key: "allResources",
    label: "全部资料",
    description: "统计该国家当前收录的全部资料数量。",
  },
  {
    key: "laws",
    label: "法律法规",
    description: "统计法律法规类资料数量。",
  },
  {
    key: "policies",
    label: "政策战略",
    description: "统计政策与战略类资料数量。",
  },
  {
    key: "digitalResources",
    label: "数字资源建设",
    description: "统计数字资源建设与长期保存专题下的资料数量。",
  },
  {
    key: "publicAccess",
    label: "开放利用与公众参与",
    description: "统计开放利用、展览教育与公众参与专题下的资料数量。",
  },
  {
    key: "institutions",
    label: "相关机构",
    description: "统计该国家已收录的相关机构数量。",
  },
  {
    key: "backups",
    label: "来源快照",
    description: "统计该国家已保存来源快照或备份的资料数量。",
  },
];

const countryNameAliases: Record<string, string> = {
  "UNITED STATES": "usa",
  "UNITED STATES OF AMERICA": "usa",
  "UNITED KINGDOM": "uk",
  "GREAT BRITAIN": "uk",
  BRITAIN: "uk",
  CANADA: "canada",
  AUSTRALIA: "australia",
  JAPAN: "japan",
  CHINA: "china",
  CN: "china",
  CHN: "china",
  "PEOPLE'S REPUBLIC OF CHINA": "china",
  "HONG KONG": "china",
  HK: "china",
  HKG: "china",
  MACAO: "china",
  MACAU: "china",
  MO: "china",
  MAC: "china",
  TAIWAN: "china",
  TW: "china",
  TWN: "china",
  "TAIWAN, PROVINCE OF CHINA": "china",
  "CHINESE TAIPEI": "china",
  台湾: "china",
  中华台北: "china",
  FRANCE: "france",
  GERMANY: "germany",
};

const numericCountryAliases: Record<string, string> = {
  "036": "australia",
  "124": "canada",
  "156": "china",
  "158": "china",
  "344": "china",
  "446": "china",
  "250": "france",
  "276": "germany",
  "392": "japan",
  "826": "uk",
  "840": "usa",
};

const numericRegionToIso2: Record<string, string> = {
  "004": "AF",
  "008": "AL",
  "010": "AQ",
  "012": "DZ",
  "016": "AS",
  "020": "AD",
  "024": "AO",
  "028": "AG",
  "031": "AZ",
  "032": "AR",
  "036": "AU",
  "040": "AT",
  "044": "BS",
  "048": "BH",
  "050": "BD",
  "051": "AM",
  "052": "BB",
  "056": "BE",
  "060": "BM",
  "064": "BT",
  "068": "BO",
  "070": "BA",
  "072": "BW",
  "074": "BV",
  "076": "BR",
  "084": "BZ",
  "086": "IO",
  "090": "SB",
  "092": "VG",
  "096": "BN",
  "100": "BG",
  "104": "MM",
  "108": "BI",
  "112": "BY",
  "116": "KH",
  "120": "CM",
  "124": "CA",
  "132": "CV",
  "136": "KY",
  "140": "CF",
  "144": "LK",
  "148": "TD",
  "152": "CL",
  "156": "CN",
  "158": "TW",
  "162": "CX",
  "166": "CC",
  "170": "CO",
  "174": "KM",
  "175": "YT",
  "178": "CG",
  "180": "CD",
  "184": "CK",
  "188": "CR",
  "191": "HR",
  "192": "CU",
  "196": "CY",
  "203": "CZ",
  "204": "BJ",
  "208": "DK",
  "212": "DM",
  "214": "DO",
  "218": "EC",
  "222": "SV",
  "226": "GQ",
  "231": "ET",
  "232": "ER",
  "233": "EE",
  "234": "FO",
  "238": "FK",
  "239": "GS",
  "242": "FJ",
  "246": "FI",
  "248": "AX",
  "250": "FR",
  "254": "GF",
  "258": "PF",
  "260": "TF",
  "262": "DJ",
  "266": "GA",
  "268": "GE",
  "270": "GM",
  "275": "PS",
  "276": "DE",
  "288": "GH",
  "292": "GI",
  "296": "KI",
  "300": "GR",
  "304": "GL",
  "308": "GD",
  "312": "GP",
  "316": "GU",
  "320": "GT",
  "324": "GN",
  "328": "GY",
  "332": "HT",
  "334": "HM",
  "336": "VA",
  "340": "HN",
  "344": "HK",
  "348": "HU",
  "352": "IS",
  "356": "IN",
  "360": "ID",
  "364": "IR",
  "368": "IQ",
  "372": "IE",
  "376": "IL",
  "380": "IT",
  "384": "CI",
  "388": "JM",
  "392": "JP",
  "398": "KZ",
  "400": "JO",
  "404": "KE",
  "408": "KP",
  "410": "KR",
  "414": "KW",
  "417": "KG",
  "418": "LA",
  "422": "LB",
  "426": "LS",
  "428": "LV",
  "430": "LR",
  "434": "LY",
  "438": "LI",
  "440": "LT",
  "442": "LU",
  "446": "MO",
  "450": "MG",
  "454": "MW",
  "458": "MY",
  "462": "MV",
  "466": "ML",
  "470": "MT",
  "474": "MQ",
  "478": "MR",
  "480": "MU",
  "484": "MX",
  "492": "MC",
  "496": "MN",
  "498": "MD",
  "499": "ME",
  "500": "MS",
  "504": "MA",
  "508": "MZ",
  "512": "OM",
  "516": "NA",
  "520": "NR",
  "524": "NP",
  "528": "NL",
  "531": "CW",
  "533": "AW",
  "534": "SX",
  "535": "BQ",
  "540": "NC",
  "548": "VU",
  "554": "NZ",
  "558": "NI",
  "562": "NE",
  "566": "NG",
  "570": "NU",
  "574": "NF",
  "578": "NO",
  "580": "MP",
  "581": "UM",
  "583": "FM",
  "584": "MH",
  "585": "PW",
  "586": "PK",
  "591": "PA",
  "598": "PG",
  "600": "PY",
  "604": "PE",
  "608": "PH",
  "612": "PN",
  "616": "PL",
  "620": "PT",
  "624": "GW",
  "626": "TL",
  "630": "PR",
  "634": "QA",
  "638": "RE",
  "642": "RO",
  "643": "RU",
  "646": "RW",
  "652": "BL",
  "654": "SH",
  "659": "KN",
  "660": "AI",
  "662": "LC",
  "663": "MF",
  "666": "PM",
  "670": "VC",
  "674": "SM",
  "678": "ST",
  "682": "SA",
  "686": "SN",
  "688": "RS",
  "690": "SC",
  "694": "SL",
  "702": "SG",
  "703": "SK",
  "704": "VN",
  "705": "SI",
  "706": "SO",
  "710": "ZA",
  "716": "ZW",
  "724": "ES",
  "728": "SS",
  "729": "SD",
  "732": "EH",
  "740": "SR",
  "744": "SJ",
  "748": "SZ",
  "752": "SE",
  "756": "CH",
  "760": "SY",
  "762": "TJ",
  "764": "TH",
  "768": "TG",
  "772": "TK",
  "776": "TO",
  "780": "TT",
  "784": "AE",
  "788": "TN",
  "792": "TR",
  "795": "TM",
  "796": "TC",
  "798": "TV",
  "800": "UG",
  "804": "UA",
  "807": "MK",
  "818": "EG",
  "826": "GB",
  "831": "GG",
  "832": "JE",
  "833": "IM",
  "834": "TZ",
  "840": "US",
  "850": "VI",
  "854": "BF",
  "858": "UY",
  "860": "UZ",
  "862": "VE",
  "876": "WF",
  "882": "WS",
  "887": "YE",
  "894": "ZM",
};

const chineseNameAliases: Record<string, string> = {
  KOSOVO: "科索沃",
  "NORTHERN CYPRUS": "北塞浦路斯",
  SOMALILAND: "索马里兰",
  "HONG KONG": "中国香港",
  MACAO: "中国澳门",
  MACAU: "中国澳门",
  TAIWAN: "中国台湾",
  "TAIWAN, PROVINCE OF CHINA": "中国台湾",
  "CHINESE TAIPEI": "中国台湾",
};

const robinsonX = [
  1, 0.9986, 0.9954, 0.99, 0.9822, 0.973, 0.96, 0.9427, 0.9216, 0.8962,
  0.8679, 0.835, 0.7986, 0.7597, 0.7186, 0.6732, 0.6213, 0.5722, 0.5322,
];

const robinsonY = [
  0, 0.062, 0.124, 0.186, 0.248, 0.31, 0.372, 0.434, 0.4958, 0.5571,
  0.6176, 0.6769, 0.7346, 0.7903, 0.8435, 0.8936, 0.9394, 0.9761, 1,
];

const untrackedFill = "#dfe4d6";
const strokeColor = "#f7fbf4";
const mapRegionOverrides: Record<
  string,
  {
    name: string;
    displayName: string;
  }
> = {
  china: {
    name: "China",
    displayName: "中国",
  },
};

function normalizeLookupValue(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function getPropertyValue(
  properties: Record<string, unknown> | undefined,
  keys: string[],
) {
  for (const key of keys) {
    const value = properties?.[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value);
    }
  }

  return "";
}

function getNumericId(value: unknown) {
  const normalized = String(value ?? "").trim();

  if (!/^\d+$/.test(normalized)) {
    return "";
  }

  return normalized.padStart(3, "0");
}

function getLocalizedRegionName({
  fallbackName,
  iso2,
  numericId,
}: {
  fallbackName: string;
  iso2?: string;
  numericId?: string;
}) {
  const regionCode = iso2 || (numericId ? numericRegionToIso2[numericId] : "");
  const alias = chineseNameAliases[normalizeLookupValue(fallbackName)];

  if (numericId === "158" || normalizeLookupValue(iso2) === "TW") {
    return "中国台湾";
  }

  if (numericId === "344" || normalizeLookupValue(iso2) === "HK") {
    return "中国香港";
  }

  if (numericId === "446" || normalizeLookupValue(iso2) === "MO") {
    return "中国澳门";
  }

  if (alias) {
    return alias;
  }

  if (regionCode && zhRegionNames) {
    try {
      const localized = zhRegionNames.of(regionCode);

      if (localized && localized !== regionCode) {
        return localized;
      }
    } catch {
      return fallbackName;
    }
  }

  return fallbackName;
}

function getMetricValue(
  metric: MetricKey,
  countryId: string,
  resources: Resource[],
  institutions: Institution[],
) {
  const countryResources = resources.filter(
    (resource) => resource.countryId === countryId,
  );

  if (metric === "allResources") {
    return countryResources.length;
  }

  if (metric === "laws") {
    return countryResources.filter((resource) =>
      ["law", "regulation"].includes(resource.resourceType),
    ).length;
  }

  if (metric === "policies") {
    return countryResources.filter((resource) =>
      ["policy", "strategy"].includes(resource.resourceType),
    ).length;
  }

  if (metric === "digitalResources") {
    return countryResources.filter((resource) =>
      resource.topicIds.includes("digital-resources-preservation"),
    ).length;
  }

  if (metric === "publicAccess") {
    return countryResources.filter((resource) =>
      resource.topicIds.includes("access-outreach-public-participation"),
    ).length;
  }

  if (metric === "institutions") {
    return institutions.filter((institution) => institution.countryId === countryId)
      .length;
  }

  return countryResources.filter((resource) => resource.hasBackup).length;
}

function getFillColor(value: number) {
  if (value === 0) {
    return "#dfe4d6";
  }

  if (value <= 2) {
    return "#b9d8b4";
  }

  if (value <= 5) {
    return "#80be84";
  }

  if (value <= 10) {
    return "#3f9362";
  }

  return "#1f5d45";
}

function getClickTarget(metric: MetricKey, countryId: string) {
  if (metric === "laws") {
    return `/resources?country=${countryId}&type=law`;
  }

  if (metric === "policies") {
    return `/resources?country=${countryId}&type=strategy`;
  }

  if (metric === "digitalResources") {
    return `/resources?country=${countryId}&topic=digital-resources-preservation`;
  }

  if (metric === "publicAccess") {
    return `/resources?country=${countryId}&topic=access-outreach-public-participation`;
  }

  if (metric === "institutions") {
    return `/institutions?country=${countryId}`;
  }

  if (metric === "backups") {
    return `/resources?country=${countryId}&snapshotStatus=complete`;
  }

  return `/resources?country=${countryId}`;
}

function buildCountryLookup(countries: Country[]) {
  const lookup = new Map<string, Country>();

  for (const country of countries) {
    [
      country.id,
      country.slug,
      country.code,
      country.iso2,
      country.iso3,
      country.nameZh,
      country.nameEn,
    ].forEach((value) => {
      lookup.set(normalizeLookupValue(value), country);
    });
  }

  Object.entries(countryNameAliases).forEach(([name, countryId]) => {
    const country = countries.find((item) => item.id === countryId);

    if (country) {
      lookup.set(name, country);
    }
  });

  Object.entries(numericCountryAliases).forEach(([numericId, countryId]) => {
    const country = countries.find((item) => item.id === countryId);

    if (country) {
      lookup.set(numericId, country);
      lookup.set(String(Number(numericId)), country);
    }
  });

  return lookup;
}

function findCountryForFeature(
  feature: WorldFeature,
  lookup: Map<string, Country>,
) {
  const candidates = [
    feature.iso3,
    feature.iso2,
    feature.numericId,
    feature.id,
    feature.name,
    feature.displayName,
    getPropertyValue(feature.properties, [
      "ISO_A3",
      "ADM0_A3",
      "iso_a3",
      "ISO3",
      "iso3",
      "SU_A3",
      "GU_A3",
    ]),
    getPropertyValue(feature.properties, [
      "NAME_ZH",
      "NAME_EN",
      "NAME",
      "name",
      "ADMIN",
      "admin",
    ]),
  ];

  for (const value of candidates) {
    const normalized = normalizeLookupValue(value);
    const country = lookup.get(normalized);

    if (country) {
      return country;
    }
  }

  return null;
}

function findCanonicalCountryIdForFeature(feature: WorldFeature) {
  const candidates = [
    feature.iso3,
    feature.iso2,
    feature.numericId,
    feature.id,
    feature.name,
    feature.displayName,
    getPropertyValue(feature.properties, [
      "ISO_A3",
      "ADM0_A3",
      "iso_a3",
      "ISO3",
      "iso3",
      "SU_A3",
      "GU_A3",
    ]),
    getPropertyValue(feature.properties, [
      "NAME_ZH",
      "NAME_EN",
      "NAME",
      "name",
      "ADMIN",
      "admin",
    ]),
  ];

  for (const value of candidates) {
    const normalized = normalizeLookupValue(value);
    const numericId = getNumericId(value);
    const countryId =
      numericCountryAliases[numericId] ?? countryNameAliases[normalized];

    if (countryId) {
      return countryId;
    }
  }

  return "";
}

function buildRenderFeatures(
  worldFeatures: WorldFeature[],
  countryLookup: Map<string, Country>,
  countryStats: Map<string, number>,
) {
  const groupedFeatures = new Map<string, RenderFeature>();
  const untrackedFeatures: RenderFeature[] = [];

  worldFeatures.forEach((feature) => {
    const country = findCountryForFeature(feature, countryLookup);
    const canonicalCountryId =
      country?.id || findCanonicalCountryIdForFeature(feature);
    const fallbackRegion = canonicalCountryId
      ? mapRegionOverrides[canonicalCountryId]
      : null;

    if (!country && !fallbackRegion) {
      untrackedFeatures.push({
        ...feature,
        country: null,
        value: 0,
      });
      return;
    }

    const groupKey = country?.id ?? canonicalCountryId;
    const existingFeature = groupedFeatures.get(groupKey);

    if (existingFeature) {
      existingFeature.path = `${existingFeature.path} ${feature.path}`;
      return;
    }

    groupedFeatures.set(groupKey, {
      ...feature,
      id: `country-${groupKey}`,
      name: country?.nameEn ?? fallbackRegion?.name ?? feature.name,
      displayName:
        country?.nameZh ?? fallbackRegion?.displayName ?? feature.displayName,
      country,
      value: country ? countryStats.get(country.id) ?? 0 : 0,
    });
  });

  return [...untrackedFeatures, ...groupedFeatures.values()];
}

function decodeArc(
  arc: [number, number][],
  transform: Topology["transform"],
) {
  if (!transform) {
    return arc;
  }

  let x = 0;
  let y = 0;

  return arc.map(([dx, dy]) => {
    x += dx;
    y += dy;

    return [
      x * transform.scale[0] + transform.translate[0],
      y * transform.scale[1] + transform.translate[1],
    ] as [number, number];
  });
}

function interpolate(start: number, end: number, fraction: number) {
  return start + (end - start) * fraction;
}

function projectRobinsonRaw([longitude, latitude]: [number, number]) {
  const clampedLatitude = Math.max(-89.999, Math.min(89.999, latitude));
  const absLatitude = Math.abs(clampedLatitude);
  const tableIndex = Math.min(17, Math.floor(absLatitude / 5));
  const fraction = (absLatitude - tableIndex * 5) / 5;
  const xCoef = interpolate(
    robinsonX[tableIndex],
    robinsonX[tableIndex + 1],
    fraction,
  );
  const yCoef = interpolate(
    robinsonY[tableIndex],
    robinsonY[tableIndex + 1],
    fraction,
  );
  const longitudeRadians = (longitude * Math.PI) / 180;
  const latitudeSign = clampedLatitude < 0 ? -1 : 1;

  return [
    0.8487 * xCoef * longitudeRadians,
    1.3523 * yCoef * latitudeSign,
  ] as [number, number];
}

function projectPoint([longitude, latitude]: [number, number]) {
  const [rawX, rawY] = projectRobinsonRaw([longitude, latitude]);
  const scale = 162;
  const x = mapWidth / 2 + rawX * scale;
  const y = mapHeight / 2 - rawY * scale;

  return [x, y] as [number, number];
}

function formatCoordinate(value: number) {
  return Number(value.toFixed(2));
}

function ringToPath(points: [number, number][]) {
  if (points.length < 2) {
    return "";
  }

  const segments: string[] = [];
  let currentSegment: string[] = [];
  let previousX: number | null = null;

  points.forEach((point) => {
    const [x, y] = projectPoint(point);
    const command =
      previousX === null || Math.abs(x - previousX) > mapWidth * 0.48
        ? "M"
        : "L";
    const pointCommand = `${command}${formatCoordinate(x)} ${formatCoordinate(y)}`;

    if (command === "M" && currentSegment.length > 1) {
      segments.push(`${currentSegment.join(" ")} Z`);
      currentSegment = [pointCommand];
    } else {
      currentSegment.push(pointCommand);
    }

    previousX = x;
  });

  if (currentSegment.length > 1) {
    segments.push(`${currentSegment.join(" ")} Z`);
  }

  return segments.join(" ");
}

function lineToPath(points: [number, number][]) {
  return points
    .map((point, index) => {
      const [x, y] = projectPoint(point);
      const command = index === 0 ? "M" : "L";

      return `${command}${formatCoordinate(x)} ${formatCoordinate(y)}`;
    })
    .join(" ");
}

function buildGraticulePath() {
  const paths: string[] = [];

  for (let longitude = -150; longitude <= 150; longitude += 30) {
    const points: [number, number][] = [];

    for (let latitude = -75; latitude <= 75; latitude += 5) {
      points.push([longitude, latitude]);
    }

    paths.push(lineToPath(points));
  }

  for (let latitude = -60; latitude <= 60; latitude += 30) {
    const points: [number, number][] = [];

    for (let longitude = -180; longitude <= 180; longitude += 5) {
      points.push([longitude, latitude]);
    }

    paths.push(lineToPath(points));
  }

  return paths.join(" ");
}

const graticulePath = buildGraticulePath();

function topologyToWorldFeatures(topology: Topology) {
  const arcCache = new Map<number, [number, number][]>();

  const getArc = (arcIndex: number) => {
    const normalizedIndex = arcIndex < 0 ? ~arcIndex : arcIndex;
    const cached =
      arcCache.get(normalizedIndex) ??
      decodeArc(topology.arcs[normalizedIndex] ?? [], topology.transform);

    arcCache.set(normalizedIndex, cached);

    return arcIndex < 0 ? [...cached].reverse() : cached;
  };

  const buildRing = (arcIndexes: number[]) =>
    arcIndexes.flatMap((arcIndex, index) => {
      const points = getArc(arcIndex);

      return index === 0 ? points : points.slice(1);
    });

  return topology.objects.countries.geometries
    .map((geometry) => {
      const properties = geometry.properties;
      const name =
        getPropertyValue(properties, ["name", "NAME", "NAME_EN", "ADMIN"]) ||
        String(geometry.id ?? "未命名国家");
      const numericId = getNumericId(geometry.id);
      const iso2 =
        getPropertyValue(properties, ["ISO_A2", "iso_a2", "ISO2", "iso2"]) ||
        (numericId ? numericRegionToIso2[numericId] : "");
      const iso3 = getPropertyValue(properties, [
        "ISO_A3",
        "ADM0_A3",
        "iso_a3",
        "ISO3",
        "iso3",
      ]);
      const polygonArcs =
        geometry.type === "Polygon"
          ? [geometry.arcs as number[][]]
          : (geometry.arcs as number[][][]);
      const path = polygonArcs
        .flatMap((polygon) => polygon.map((ring) => ringToPath(buildRing(ring))))
        .filter(Boolean)
        .join(" ");

      return {
        id: numericId || String(geometry.id ?? name),
        name,
        displayName: getLocalizedRegionName({
          fallbackName: name,
          iso2,
          numericId,
        }),
        numericId,
        iso2,
        iso3,
        path,
        properties,
      };
    })
    .filter((feature) => feature.path);
}

function MetricSelector({
  activeMetric,
  onChange,
}: {
  activeMetric: MetricKey;
  onChange: (metric: MetricKey) => void;
}) {
  return (
    <div className="country-map-layer-switcher">
      {metricOptions.map((metric) => (
        <button
          key={metric.key}
          type="button"
          onClick={() => onChange(metric.key)}
          className={activeMetric === metric.key ? "is-active" : ""}
        >
          {metric.label}
        </button>
      ))}
    </div>
  );
}

function MapLegend({ description }: { description: string }) {
  return (
    <aside className="country-map-legend">
      <h3>图层说明</h3>
      <p>{description}</p>
      <div>
        {[
          ["0", "#dfe4d6"],
          ["1-2", "#b9d8b4"],
          ["3-5", "#80be84"],
          ["6-10", "#3f9362"],
          ["10+", "#1f5d45"],
        ].map(([label, color]) => (
          <div key={label}>
            <span
              style={{ backgroundColor: color }}
            />
            <b>{label}</b>
          </div>
        ))}
      </div>
      <small>颜色深浅表示当前维度下各国已收录内容数量。</small>
    </aside>
  );
}

function MapTooltip({
  hovered,
  metricLabel,
}: {
  hovered: HoverState;
  metricLabel: string;
}) {
  const country = hovered.feature.country;

  return (
    <div
      className="country-map-tooltip"
      style={{
        left: hovered.x,
        top: hovered.y,
        transform: hovered.flipX
          ? "translate(calc(-100% - 14px), -12%)"
          : "translate(14px, -12%)",
      }}
    >
      {country ? (
        <>
          <p className="font-semibold text-zinc-900 dark:text-zinc-50">
            {country.nameZh}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            当前维度：{metricLabel}
          </p>
          <p className="mt-1 text-xs text-zinc-700 dark:text-zinc-200">
            数量：{hovered.feature.value}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            状态：{countryStatusZh[country.status]}
          </p>
        </>
      ) : (
        <>
          <p className="font-semibold text-zinc-900 dark:text-zinc-50">
            {hovered.feature.displayName || "该国家"}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            当前维度：{metricLabel}
          </p>
          <p className="mt-1 text-xs text-zinc-700 dark:text-zinc-200">
            数量：0
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            该国家暂未收录
          </p>
        </>
      )}
    </div>
  );
}

function CountryProfilePanel({
  country,
  activeMetric,
  activeValue,
  resources,
  institutions,
}: {
  country: Country | null;
  activeMetric: MetricOption;
  activeValue: number;
  resources: Resource[];
  institutions: Institution[];
}) {
  const selectedCountry = country;
  const countryResources = selectedCountry
    ? resources.filter((resource) => resource.countryId === selectedCountry.id)
    : [];
  const countryInstitutions = selectedCountry
    ? institutions.filter(
        (institution) => institution.countryId === selectedCountry.id,
      )
    : [];
  const metrics = selectedCountry
    ? metricOptions.map((metric) => ({
        ...metric,
        value: getMetricValue(
          metric.key,
          selectedCountry.id,
          resources,
          institutions,
        ),
      }))
    : [];
  const maxValue = Math.max(...metrics.map((metric) => metric.value), 1);
  const recentResources = countryResources
    .slice(0, 3);

  if (!selectedCountry) {
    return (
      <aside className="country-map-profile">
        <span>国家档案剖面</span>
        <h3>移动到地图国家</h3>
        <p>
          鼠标移到地图上的国家，可查看该国家在档案资源建设领域的资料数量、机构数量与快照保存情况。
        </p>
      </aside>
    );
  }

  return (
    <aside className="country-map-profile">
      <span>国家档案剖面</span>
      <div className="country-map-profile__head">
        <div>
          <h3>{selectedCountry.nameZh}</h3>
          <p>{selectedCountry.nameEn}</p>
        </div>
        <b>{countryStatusZh[selectedCountry.status]}</b>
      </div>

      <div className="country-map-profile__metric">
        <small>{activeMetric.label}</small>
        <strong>{activeValue}</strong>
      </div>

      <div className="country-map-profile__bars">
        {metrics.map((metric) => (
          <div key={metric.key}>
            <label>
              <span>{metric.label}</span>
              <b>{metric.value}</b>
            </label>
            <i style={{ width: `${Math.max((metric.value / maxValue) * 100, 4)}%` }} />
          </div>
        ))}
      </div>

      <div className="country-map-profile__recent">
        <small>代表资料</small>
        {recentResources.length > 0 ? (
          recentResources.map((resource) => (
            <a key={resource.id} href={`/resources/${resource.slug}`}>
              {resource.titleZh || resource.titleEn}
            </a>
          ))
        ) : (
          <p>该国家资料正在整理中。</p>
        )}
      </div>

      <a
        className="country-map-profile__link"
        href={getClickTarget(activeMetric.key, selectedCountry.id)}
      >
        查看该维度资料
      </a>
    </aside>
  );
}

export function CountryResourceMap({
  countries,
  institutions,
  resources,
}: CountryResourceMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const [activeMetric, setActiveMetric] = useState<MetricKey>("allResources");
  const [hovered, setHovered] = useState<HoverState | null>(null);
  const [openPanels, setOpenPanels] = useState({
    overview: false,
    profile: false,
  });
  const [worldFeatures, setWorldFeatures] = useState<WorldFeature[]>([]);
  const [mapStatus, setMapStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  const activeMetricOption =
    metricOptions.find((metric) => metric.key === activeMetric) ??
    metricOptions[0];

  const countryLookup = useMemo(
    () => buildCountryLookup(countries),
    [countries],
  );

  const countryStats = useMemo(
    () =>
      new Map(
        countries.map((country) => [
          country.id,
          getMetricValue(activeMetric, country.id, resources, institutions),
        ]),
      ),
    [activeMetric, countries, institutions, resources],
  );

  const renderFeatures = useMemo<RenderFeature[]>(
    () => buildRenderFeatures(worldFeatures, countryLookup, countryStats),
    [countryLookup, countryStats, worldFeatures],
  );
  const featureByCountryId = useMemo(() => {
    const featureMap = new Map<string, RenderFeature>();

    renderFeatures.forEach((feature) => {
      if (feature.country) {
        featureMap.set(feature.country.id, feature);
      }
    });

    return featureMap;
  }, [renderFeatures]);
  const dashboardStats = [
    {
      label: "收录资料",
      value: resources.length,
    },
    {
      label: "相关机构",
      value: institutions.length,
    },
    {
      label: "已上线",
      value: countries.filter((country) => country.status === "active").length,
    },
    {
      label: "来源快照",
      value: resources.filter((resource) => resource.hasBackup).length,
    },
  ];
  const rankedCountries = countries
    .map((country) => ({
      country,
      value: countryStats.get(country.id) ?? 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);
  const defaultFeature =
    renderFeatures.find((feature) => feature.country?.id === "usa") ??
    renderFeatures.find((feature) => feature.country) ??
    null;
  const activeFeature =
    hovered?.feature.country ? hovered.feature : defaultFeature;
  const activeCountry = activeFeature?.country ?? null;
  const activeValue = activeFeature?.value ?? 0;

  useEffect(() => {
    let isMounted = true;

    async function loadWorldMap() {
      try {
        setMapStatus("loading");

        const response = await fetch(worldMapUrl);

        if (!response.ok) {
          throw new Error("World map data failed to load.");
        }

        const topology = (await response.json()) as Topology;
        const features = topologyToWorldFeatures(topology);

        if (isMounted) {
          setWorldFeatures(features);
          setMapStatus("ready");
        }
      } catch {
        if (isMounted) {
          setMapStatus("error");
        }
      }
    }

    loadWorldMap();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateHover = (
    event: MouseEvent<SVGElement>,
    feature: RenderFeature,
  ) => {
    const rect = mapContainerRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    setHovered({
      feature,
      x,
      y,
      flipX: x > rect.width * 0.62,
    });
  };

  return (
    <section className="country-map-section">
      <div className="country-map-shell">
        <div className="country-map-topbar">
          <div className="country-map-heading">
            <div>
              <span>Global Archive Terrain</span>
              <h2>全球档案资源地理索引</h2>
              <p>
                用地图点亮各国档案资源建设情况，切换图层可查看法规、政策、机构、快照等维度。
              </p>
            </div>
            <p>
              当前图层
              <strong>{activeMetricOption.label}</strong>
            </p>
          </div>

          <MetricSelector
            activeMetric={activeMetric}
            onChange={(metric) => {
              setActiveMetric(metric);
              setHovered(null);
            }}
          />
        </div>

        <div className="country-map-dashboard">
          <div className="country-map-panel-toggles">
            <button
              type="button"
              className={openPanels.overview ? "is-active" : ""}
              onClick={() =>
                setOpenPanels((current) => ({
                  ...current,
                  overview: !current.overview,
                }))
              }
            >
              收录概览
            </button>
            <button
              type="button"
              className={openPanels.profile ? "is-active" : ""}
              onClick={() =>
                setOpenPanels((current) => ({
                  ...current,
                  profile: !current.profile,
                }))
              }
            >
              国家剖面
            </button>
          </div>

          <div className="country-map-layout">
            {openPanels.overview ? (
              <aside className="country-map-overview">
                <button
                  type="button"
                  className="country-map-panel-close"
                  onClick={() =>
                    setOpenPanels((current) => ({
                      ...current,
                      overview: false,
                    }))
                  }
                >
                  收起
                </button>
                <span>Archive Coverage</span>
                <h3>全球收录概览</h3>
                <div className="country-map-overview__stats">
                  {dashboardStats.map((stat) => (
                    <div key={stat.label}>
                      <strong>{stat.value}</strong>
                      <small>{stat.label}</small>
                    </div>
                  ))}
                </div>
                <div className="country-map-overview__rank">
                  <small>当前图层排行</small>
                  {rankedCountries.map(({ country, value }) => (
                    <button
                      key={country.id}
                      type="button"
                      onClick={() => {
                        const feature = featureByCountryId.get(country.id);

                        if (feature) {
                          setHovered({
                            feature,
                            x: mapContainerRef.current
                              ? mapContainerRef.current.clientWidth * 0.58
                              : 360,
                            y: mapContainerRef.current
                              ? mapContainerRef.current.clientHeight * 0.4
                              : 180,
                            flipX: true,
                          });
                          setOpenPanels((current) => ({
                            ...current,
                            profile: true,
                          }));
                        }
                      }}
                    >
                      <span>{country.nameZh}</span>
                      <b>{value}</b>
                    </button>
                  ))}
                </div>
              </aside>
            ) : null}

            <div
              ref={mapContainerRef}
              className="country-map-card"
            >
              <div className="country-map-canvas">
                {mapStatus === "loading" ? (
                  <div className="country-map-state">
                    正在加载世界地图...
                  </div>
                ) : null}

                {mapStatus === "error" ? (
                  <div className="country-map-state">
                    <strong>世界地图数据暂时无法加载</strong>
                    <p>
                      请稍后刷新页面。当前统计数据仍来自本地 mock data，不影响国家卡片与资料筛选入口。
                    </p>
                  </div>
                ) : null}

                {mapStatus === "ready" ? (
                  <svg
                    viewBox={`0 ${mapViewBoxY} ${mapWidth} ${mapViewBoxHeight}`}
                    preserveAspectRatio="xMidYMid meet"
                    role="img"
                    aria-label="ArchiveScope 真实世界国家资源分布地图"
                    className="country-map-svg"
                    onMouseLeave={() => setHovered(null)}
                  >
                    <defs>
                      <linearGradient id="countryOceanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#d8edf0" />
                        <stop offset="52%" stopColor="#b9dbe1" />
                        <stop offset="100%" stopColor="#dfeeea" />
                      </linearGradient>
                      <radialGradient id="countryPolarGlow" cx="50%" cy="8%" r="72%">
                        <stop offset="0%" stopColor="#f8fbf8" stopOpacity="0.78" />
                        <stop offset="50%" stopColor="#ffffff" stopOpacity="0.18" />
                        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                      </radialGradient>
                      <filter id="countryTerrainNoise" x="-20%" y="-20%" width="140%" height="140%">
                        <feTurbulence
                          type="fractalNoise"
                          baseFrequency="0.012 0.02"
                          numOctaves="4"
                          seed="11"
                          result="noise"
                        />
                        <feColorMatrix
                          in="noise"
                          type="matrix"
                          values="0.36 0 0 0 0.28 0 0.42 0 0 0.35 0 0 0.28 0 0.24 0 0 0 0.26 0"
                        />
                      </filter>
                      <filter id="countryLandRelief" x="-5%" y="-5%" width="110%" height="110%">
                        <feDropShadow
                          dx="0"
                          dy="0.7"
                          stdDeviation="0.45"
                          floodColor="#3f513c"
                          floodOpacity="0.22"
                        />
                      </filter>
                    </defs>
                    <rect
                      width={mapWidth}
                      height={mapHeight}
                      fill="url(#countryOceanGradient)"
                    />
                    <rect
                      width={mapWidth}
                      height={mapHeight}
                      fill="url(#countryPolarGlow)"
                      opacity="0.74"
                    />
                    <rect
                      width={mapWidth}
                      height={mapHeight}
                      filter="url(#countryTerrainNoise)"
                      opacity="0.38"
                    />
                    <path
                      d={graticulePath}
                      fill="none"
                      stroke="#eef8f3"
                      strokeWidth="0.5"
                      opacity="0.58"
                      vectorEffect="non-scaling-stroke"
                    />
                    <g filter="url(#countryLandRelief)">
                      {renderFeatures.map((feature) => {
                        const isKnownCountry = Boolean(feature.country);
                        const isHovered = hovered?.feature.id === feature.id;
                        const fill = isKnownCountry
                          ? getFillColor(feature.value)
                          : untrackedFill;

                        return (
                          <path
                            key={feature.id}
                            d={feature.path}
                            fill={fill}
                            fillRule="evenodd"
                            stroke={isHovered ? "#173f30" : strokeColor}
                            strokeWidth={isHovered ? 1.35 : 0.48}
                            vectorEffect="non-scaling-stroke"
                            className={`country-map-path ${
                              isKnownCountry ? "is-tracked" : "is-untracked"
                            } ${isHovered ? "is-hovered" : ""}`}
                            role={isKnownCountry ? "button" : "img"}
                            tabIndex={isKnownCountry ? 0 : -1}
                            aria-label={
                              isKnownCountry && feature.country
                                ? `${feature.country.nameZh}，${activeMetricOption.label}，数量 ${feature.value}`
                                : `${feature.displayName}，该国家暂未收录`
                            }
                            onMouseEnter={(event) => updateHover(event, feature)}
                            onMouseMove={(event) => updateHover(event, feature)}
                            onFocus={() =>
                              setHovered({
                                feature,
                                x: mapContainerRef.current
                                  ? mapContainerRef.current.clientWidth / 2
                                  : 320,
                                y: 120,
                                flipX: false,
                              })
                            }
                            onBlur={() => setHovered(null)}
                            onClick={(event) => {
                              if (feature.country) {
                                updateHover(event, feature);
                                setOpenPanels((current) => ({
                                  ...current,
                                  profile: true,
                                }));
                              }
                            }}
                            onKeyDown={(event) => {
                              if (
                                feature.country &&
                                (event.key === "Enter" || event.key === " ")
                            ) {
                              event.preventDefault();
                              setHovered({
                                feature,
                                x: mapContainerRef.current
                                  ? mapContainerRef.current.clientWidth / 2
                                  : 320,
                                y: 120,
                                flipX: false,
                              });
                              setOpenPanels((current) => ({
                                ...current,
                                profile: true,
                              }));
                            }
                          }}
                          />
                        );
                      })}
                    </g>
                  </svg>
                ) : null}

                {hovered ? (
                  <MapTooltip
                    hovered={hovered}
                    metricLabel={activeMetricOption.label}
                  />
                ) : null}
                </div>
            </div>

            {openPanels.profile ? (
              <div className="country-map-side">
                <button
                  type="button"
                  className="country-map-panel-close"
                  onClick={() =>
                    setOpenPanels((current) => ({
                      ...current,
                      profile: false,
                    }))
                  }
                >
                  收起
                </button>
                <CountryProfilePanel
                  country={activeCountry}
                  activeMetric={activeMetricOption}
                  activeValue={activeValue}
                  resources={resources}
                  institutions={institutions}
                />
                <MapLegend description={activeMetricOption.description} />
              </div>
            ) : null}
          </div>
        </div>
        <p className="country-map-source-note">
          地图底图数据使用 world-atlas 提供的 Natural Earth 国家边界
          TopoJSON。地图仅用于资料分布可视化，不作为政治边界、行政区划或主权判断依据；本站已将中国大陆、台湾、香港、澳门相关区域合并归入中国显示与统计。如发现边界或名称问题，请联系作者核对修正。
        </p>
      </div>
    </section>
  );
}
