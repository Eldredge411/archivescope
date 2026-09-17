"use client";
import Image from "next/image";
import Link from "next/link";
import type { Institution, Resource, Topic } from "@/types";
import { resourceTypeZh } from "@/lib/display";
import type { PointerEvent as ReactPointerEvent } from "react";

type Props={topics:Topic[];resources:Resource[];institutions:Institution[]};
type Milestone={resource:Resource;year:string;institution:string};
const typeWeight:Record<string,number>={law:12,regulation:11,policy:10,strategy:9,guidance:8,system:7,program:6,report:5,database:4,catalog:3,portal:2};

export function ArchiveKnowledgeRoom({topics,resources,institutions}:Props){
 const institutionById=new Map(institutions.map(i=>[i.id,i]));
 const dated=resources.filter(r=>/^\d{4}/.test(r.publishDate||r.updatedDate||""));
 const byYear=new Map<string,Resource[]>();dated.forEach(r=>{const year=(r.publishDate||r.updatedDate).slice(0,4);byYear.set(year,[...(byYear.get(year)??[]),r])});
 const milestones:Array<Milestone>=Array.from(byYear.entries()).sort(([a],[b])=>a.localeCompare(b)).map(([year,items])=>({year,resource:[...items].sort((a,b)=>(typeWeight[b.resourceType]??0)-(typeWeight[a.resourceType]??0))[0],institution:institutionById.get([...items].sort((a,b)=>(typeWeight[b.resourceType]??0)-(typeWeight[a.resourceType]??0))[0].institutionId)?.nameZh??"来源机构待核"})).filter((_,i,a)=>i===0||i===a.length-1||i%Math.max(1,Math.floor(a.length/10))===0).slice(-12);
 const topicRecords=topics.slice().sort((a,b)=>a.sortIndex-b.sortIndex).map(t=>{const related=resources.filter(r=>r.primaryTopicId===t.id||r.topicIds.includes(t.id));return{topic:t,count:related.length,institutions:new Set(related.map(r=>r.institutionId)).size,sample:related.slice(0,3)}});
 const institutionRecords=institutions.map(i=>({institution:i,items:resources.filter(r=>r.institutionId===i.id)})).filter(x=>x.items.length).sort((a,b)=>b.items.length-a.items.length).slice(0,8);
 const move=(e:ReactPointerEvent<HTMLElement>)=>{const b=e.currentTarget.getBoundingClientRect();e.currentTarget.style.setProperty("--knowledge-x",`${e.clientX-b.left}px`);e.currentTarget.style.setProperty("--knowledge-y",`${e.clientY-b.top}px`)};
 return <main className="knowledge-room" onPointerMove={move}>
  <Image src="/image/topic-workbench-cg-v2.png" alt="第一视角档案知识脉络工作台" fill priority sizes="100vw" className="knowledge-room__background"/><div className="knowledge-room__grade"/><div className="knowledge-room__focus"/>
  <Link href="/stacks?country=usa" className="knowledge-room__back">← 返回档案架</Link>
  <header className="knowledge-room__heading"><span>ARCHIVAL KNOWLEDGE TRAILS</span><h1>美国档案知识脉络</h1><p>沿时间、专题与机构三条线索，追踪制度如何形成、资料如何关联、实践如何展开</p></header>
  <aside className="knowledge-room__lenses"><span>查阅视角</span><a href="#atlas-timeline"><i>01</i><b>时间脉络</b><small>制度与事件的展开</small></a><a href="#atlas-topics"><i>02</i><b>专题脉络</b><small>问题与资料的聚合</small></a><a href="#atlas-institutions"><i>03</i><b>机构脉络</b><small>责任与馆藏的联系</small></a></aside>
  <section className="knowledge-folio"><div className="knowledge-folio__layers"><i/><i/></div>
   <article id="atlas-timeline" className="knowledge-panel knowledge-panel--timeline"><PanelHeader code="CHRONOLOGY" title="时间脉络" note={`从 ${milestones[0]?.year??"未记录"} 到 ${milestones.at(-1)?.year??"当前"}，选择关键资料作为制度演进的时间锚点。`}/><div className="knowledge-timeline"><div className="knowledge-timeline__line"/>{milestones.map((m,i)=><Link href={`/resources/${m.resource.slug}`} key={m.resource.id} className={i%2?"is-right":"is-left"}><time>{m.year}</time><div><span>{resourceTypeZh[m.resource.resourceType]} · {m.institution}</span><h3>{m.resource.titleZh||m.resource.titleEn}</h3><p>{m.resource.summaryShort||m.resource.summaryZh}</p><b>查看节点 →</b></div></Link>)}</div><PanelFooter label={`${milestones.length} 个关键时间节点`}/></article>
   <article id="atlas-topics" className="knowledge-panel knowledge-panel--topics"><PanelHeader code="RESEARCH CONSTELLATION" title="专题脉络" note="每个专题是一条研究问题线索；资料数量与机构数量共同显示其证据覆盖范围。"/><div className="knowledge-topic-map"><div className="knowledge-topic-map__center"><span>RESEARCH CORE</span><b>六条研究路径</b><small>{resources.length} 条资料共同支撑</small></div>{topicRecords.map((r,i)=><Link key={r.topic.id} href={`/topics/${r.topic.slug}`} className={`knowledge-topic-node knowledge-topic-node--${i+1}`}><i>{String(i+1).padStart(2,"0")}</i><span>{r.count} 资料 · {r.institutions} 机构</span><h3>{r.topic.titleZh}</h3><p>{r.topic.plainQuestion}</p><b>进入专题 →</b></Link>)}</div><PanelFooter label={`${topicRecords.length} 个研究专题`}/></article>
   <article id="atlas-institutions" className="knowledge-panel knowledge-panel--institutions"><PanelHeader code="AUTHORITY TRAILS" title="机构脉络" note="从责任机构出发，查看其馆藏规模、资料类型和可继续追踪的代表卷宗。"/><div className="knowledge-institution-trails">{institutionRecords.map((r,i)=><section key={r.institution.id}><Link href={`/institutions/${r.institution.slug}`} className="knowledge-institution-trails__head"><i>{String(i+1).padStart(2,"0")}</i><div><span>{r.institution.institutionLevel} · {r.institution.institutionType}</span><h3>{r.institution.nameZh}</h3></div><b>{r.items.length}<small>资料</small></b></Link><div>{r.items.slice(0,2).map(item=><Link key={item.id} href={`/resources/${item.slug}`}><span>{resourceTypeZh[item.resourceType]}</span>{item.titleZh||item.titleEn}</Link>)}</div></section>)}</div><PanelFooter label={`${institutionRecords.length} 个核心责任机构`}/></article>
  </section>
 </main>
}
function PanelHeader({code,title,note}:{code:string;title:string;note:string}){return <header className="knowledge-panel__header"><div><span>{code}</span><h2>{title}</h2></div><p>{note}</p></header>}
function PanelFooter({label}:{label:string}){return <footer className="knowledge-panel__footer"><span>ARCHIVESCOPE · KNOWLEDGE TRAILS</span><b>{label}</b></footer>}
