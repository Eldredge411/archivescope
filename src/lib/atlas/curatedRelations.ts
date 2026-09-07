import type { EntityRelation } from "@/types";
import type { AtlasGraphEdgeType } from "@/lib/atlas/atlasGraph";

export type CuratedRelationStatus = "inferred" | "verified";

export type CuratedAuthorization = {
  id: string;
  sourceRelationId: string;
  source: string;
  target: string;
  type: AtlasGraphEdgeType;
  status: CuratedRelationStatus;
  confidence: "high" | "medium" | "low";
  judgementZh: string;
};

export const curatedRelationsRevisionLog = [
  {
    date: "2026-09-07",
    summary:
      "人工审校全部 AUTHORIZE 候选：6 条确认/升级，2 条转为 AMEND 待复核，1 条方向反转，1 条删除。",
  },
];

/**
 * Manual review log
 * - 2026-09-07: Reviewed all AUTHORIZE candidates. Confirmed six relations as
 *   verified AUTHORIZE; converted two document-evolution candidates to inferred
 *   AMEND; reversed the GRS relation direction; removed one invalid relation.
 */

export const curatedAuthorizationDrafts: CuratedAuthorization[] = [
  {
    id: "cur-auth-privacy-act-1202",
    sourceRelationId: "rel-privacy-act-uscode-to-ecfr-1202",
    source: "uscode-5-section-552a-privacy-act",
    target: "ecfr-36-cfr-1202",
    type: "AUTHORIZE",
    status: "verified",
    confidence: "high",
    judgementZh: "人工审校：5 U.S.C. 552a 为 36 CFR Part 1202 提供上位法律依据。",
  },
  {
    id: "cur-auth-privacy-2001-1202",
    sourceRelationId: "rel-privacy-2001-base-ecfr-1202",
    source: "fr-01-31340",
    target: "ecfr-36-cfr-1202",
    type: "AMEND",
    status: "inferred",
    confidence: "medium",
    judgementZh: "人工审校：联邦公报规则公告对 CFR 编纂条文是修订关系，不是授权。",
  },
  {
    id: "cur-auth-grs-portal-1227",
    sourceRelationId: "rel-grs-current-page-to-ecfr-1227",
    source: "ecfr-36-cfr-1227",
    target: "nara-web-grs",
    type: "AUTHORIZE",
    status: "verified",
    confidence: "medium",
    judgementZh: "人工审校：法规为 GRS 服务入口提供制度背景，方向反转为法规指向服务入口。",
  },
  {
    id: "cur-auth-email-grs-practice",
    sourceRelationId: "rel-grs-25-capstone-to-er",
    source: "fr-2015-23245",
    target: "nara-web-email-management",
    type: "AUTHORIZE",
    status: "verified",
    confidence: "medium",
    judgementZh: "人工审校：法规在前、实践页面承接在后，方向成立。",
  },
  {
    id: "cur-auth-foia-law-portal",
    sourceRelationId: "rel-foia-uscode-to-nara-page",
    source: "uscode-5-section-552-foia",
    target: "nara-web-foia",
    type: "AUTHORIZE",
    status: "verified",
    confidence: "high",
    judgementZh: "人工审校：FOIA 法典直接支撑 NARA 办理入口。",
  },
  {
    id: "cur-auth-foia-rule-portal",
    sourceRelationId: "rel-foia-2001-rule-to-nara-page",
    source: "fr-01-6555",
    target: "nara-web-foia",
    type: "AUTHORIZE",
    status: "verified",
    confidence: "medium",
    judgementZh: "人工审校：程序规则授权办理入口成立。",
  },
  {
    id: "cur-auth-pra-uscode-resource",
    sourceRelationId: "rel-pra-uscode-to-nara-page",
    source: "uscode-44-chapter-22-presidential-records",
    target: "res-presidential-records-act",
    type: "AUTHORIZE",
    status: "verified",
    confidence: "high",
    judgementZh: "人工审校：法典文本为 PRA 条目提供上位法律依据。",
  },
  {
    id: "cur-auth-pra-rule-act",
    sourceRelationId: "rel-pra-2005-procedures-to-law",
    source: "fr-05-6410",
    target: "res-presidential-records-act",
    type: "AMEND",
    status: "inferred",
    confidence: "medium",
    judgementZh: "人工审校：程序规则对 PRA 条目构成修订关系，暂保留待复核。",
  },
  {
    id: "cur-auth-ecfr-1233-libraries",
    sourceRelationId: "rel-pra-ecfr-1233-to-libraries",
    source: "ecfr-36-cfr-1233",
    target: "nara-web-presidential-libraries",
    type: "AUTHORIZE",
    status: "verified",
    confidence: "medium",
    judgementZh: "人工审校：法规条文为总统图书馆实践提供制度背景。",
  },
];

export function getCuratedAuthorizationSource(
  draft: CuratedAuthorization,
  entityRelations: EntityRelation[],
) {
  return entityRelations.find((relation) => relation.id === draft.sourceRelationId);
}
