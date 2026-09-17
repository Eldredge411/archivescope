export type AtlasInquiry = {
  id: string;
  topicIndex: number;
  title: string;
  question: string;
  brief: string;
  storyId?: string;
};

export const atlasInquiries: AtlasInquiry[] = [
  { id: "governance", topicIndex: 0, title: "制度如何形成", question: "美国档案治理的权力与责任如何被写进制度？", brief: "从法律、规章到机构职责，顺着制度依据寻找治理结构。", storyId: "declassification-road" },
  { id: "electronic-records", topicIndex: 1, title: "电子文件如何接管", question: "电子文件如何从业务系统进入国家档案体系？", brief: "观察规则、系统能力、移交与长期保存之间的连续链条。", storyId: "electronic-records-challenge" },
  { id: "digital-preservation", topicIndex: 2, title: "数字记忆如何保存", question: "面对格式淘汰与技术变迁，数字档案如何延续？", brief: "沿标准、保存计划与实践项目理解数字保存的技术和组织条件。" },
  { id: "public-access", topicIndex: 3, title: "开放边界如何协商", question: "公众获取权、国家安全与个人隐私如何取得平衡？", brief: "把公开、解密、隐私和利用服务放在同一条证据链中阅读。", storyId: "privacy-and-openness" },
  { id: "participation", topicIndex: 4, title: "公众如何参与", question: "档案机构如何让公众从查阅者变为共同参与者？", brief: "从服务入口、开放数据与公众项目追踪利用关系的变化。" },
  { id: "ai-data", topicIndex: 5, title: "智能技术改变什么", question: "数据与人工智能正在怎样改变档案描述、发现与利用？", brief: "连接平台、数据接口、自动化方法及其治理边界。" },
];
