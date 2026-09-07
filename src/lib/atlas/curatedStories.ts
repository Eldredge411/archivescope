import type { AtlasViewState } from "@/lib/atlas/viewState";

export type StoryStep = {
  chapterNo: number;
  textZh: string;
  viewState: AtlasViewState;
  evidenceIds: string[];
};

export type Story = {
  id: string;
  titleZh: string;
  titleEn: string;
  summary: string;
  chapterCount: number;
  estimatedMinutes: number;
  steps: StoryStep[];
};

export const curatedStories: Story[] = [
  {
    id: "declassification-road",
    titleZh: "解密之路",
    titleEn: "The Road to Declassification",
    summary: "从 2000 年解密规则到 NARA 解密入口，观察国家安全信息如何进入可审查、可申请的档案开放流程。",
    chapterCount: 3,
    estimatedMinutes: 4,
    steps: [
      {
        chapterNo: 1,
        textZh: "2000 年 6 月 1 日，NARA 在《联邦公报》发布档案解密规则。它把移交入馆的国家安全信息放入统一程序：满期自动解密、受限数据另作审查，公众也可提出强制审查请求。规则的核心，是把“是否解密”从零散裁量变成可追踪的制度步骤。",
        viewState: { view: "timeline", focusNodeId: "fr-00-13809" },
        evidenceIds: ["fr-00-13809"],
      },
      {
        chapterNo: 2,
        textZh: "2011 年的《国家安全信息解密》公告继续处理规则与实践的衔接。它不是故事的起点，而是显示解密制度如何随行政命令和机构责任不断调整。对研究者而言，这类公告能帮助我们辨认规则条文的修订时机及其治理背景。",
        viewState: { view: "timeline", focusNodeId: "fr-2011-33284" },
        evidenceIds: ["fr-2011-33284"],
      },
      {
        chapterNo: 3,
        textZh: "最终，制度要求需要抵达利用者。NARA 解密工作页面把规则、审查申请和相关服务组织为入口，使研究者不必先阅读全部法规即可理解可用的路径。这里显示的是制度从文本走向服务界面的最后一段。",
        viewState: { view: "network", focusNodeId: "nara-web-declassification", showInferred: true },
        evidenceIds: ["nara-web-declassification"],
      },
    ],
  },
  {
    id: "privacy-and-openness",
    titleZh: "隐私与公开的拉锯",
    titleEn: "Privacy and Public Access",
    summary: "以《隐私法》、36 CFR 1202 与 FOIA 入口为线索，解释个人隐私保护和公共获取权如何并行运转。",
    chapterCount: 4,
    estimatedMinutes: 5,
    steps: [
      {
        chapterNo: 1,
        textZh: "《1974 年隐私法》确立联邦机构处理个人信息文件的基本边界：个人可以请求访问和更正自己的记录，机构披露信息则受到限制。它把“个人信息”从普通档案业务中抽出来，形成专门的法律责任。",
        viewState: { view: "timeline", focusNodeId: "uscode-5-section-552a-privacy-act" },
        evidenceIds: ["uscode-5-section-552a-privacy-act"],
      },
      {
        chapterNo: 2,
        textZh: "36 CFR 第 1202 部分是 NARA 落实隐私法的实施规则，涵盖个人请求、披露限制、记录修正和特定文件系统豁免。站内已核验的授权关系显示，隐私法为该规则提供上位依据。",
        viewState: {
          view: "network",
          focusNodeId: "ecfr-36-cfr-1202",
          highlightEdgeIds: ["graph-cur-auth-privacy-act-1202"],
        },
        evidenceIds: ["uscode-5-section-552a-privacy-act", "ecfr-36-cfr-1202"],
      },
      {
        chapterNo: 3,
        textZh: "2016 年豁免规则公告展示制度继续细化。它讨论《隐私法》豁免如何适用于特定文件系统，使安全、执法或敏感管理需要能与个人访问权并存。这提醒我们：隐私保护不是绝对封闭，而是逐类说明边界。",
        viewState: { view: "timeline", focusNodeId: "fr-2016-13599" },
        evidenceIds: ["fr-2016-13599", "ecfr-36-cfr-1202"],
      },
      {
        chapterNo: 4,
        textZh: "另一侧是 FOIA。它赋予公众请求获取联邦机构文件的权利，并规定豁免与救济机制。NARA 的 FOIA 页面把法律要求转化为办理入口。隐私法与 FOIA 并行，构成“保护个人”与“保障获取”的双轨。",
        viewState: {
          view: "network",
          focusNodeId: "nara-web-foia",
          highlightEdgeIds: [
            "graph-cur-auth-foia-law-portal",
            "graph-cur-auth-foia-rule-portal",
          ],
        },
        evidenceIds: ["uscode-5-section-552-foia", "nara-web-foia"],
      },
    ],
  },
  {
    id: "electronic-records-challenge",
    titleZh: "电子文件的挑战",
    titleEn: "The Electronic Records Challenge",
    summary: "从电子文件管理规则到 ERA 系统，再到 Catalog API，看制度要求如何变成基础设施和利用通道。",
    chapterCount: 3,
    estimatedMinutes: 4,
    steps: [
      {
        chapterNo: 1,
        textZh: "36 CFR 第 1236 部分集中规定电子文件、电子邮件、数字化副本和电子系统中的文件管理要求。它说明电子文件不是“保存一个文件”那么简单，而是涉及形成、维护、处置、移交与保存的连续责任。",
        viewState: { view: "timeline", focusNodeId: "ecfr-36-cfr-1236" },
        evidenceIds: ["ecfr-36-cfr-1236"],
      },
      {
        chapterNo: 2,
        textZh: "NARA 通用电子文件管理需求把这些要求转成系统能力：元数据、处置、检索与合规。制度语言开始变成机构采购和系统建设中的功能清单，电子文件治理由此进入平台化阶段。",
        viewState: { view: "timeline", focusNodeId: "nara-universal-erm-requirements" },
        evidenceIds: ["ecfr-36-cfr-1236", "nara-universal-erm-requirements"],
      },
      {
        chapterNo: 3,
        textZh: "ERA 承接联邦机构电子文件移交、处置请求和长期保存；Catalog API 则把目录元数据和数字对象开放给数据驱动研究。前者解决电子文件如何进入国家档案体系，后者解决研究者和公众如何再次抵达它们。",
        viewState: {
          view: "network",
          focusNodeId: "nara-catalog-api",
          showInferred: true,
        },
        evidenceIds: [
          "nara-electronic-records-archives-era",
          "nara-catalog-api",
        ],
      },
    ],
  },
];

// DRAFT: 所有故事叙述为基于真实资源摘要和日期整理的初稿，待人工润色。
