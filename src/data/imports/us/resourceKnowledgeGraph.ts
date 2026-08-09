import type { EntityRelation, ResourceVersion } from "@/types";

export const importedResourceVersions: ResourceVersion[] = [
  {
    id: "ver-privacy-act-nara-2024-request-rule",
    resourceId: "fr-2024-04939",
    versionTitle: "2024 年：NARA 隐私法请求程序修订",
    versionNumber: "2024",
    versionStatus: "current",
    publishDate: "2024-03-08",
    effectiveDate: "2024-04-17",
    sourceUrl:
      "https://www.federalregister.gov/documents/2024/03/08/2024-04939/making-a-privacy-act-request",
    archivedUrl: null,
    summaryZh:
      "该直接最终规则修订 36 CFR Part 1202 中个人向 NARA 提出《隐私法》请求、访问记录和请求修正记录的程序性规定，使现行规则更贴近 NARA 的实际办理流程。",
    keyChanges: [
      "更新个人向 NARA 提出 Privacy Act 请求的程序说明。",
      "强调个人访问和修正自身记录的路径与处理要求。",
      "应与 36 CFR Part 1202 当前有效文本和 2001 年整体实施规则一起阅读。",
    ],
    aiSummary:
      "该节点代表 NARA 对隐私法实施规则中“请求程序”部分的近期修订，不是隐私法制度的起点，而是 36 CFR Part 1202 演进链条中的后续节点。",
    humanNote:
      "人工整理：本节点用于把 Federal Register 修订公告与当前 CFR 条文、早期实施规则连接起来。",
  },
  {
    id: "ver-privacy-act-nara-2016-exemptions",
    resourceId: "fr-2016-13599",
    versionTitle: "2016 年：NARA 隐私法豁免规则修订",
    versionNumber: "2016",
    versionStatus: "historical",
    publishDate: "2016-06-08",
    effectiveDate: "2016-07-18",
    sourceUrl:
      "https://www.federalregister.gov/documents/2016/06/08/2016-13599/privacy-act-of-1974-exemptions",
    archivedUrl: null,
    summaryZh:
      "该最终规则修订 36 CFR Part 1202 的豁免条款，将 NARA 特定记录系统纳入《1974年隐私法》允许的豁免范围，用于说明档案机构在执法、内部安全或敏感记录场景中如何限制个人访问和修正权。",
    keyChanges: [
      "在 36 CFR Part 1202 的豁免框架下补充特定 NARA 记录系统。",
      "说明隐私法权利与执法、内部安全、敏感记录管理之间的制度平衡。",
      "与 2001 年 NARA 隐私法实施规则和当前 eCFR 文本构成同一法规演进链条。",
    ],
    aiSummary:
      "该节点适合用于研究 NARA 如何通过 Federal Register 修订 CFR 条文，把抽象的 Privacy Act 豁免机制落实到具体记录系统。",
    humanNote:
      "人工整理：本节点重点解释截图所示页面为何应有版本沿革和相关资料。",
  },
  {
    id: "ver-privacy-act-nara-2001-implementation",
    resourceId: "fr-01-31340",
    versionTitle: "2001 年：NARA 隐私法实施规则整体修订",
    versionNumber: "2001",
    versionStatus: "historical",
    publishDate: "2001-12-20",
    effectiveDate: "2002-01-22",
    sourceUrl:
      "https://www.federalregister.gov/documents/2001/12/20/01-31340/privacy-act-implementation",
    archivedUrl: null,
    summaryZh:
      "该规则系统修订 36 CFR Part 1202，集中规定 NARA 如何执行《1974年隐私法》，包括个人信息收集、个人访问记录、记录披露、修正请求和记录系统豁免等内容。",
    keyChanges: [
      "把《1974年隐私法》的要求落实为 NARA 的机构操作规则。",
      "形成 36 CFR Part 1202 的完整制度框架。",
      "为 2016 年豁免规则和 2024 年请求程序修订提供基础文本。",
    ],
    aiSummary:
      "该节点是理解 NARA 隐私法实施规则的重要基础版本，后续 Federal Register 公告多是在这一 CFR 框架上继续修订。",
    humanNote:
      "人工整理：当前先收录核心节点，未来可继续补充 1998 年隐私法规则和各类 SORN 公告。",
  },
  {
    id: "ver-privacy-act-nara-current-ecfr-1202",
    resourceId: "ecfr-36-cfr-1202",
    versionTitle: "当前有效文本：36 CFR Part 1202",
    versionNumber: "current",
    versionStatus: "current",
    publishDate: "",
    sourceUrl: "https://www.ecfr.gov/current/title-36/chapter-XII/subchapter-B/part-1202",
    archivedUrl: null,
    summaryZh:
      "eCFR 当前文本汇总展示 36 CFR Part 1202 的现行有效条文，是核对 NARA 隐私法实施规则当前状态的主要入口。Federal Register 公告用于理解这些条文的发布、修订和解释过程。",
    keyChanges: [
      "用于查看当前有效的 NARA 隐私法实施规则。",
      "整合历次 Federal Register 规则修订后的现行条文。",
      "适合与 2001、2016、2024 年 Federal Register 节点对照阅读。",
    ],
    aiSummary:
      "该节点不是一次历史公告，而是当前有效法规文本入口，适合作为版本沿革中的当前文本锚点。",
    humanNote:
      "人工整理：正式引用当前规则时应优先核对 eCFR 当前文本。",
  },
  {
    id: "ver-electronic-records-current-ecfr-1236",
    resourceId: "ecfr-36-cfr-1236",
    versionTitle: "当前有效文本：36 CFR Part 1236",
    versionNumber: "current",
    versionStatus: "current",
    publishDate: "",
    sourceUrl:
      "https://www.ecfr.gov/current/title-36/chapter-XII/subchapter-B/part-1236",
    archivedUrl: null,
    summaryZh:
      "36 CFR Part 1236 是 NARA 电子记录管理要求的当前有效法规文本，覆盖电子记录、电子邮件、数字化副本和电子系统中的记录管理要求。Federal Register 公告用于理解该部分条文的修订过程。",
    keyChanges: [
      "作为电子记录管理法规的当前文本入口。",
      "汇总历次修订后对电子记录和数字化副本的管理要求。",
      "适合与 2018 拟议规则、2019 最终规则、2023/2024 数字化规则对照阅读。",
    ],
    aiSummary:
      "该节点是电子记录管理制度链条的当前文本锚点，帮助用户区分当前有效规则和历史修订公告。",
    humanNote: "人工整理：正式引用电子记录管理要求时应优先核对 eCFR 当前文本。",
  },
  {
    id: "ver-electronic-records-2018-proposed",
    resourceId: "fr-2018-19497",
    versionTitle: "2018 年：电子记录拟议规则",
    versionNumber: "2018 proposed",
    versionStatus: "historical",
    publishDate: "2018-09-10",
    sourceUrl:
      "https://www.federalregister.gov/documents/2018/09/10/2018-19497/electronic-records",
    archivedUrl: null,
    summaryZh:
      "该拟议规则提出修订 36 CFR Part 1236，围绕联邦机构数字化临时记录、真实性完整性保障和公众评论程序展开，是后续 2019 年最终规则的前置节点。",
    keyChanges: [
      "提出新增或调整电子记录管理规则。",
      "围绕临时记录数字化和电子记录管理设置公众评论期。",
      "与 2019 年最终规则构成从提案到生效的法规制定链条。",
    ],
    aiSummary:
      "该节点适合用于观察美国电子记录法规如何通过拟议规则、公众评论和最终规则逐步成形。",
    humanNote: "人工整理：建议与 2019 年最终规则和 36 CFR Part 1236 当前文本一起阅读。",
  },
  {
    id: "ver-electronic-records-2019-final",
    resourceId: "fr-2019-06916",
    versionTitle: "2019 年：电子记录管理最终规则",
    versionNumber: "2019 final",
    versionStatus: "historical",
    publishDate: "2019-04-10",
    effectiveDate: "2019-05-10",
    sourceUrl:
      "https://www.federalregister.gov/documents/2019/04/10/2019-06916/electronic-records-management",
    archivedUrl: null,
    summaryZh:
      "该最终规则修订 36 CFR Part 1236，将临时记录数字化等要求纳入电子记录管理法规，是美国联邦机构电子记录管理制度现代化的重要节点。",
    keyChanges: [
      "将 2018 年拟议规则推进为最终规则。",
      "修订 36 CFR Part 1236，明确临时记录数字化管理要求。",
      "为后续永久记录数字化和电子消息管理规则提供基础。",
    ],
    aiSummary:
      "该节点是电子记录管理法规链条中的关键落地节点，可用于研究数字化临时记录的合规要求。",
    humanNote: "人工整理：该节点与 2018 拟议规则和当前 eCFR 文本构成完整阅读链。",
  },
  {
    id: "ver-electronic-records-2022-messages",
    resourceId: "fr-2022-26450",
    versionTitle: "2022 年：电子记录与电子消息管理",
    versionNumber: "2022",
    versionStatus: "historical",
    publishDate: "2022-12-12",
    sourceUrl:
      "https://www.federalregister.gov/documents/2022/12/12/2022-26450/federal-records-management-managing-electronic-records-including-electronic-messages",
    archivedUrl: null,
    summaryZh:
      "该规则节点围绕电子记录和电子消息管理展开，体现 NARA 将聊天、电子消息和数字办公环境中的记录纳入联邦记录管理框架的趋势。",
    keyChanges: [
      "把电子消息纳入电子记录管理讨论范围。",
      "延伸 36 CFR Part 1236 对数字办公环境中记录捕获和保存的要求。",
      "适合与 2023 年协作平台记录管理公告和 Capstone 电子消息指南一起阅读。",
    ],
    aiSummary:
      "该节点反映电子记录管理从电子邮件扩展到更广泛电子消息和协作平台的制度变化。",
    humanNote: "人工整理：该节点用于连接电子记录法规与协作平台、电子消息实践资料。",
  },
  {
    id: "ver-digitization-2023-permanent-records",
    resourceId: "fr-2023-09050",
    versionTitle: "2023 年：永久记录数字化与处置表审查规则",
    versionNumber: "2023 permanent",
    versionStatus: "historical",
    publishDate: "2023-05-04",
    effectiveDate: "2023-06-05",
    sourceUrl:
      "https://www.federalregister.gov/documents/2023/05/04/2023-09050/federal-records-management-digitizing-permanent-records-and-reviewing-records-schedules",
    archivedUrl: null,
    summaryZh:
      "该最终规则修订 36 CFR 1224、1225 和 1236，围绕永久记录数字化、质量控制、元数据和记录处置期限表审查程序提出要求。",
    keyChanges: [
      "将永久记录数字化要求纳入联邦记录管理法规。",
      "把数字化质量、格式、元数据和长期保存要求与处置表审查相连接。",
      "同时关联 36 CFR 1225 的记录处置表程序和 36 CFR 1236 的电子记录管理要求。",
    ],
    aiSummary:
      "该节点体现美国从临时记录数字化转向永久记录数字化合规框架的制度深化。",
    humanNote: "人工整理：该节点应与当前 36 CFR Part 1236、Part 1225 和 NARA 数字化资源一起阅读。",
  },
  {
    id: "ver-digitization-2024-temporary-records",
    resourceId: "fr-2024-11910",
    versionTitle: "2024 年：临时记录数字化规则",
    versionNumber: "2024 temporary",
    versionStatus: "historical",
    publishDate: "2024-05-30",
    sourceUrl:
      "https://www.federalregister.gov/documents/2024/05/30/2024-11910/federal-records-management-digitizing-temporary-records",
    archivedUrl: null,
    summaryZh:
      "该规则围绕临时联邦记录数字化管理展开，说明机构在将临时记录数字化后如何满足记录管理、保存和处置要求。",
    keyChanges: [
      "聚焦临时记录数字化后的合规管理。",
      "延续 36 CFR Part 1236 中电子记录和数字化副本的管理框架。",
      "可与 2019 年临时记录数字化最终规则和 2023 年永久记录数字化规则比较阅读。",
    ],
    aiSummary:
      "该节点帮助用户区分永久记录数字化和临时记录数字化两个不同但相关的制度方向。",
    humanNote: "人工整理：该节点用于补充数字化记录管理链条。",
  },
  {
    id: "ver-gao-current-ecfr-1225",
    resourceId: "ecfr-36-cfr-1225",
    versionTitle: "当前有效文本：36 CFR Part 1225",
    versionNumber: "current",
    versionStatus: "current",
    publishDate: "",
    sourceUrl:
      "https://www.ecfr.gov/current/title-36/chapter-XII/subchapter-B/part-1225",
    archivedUrl: null,
    summaryZh:
      "36 CFR Part 1225 是记录保管期限表编制、审批和处置授权机制的当前有效法规文本。涉及 GAO 同意程序的 Federal Register 公告应与该当前文本对照阅读。",
    keyChanges: [
      "作为记录保管期限表和处置授权程序的当前法规入口。",
      "承接 2024 年 GAO 同意程序规则及其更正规则后的现行条文。",
      "适合用于理解记录处置审批中的 NARA 与 GAO 权责变化。",
    ],
    aiSummary:
      "该节点是 GAO 同意程序和记录保管期限表制度的当前文本锚点。",
    humanNote: "人工整理：正式引用处置表编制与审批要求时应核对 eCFR 当前文本。",
  },
  {
    id: "ver-gao-2024-direct-final",
    resourceId: "fr-2024-09396",
    versionTitle: "2024 年：GAO 同意程序直接最终规则",
    versionNumber: "2024 direct final",
    versionStatus: "historical",
    publishDate: "2024-05-01",
    sourceUrl:
      "https://www.federalregister.gov/documents/2024/05/01/2024-09396/federal-records-management-gao-concurrence",
    archivedUrl: null,
    summaryZh:
      "该规则修订 36 CFR Part 1225，调整联邦机构记录处置计划中 GAO 同意程序，反映记录处置审批流程的行政简化。",
    keyChanges: [
      "修订记录处置期限表编制和审批相关条款。",
      "围绕 GAO 对记录处置计划的同意要求进行调整。",
      "后续由 2024 年更正规则修正文本错误或技术细节。",
    ],
    aiSummary:
      "该节点适合研究 NARA 与 GAO 在联邦记录处置审批中的职能边界变化。",
    humanNote: "人工整理：应与 2024 年更正规则和当前 36 CFR Part 1225 一并阅读。",
  },
  {
    id: "ver-gao-2024-correction",
    resourceId: "fr-2024-11915",
    versionTitle: "2024 年：GAO 同意程序更正规则",
    versionNumber: "2024 correction",
    versionStatus: "historical",
    publishDate: "2024-06-03",
    effectiveDate: "2024-07-30",
    sourceUrl:
      "https://www.federalregister.gov/documents/2024/06/03/2024-11915/federal-records-management-gao-concurrence-correction",
    archivedUrl: null,
    summaryZh:
      "该更正规则修正 2024 年 GAO 同意程序直接最终规则中的错误，使 36 CFR Part 1225 中相关条文更准确可执行。",
    keyChanges: [
      "更正 2024 年 5 月 GAO 同意程序规则。",
      "不作为孤立政策理解，应追溯到被更正的原规则。",
      "最终适用仍应核对 36 CFR Part 1225 当前有效文本。",
    ],
    aiSummary:
      "该节点说明 Federal Register 更正规则如何成为法规演进链条的一部分。",
    humanNote: "人工整理：该节点重点用于展示“更正”与“原规则”的关系。",
  },
  {
    id: "ver-grs-current-nara",
    resourceId: "nara-web-grs",
    versionTitle: "当前入口：NARA 通用记录处置表（GRS）",
    versionNumber: "current portal",
    versionStatus: "current",
    publishDate: "",
    sourceUrl: "https://www.archives.gov/records-mgmt/grs",
    archivedUrl: null,
    summaryZh:
      "NARA GRS 页面是查看通用记录处置表当前资源、说明和下载入口的官方页面。各 GRS Transmittal 是对该制度的阶段性更新通知。",
    keyChanges: [
      "提供当前 GRS 资料入口。",
      "用于理解各次 GRS Transmittal 更新后的实际可用资源。",
      "适合与 36 CFR Part 1227 和各次 Federal Register 传送通知配合阅读。",
    ],
    aiSummary:
      "该节点作为 GRS 制度的当前导航锚点，帮助用户把历次传送通知放回现行资源体系中理解。",
    humanNote: "人工整理：入口页本身不替代具体传送通知，但适合作为当前资源入口。",
  },
  {
    id: "ver-grs-current-ecfr-1227",
    resourceId: "ecfr-36-cfr-1227",
    versionTitle: "当前有效文本：36 CFR Part 1227",
    versionNumber: "current",
    versionStatus: "current",
    publishDate: "",
    sourceUrl:
      "https://www.ecfr.gov/current/title-36/chapter-XII/subchapter-B/part-1227",
    archivedUrl: null,
    summaryZh:
      "36 CFR Part 1227 是通用记录表适用、使用和机构执行责任的当前有效法规文本，是理解 GRS Transmittal 法规背景的基础。",
    keyChanges: [
      "规定通用记录表的适用和使用规则。",
      "为各次 GRS Transmittal 的制度效力提供法规背景。",
      "适合与 NARA GRS 当前入口和 Federal Register 传送通知一起阅读。",
    ],
    aiSummary:
      "该节点是 GRS 制度的当前法规文本锚点。",
    humanNote: "人工整理：正式引用 GRS 适用规则时应优先核对 eCFR 当前文本。",
  },
  {
    id: "ver-grs-2024-transmittal-36",
    resourceId: "fr-2024-18393",
    versionTitle: "2024 年：GRS Transmittal 36",
    versionNumber: "36",
    versionStatus: "historical",
    publishDate: "2024-08-16",
    sourceUrl:
      "https://www.federalregister.gov/documents/2024/08/16/2024-18393/records-management-general-records-schedule-grs-grs-transmittal-36",
    archivedUrl: null,
    summaryZh:
      "该通知宣布 GRS Transmittal 36 生效，是通用记录表制度的阶段性更新节点。",
    keyChanges: [
      "发布通用记录表第 36 号传送更新。",
      "说明联邦机构如何引用和执行更新后的 GRS 条目。",
      "应与 NARA GRS 当前入口和前序传送通知对照阅读。",
    ],
    aiSummary:
      "该节点展示 GRS 制度如何通过连续传送通知滚动更新。",
    humanNote: "人工整理：该节点可作为当前较新的 GRS 更新代表。",
  },
  {
    id: "ver-grs-2024-transmittal-35",
    resourceId: "fr-2024-13176",
    versionTitle: "2024 年：GRS Transmittal 35",
    versionNumber: "35",
    versionStatus: "historical",
    publishDate: "2024-06-14",
    sourceUrl:
      "https://www.federalregister.gov/documents/2024/06/14/2024-13176/records-management-general-records-schedule-grs-grs-transmittal-35",
    archivedUrl: null,
    summaryZh:
      "该通知发布 GRS Transmittal 35，体现通用记录表在 2024 年的连续更新机制。",
    keyChanges: [
      "发布第 35 号 GRS 更新。",
      "为联邦机构提供更新后的记录处置授权。",
      "与第 36 号和第 34 号传送通知构成连续更新链条。",
    ],
    aiSummary:
      "该节点帮助用户观察 GRS 制度在同一年内多次更新的节奏。",
    humanNote: "人工整理：建议结合前后传送通知阅读。",
  },
  {
    id: "ver-grs-2023-transmittal-34",
    resourceId: "fr-2023-13369",
    versionTitle: "2023 年：GRS Transmittal 34",
    versionNumber: "34",
    versionStatus: "historical",
    publishDate: "2023-06-23",
    sourceUrl:
      "https://www.federalregister.gov/documents/2023/06/23/2023-13369/records-management-general-records-schedule-grs-grs-transmittal-34",
    archivedUrl: null,
    summaryZh:
      "该通知发布 GRS Transmittal 34，涉及记录管理、信息获取与保护、临时和中间记录等通用记录表更新。",
    keyChanges: [
      "更新多项通用记录表。",
      "涉及记录管理记录、信息获取与保护记录等类别。",
      "可用于研究 GRS 条目的滚动维护和联邦机构处置授权更新机制。",
    ],
    aiSummary:
      "该节点代表 GRS 在电子记录和信息保护背景下的阶段性调整。",
    humanNote: "人工整理：建议与 GRS 当前入口和后续 35、36 号传送通知一起阅读。",
  },
  {
    id: "ver-grs-2015-transmittal-25-capstone",
    resourceId: "fr-2015-23245",
    versionTitle: "2015 年：GRS Transmittal 25 与 Capstone 邮件管理",
    versionNumber: "25",
    versionStatus: "historical",
    publishDate: "2015-09-16",
    sourceUrl:
      "https://www.federalregister.gov/documents/2015/09/16/2015-23245/records-management-general-records-schedule-grs-grs-transmittal-25-email-managed-under-a-capstone",
    archivedUrl: null,
    summaryZh:
      "该通知发布 GRS Transmittal 25，重点涉及采用 Capstone 方法管理联邦机构电子邮件，是电子邮件记录处置制度化的重要节点。",
    keyChanges: [
      "将 Capstone 电子邮件管理与 GRS 处置授权连接起来。",
      "为联邦机构电子邮件记录保存与处置提供通用授权。",
      "适合与后续电子消息、协作平台和电子记录管理资料一起阅读。",
    ],
    aiSummary:
      "该节点把 GRS 制度与电子邮件记录管理连接起来，是理解 Capstone 方法的重要历史节点。",
    humanNote: "人工整理：该节点也属于电子记录管理与 GRS 两条制度链。",
  },
  {
    id: "ver-foia-current-uscode-552",
    resourceId: "uscode-5-section-552-foia",
    versionTitle: "当前法典文本：5 U.S.C. 552",
    versionNumber: "current",
    versionStatus: "current",
    publishDate: "",
    sourceUrl:
      "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title5-section552&edition=prelim",
    archivedUrl: null,
    summaryZh:
      "5 U.S.C. 552 是《信息自由法》（FOIA）的当前法典文本，规定公众请求联邦机构记录、主动公开、豁免公开和行政救济等基本制度。",
    keyChanges: [
      "作为 FOIA 制度的当前法律文本入口。",
      "为 NARA FOIA 页面、机构 FOIA 程序规则和咨询委员会资料提供上位法依据。",
      "适合与 NARA FOIA 页面和具体 Federal Register 程序规则一起阅读。",
    ],
    aiSummary:
      "该节点是 FOIA 链条中的法律依据锚点，用于把网站说明页和机构程序规则连接到当前法典文本。",
    humanNote: "人工整理：正式引用 FOIA 权利和豁免时应优先核对 5 U.S.C. 552 当前文本。",
  },
  {
    id: "ver-foia-nara-current-page",
    resourceId: "nara-web-foia",
    versionTitle: "当前入口：NARA FOIA 请求页面",
    versionNumber: "current portal",
    versionStatus: "current",
    publishDate: "",
    sourceUrl: "https://www.archives.gov/foia",
    archivedUrl: null,
    summaryZh:
      "NARA FOIA 页面是公众向 NARA 提出信息公开请求、了解处理流程、费用和申诉路径的当前入口。",
    keyChanges: [
      "把 FOIA 的法定权利转化为 NARA 面向公众的办理入口。",
      "说明如何提交请求、跟进请求和理解豁免或限制。",
      "适合与 5 U.S.C. 552 和 NARA FOIA 程序规则一起阅读。",
    ],
    aiSummary:
      "该节点帮助用户区分 FOIA 法律文本和 NARA 面向公众提供的实践入口。",
    humanNote: "人工整理：入口页用于实际办理，法规节点用于制度研究。",
  },
  {
    id: "ver-foia-2001-nara-regulations",
    resourceId: "fr-01-6555",
    versionTitle: "2001 年：NARA FOIA 法规修订",
    versionNumber: "2001",
    versionStatus: "historical",
    publishDate: "2001-03-20",
    sourceUrl:
      "https://www.federalregister.gov/documents/2001/03/20/01-6555/freedom-of-information-act-regulations",
    archivedUrl: null,
    summaryZh:
      "该 Federal Register 规则修订 NARA 的 FOIA 实施法规，说明 NARA 如何处理公众信息公开请求、费用、时限、申诉和可公开记录。",
    keyChanges: [
      "把 FOIA 的一般法律要求落实为 NARA 的机构程序规则。",
      "说明公众请求 NARA 记录时的办理机制。",
      "可与当前 NARA FOIA 页面和 5 U.S.C. 552 对照阅读。",
    ],
    aiSummary:
      "该节点是 NARA FOIA 机构规则的历史修订节点，用于补足 FOIA 页面背后的制度沿革。",
    humanNote: "人工整理：该节点避免把 FOIA 页面孤立理解为普通介绍页。",
  },
  {
    id: "ver-foia-2014-advisory-committee",
    resourceId: "fr-2014-10225",
    versionTitle: "2014 年：FOIA 咨询委员会设立",
    versionNumber: "2014",
    versionStatus: "historical",
    publishDate: "2014-05-05",
    sourceUrl:
      "https://www.federalregister.gov/documents/2014/05/05/2014-10225/freedom-of-information-act-foia-advisory-committee",
    archivedUrl: null,
    summaryZh:
      "该公告设立 FOIA Advisory Committee，用于汇集政府和公众代表，讨论 FOIA 执行中的透明度、效率和制度改进问题。",
    keyChanges: [
      "体现 FOIA 制度不仅包括请求程序，也包括持续治理和制度改进机制。",
      "为研究公众参与、开放政府和信息公开改革提供治理节点。",
      "不应与普通会议通知混同，适合作为 FOIA 治理机制的代表资料。",
    ],
    aiSummary:
      "该节点把 FOIA 从单一法律条文扩展到制度治理和公众参与层面。",
    humanNote: "人工整理：只收录委员会设立节点，暂不把大量低价值例会通知全部纳入关系链。",
  },
  {
    id: "ver-pra-current-uscode-chapter-22",
    resourceId: "uscode-44-chapter-22-presidential-records",
    versionTitle: "当前法典文本：44 U.S.C. Chapter 22",
    versionNumber: "current",
    versionStatus: "current",
    publishDate: "",
    sourceUrl:
      "https://uscode.house.gov/view.xhtml?path=/prelim@title44/chapter22&edition=prelim",
    archivedUrl: null,
    summaryZh:
      "44 U.S.C. Chapter 22 是总统记录制度的当前法典文本，规定总统记录的所有权、保存、移交、公开限制和 NARA 职责。",
    keyChanges: [
      "作为总统记录制度的当前法律文本入口。",
      "为 NARA 总统记录法页面、总统图书馆和程序规则提供法律依据。",
      "适合与 36 CFR Part 1233 和 NARA 总统图书馆资料一起阅读。",
    ],
    aiSummary:
      "该节点是总统记录链条中的上位法锚点。",
    humanNote: "人工整理：用于把总统记录介绍页和具体法规规则连接到当前法典文本。",
  },
  {
    id: "ver-pra-current-ecfr-1233",
    resourceId: "ecfr-36-cfr-1233",
    versionTitle: "当前有效文本：36 CFR Part 1233",
    versionNumber: "current",
    versionStatus: "current",
    publishDate: "",
    sourceUrl:
      "https://www.ecfr.gov/current/title-36/chapter-XII/subchapter-B/part-1233",
    archivedUrl: null,
    summaryZh:
      "36 CFR Part 1233 是与转移、使用、保管设施和档案保管相关的当前法规文本，可用于理解总统记录、实体设施和记录移交的管理要求。",
    keyChanges: [
      "作为相关记录转移和保管要求的当前法规入口。",
      "补充总统记录法和总统图书馆页面的操作规则背景。",
      "适合与 NARA 总统记录法页面和总统图书馆体系资料一起阅读。",
    ],
    aiSummary:
      "该节点用于把总统记录法律框架与 NARA 保管设施和移交管理要求连接起来。",
    humanNote: "人工整理：该节点是法规背景，不等同于总统记录法本身。",
  },
  {
    id: "ver-pra-2005-procedures",
    resourceId: "fr-05-6410",
    versionTitle: "2005 年：总统记录法程序规则",
    versionNumber: "2005",
    versionStatus: "historical",
    publishDate: "2005-04-05",
    sourceUrl:
      "https://www.federalregister.gov/documents/2005/04/05/05-6410/presidential-records-act-procedures",
    archivedUrl: null,
    summaryZh:
      "该规则说明总统记录法相关程序安排，帮助理解总统离任后记录移交、限制公开、请求访问和 NARA 管理职责如何被制度化。",
    keyChanges: [
      "把总统记录法要求转化为 NARA 的程序规则。",
      "关联总统记录公开、限制和 NARA 保管职责。",
      "适合与总统记录法当前法典文本和 NARA 总统图书馆页面对照阅读。",
    ],
    aiSummary:
      "该节点是总统记录法从法律文本进入机构办理程序的关键节点。",
    humanNote: "人工整理：适合放入总统记录法页面的版本沿革。",
  },
  {
    id: "ver-pra-2017-final-rule",
    resourceId: "fr-2017-11895",
    versionTitle: "2017 年：总统记录相关最终规则",
    versionNumber: "2017",
    versionStatus: "historical",
    publishDate: "2017-06-08",
    sourceUrl:
      "https://www.federalregister.gov/documents/2017/06/08/2017-11895/presidential-records",
    archivedUrl: null,
    summaryZh:
      "该最终规则围绕总统记录管理要求进行调整，是 NARA 总统记录制度在近年 Federal Register 中的重要规则节点。",
    keyChanges: [
      "更新总统记录相关法规或程序要求。",
      "延续 2005 年程序规则和当前总统记录法框架。",
      "适合与 44 U.S.C. Chapter 22 和总统图书馆资料一起阅读。",
    ],
    aiSummary:
      "该节点用于展示总统记录制度的后续规则更新。",
    humanNote: "人工整理：详情页中应把它与法律依据和总统图书馆体系连接起来。",
  },
  {
    id: "ver-declassification-current-page",
    resourceId: "nara-web-declassification",
    versionTitle: "当前入口：NARA 解密与信息安全页面",
    versionNumber: "current portal",
    versionStatus: "current",
    publishDate: "",
    sourceUrl: "https://www.archives.gov/declassification",
    archivedUrl: null,
    summaryZh:
      "NARA 解密页面汇集国家安全信息解密、强制解密审查、跨机构安全分类上诉和相关指导资料，是理解美国档案开放与保密平衡的重要入口。",
    keyChanges: [
      "提供解密、审查和安全分类相关资源入口。",
      "连接 ISCAP、CUI、强制解密审查和分类电子记录元数据要求。",
      "适合与 CUI 最终规则、国家安全信息法规和 NARA 公告一起阅读。",
    ],
    aiSummary:
      "该节点是解密/CUI 链条的当前入口，负责聚合制度、机构和实践资料。",
    humanNote: "人工整理：入口页应服务于发现具体制度节点，而不是替代具体规则。",
  },
  {
    id: "ver-cui-2016-final-rule",
    resourceId: "fr-2016-21665",
    versionTitle: "2016 年：CUI 受控非密信息最终规则",
    versionNumber: "2016",
    versionStatus: "historical",
    publishDate: "2016-09-14",
    effectiveDate: "2016-11-14",
    sourceUrl:
      "https://www.federalregister.gov/documents/2016/09/14/2016-21665/controlled-unclassified-information",
    archivedUrl: null,
    summaryZh:
      "该最终规则建立受控非密信息（CUI）项目的核心管理框架，说明联邦机构如何标识、保护、共享和解除控制不属于国家秘密但仍受控的信息。",
    keyChanges: [
      "确立 CUI 的统一管理框架。",
      "连接信息安全、开放获取和档案保存中的控制边界问题。",
      "适合与 NARA 解密页面和分类电子记录元数据公告一起阅读。",
    ],
    aiSummary:
      "该节点为研究美国信息控制与档案开放之间的制度边界提供核心规则。",
    humanNote: "人工整理：CUI 不是解密本身，但与解密和开放利用高度相关。",
  },
  {
    id: "ver-cui-2022-program-rule",
    resourceId: "fr-2022-06548",
    versionTitle: "2022 年：CUI 项目规则节点",
    versionNumber: "2022",
    versionStatus: "historical",
    publishDate: "2022-03-24",
    sourceUrl:
      "https://www.federalregister.gov/documents/2022/03/24/2022-06548/controlled-unclassified-information",
    archivedUrl: null,
    summaryZh:
      "该 CUI 相关 Federal Register 节点延续受控非密信息项目的制度维护，适合与 2016 年最终规则和 NARA 解密页面一起理解。",
    keyChanges: [
      "体现 CUI 项目的后续维护和制度延伸。",
      "补充 2016 年最终规则后的执行环境。",
      "可与国家安全信息和分类电子记录元数据资料形成对照。",
    ],
    aiSummary:
      "该节点帮助用户观察 CUI 制度不是一次性规则，而是持续维护的治理项目。",
    humanNote: "人工整理：后续可继续补充 CUI Registry 等具体执行资源。",
  },
  {
    id: "ver-iscap-2000-rule",
    resourceId: "fr-00-13809",
    versionTitle: "2000 年：ISCAP 相关规则",
    versionNumber: "2000",
    versionStatus: "historical",
    publishDate: "2000-06-01",
    sourceUrl:
      "https://www.federalregister.gov/documents/2000/06/01/00-13809/interagency-security-classification-appeals-panel",
    archivedUrl: null,
    summaryZh:
      "该规则与跨机构安全分类上诉小组（ISCAP）相关，用于理解美国国家安全信息解密争议、上诉和审查机制。",
    keyChanges: [
      "提供解密和安全分类争议的上诉机制背景。",
      "连接强制解密审查和国家安全信息开放制度。",
      "适合与 NARA 解密页面和后续分类信息规则一起阅读。",
    ],
    aiSummary:
      "该节点把解密链条从网页入口推进到具体审查和上诉机制。",
    humanNote: "人工整理：用于补充解密制度中的机构程序维度。",
  },
  {
    id: "ver-digital-preservation-loc-current",
    resourceId: "loc-digital-preservation",
    versionTitle: "当前入口：Library of Congress 数字保存",
    versionNumber: "current portal",
    versionStatus: "current",
    publishDate: "",
    sourceUrl: "https://www.loc.gov/preservation/digital/",
    archivedUrl: null,
    summaryZh:
      "美国国会图书馆数字保存页面汇集数字保存项目、格式可持续性、推荐格式和长期保存实践，是理解美国数字文化遗产保存体系的重要入口。",
    keyChanges: [
      "提供数字保存和格式策略的当前入口。",
      "与推荐格式声明、格式可持续性页面共同支撑数字资源长期保存研究。",
      "可与 NARA 电子记录保存和永久电子记录移交指南互补阅读。",
    ],
    aiSummary:
      "该节点把档案领域的电子记录保存与图书馆领域的数字保存实践连接起来。",
    humanNote: "人工整理：用于扩展资料库，不让用户只看到 NARA 的入口页。",
  },
  {
    id: "ver-digital-formats-loc-rfs",
    resourceId: "loc-recommended-formats-statement",
    versionTitle: "当前资源：LOC 推荐格式声明",
    versionNumber: "current",
    versionStatus: "current",
    publishDate: "",
    sourceUrl: "https://www.loc.gov/preservation/resources/rfs/",
    archivedUrl: null,
    summaryZh:
      "推荐格式声明列出不同类型数字内容在长期保存、采集和提供利用时优先采用的格式，适合研究数字档案资源建设中的格式策略。",
    keyChanges: [
      "提供数字对象格式选择的实践标准。",
      "支撑档案、图书馆和数字人文项目中的长期可用性判断。",
      "适合与 LOC 格式可持续性页面和 NARA 电子记录移交格式指南一起阅读。",
    ],
    aiSummary:
      "该节点从实际格式选择层面补足数字保存链条。",
    humanNote: "人工整理：该资料比普通入口页更适合作为具体研究材料。",
  },
  {
    id: "ver-digital-formats-loc-sustainability",
    resourceId: "loc-sustainability-of-digital-formats",
    versionTitle: "当前资源：数字格式可持续性",
    versionNumber: "current",
    versionStatus: "current",
    publishDate: "",
    sourceUrl: "https://www.loc.gov/preservation/digital/formats/",
    archivedUrl: null,
    summaryZh:
      "数字格式可持续性页面系统说明文件格式的透明性、开放性、采用程度、元数据支持和保存风险，是评估数字资源长期保存质量的重要参考。",
    keyChanges: [
      "提供判断数字格式长期保存风险的维度。",
      "与推荐格式声明形成“选择格式”和“理解格式风险”的配套关系。",
      "可用于研究 NARA 电子记录移交格式要求背后的保存逻辑。",
    ],
    aiSummary:
      "该节点用于把格式清单提升为可解释的数字保存评价框架。",
    humanNote: "人工整理：适合出现在“相关资料”中帮助学生理解格式选择原因。",
  },
  {
    id: "ver-public-participation-citizen-archivist",
    resourceId: "nara-web-citizen-archivist",
    versionTitle: "当前项目：NARA Citizen Archivist",
    versionNumber: "current project",
    versionStatus: "current",
    publishDate: "",
    sourceUrl: "https://www.archives.gov/citizen-archivist",
    archivedUrl: null,
    summaryZh:
      "Citizen Archivist 是 NARA 面向公众的协作参与项目，通过标签、转录和任务方式让公众参与档案描述、发现和开放利用。",
    keyChanges: [
      "把公众参与从政策口号落实为可操作项目。",
      "与 Citizen Archivist Missions 和 NARA Catalog 形成项目、任务和平台之间的关系。",
      "适合与 LOC By the People、Collections as Data 等数字人文资料对照阅读。",
    ],
    aiSummary:
      "该节点代表美国档案开放利用中的公众协作实践。",
    humanNote: "人工整理：用于回应用户希望看到具体项目而不是单纯入口页的需求。",
  },
  {
    id: "ver-public-participation-citizen-missions",
    resourceId: "nara-citizen-archivist-missions",
    versionTitle: "当前任务：Citizen Archivist Missions",
    versionNumber: "current project",
    versionStatus: "current",
    publishDate: "",
    sourceUrl: "https://catalog.archives.gov/citizenarchivist",
    archivedUrl: null,
    summaryZh:
      "Citizen Archivist Missions 将公众协作拆分为具体任务，围绕特定馆藏、主题或记录集合组织转录、标签和描述工作。",
    keyChanges: [
      "提供可直接观察的公众参与任务形态。",
      "连接 NARA Catalog 中的数字对象和公众贡献机制。",
      "适合用于研究数字档案平台如何设计公众参与流程。",
    ],
    aiSummary:
      "该节点把 Citizen Archivist 从介绍页推进到具体项目任务层。",
    humanNote: "人工整理：作为前台展示时更有助于用户理解实际项目成果。",
  },
  {
    id: "ver-public-participation-loc-by-the-people",
    resourceId: "loc-by-the-people",
    versionTitle: "当前项目：LOC By the People",
    versionNumber: "current project",
    versionStatus: "current",
    publishDate: "",
    sourceUrl: "https://crowd.loc.gov/",
    archivedUrl: null,
    summaryZh:
      "By the People 是美国国会图书馆的众包转录项目，邀请公众转录手稿和历史资料，提升数字馆藏的可检索性和可利用性。",
    keyChanges: [
      "展示图书馆领域公众参与和数字人文协作实践。",
      "可与 NARA Citizen Archivist 比较不同文化遗产机构的众包机制。",
      "与 Collections as Data 共同说明开放数据和公众参与如何服务研究利用。",
    ],
    aiSummary:
      "该节点扩展美国档案数据资源建设中的公众协作案例。",
    humanNote: "人工整理：适合作为 NARA 项目的横向比较对象。",
  },
];

