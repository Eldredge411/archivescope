"use client";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
import { linkStatusZh } from "@/lib/display";
import type { LinkStatus, ResourceType } from "@/types";

type Stat={label:string;value:number;description:string};
type Topic={id:string;slug:string;titleZh:string;titleEn:string;plainQuestion:string;description:string;examples:string[];relatedKeywords:string[]};
type Resource={id:string;slug:string;titleZh:string;titleEn:string;resourceType:ResourceType;resourceTypeLabel:string;institutionName:string;summary:string;updatedDate:string;linkStatus:LinkStatus;hasBackup:boolean;sourceDomain:string;tags:string[]};
type Group={type:ResourceType;label:string;labelEn:string;resources:Resource[]};
type Props={topic:Topic;topicIndex:number;stats:Stat[];groups:Group[]};
const PAGE_SIZE=6;
function description(group?:Group){if(!group)return"该分卷正在整理中。";if(["law","regulation"].includes(group.type))return"从制度依据与规则条文开始，建立这一专题的治理背景。";if(["program","system"].includes(group.type))return"查看项目、系统与实践案例，理解档案工作如何具体展开。";if(group.type==="portal")return"从官方入口继续检索目录、专题栏目与原始资料。";return"按同一资料类型集中阅读，比较不同机构的建设路径。"}

export function TopicDossierDetail({topic,topicIndex,stats,groups}:Props){
 const[activeType,setActiveType]=useState<ResourceType|null>(groups[0]?.type??null),[catalogOpen,setCatalogOpen]=useState(false),[query,setQuery]=useState(""),[page,setPage]=useState(1);
 const activeGroup=groups.find(g=>g.type===activeType)??groups[0],all=useMemo(()=>groups.flatMap(g=>g.resources),[groups]),normalized=query.trim().toLowerCase();
 const visible=normalized?all.filter(r=>[r.titleZh,r.titleEn,r.summary,r.institutionName,r.resourceTypeLabel,...r.tags].join(" ").toLowerCase().includes(normalized)):activeGroup?.resources??[],maxPage=Math.max(1,Math.ceil(visible.length/PAGE_SIZE)),currentPage=Math.min(page,maxPage),paged=visible.slice((currentPage-1)*PAGE_SIZE,currentPage*PAGE_SIZE),core=(activeGroup?.resources.length?activeGroup.resources:all).slice(0,3);
 const select=(type:ResourceType)=>{setActiveType(type);setQuery("");setPage(1)};
 const move=(e:ReactPointerEvent<HTMLElement>)=>{const b=e.currentTarget.getBoundingClientRect();e.currentTarget.style.setProperty("--desk-x",String(((e.clientX-b.left)/b.width-.5)*2));e.currentTarget.style.setProperty("--desk-y",String(((e.clientY-b.top)/b.height-.5)*2))};
 return <main className={`topic-workbench${catalogOpen?" is-catalog-open":""}`} onPointerMove={move} onPointerLeave={e=>{e.currentTarget.style.setProperty("--desk-x","0");e.currentTarget.style.setProperty("--desk-y","0")}}>
  <Image src="/image/topic-workbench-cg-v2.png" alt="档案库中的第一视角查档工作台" fill priority sizes="100vw" className="topic-workbench__background"/><div className="topic-workbench__grade" aria-hidden="true"/><Link className="topic-workbench__back" href="/stacks?country=usa">← 返回档案架</Link>
  <header className="topic-workbench__heading"><span>专题卷宗 {String(topicIndex+1).padStart(2,"0")}</span><h1>{topic.titleZh}</h1><p>{topic.plainQuestion}</p></header>
  <aside className="topic-workbench__index" aria-label="专题资料分卷"><span>资料分卷</span>{groups.map((g,i)=><button key={g.type} className={g.type===activeGroup?.type?"is-active":""} onClick={()=>select(g.type)}><i>{String(i+1).padStart(2,"0")}</i><strong>{g.label}</strong><small>{g.resources.length}</small></button>)}</aside>
  <section className="topic-workbench__document" aria-live="polite"><div className="topic-workbench__under-sheet"/><div key={activeGroup?.type??"empty"} className="topic-workbench__document-sheet"><header><div><span>{activeGroup?.labelEn??"RESEARCH FILE"}</span><h2>{activeGroup?.label??"核心资料"}</h2><p>{description(activeGroup)}</p></div><div className="topic-workbench__stats">{stats.slice(0,3).map(s=><span key={s.label}><strong>{s.value}</strong><small>{s.label}</small></span>)}</div></header><div className="topic-workbench__core"><span>建议先查阅</span>{core.length?core.map((r,i)=><Link key={r.id} href={`/resources/${r.slug}`} className="topic-workbench__resource"><b>{String(i+1).padStart(2,"0")}</b><div><span>{r.resourceTypeLabel} · {r.institutionName}</span><h3>{r.titleZh||r.titleEn}</h3><p>{r.summary||r.titleEn}</p></div><em>打开 →</em></Link>):<p>该分卷暂时没有已收录资料。</p>}</div><footer><div>{topic.relatedKeywords.slice(0,4).map(k=><span key={k}>{k}</span>)}</div><button onClick={()=>setCatalogOpen(true)}>打开完整资料目录</button></footer></div></section>
  <section className="topic-catalog" aria-hidden={!catalogOpen}><button className="topic-catalog__shade" aria-label="关闭资料目录" onClick={()=>setCatalogOpen(false)}/><div className="topic-catalog__drawer"><header><div><span>COMPLETE CATALOG</span><h2>{topic.titleZh} · 完整目录</h2></div><button onClick={()=>setCatalogOpen(false)}>收起目录 ↓</button></header><div className="topic-catalog__tools"><input type="search" value={query} placeholder="输入法规、项目、机构或关键词" onChange={e=>{setQuery(e.target.value);setPage(1)}}/><nav>{groups.map(g=><button key={g.type} className={!normalized&&g.type===activeGroup?.type?"is-active":""} onClick={()=>select(g.type)}>{g.label}<small>{g.resources.length}</small></button>)}</nav></div><div className="topic-catalog__list">{paged.map(r=><Link key={r.id} href={`/resources/${r.slug}`}><span>{r.resourceTypeLabel}</span><div><h3>{r.titleZh||r.titleEn}</h3><p>{r.summary||r.titleEn}</p><small>{r.institutionName} · {r.updatedDate} · {linkStatusZh[r.linkStatus]}</small></div><b>查阅 →</b></Link>)}</div>{maxPage>1?<footer><button disabled={currentPage===1} onClick={()=>setPage(v=>Math.max(1,v-1))}>上一页</button><span>{currentPage} / {maxPage}</span><button disabled={currentPage===maxPage} onClick={()=>setPage(v=>Math.min(maxPage,v+1))}>下一页</button></footer>:null}</div></section>
 </main>;
}
