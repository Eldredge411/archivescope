"use client";

import Image from "next/image";
import Link from "next/link";
import { type PointerEvent as ReactPointerEvent } from "react";
import type { LinkStatus, ResourceType } from "@/types";
import { linkStatusZh, resourceTypeZh } from "@/lib/display";

type ResourceItem = {
  id: string; slug: string; titleZh: string; titleEn: string;
  resourceType: ResourceType; primaryTopicTitle: string; summaryZh: string;
  linkStatus: LinkStatus; hasBackup: boolean; relationLabelZh: string; sourceUrl: string;
};
type TopicItem = { topic: { id: string; slug: string; titleZh: string; titleEn: string; shortDescription: string }; relationSourceZh: string; relationStrengthZh: string; relationBasis: string; supportingResourceCount: number };
type RelatedInstitution = { id: string; slug: string; nameZh: string; nameEn: string; countryName: string; institutionType: string; relationLabelZh: string; descriptionZh: string };
type Institution = { id: string; nameZh: string; nameEn: string; shortName: string; descriptionZh: string; institutionType: string; institutionSubType: string; institutionLevel: string; location: string; officialUrl: string; establishedYear?: number; tags: string[]; lastCheckedAt: string };

type Volume = "profile" | "resources" | "topics" | "relations";
const volumes: Array<{key:Volume; label:string; en:string}> = [
  {key:"profile",label:"全宗概览",en:"FONDS PROFILE"},
  {key:"resources",label:"馆藏资料",en:"RECORD SERIES"},
  {key:"topics",label:"研究关联",en:"RESEARCH LINKS"},
  {key:"relations",label:"机构关系",en:"INSTITUTION LINKS"},
];

export function InstitutionArchiveRoom({institution, resources, topics, relatedInstitutions}:{institution:Institution;resources:ResourceItem[];topics:TopicItem[];relatedInstitutions:RelatedInstitution[]}) {
  const move=(e:ReactPointerEvent<HTMLElement>)=>{const b=e.currentTarget.getBoundingClientRect();e.currentTarget.style.setProperty("--room-x",String(((e.clientX-b.left)/b.width-.5)*2));e.currentTarget.style.setProperty("--room-y",String(((e.clientY-b.top)/b.height-.5)*2));e.currentTarget.style.setProperty("--focus-x",`${e.clientX-b.left}px`);e.currentTarget.style.setProperty("--focus-y",`${e.clientY-b.top}px`)};
  return <main className="institution-room" onPointerMove={move} onPointerLeave={e=>{e.currentTarget.style.setProperty("--room-x","0");e.currentTarget.style.setProperty("--room-y","0")}}>
    <Image src="/image/institution-fonds-desk-v2.png" alt="深色木质查档桌面与层叠档案纸" fill priority sizes="100vw" className="institution-room__background"/>
    <div className="institution-room__grade" aria-hidden="true"/><div className="institution-room__focus" aria-hidden="true"/><Link className="institution-room__back" href="/stacks?country=usa">← 返回档案架</Link>
    <header className="institution-room__heading"><span>INSTITUTION FONDS · {institution.shortName||institution.id}</span><h1>{institution.nameZh}</h1><p>{institution.nameEn}</p></header>
    <aside className="institution-room__index"><span>全宗目录</span>{volumes.map((v,i)=><a key={v.key} href={`#fonds-${v.key}`}><i>{String(i+1).padStart(2,"0")}</i><strong>{v.label}</strong><small>{v.en}</small></a>)}</aside>
    <section className="institution-ledger" aria-live="polite">
      <div className="institution-ledger__boards" aria-hidden="true"><i/><i/></div>
      {volumes.map((v,i)=><article id={`fonds-${v.key}`} key={v.key} className={`institution-ledger__sheet institution-ledger__sheet--${v.key}`}>
        <div className="institution-ledger__ornaments" aria-hidden="true"><span>AS · {institution.shortName||institution.id}</span><i/><b>{String(i+1).padStart(2,"0")}</b></div>
        <header><div><span>{v.en}</span><h2>{v.label}</h2></div><div className="institution-ledger__ref"><small>全宗代号</small><b>{institution.shortName||institution.id.toUpperCase()}</b></div></header>
        {v.key==="profile"?<Profile institution={institution} resources={resources} topics={topics}/>:null}
        {v.key==="resources"?<Resources resources={resources}/>:null}
        {v.key==="topics"?<Topics topics={topics}/>:null}
        {v.key==="relations"?<Relations items={relatedInstitutions}/>:null}
        <footer><span>最近核验 {institution.lastCheckedAt||"未记录"}</span><b>{String(i+1).padStart(2,"0")} / {String(volumes.length).padStart(2,"0")}</b></footer>
      </article>)}
    </section>
    <section id="institution-catalog" className="institution-catalog"><a className="institution-catalog__shade" aria-label="关闭完整目录" href="#fonds-resources"/><div className="institution-catalog__drawer"><header><div><span>RECORD SERIES CATALOG</span><h2>{institution.shortName} 馆藏资料目录</h2></div><a href="#fonds-resources">收起目录 ↓</a></header><p className="institution-catalog__hint">完整目录按机构馆藏关系编排；点击条目即可进入单条资料查阅台。</p><div>{resources.map((r,i)=><Link key={r.id} href={`/resources/${r.slug}`}><b>{String(i+1).padStart(3,"0")}</b><div><span>{resourceTypeZh[r.resourceType]} · {r.primaryTopicTitle}</span><h3>{r.titleZh||r.titleEn}</h3><p>{r.summaryZh}</p></div><em>调阅 →</em></Link>)}</div></div></section>
  </main>;
}

