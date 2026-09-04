const protectedPhrases = ["未记录", "暂未记录", "已记录"];

const preferredReplacements = [
  ["国家档案与记录管理局", "国家档案与文件管理局"],
  ["国家档案和记录管理局", "国家档案和文件管理局"],
  ["档案与记录管理", "档案与文件管理"],
  ["电子记录", "电子文件"],
  ["联邦记录", "联邦文件"],
  ["总统记录", "总统文件"],
  ["公共记录", "公共文件"],
  ["行政记录", "行政文件"],
  ["业务记录", "业务文件"],
  ["财务记录", "财务文件"],
  ["官方记录", "官方文件"],
  ["公务记录", "公务文件"],
  ["档案记录", "档案文件"],
  ["数字记录", "数字文件"],
  ["数字化记录", "数字化文件"],
  ["纸质记录", "纸质文件"],
  ["临时记录", "临时文件"],
  ["永久记录", "永久文件"],
  ["通用记录", "通用文件"],
  ["系统记录", "系统文件"],
  ["记录管理", "文件管理"],
  ["记录治理", "文件治理"],
  ["记录制度", "文件制度"],
  ["记录政策", "文件政策"],
  ["记录法规", "文件法规"],
  ["记录官", "文件官"],
  ["记录机构", "文件机构"],
  ["记录责任", "文件责任"],
  ["记录义务", "文件义务"],
  ["记录要求", "文件要求"],
  ["记录程序", "文件程序"],
  ["记录流程", "文件流程"],
  ["记录计划", "文件计划"],
  ["记录审批", "文件审批"],
  ["记录申请", "文件申请"],
  ["记录处置", "文件处置"],
  ["记录保存", "文件保存"],
  ["记录保管", "文件保管"],
  ["记录存储", "文件存储"],
  ["记录创建", "文件创建"],
  ["记录形成", "文件形成"],
  ["记录维护", "文件维护"],
  ["记录移交", "文件移交"],
  ["记录捕获", "文件捕获"],
  ["记录生命周期", "文件生命周期"],
  ["记录全生命周期", "文件全生命周期"],
  ["记录转型", "文件转型"],
  ["记录实践", "文件实践"],
  ["记录合规", "文件合规"],
  ["记录开放", "文件开放"],
  ["记录利用", "文件利用"],
  ["记录获取", "文件获取"],
  ["记录请求", "文件请求"],
  ["记录访问", "文件访问"],
  ["记录修正", "文件修正"],
  ["记录披露", "文件披露"],
  ["记录真实性", "文件真实性"],
  ["记录完整性", "文件完整性"],
  ["记录表", "文件表"],
  ["记录材料", "文件材料"],
  ["记录集合", "文件集合"],
  ["记录描述", "文件描述"],
  ["记录类型", "文件类型"],
  ["记录用途", "文件用途"],
  ["记录法", "文件法"],
  ["记录中心", "文件中心"],
  ["记录控制表", "文件控制表"],
  ["记录鉴定", "文件鉴定"],
  ["记录定义", "文件定义"],
  ["记录保护", "文件保护"],
  ["记录系统", "文件系统"],
  ["记录类别", "文件类别"],
  ["记录公开", "文件公开"],
  ["记录工作", "文件工作"],
  ["记录现代化", "文件现代化"],
  ["记录服务", "文件服务"],
  ["记录迁移", "文件迁移"],
  ["记录数字化", "文件数字化"],
];

export function normalizeRecordTerminologyText(value) {
  let text = String(value ?? "");
  const placeholders = new Map();

  protectedPhrases.forEach((phrase, index) => {
    const placeholder = `__RECORD_TERM_${index}__`;
    text = text.split(phrase).join(placeholder);
    placeholders.set(placeholder, phrase);
  });

  for (const [from, to] of preferredReplacements) {
    text = text.split(from).join(to);
  }

  text = text.split("记录").join("文件");

  for (const [placeholder, phrase] of placeholders) {
    text = text.split(placeholder).join(phrase);
  }

  return text;
}

export function normalizeRecordTerminology(value) {
  if (typeof value === "string") {
    return normalizeRecordTerminologyText(value);
  }

  if (Array.isArray(value)) {
    return value.map(normalizeRecordTerminology);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        normalizeRecordTerminology(item),
      ]),
    );
  }

  return value;
}
