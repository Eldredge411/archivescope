import type { EntityRelation } from "@/types";

export type CuratedRelationStatus = "inferred" | "verified";

export type CuratedAuthorization = {
  id: string;
  sourceRelationId: string;
  source: string;
  target: string;
  status: CuratedRelationStatus;
  confidence: "high" | "medium" | "low";
  judgementZh: string;
};

export const curatedAuthorizationDrafts: CuratedAuthorization[] = [
  {
    id: "cur-auth-privacy-act-1202",
    sourceRelationId: "rel-privacy-act-uscode-to-ecfr-1202",
    source: "uscode-5-section-552a-privacy-act",
    target: "ecfr-36-cfr-1202",
    status: "inferred",
    confidence: "high",
    judgementZh: "法典条文是 NARA 实施规则的上位法律依据，需确认方向后升级为 verified。",
  },
  {
    id: "cur-auth-privacy-2001-1202",
    sourceRelationId: "rel-privacy-2001-base-ecfr-1202",
    source: "fr-01-31340",
    target: "ecfr-36-cfr-1202",
    status: "inferred",
    confidence: "medium",
    judgementZh: "2001 年系统规则形成现行规则基础，但更接近 AMEND 而非 AUTHORIZE，需人工定边。",
  },
  {
    id: "cur-auth-digitization-page-rules",
    sourceRelationId: "rel-digitization-nara-page-to-rules",
    source: "nara-web-digitization",
    target: "fr-2023-09050",
    status: "inferred",
    confidence: "low",
    judgementZh: "页面是规则背景入口，不一定是授权来源；审校时可能应改为 AMEND 或移除。",
  },
  {
    id: "cur-auth-grs-portal-1227",
    sourceRelationId: "rel-grs-current-page-to-ecfr-1227",
    source: "nara-web-grs",
    target: "ecfr-36-cfr-1227",
    status: "inferred",
    confidence: "medium",
    judgementZh: "入口与法规互为承接，需确认页面是否应作为平台承接方而非制度来源。",
  },
  {
    id: "cur-auth-email-grs-practice",
    sourceRelationId: "rel-grs-25-capstone-to-er",
    source: "fr-2015-23245",
    target: "nara-web-email-management",
    status: "inferred",
    confidence: "medium",
    judgementZh: "法规提供处置基础，页面提供实践承接；适合 AUTHORIZE 或 AMEND 需人工判断。",
  },
  {
    id: "cur-auth-foia-law-portal",
    sourceRelationId: "rel-foia-uscode-to-nara-page",
    source: "uscode-5-section-552-foia",
    target: "nara-web-foia",
    status: "inferred",
    confidence: "high",
    judgementZh: "FOIA 法典直接支撑 NARA 办理入口，是较明确的制度授权候选。",
  },
  {
    id: "cur-auth-foia-rule-portal",
    sourceRelationId: "rel-foia-2001-rule-to-nara-page",
    source: "fr-01-6555",
    target: "nara-web-foia",
    status: "inferred",
    confidence: "medium",
    judgementZh: "程序规则支撑入口办理，但可能是规则修正而非上位授权。",
  },
  {
    id: "cur-auth-pra-uscode-resource",
    sourceRelationId: "rel-pra-uscode-to-nara-page",
    source: "uscode-44-chapter-22-presidential-records",
    target: "res-presidential-records-act",
    status: "inferred",
    confidence: "high",
    judgementZh: "法典文本与原法条目存在同一法律依据关系，需确认资源节点指向方向。",
  },
  {
    id: "cur-auth-pra-rule-act",
    sourceRelationId: "rel-pra-2005-procedures-to-law",
    source: "fr-05-6410",
    target: "res-presidential-records-act",
    status: "inferred",
    confidence: "medium",
    judgementZh: "程序规则是法律实施规则，更可能是 AMEND 而非 AUTHORIZE。",
  },
  {
    id: "cur-auth-ecfr-1233-libraries",
    sourceRelationId: "rel-pra-ecfr-1233-to-libraries",
    source: "ecfr-36-cfr-1233",
    target: "nara-web-presidential-libraries",
    status: "inferred",
    confidence: "medium",
    judgementZh: "法规条文为总统图书馆实践提供规则背景，适合作为制度承接候选。",
  },
];

export function getCuratedAuthorizationSource(
  draft: CuratedAuthorization,
  entityRelations: EntityRelation[],
) {
  return entityRelations.find((relation) => relation.id === draft.sourceRelationId);
}
