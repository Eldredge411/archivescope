export type AtlasPeriod = {
  id: string;
  labelZh: string;
  labelEn: string;
  startYear: number;
  endYear: number;
  summaryZh: string;
};

export const atlasPeriods: AtlasPeriod[] = [
  {
    id: "institution-building",
    labelZh: "建制期",
    labelEn: "Institution Building",
    startYear: 1934,
    endYear: 1965,
    summaryZh: "国家档案馆建立，集中保管制度奠基。",
  },
  {
    id: "open-access-framework",
    labelZh: "开放制度期",
    labelEn: "Open Access Framework",
    startYear: 1966,
    endYear: 1994,
    summaryZh: "FOIA、隐私法确立利用与限制的双重框架。",
  },
  {
    id: "declassification-digital-turn",
    labelZh: "解密与数字化转向",
    labelEn: "Declassification and Digital Turn",
    startYear: 1995,
    endYear: 2008,
    summaryZh: "自动解密制度确立，电子文件挑战浮现。",
  },
  {
    id: "electronic-records-era",
    labelZh: "电子文件时代",
    labelEn: "Electronic Records Era",
    startYear: 2009,
    endYear: 2026,
    summaryZh: "制度要求向平台大规模承接。",
  },
];