export const importedEntityRelations: EntityRelation[] = [
  {
    id: "rel-privacy-2024-amends-ecfr-1202",
    sourceType: "resource",
    sourceId: "fr-2024-04939",
    targetType: "resource",
    targetId: "ecfr-36-cfr-1202",
    relationType: "related_to",
    relationLabelZh: "修订当前法规",
    descriptionZh:
      "2024 年 Federal Register 规则修订 36 CFR Part 1202 中关于向 NARA 提出《隐私法》请求的程序；当前有效文本应以 eCFR 为准。",
    evidenceResourceId: "fr-2024-04939",
    sourceUrl:
      "https://www.federalregister.gov/documents/2024/03/08/2024-04939/making-a-privacy-act-request",
    confidence: "high",
  },
  {
    id: "rel-privacy-2016-amends-ecfr-1202",
    sourceType: "resource",
    sourceId: "fr-2016-13599",
    targetType: "resource",
    targetId: "ecfr-36-cfr-1202",
    relationType: "related_to",
    relationLabelZh: "修订当前法规",
    descriptionZh:
      "2016 年《1974年隐私法》豁免规则修订 36 CFR Part 1202 的豁免条款，属于 NARA 隐私法实施规则的历史修订节点。",
    evidenceResourceId: "fr-2016-13599",
    sourceUrl:
      "https://www.federalregister.gov/documents/2016/06/08/2016-13599/privacy-act-of-1974-exemptions",
    confidence: "high",
  },
  {
    id: "rel-privacy-2001-base-ecfr-1202",
    sourceType: "resource",
    sourceId: "fr-01-31340",
    targetType: "resource",
    targetId: "ecfr-36-cfr-1202",
    relationType: "related_to",
    relationLabelZh: "形成基础规则",
    descriptionZh:
      "2001 年 Privacy Act Implementation 规则系统修订 36 CFR Part 1202，是理解 NARA 隐私法实施规则现行结构的基础节点。",
    evidenceResourceId: "fr-01-31340",
    sourceUrl:
      "https://www.federalregister.gov/documents/2001/12/20/01-31340/privacy-act-implementation",
    confidence: "high",
  },
  {
    id: "rel-privacy-2016-follows-2001",
    sourceType: "resource",
    sourceId: "fr-2016-13599",
    targetType: "resource",
    targetId: "fr-01-31340",
    relationType: "related_to",
    relationLabelZh: "延伸修订",
    descriptionZh:
      "2016 年豁免规则是在 2001 年 NARA 隐私法实施规则框架上的后续修订，重点处理特定记录系统豁免。",
    evidenceResourceId: "fr-2016-13599",
    sourceUrl:
      "https://www.federalregister.gov/documents/2016/06/08/2016-13599/privacy-act-of-1974-exemptions",
    confidence: "high",
  },
  {
    id: "rel-privacy-2024-follows-2001",
    sourceType: "resource",
    sourceId: "fr-2024-04939",
    targetType: "resource",
    targetId: "fr-01-31340",
    relationType: "related_to",
    relationLabelZh: "延伸修订",
    descriptionZh:
      "2024 年请求程序修订延续 2001 年 NARA 隐私法实施规则的基本框架，更新个人请求处理流程。",
    evidenceResourceId: "fr-2024-04939",
    sourceUrl:
      "https://www.federalregister.gov/documents/2024/03/08/2024-04939/making-a-privacy-act-request",
    confidence: "high",
  },
  {
    id: "rel-privacy-2024-same-part-2016",
    sourceType: "resource",
    sourceId: "fr-2024-04939",
    targetType: "resource",
    targetId: "fr-2016-13599",
    relationType: "related_to",
    relationLabelZh: "同属 36 CFR 1202 修订链",
    descriptionZh:
      "2024 年请求程序修订与 2016 年隐私法豁免规则都属于 NARA 对 36 CFR Part 1202 的后续修订，分别关注请求流程和豁免机制。",
    evidenceResourceId: "fr-2024-04939",
    sourceUrl:
      "https://www.federalregister.gov/documents/2024/03/08/2024-04939/making-a-privacy-act-request",
    confidence: "high",
  },
  {
    id: "rel-privacy-act-uscode-to-ecfr-1202",
    sourceType: "resource",
    sourceId: "uscode-5-section-552a-privacy-act",
    targetType: "resource",
    targetId: "ecfr-36-cfr-1202",
    relationType: "related_to",
    relationLabelZh: "法律依据",
    descriptionZh:
      "5 U.S.C. 552a 是《1974年隐私法》的法典文本，36 CFR Part 1202 是 NARA 将该法落实为机构操作规则的法规文本。",
    evidenceResourceId: "uscode-5-section-552a-privacy-act",
    sourceUrl:
      "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title5-section552a&edition=prelim",
    confidence: "high",
  },
  {
    id: "rel-er-2018-proposed-to-2019-final",
    sourceType: "resource",
    sourceId: "fr-2018-19497",
    targetType: "resource",
    targetId: "fr-2019-06916",
    relationType: "related_to",
    relationLabelZh: "拟议规则的最终版",
    descriptionZh:
      "2018 年 Electronic Records 拟议规则经过评论程序后，发展为 2019 年 Electronic Records Management 最终规则。",
    evidenceResourceId: "fr-2019-06916",
    sourceUrl:
      "https://www.federalregister.gov/documents/2019/04/10/2019-06916/electronic-records-management",
    confidence: "high",
  },
  {
    id: "rel-er-2019-amends-ecfr-1236",
    sourceType: "resource",
    sourceId: "fr-2019-06916",
    targetType: "resource",
    targetId: "ecfr-36-cfr-1236",
    relationType: "related_to",
    relationLabelZh: "修订当前法规",
    descriptionZh:
      "2019 年电子记录管理最终规则修订 36 CFR Part 1236，当前有效文本应以 eCFR 为准。",
    evidenceResourceId: "fr-2019-06916",
    sourceUrl:
      "https://www.federalregister.gov/documents/2019/04/10/2019-06916/electronic-records-management",
    confidence: "high",
  },
  {
    id: "rel-er-2022-messages-to-ecfr-1236",
    sourceType: "resource",
    sourceId: "fr-2022-26450",
    targetType: "resource",
    targetId: "ecfr-36-cfr-1236",
    relationType: "related_to",
    relationLabelZh: "电子消息管理延伸",
    descriptionZh:
      "2022 年电子记录与电子消息管理资料延伸 36 CFR Part 1236 的电子记录管理主题，适合与当前法规文本一起阅读。",
    evidenceResourceId: "fr-2022-26450",
    sourceUrl:
      "https://www.federalregister.gov/documents/2022/12/12/2022-26450/federal-records-management-managing-electronic-records-including-electronic-messages",
    confidence: "medium",
  },
  {
    id: "rel-er-2023-collaboration-to-ecfr-1236",
    sourceType: "resource",
    sourceId: "nara-bulletin-2023-04-collaboration-platforms",
    targetType: "resource",
    targetId: "ecfr-36-cfr-1236",
    relationType: "related_to",
    relationLabelZh: "实践指南补充",
    descriptionZh:
      "协作平台记录管理公告把电子记录管理要求落实到 Teams、Slack 等数字办公平台场景。",
    evidenceResourceId: "nara-bulletin-2023-04-collaboration-platforms",
    sourceUrl: "https://www.archives.gov/records-mgmt/bulletins/2023/2023-04",
    confidence: "high",
  },
  {
    id: "rel-er-2023-capstone-to-2022-messages",
    sourceType: "resource",
    sourceId: "nara-bulletin-2023-02-capstone-electronic-messages",
    targetType: "resource",
    targetId: "fr-2022-26450",
    relationType: "related_to",
    relationLabelZh: "电子消息管理补充",
    descriptionZh:
      "Capstone 电子消息公告补充说明电子消息记录如何按职位、账户和业务角色进行识别与处置。",
    evidenceResourceId: "nara-bulletin-2023-02-capstone-electronic-messages",
    sourceUrl: "https://www.archives.gov/records-mgmt/bulletins/2023/2023-02",
    confidence: "high",
  },
  {
    id: "rel-digitization-2023-to-ecfr-1236",
    sourceType: "resource",
    sourceId: "fr-2023-09050",
    targetType: "resource",
    targetId: "ecfr-36-cfr-1236",
    relationType: "related_to",
    relationLabelZh: "修订电子记录法规",
    descriptionZh:
      "2023 年永久记录数字化规则修订 36 CFR Part 1236，并把永久记录数字化质量、元数据和长期保存要求纳入法规框架。",
    evidenceResourceId: "fr-2023-09050",
    sourceUrl:
      "https://www.federalregister.gov/documents/2023/05/04/2023-09050/federal-records-management-digitizing-permanent-records-and-reviewing-records-schedules",
    confidence: "high",
  },
  {
    id: "rel-digitization-2023-to-ecfr-1225",
    sourceType: "resource",
    sourceId: "fr-2023-09050",
    targetType: "resource",
    targetId: "ecfr-36-cfr-1225",
    relationType: "related_to",
    relationLabelZh: "关联处置表审查",
    descriptionZh:
      "2023 年永久记录数字化规则也涉及 36 CFR Part 1225 中记录处置期限表审查程序。",
    evidenceResourceId: "fr-2023-09050",
    sourceUrl:
      "https://www.federalregister.gov/documents/2023/05/04/2023-09050/federal-records-management-digitizing-permanent-records-and-reviewing-records-schedules",
    confidence: "high",
  },
  {
    id: "rel-digitization-2024-temporary-to-2023-permanent",
    sourceType: "resource",
    sourceId: "fr-2024-11910",
    targetType: "resource",
    targetId: "fr-2023-09050",
    relationType: "related_to",
    relationLabelZh: "数字化规则延伸",
    descriptionZh:
      "2024 年临时记录数字化规则与 2023 年永久记录数字化规则共同构成 NARA 对不同记录价值类型数字化要求的制度链条。",
    evidenceResourceId: "fr-2024-11910",
    sourceUrl:
      "https://www.federalregister.gov/documents/2024/05/30/2024-11910/federal-records-management-digitizing-temporary-records",
    confidence: "high",
  },
  {
    id: "rel-digitization-nara-page-to-rules",
    sourceType: "resource",
    sourceId: "nara-web-digitization",
    targetType: "resource",
    targetId: "fr-2023-09050",
    relationType: "related_to",
    relationLabelZh: "项目背景与法规节点",
    descriptionZh:
      "NARA 数字化页面提供项目和实践背景，2023 年规则则提供永久记录数字化的法规节点。",
    evidenceResourceId: "fr-2023-09050",
    sourceUrl:
      "https://www.federalregister.gov/documents/2023/05/04/2023-09050/federal-records-management-digitizing-permanent-records-and-reviewing-records-schedules",
    confidence: "medium",
  },
  {
    id: "rel-gao-2024-to-ecfr-1225",
    sourceType: "resource",
    sourceId: "fr-2024-09396",
    targetType: "resource",
    targetId: "ecfr-36-cfr-1225",
    relationType: "related_to",
    relationLabelZh: "修订当前法规",
    descriptionZh:
      "2024 年 GAO 同意程序直接最终规则修订 36 CFR Part 1225，当前适用文本应以 eCFR 为准。",
    evidenceResourceId: "fr-2024-09396",
    sourceUrl:
      "https://www.federalregister.gov/documents/2024/05/01/2024-09396/federal-records-management-gao-concurrence",
    confidence: "high",
  },
  {
    id: "rel-gao-correction-to-original",
    sourceType: "resource",
    sourceId: "fr-2024-11915",
    targetType: "resource",
    targetId: "fr-2024-09396",
    relationType: "related_to",
    relationLabelZh: "更正前序规则",
    descriptionZh:
      "2024 年 6 月更正规则修正 2024 年 5 月 GAO 同意程序直接最终规则中的错误，应与原规则一起阅读。",
    evidenceResourceId: "fr-2024-11915",
    sourceUrl:
      "https://www.federalregister.gov/documents/2024/06/03/2024-11915/federal-records-management-gao-concurrence-correction",
    confidence: "high",
  },
  {
    id: "rel-gao-correction-to-ecfr-1225",
    sourceType: "resource",
    sourceId: "fr-2024-11915",
    targetType: "resource",
    targetId: "ecfr-36-cfr-1225",
    relationType: "related_to",
    relationLabelZh: "当前法规更正链",
    descriptionZh:
      "GAO 同意程序更正规则最终应回到 36 CFR Part 1225 当前有效文本中核对。",
    evidenceResourceId: "fr-2024-11915",
    sourceUrl:
      "https://www.federalregister.gov/documents/2024/06/03/2024-11915/federal-records-management-gao-concurrence-correction",
    confidence: "high",
  },
  {
    id: "rel-grs-current-page-to-ecfr-1227",
    sourceType: "resource",
    sourceId: "nara-web-grs",
    targetType: "resource",
    targetId: "ecfr-36-cfr-1227",
    relationType: "related_to",
    relationLabelZh: "当前入口与法规依据",
    descriptionZh:
      "NARA GRS 页面是当前资源入口，36 CFR Part 1227 是通用记录表适用和使用规则的当前法规文本。",
    evidenceResourceId: "ecfr-36-cfr-1227",
    sourceUrl:
      "https://www.ecfr.gov/current/title-36/chapter-XII/subchapter-B/part-1227",
    confidence: "high",
  },
  {
    id: "rel-grs-36-to-current-page",
    sourceType: "resource",
    sourceId: "fr-2024-18393",
    targetType: "resource",
    targetId: "nara-web-grs",
    relationType: "related_to",
    relationLabelZh: "GRS 更新链",
    descriptionZh:
      "GRS Transmittal 36 是通用记录表的阶段性更新通知，当前可用表格和说明应回到 NARA GRS 页面核对。",
    evidenceResourceId: "fr-2024-18393",
    sourceUrl:
      "https://www.federalregister.gov/documents/2024/08/16/2024-18393/records-management-general-records-schedule-grs-grs-transmittal-36",
    confidence: "high",
  },
  {
    id: "rel-grs-35-to-current-page",
    sourceType: "resource",
    sourceId: "fr-2024-13176",
    targetType: "resource",
    targetId: "nara-web-grs",
    relationType: "related_to",
    relationLabelZh: "GRS 更新链",
    descriptionZh:
      "GRS Transmittal 35 是通用记录表的阶段性更新通知，当前可用表格和说明应回到 NARA GRS 页面核对。",
    evidenceResourceId: "fr-2024-13176",
    sourceUrl:
      "https://www.federalregister.gov/documents/2024/06/14/2024-13176/records-management-general-records-schedule-grs-grs-transmittal-35",
    confidence: "high",
  },
  {
    id: "rel-grs-34-to-current-page",
    sourceType: "resource",
    sourceId: "fr-2023-13369",
    targetType: "resource",
    targetId: "nara-web-grs",
    relationType: "related_to",
    relationLabelZh: "GRS 更新链",
    descriptionZh:
      "GRS Transmittal 34 是通用记录表的阶段性更新通知，适合与当前 GRS 页面和后续传送通知一起阅读。",
    evidenceResourceId: "fr-2023-13369",
    sourceUrl:
      "https://www.federalregister.gov/documents/2023/06/23/2023-13369/records-management-general-records-schedule-grs-grs-transmittal-34",
    confidence: "high",
  },
  {
    id: "rel-grs-36-follows-35",
    sourceType: "resource",
    sourceId: "fr-2024-18393",
    targetType: "resource",
    targetId: "fr-2024-13176",
    relationType: "related_to",
    relationLabelZh: "后续传送通知",
    descriptionZh:
      "GRS Transmittal 36 是 Transmittal 35 之后的后续更新节点，可用于观察通用记录表的连续维护过程。",
    evidenceResourceId: "fr-2024-18393",
    sourceUrl:
      "https://www.federalregister.gov/documents/2024/08/16/2024-18393/records-management-general-records-schedule-grs-grs-transmittal-36",
    confidence: "high",
  },
  {
    id: "rel-grs-35-follows-34",
    sourceType: "resource",
    sourceId: "fr-2024-13176",
    targetType: "resource",
    targetId: "fr-2023-13369",
    relationType: "related_to",
    relationLabelZh: "后续传送通知",
    descriptionZh:
      "GRS Transmittal 35 承接 Transmittal 34，是通用记录表滚动更新链条中的后续节点。",
    evidenceResourceId: "fr-2024-13176",
    sourceUrl:
      "https://www.federalregister.gov/documents/2024/06/14/2024-13176/records-management-general-records-schedule-grs-grs-transmittal-35",
    confidence: "high",
  },
  {
    id: "rel-grs-25-capstone-to-er",
    sourceType: "resource",
    sourceId: "fr-2015-23245",
    targetType: "resource",
    targetId: "nara-web-email-management",
    relationType: "related_to",
    relationLabelZh: "电子邮件处置基础",
    descriptionZh:
      "GRS Transmittal 25 将 Capstone 方法纳入电子邮件记录处置授权，适合与 NARA 电子邮件记录管理页面一起阅读。",
    evidenceResourceId: "fr-2015-23245",
    sourceUrl:
      "https://www.federalregister.gov/documents/2015/09/16/2015-23245/records-management-general-records-schedule-grs-grs-transmittal-25-email-managed-under-a-capstone",
    confidence: "high",
  },
  {
    id: "rel-foia-uscode-to-nara-page",
    sourceType: "resource",
    sourceId: "uscode-5-section-552-foia",
    targetType: "resource",
    targetId: "nara-web-foia",
    relationType: "related_to",
    relationLabelZh: "法律依据与办理入口",
    descriptionZh:
      "5 U.S.C. 552 是 FOIA 的当前法典文本，NARA FOIA 页面则把该法律权利转化为公众向 NARA 提交请求的实际入口。",
    evidenceResourceId: "uscode-5-section-552-foia",
    sourceUrl:
      "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title5-section552&edition=prelim",
    confidence: "high",
  },
  {
    id: "rel-foia-base-resource-to-uscode",
    sourceType: "resource",
    sourceId: "res-freedom-of-information-act",
    targetType: "resource",
    targetId: "uscode-5-section-552-foia",
    relationType: "related_to",
    relationLabelZh: "当前法典文本",
    descriptionZh:
      "《信息自由法》的基础介绍应回到 5 U.S.C. 552 当前法典文本核对具体权利、豁免和程序要求。",
    evidenceResourceId: "uscode-5-section-552-foia",
    sourceUrl:
      "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title5-section552&edition=prelim",
    confidence: "high",
  },
  {
    id: "rel-foia-2001-rule-to-nara-page",
    sourceType: "resource",
    sourceId: "fr-01-6555",
    targetType: "resource",
    targetId: "nara-web-foia",
    relationType: "related_to",
    relationLabelZh: "程序规则",
    descriptionZh:
      "2001 年 NARA FOIA 法规修订说明机构如何处理 FOIA 请求；当前实际办理入口应回到 NARA FOIA 页面。",
    evidenceResourceId: "fr-01-6555",
    sourceUrl:
      "https://www.federalregister.gov/documents/2001/03/20/01-6555/freedom-of-information-act-regulations",
    confidence: "high",
  },
  {
    id: "rel-foia-2017-records-subject-to-foia",
    sourceType: "resource",
    sourceId: "fr-2017-00329",
    targetType: "resource",
    targetId: "nara-web-foia",
    relationType: "related_to",
    relationLabelZh: "适用范围说明",
    descriptionZh:
      "2017 年 NARA 相关规则围绕哪些 NARA 记录适用 FOIA 展开，可作为理解 NARA FOIA 页面适用范围的补充节点。",
    evidenceResourceId: "fr-2017-00329",
    sourceUrl:
      "https://www.federalregister.gov/documents/2017/01/11/2017-00329/nara-records-subject-to-foia",
    confidence: "medium",
  },
  {
    id: "rel-foia-advisory-to-foia-law",
    sourceType: "resource",
    sourceId: "fr-2014-10225",
    targetType: "resource",
    targetId: "uscode-5-section-552-foia",
    relationType: "related_to",
    relationLabelZh: "治理与改进机制",
    descriptionZh:
      "FOIA Advisory Committee 是围绕 FOIA 执行改进、透明度和公众参与建立的治理机制，不是一次普通会议通知。",
    evidenceResourceId: "fr-2014-10225",
    sourceUrl:
      "https://www.federalregister.gov/documents/2014/05/05/2014-10225/freedom-of-information-act-foia-advisory-committee",
    confidence: "high",
  },
  {
    id: "rel-pra-base-resource-to-uscode",
    sourceType: "resource",
    sourceId: "res-presidential-records-act",
    targetType: "resource",
    targetId: "uscode-44-chapter-22-presidential-records",
    relationType: "related_to",
    relationLabelZh: "当前法典文本",
    descriptionZh:
      "《总统记录法》的基础介绍应与 44 U.S.C. Chapter 22 当前法典文本对照，以核对总统记录所有权、移交和公开限制。",
    evidenceResourceId: "uscode-44-chapter-22-presidential-records",
    sourceUrl:
      "https://uscode.house.gov/view.xhtml?path=/prelim@title44/chapter22&edition=prelim",
    confidence: "high",
  },
  {
    id: "rel-pra-uscode-to-nara-page",
    sourceType: "resource",
    sourceId: "uscode-44-chapter-22-presidential-records",
    targetType: "resource",
    targetId: "res-presidential-records-act",
    relationType: "related_to",
    relationLabelZh: "法律依据",
    descriptionZh:
      "44 U.S.C. Chapter 22 是总统记录制度的法律依据，NARA 总统记录法页面提供面向公众和研究者的解释入口。",
    evidenceResourceId: "uscode-44-chapter-22-presidential-records",
    sourceUrl:
      "https://uscode.house.gov/view.xhtml?path=/prelim@title44/chapter22&edition=prelim",
    confidence: "high",
  },
  {
    id: "rel-pra-to-presidential-libraries",
    sourceType: "resource",
    sourceId: "res-presidential-records-act",
    targetType: "resource",
    targetId: "nara-web-presidential-libraries",
    relationType: "related_to",
    relationLabelZh: "机构实践",
    descriptionZh:
      "总统记录法确立总统记录归属和管理框架，总统图书馆体系是 NARA 保存、描述和开放总统记录的重要实践载体。",
    evidenceResourceId: "res-presidential-records-act",
    sourceUrl:
      "https://www.archives.gov/presidential-libraries/laws/presidential-records-act",
    confidence: "high",
  },
  {
    id: "rel-pra-2005-procedures-to-law",
    sourceType: "resource",
    sourceId: "fr-05-6410",
    targetType: "resource",
    targetId: "res-presidential-records-act",
    relationType: "related_to",
    relationLabelZh: "程序规则",
    descriptionZh:
      "2005 年总统记录法程序规则把法律要求转化为 NARA 的办理流程，适合与总统记录法介绍页和当前法典文本一起阅读。",
    evidenceResourceId: "fr-05-6410",
    sourceUrl:
      "https://www.federalregister.gov/documents/2005/04/05/05-6410/presidential-records-act-procedures",
    confidence: "high",
  },
  {
    id: "rel-pra-2017-rule-to-uscode",
    sourceType: "resource",
    sourceId: "fr-2017-11895",
    targetType: "resource",
    targetId: "uscode-44-chapter-22-presidential-records",
    relationType: "related_to",
    relationLabelZh: "后续规则更新",
    descriptionZh:
      "2017 年 Presidential Records 规则是总统记录制度的后续规则节点，应回到 44 U.S.C. Chapter 22 和 NARA 页面理解其制度位置。",
    evidenceResourceId: "fr-2017-11895",
    sourceUrl:
      "https://www.federalregister.gov/documents/2017/06/08/2017-11895/presidential-records",
    confidence: "high",
  },
  {
    id: "rel-pra-ecfr-1233-to-libraries",
    sourceType: "resource",
    sourceId: "ecfr-36-cfr-1233",
    targetType: "resource",
    targetId: "nara-web-presidential-libraries",
    relationType: "related_to",
    relationLabelZh: "保管与移交规则背景",
    descriptionZh:
      "36 CFR Part 1233 提供记录移交和保管相关法规背景，可帮助理解总统图书馆体系中的记录接收、保管和开放实践。",
    evidenceResourceId: "ecfr-36-cfr-1233",
    sourceUrl:
      "https://www.ecfr.gov/current/title-36/chapter-XII/subchapter-B/part-1233",
    confidence: "medium",
  },
  {
    id: "rel-declassification-page-to-cui-2016",
    sourceType: "resource",
    sourceId: "nara-web-declassification",
    targetType: "resource",
    targetId: "fr-2016-21665",
    relationType: "related_to",
    relationLabelZh: "信息控制制度",
    descriptionZh:
      "NARA 解密页面聚合国家安全信息和开放审查资源，2016 年 CUI 最终规则则说明受控非密信息的统一管理制度。",
    evidenceResourceId: "fr-2016-21665",
    sourceUrl:
      "https://www.federalregister.gov/documents/2016/09/14/2016-21665/controlled-unclassified-information",
    confidence: "high",
  },
  {
    id: "rel-cui-2022-follows-2016",
    sourceType: "resource",
    sourceId: "fr-2022-06548",
    targetType: "resource",
    targetId: "fr-2016-21665",
    relationType: "related_to",
    relationLabelZh: "CUI 后续维护",
    descriptionZh:
      "2022 年 CUI 相关节点延续 2016 年 CUI 最终规则后的制度维护，适合观察受控非密信息项目的持续调整。",
    evidenceResourceId: "fr-2022-06548",
    sourceUrl:
      "https://www.federalregister.gov/documents/2022/03/24/2022-06548/controlled-unclassified-information",
    confidence: "medium",
  },
  {
    id: "rel-declassification-page-to-iscap",
    sourceType: "resource",
    sourceId: "nara-web-declassification",
    targetType: "resource",
    targetId: "fr-00-13809",
    relationType: "related_to",
    relationLabelZh: "解密上诉机制",
    descriptionZh:
      "ISCAP 相关规则补充说明国家安全信息解密争议和安全分类上诉机制，是解密入口页背后的具体制度节点。",
    evidenceResourceId: "fr-00-13809",
    sourceUrl:
      "https://www.federalregister.gov/documents/2000/06/01/00-13809/interagency-security-classification-appeals-panel",
    confidence: "high",
  },
  {
    id: "rel-declassification-to-classified-metadata",
    sourceType: "resource",
    sourceId: "nara-web-declassification",
    targetType: "resource",
    targetId: "nara-bulletin-2025-01-classified-electronic-records-metadata",
    relationType: "related_to",
    relationLabelZh: "分类电子记录元数据",
    descriptionZh:
      "分类电子记录元数据公告把解密和安全分类问题延伸到电子记录移交、描述和长期保存的技术层面。",
    evidenceResourceId: "nara-bulletin-2025-01-classified-electronic-records-metadata",
    sourceUrl: "https://www.archives.gov/records-mgmt/bulletins/2025/2025-01",
    confidence: "high",
  },
  {
    id: "rel-digital-preservation-loc-to-rfs",
    sourceType: "resource",
    sourceId: "loc-digital-preservation",
    targetType: "resource",
    targetId: "loc-recommended-formats-statement",
    relationType: "related_to",
    relationLabelZh: "格式策略",
    descriptionZh:
      "LOC 数字保存入口提供总体背景，推荐格式声明则给出不同数字对象在长期保存和采集中的具体优先格式。",
    evidenceResourceId: "loc-recommended-formats-statement",
    sourceUrl: "https://www.loc.gov/preservation/resources/rfs/",
    confidence: "high",
  },
  {
    id: "rel-loc-rfs-to-format-sustainability",
    sourceType: "resource",
    sourceId: "loc-recommended-formats-statement",
    targetType: "resource",
    targetId: "loc-sustainability-of-digital-formats",
    relationType: "related_to",
    relationLabelZh: "格式风险说明",
    descriptionZh:
      "推荐格式声明告诉用户优先采用哪些格式，格式可持续性页面解释为什么这些格式更适合长期保存。",
    evidenceResourceId: "loc-sustainability-of-digital-formats",
    sourceUrl: "https://www.loc.gov/preservation/digital/formats/",
    confidence: "high",
  },
  {
    id: "rel-nara-format-guidance-to-loc-formats",
    sourceType: "resource",
    sourceId: "nara-bulletin-2014-04-format-guidance",
    targetType: "resource",
    targetId: "loc-sustainability-of-digital-formats",
    relationType: "related_to",
    relationLabelZh: "格式与长期保存支撑",
    descriptionZh:
      "NARA 永久电子记录格式指南与 LOC 数字格式可持续性资料共同说明文件格式选择如何影响长期保存和未来可用性。",
    evidenceResourceId: "nara-bulletin-2014-04-format-guidance",
    sourceUrl: "https://www.archives.gov/records-mgmt/bulletins/2014/2014-04",
    confidence: "high",
  },
  {
    id: "rel-nara-metadata-guidance-to-transfer",
    sourceType: "resource",
    sourceId: "nara-bulletin-2015-04-metadata-guidance",
    targetType: "resource",
    targetId: "nara-transfer-electronic-records",
    relationType: "related_to",
    relationLabelZh: "元数据与移交要求",
    descriptionZh:
      "NARA 元数据指南解释永久电子记录移交时需要提供哪些描述和技术信息，应与电子记录移交指南一起阅读。",
    evidenceResourceId: "nara-bulletin-2015-04-metadata-guidance",
    sourceUrl: "https://www.archives.gov/records-mgmt/bulletins/2015/2015-04",
    confidence: "high",
  },
  {
    id: "rel-nara-electronic-preservation-to-transfer",
    sourceType: "resource",
    sourceId: "nara-web-electronic-records-preservation",
    targetType: "resource",
    targetId: "nara-transfer-electronic-records",
    relationType: "related_to",
    relationLabelZh: "保存与移交实践",
    descriptionZh:
      "NARA 电子记录保存入口提供总体背景，永久电子记录移交指南则说明机构把电子记录交给 NARA 的具体要求。",
    evidenceResourceId: "nara-transfer-electronic-records",
    sourceUrl: "https://www.archives.gov/records-mgmt/transfer-electronic-records",
    confidence: "high",
  },
  {
    id: "rel-citizen-archivist-to-missions",
    sourceType: "resource",
    sourceId: "nara-web-citizen-archivist",
    targetType: "resource",
    targetId: "nara-citizen-archivist-missions",
    relationType: "related_to",
    relationLabelZh: "项目任务入口",
    descriptionZh:
      "Citizen Archivist 页面介绍公众协作项目，Missions 页面展示可直接参与的具体任务和馆藏主题。",
    evidenceResourceId: "nara-citizen-archivist-missions",
    sourceUrl: "https://catalog.archives.gov/citizenarchivist",
    confidence: "high",
  },
  {
    id: "rel-citizen-archivist-to-catalog-api",
    sourceType: "resource",
    sourceId: "nara-web-citizen-archivist",
    targetType: "resource",
    targetId: "nara-catalog-api",
    relationType: "related_to",
    relationLabelZh: "平台与数据接口",
    descriptionZh:
      "Citizen Archivist 依托 NARA Catalog 中的数字对象和描述数据；Catalog API 则为研究者提供数据化获取和分析入口。",
    evidenceResourceId: "nara-catalog-api",
    sourceUrl: "https://www.archives.gov/research/catalog/api",
    confidence: "high",
  },
  {
    id: "rel-loc-by-the-people-to-collections-as-data",
    sourceType: "resource",
    sourceId: "loc-by-the-people",
    targetType: "resource",
    targetId: "loc-collections-as-data",
    relationType: "related_to",
    relationLabelZh: "众包与数据化利用",
    descriptionZh:
      "LOC By the People 通过公众转录提升文本可检索性，Collections as Data 则强调把馆藏作为可计算研究数据使用。",
    evidenceResourceId: "loc-by-the-people",
    sourceUrl: "https://crowd.loc.gov/",
    confidence: "high",
  },
  {
    id: "rel-dpla-to-collections-as-data",
    sourceType: "resource",
    sourceId: "dpla-digital-public-library",
    targetType: "resource",
    targetId: "loc-collections-as-data",
    relationType: "related_to",
    relationLabelZh: "开放聚合与数据研究",
    descriptionZh:
      "DPLA 展示跨机构数字文化遗产聚合平台，Collections as Data 则提供把数字馆藏用于计算研究的理念和方法参照。",
    evidenceResourceId: "dpla-digital-public-library",
    sourceUrl: "https://dp.la/",
    confidence: "medium",
  },
];