function Profile({institution,resources,topics}:{institution:Institution;resources:ResourceItem[];topics:TopicItem[]}){return <div className="institution-ledger__profile"><div className="institution-ledger__intro"><span>机构职责与馆藏范围</span><p>{institution.descriptionZh}</p><p className="institution-ledger__guide">查阅建议：先确认机构职能与层级，再进入馆藏资料卷；如需从研究问题出发，可转入“研究关联”查看资料所支撑的专题路径。</p><div>{institution.tags.slice(0,6).map(t=><i key={t}>{t}</i>)}</div></div><dl>{[["设立时间",institution.establishedYear?`${institution.establishedYear} 年`:"未记录"],["机构层级",institution.institutionLevel],["机构类型",institution.institutionType],["专业分类",institution.institutionSubType],["所在地",institution.location]].map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl><div className="institution-ledger__counts"><span><b>{resources.length}</b>馆藏资料</span><span><b>{topics.length}</b>研究专题</span><span><b>{institution.tags.length}</b>检索词</span></div><div className="institution-ledger__actions"><a href={institution.officialUrl} target="_blank" rel="noreferrer">访问机构官网 ↗</a><Link href={`/resources?institution=${institution.id}`}>查看全部资料 →</Link></div></div>}
function Resources({resources}:{resources:ResourceItem[]}){return <div className="institution-ledger__records"><div className="institution-ledger__section-intro"><span>调阅说明</span><p>本卷汇集由该机构发布、管理、运营或与其核心职能直接相关的资料。先呈现最适合作为研究入口的记录，题名下方同时标明资料类型、关联方式与所属专题。</p></div>{resources.slice(0,5).map((r,i)=><Link href={`/resources/${r.slug}`} key={r.id}><b>{String(i+1).padStart(2,"0")}</b><div><span>{resourceTypeZh[r.resourceType]} · {r.relationLabelZh} · {r.primaryTopicTitle}</span><h3>{r.titleZh||r.titleEn}</h3><p>{r.summaryZh}</p></div><em>调阅 →</em></Link>)}{resources.length?<a className="institution-ledger__catalog-trigger" href="#institution-catalog">展开完整馆藏目录 · {resources.length} 条</a>:<small>该机构的馆藏资料仍在整理中。</small>}</div>}
function Topics({topics}:{topics:TopicItem[]}){return <div className="institution-ledger__topics"><div className="institution-ledger__section-intro"><span>研究路径</span><p>这些专题不是孤立标签，而是由该机构发布或管理的资料归纳出的研究入口。关联强度与支撑资料数量可以帮助判断继续查阅的优先顺序。</p></div>{topics.slice(0,6).map((t,i)=><Link href={`/topics/${t.topic.slug}`} key={t.topic.id}><i>{String(i+1).padStart(2,"0")}</i><div><span>{t.relationStrengthZh} · {t.supportingResourceCount} 条资料支撑</span><h3>{t.topic.titleZh}</h3><p>{t.relationBasis}。{t.topic.shortDescription}</p></div></Link>)}</div>}
function Relations({items}:{items:RelatedInstitution[]}){return <div className="institution-ledger__relations"><div className="institution-ledger__section-intro"><span>关系释读</span><p>本卷沿隶属、协作、制度衔接和资源联系组织相邻机构。进入另一机构全宗后，可以继续比较其职责、资料类型与研究专题。</p></div>{items.length?items.slice(0,5).map((it,i)=><Link href={`/institutions/${it.slug}`} key={it.id}><b>{String(i+1).padStart(2,"0")}</b><div><span>{it.relationLabelZh} · {it.institutionType} · {it.countryName}</span><h3>{it.nameZh}</h3><p>{it.descriptionZh}</p></div></Link>):<div className="institution-ledger__empty"><span>关系卷待补</span><p>目前尚未建立经过核验的机构关系。后续将优先补充隶属体系、业务协作、共同发布资料以及平台运营关系，并在此形成可连续追踪的查档路径。</p><small>当前状态：等待关系证据核验与人工确认</small></div>}</div>}
