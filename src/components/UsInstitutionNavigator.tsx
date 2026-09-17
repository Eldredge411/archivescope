"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, type PointerEvent as ReactPointerEvent } from "react";
import type { Institution, InstitutionGroup, Resource } from "@/types";

type Props={institutions:Institution[];resources:Resource[];countryName:string;initialGroup?:string;initialQuery?:string};
const groups:Array<{value:InstitutionGroup;label:string;en:string;description:string}>=[
 {value:"federal",label:"联邦机构",en:"FEDERAL",description:"国家层面的档案、文件管理、文化记忆与信息服务机构"},
 {value:"state",label:"各州机构",en:"STATE",description:"州级档案馆、图书馆、博物馆及公共文件管理机构"},
 {value:"social",label:"社会机构",en:"ASSOCIATION",description:"专业协会、非营利组织与档案行业共同体"},
 {value:"academic",label:"高校与研究机构",en:"ACADEMIC",description:"高校、研究中心与档案学教育研究机构"},
 {value:"commercial",label:"商业与服务机构",en:"SERVICE",description:"面向文件管理、数字保存与档案利用的服务机构"},
 {value:"other",label:"其他机构",en:"OTHER",description:"暂未归入主要类型但具有研究价值的相关机构"},
];
const valid=(value?:string):value is InstitutionGroup=>groups.some(g=>g.value===value);
const groupOf=(i:Institution)=>i.institutionGroup??"other";

export function UsInstitutionNavigator({institutions,resources,countryName,initialGroup,initialQuery}:Props){
 const active=valid(initialGroup)?initialGroup:"federal",meta=groups.find(g=>g.value===active)!;
 const query=String(initialQuery??"");
 const resourceCounts=useMemo(()=>{const m=new Map<string,number>();resources.forEach(r=>m.set(r.institutionId,(m.get(r.institutionId)??0)+1));return m},[resources]);
 const visible=useMemo(()=>{const q=query.trim().toLowerCase();return institutions.filter(i=>groupOf(i)===active&&(!q||[i.nameZh,i.nameEn,i.shortName,i.descriptionZh,i.location,i.institutionType,...i.tags].join(" ").toLowerCase().includes(q)))},[active,institutions,query]);
 const counts=useMemo(()=>new Map(groups.map(g=>[g.value,institutions.filter(i=>groupOf(i)===g.value).length])),[institutions]);
 const move=(e:ReactPointerEvent<HTMLElement>)=>{const b=e.currentTarget.getBoundingClientRect();e.currentTarget.style.setProperty("--directory-x",`${e.clientX-b.left}px`);e.currentTarget.style.setProperty("--directory-y",`${e.clientY-b.top}px`);e.currentTarget.style.setProperty("--directory-shift",String(((e.clientX-b.left)/b.width-.5)*2))};
 return <main className="institution-directory" onPointerMove={move}>
  <Image src="/image/institution-fonds-desk-v2.png" alt="档案目录柜与查阅台" fill priority sizes="100vw" className="institution-directory__background"/><div className="institution-directory__grade"/><div className="institution-directory__focus"/>
  <Link className="institution-directory__back" href="/stacks?country=usa">← 返回档案架</Link>
  <header className="institution-directory__heading"><span>INSTITUTION DIRECTORY · USA</span><h1>{countryName}组织机构目录</h1><p>从机构类别进入全宗登记卡，再调阅机构档案与关联资料</p></header>
  <aside className="institution-directory__cabinet" aria-label="机构类别目录柜"><div className="institution-directory__cabinet-title"><span>分类柜</span><b>06</b></div>{groups.map((g,i)=><Link key={g.value} href={`/institutions/usa?group=${g.value}`} className={active===g.value?"is-active":""}><i>{String(i+1).padStart(2,"0")}</i><div><strong>{g.label}</strong><small>{g.en}</small></div><b>{counts.get(g.value)??0}</b></Link>)}</aside>
  <section className="institution-directory__desk">
   <div className="institution-directory__underlay" aria-hidden="true"><i/><i/><i/></div>
   <div className="institution-directory__sheet">
    <header><div><span>{meta.en} FONDS REGISTER</span><h2>{meta.label}</h2><p>{meta.description}</p></div><div className="institution-directory__stats"><span><b>{visible.length}</b>当前登记</span><span><b>{resources.filter(r=>visible.some(i=>i.id===r.institutionId)).length}</b>关联资料</span></div></header>
    <div className="institution-directory__tools"><form action="/institutions/usa" method="get"><input type="hidden" name="group" value={active}/><label><span>目录检索</span><input type="search" name="q" defaultValue={query} placeholder="输入关键词并按回车检索"/></label></form><p>悬浮登记卡可查看职责摘要，点击后抽取机构全宗。</p></div>
    <div className="institution-directory__cards">{visible.length?visible.map((institution,index)=><InstitutionCard key={institution.id} institution={institution} index={index} resourceCount={resourceCounts.get(institution.id)??0}/>):<EmptyRegister searching={Boolean(query.trim())} category={meta.label}/>}</div>
    <footer><span>ARCHIVESCOPE · INSTITUTION REGISTER</span><b>{String(visible.length).padStart(2,"0")} FONDS</b></footer>
   </div>
  </section>
 </main>
}

function EmptyRegister({searching,category}:{searching:boolean;category:string}){return <div className="institution-directory__empty"><header><span>{searching?"NO MATCHING FONDS":"REGISTER IN PREPARATION"}</span><b>{searching?"未找到匹配登记卡":`${category}目录正在建设`}</b><p>{searching?"当前检索词没有命中本柜机构，可清空检索词或切换分类。":"该分类暂未收入经过核验的机构条目。以下工作完成后，登记卡将依次归档到本柜。"}</p></header><div><span><i>01</i><b>机构识别</b><small>确认正式名称、机构属性与官方网站</small></span><span><i>02</i><b>职责核验</b><small>整理机构层级、业务范围与所在地</small></span><span><i>03</i><b>资料挂接</b><small>建立机构与政策、平台、项目资料的关系</small></span></div><footer><Link href="/institutions/usa?group=federal">转至联邦机构柜</Link><Link href="/institutions/usa?group=state">转至各州机构柜</Link></footer></div>}

function InstitutionCard({institution,index,resourceCount}:{institution:Institution;index:number;resourceCount:number}){
 const location=institution.stateNameZh||institution.stateName||institution.stateCode||institution.location||"所在地待补";
 return <Link href={`/institutions/${institution.slug}`} className="institution-register-card">
  <div className="institution-register-card__number"><span>{String(index+1).padStart(2,"0")}</span><b>{institution.shortName||"FONDS"}</b></div>
  <div className="institution-register-card__body"><span>{institution.institutionLevel} · {institution.institutionType}</span><h3>{institution.nameZh}</h3><small>{institution.nameEn}</small><p>{institution.descriptionZh}</p><div>{institution.tags.slice(0,3).map(tag=><i key={tag}>{tag}</i>)}</div></div>
  <dl><div><dt>地点</dt><dd>{location}</dd></div><div><dt>资料</dt><dd>{resourceCount} 条</dd></div><div><dt>核验</dt><dd>{institution.lastCheckedAt||"待补"}</dd></div></dl>
  <em>抽取全宗 →</em>
 </Link>
}
