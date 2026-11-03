'use client';

import {useEffect, useMemo, useState} from 'react';
import {
  ArrowUpRight, BookOpen, Check, ChevronRight, Compass, Download,
  Footprints, Leaf, Link2, Network, Pencil, Plus, RotateCcw, Trash2, Upload,
} from 'lucide-react';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle} from '@/components/ui/sheet';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Checkbox} from '@/components/ui/checkbox';
import {bridges, demo, fields, suggest, type Entry, type PersonalLink} from '@/lib/forest';
import {loadForest, parseForest, saveForest} from '@/lib/storage';

function Choice({value, onChange, values, label}: {
  value: string; onChange: (value: string) => void; values: string[]; label: string;
}) {
  return <Select value={value} onValueChange={onChange}>
    <SelectTrigger aria-label={label} className="choice"><SelectValue/></SelectTrigger>
    <SelectContent>{values.map(value => <SelectItem value={value} key={value}>{value}</SelectItem>)}</SelectContent>
  </Select>;
}

function newId() {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : 'zhilin-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
}

function localDay() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function entryDay(entry: Entry) {
  return entry.learnedOn && /^\d{4}-\d{2}-\d{2}$/.test(entry.learnedOn)
    ? entry.learnedOn : entry.created.slice(0, 10);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : '请重试。';
}

type Position = {x: number; y: number; color: string; label: string; root?: boolean};

export default function Home() {
  const [records, setRecords] = useState<Entry[]>([]);
  const [links, setLinks] = useState<PersonalLink[]>([]);
  const [mode, setMode] = useState<'demo' | 'mine'>('demo');
  const [tab, setTab] = useState('map');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [showLinks, setShowLinks] = useState(true);
  const [zoom, setZoom] = useState(1);

  const [recordOpen, setRecordOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [existingFileName, setExistingFileName] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState('书籍');
  const [progress, setProgress] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('接触过');
  const [learnedOn, setLearnedOn] = useState(localDay);
  const [topics, setTopics] = useState<string[]>([]);
  const [field, setField] = useState('哲学');
  const [topic, setTopic] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [recordError, setRecordError] = useState('');
  const [hint, setHint] = useState('');

  const [linkOpen, setLinkOpen] = useState(false);
  const [linkId, setLinkId] = useState<string | null>(null);
  const [linkA, setLinkA] = useState('');
  const [linkB, setLinkB] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkNote, setLinkNote] = useState('');
  const [certainty, setCertainty] = useState<PersonalLink['certainty']>('待检验的想法');
  const [linkError, setLinkError] = useState('');

  async function load() {
    setLoading(true);
    setLoadError('');
    try {
      const data = await loadForest();
      setRecords(data.entries);
      setLinks(data.links);
      if (data.entries.length || data.links.length) setMode('mine');
    } catch (error) {
      setLoadError('无法读取本机记录：' + errorMessage(error) + ' 请不要清除网站数据。');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);

  const entries = mode === 'demo' ? demo : records;
  const ordered = useMemo(
    () => [...entries].sort((a, b) => entryDay(b).localeCompare(entryDay(a)) || b.created.localeCompare(a.created)),
    [entries],
  );
  const touched = useMemo(() => new Set(entries.flatMap(entry => entry.topics)), [entries]);
  const explored = fields.filter(field => [...touched].some(topic => topic.startsWith(field.id + '/')));
  const connections: (PersonalLink & {question?: string; example?: boolean})[] = mode === 'demo'
    ? bridges.filter(bridge => touched.has(bridge.a) && touched.has(bridge.b)).map((bridge, index) => ({
        id: 'demo-' + index, a: bridge.a, b: bridge.b, title: bridge.title,
        note: bridge.text, certainty: '有依据的联系', created: '', question: bridge.question, example: true,
      }))
    : links;
  const endpoints = mode === 'mine' ? links.flatMap(link => [link.a, link.b]) : [];
  const positions = useMemo(() => {
    const result: Record<string, Position> = {};
    fields.forEach(field => {
      result[field.id] = {x: field.x, y: field.y, color: field.color, label: field.id, root: true};
      const additions = [...touched, ...endpoints]
        .filter(topic => topic.startsWith(field.id + '/'))
        .map(topic => topic.slice(field.id.length + 1));
      const all = [...new Set([...field.topics, ...additions])];
      all.forEach((name, index) => {
        const angle = (-145 + index * 76) * Math.PI / 180;
        result[field.id + '/' + name] = {
          x: field.x + Math.cos(angle) * (100 + Math.floor(index / 4) * 46),
          y: field.y + Math.sin(angle) * (86 + Math.floor(index / 4) * 36),
          color: field.color, label: name,
        };
      });
    });
    return result;
  }, [touched, endpoints.join('|')]);
  const visible = Object.keys(positions).filter(key =>
    positions[key].root || touched.has(key) || endpoints.includes(key) || expanded.includes(key.split('/')[0]));
  const allTopics = [...new Set([
    ...fields.flatMap(field => field.topics.map(topic => field.id + '/' + topic)),
    ...records.flatMap(record => record.topics),
    ...links.flatMap(link => [link.a, link.b]),
  ])];
  const relevant = selected
    ? entries.filter(entry => entry.topics.some(topic => topic === selected || topic.startsWith(selected + '/')))
    : [];

  function startRecord(place?: string) {
    setEditingId(null);
    setExistingFileName(null);
    setTitle(''); setKind('书籍'); setProgress(''); setNotes(''); setStatus('接触过');
    setLearnedOn(localDay()); setTopics(place?.includes('/') ? [place] : []);
    setField(place?.split('/')[0] || '哲学'); setTopic(''); setFile(null);
    setHint(''); setRecordError(''); setNotice(''); setSelected(null); setRecordOpen(true);
  }

  function editRecord(entry: Entry) {
    setEditingId(entry.id); setExistingFileName(entry.file_name ?? null);
    setTitle(entry.title); setKind(entry.kind); setProgress(entry.progress);
    setNotes(entry.notes); setStatus(entry.status); setLearnedOn(entryDay(entry));
    setTopics([...entry.topics]); setField(entry.topics[0]?.split('/')[0] || '哲学');
    setTopic(''); setFile(null); setHint(''); setRecordError('');
    setSelected(null); setRecordOpen(true);
  }

  function toggleTopic(value: string) {
    setTopics(previous => previous.includes(value) ? previous.filter(item => item !== value)
      : previous.length < 8 ? [...previous, value] : previous);
  }

  async function importText(fileToRead?: File) {
    if (!fileToRead) return;
    if (fileToRead.size > 200000 || !/[.](txt|md)$/i.test(fileToRead.name)) {
      setRecordError('请选择 200KB 以内的 TXT 或 Markdown 文件。'); return;
    }
    try {
      const text = await fileToRead.text();
      if (text.length > 20000) { setRecordError('笔记最多 20,000 字。'); return; }
      setFile(fileToRead); setNotes(text);
      if (!title) setTitle(fileToRead.name.replace(/[.](txt|md)$/i, ''));
      setRecordError('');
    } catch { setRecordError('文件读取失败，请重新选择。'); }
  }

  async function saveRecord() {
    if (!title.trim() || !topics.length || !learnedOn) {
      setRecordError('请填写学习内容、日期，并至少确认一个知识位置。'); return;
    }
    setBusy(true); setRecordError('');
    try {
      const old = editingId ? records.find(entry => entry.id === editingId) : undefined;
      const attachment = file
        ? {file_name: file.name, file_text: await file.text()}
        : {file_name: old?.file_name, file_text: old?.file_text};
      const entry: Entry = {
        id: editingId ?? newId(), title: title.trim(), kind, progress: progress.trim(),
        notes: notes.trim(), status, topics, learnedOn,
        created: old?.created ?? new Date().toISOString(), ...attachment,
      };
      const next = editingId ? records.map(item => item.id === editingId ? entry : item) : [entry, ...records];
      await saveForest({entries: next, links});
      setRecords(next); setMode('mine'); setLoadError(''); setRecordOpen(false);
      if (!editingId) setTab('traces');
      setNotice(editingId ? '学习记录已更新，地图和时间轴已同步。' : '已保存到这台设备。你可以在时间轴上继续编辑。');
      setEditingId(null); setFile(null);
    } catch (error) {
      setRecordError('保存失败：' + errorMessage(error) + '。内容还在表单里，请不要刷新页面。');
    } finally { setBusy(false); }
  }

  async function deleteRecord(entry: Entry) {
    if (!window.confirm('删除「' + entry.title + '」？这段记录无法从网站恢复，已建立的知识联系会保留。')) return;
    setBusy(true); setNotice('');
    try {
      const next = records.filter(item => item.id !== entry.id);
      await saveForest({entries: next, links});
      setRecords(next); setNotice('已删除这段学习记录。');
    } catch (error) { setLoadError('删除失败：' + errorMessage(error)); }
    finally { setBusy(false); }
  }

  function startLink(place?: string) {
    setLinkId(null); setLinkA(place?.includes('/') ? place : ''); setLinkB('');
    setLinkTitle(''); setLinkNote(''); setCertainty('待检验的想法');
    setLinkError(''); setSelected(null); setLinkOpen(true);
  }

  function editLink(link: PersonalLink) {
    setLinkId(link.id); setLinkA(link.a); setLinkB(link.b);
    setLinkTitle(link.title); setLinkNote(link.note); setCertainty(link.certainty);
    setLinkError(''); setLinkOpen(true);
  }

  async function saveLink() {
    if (!linkA || !linkB || linkA === linkB || !linkTitle.trim()) {
      setLinkError('请选择两个不同的知识位置，并写下你发现的联系。'); return;
    }
    setBusy(true); setLinkError('');
    try {
      const old = linkId ? links.find(link => link.id === linkId) : undefined;
      const link: PersonalLink = {
        id: linkId ?? newId(), a: linkA, b: linkB, title: linkTitle.trim(),
        note: linkNote.trim(), certainty, created: old?.created ?? new Date().toISOString(),
      };
      const next = linkId ? links.map(item => item.id === linkId ? link : item) : [...links, link];
      await saveForest({entries: records, links: next});
      setLinks(next); setMode('mine'); setTab('links'); setLinkOpen(false);
      setNotice(linkId ? '已修改你建立的知识联系。' : '联系已出现在你的地图上。');
      setLinkId(null); setLoadError('');
    } catch (error) {
      setLinkError('保存失败：' + errorMessage(error) + '。内容还在表单里。');
    } finally { setBusy(false); }
  }

  async function deleteLink(link: PersonalLink) {
    if (!window.confirm('删除「' + link.title + '」这条联系？')) return;
    setBusy(true); setNotice('');
    try {
      const next = links.filter(item => item.id !== link.id);
      await saveForest({entries: records, links: next});
      setLinks(next); setNotice('已删除这条知识联系。');
    } catch (error) { setLoadError('删除失败：' + errorMessage(error)); }
    finally { setBusy(false); }
  }

  function exportBackup() {
    const backup = {format: 'zhilin-backup', version: 1, exportedAt: new Date().toISOString(), entries: records, links};
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], {type: 'application/json'}));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = '知林备份-' + localDay() + '.json'; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice('备份已下载。请将文件保存在你找得到的位置。');
  }

  async function importBackup(backupFile?: File) {
    if (!backupFile) return;
    if (backupFile.size > 10_000_000) { setLoadError('备份文件超过 10MB，无法导入。'); return; }
    setBusy(true); setLoadError(''); setNotice('');
    try {
      const value = JSON.parse(await backupFile.text()) as unknown;
      if (!value || typeof value !== 'object' || (value as {format?: string}).format !== 'zhilin-backup') {
        throw new Error('请选择知林导出的 JSON 备份文件。');
      }
      const data = parseForest(value);
      if ((records.length || links.length) && !window.confirm('导入会替换这台设备上现有的记录和联系。请先导出当前备份。确定继续吗？')) return;
      await saveForest(data);
      setRecords(data.entries); setLinks(data.links); setMode('mine'); setTab('traces');
      setNotice('备份已恢复：' + data.entries.length + ' 段学习记录，' + data.links.length + ' 条知识联系。');
    } catch (error) { setLoadError('导入失败：' + errorMessage(error)); }
    finally { setBusy(false); }
  }

  function downloadAttachment(entry: Entry) {
    const url = URL.createObjectURL(new Blob([entry.file_text ?? entry.notes], {type: 'text/plain;charset=utf-8'}));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = entry.file_name ?? 'zhilin-note.txt'; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const grouped = ordered.reduce<Record<string, Entry[]>>((days, entry) => {
    const day = entryDay(entry);
    (days[day] ??= []).push(entry);
    return days;
  }, {});

  return <div className="app-shell">
    <header className="topbar">
      <a href="/" className="brand"><span className="brand-mark"><Network size={24}/></span>
        <strong>知林</strong><span className="brand-sub">KNOWLEDGE FOREST</span></a>
      <div className="top-actions"><span className="private-label">我的学习地图</span>
        <button className="primary" onClick={() => startRecord()}><Plus size={18}/>记录学习</button></div>
    </header>
    <main>
      <section className="intro"><div><div className="eyebrow">YOUR PERSONAL ATLAS</div>
        <h1>我的知识森林<span>每一步探索，都有迹可循。</span></h1></div>
        <div className="stats">
          <div><strong>{String(explored.length).padStart(2, '0')}</strong><span>探索领域</span></div>
          <div><strong>{String(touched.size).padStart(2, '0')}</strong><span>知识位置</span></div>
          <div><strong>{String(entries.length).padStart(2, '0')}</strong><span>学习记录</span></div>
        </div>
      </section>
      <Tabs value={tab} onValueChange={setTab} className="workspace">
        <div className="workspace-bar">
          <TabsList variant="line" className="view-tabs">
            <TabsTrigger value="map"><Network/>知识地图</TabsTrigger>
            <TabsTrigger value="traces"><Footprints/>时间轴</TabsTrigger>
            <TabsTrigger value="links"><Link2/>知识联系</TabsTrigger>
          </TabsList>
          <div className="mode-toggle" aria-label="切换地图数据">
            <button className={mode === 'demo' ? 'active' : ''} onClick={() => {setMode('demo'); setSelected(null);}}>示例森林</button>
            <button className={mode === 'mine' ? 'active' : ''} onClick={() => {setMode('mine'); setSelected(null);}}>我的森林</button>
          </div>
        </div>
        <div className="preview-banner">
          <span>记录保存在这台设备的浏览器中。建议定期备份，换设备时可导入；目前没有账号同步。</span>
          <div className="backup-actions">
            <button disabled={loading || !!loadError || busy} onClick={exportBackup}><Download size={14}/>导出备份</button>
            <label className={busy ? 'disabled' : ''}><Upload size={14}/>导入备份
              <input type="file" accept=".json,application/json" disabled={busy} onChange={event => {
                void importBackup(event.target.files?.[0]); event.target.value = '';
              }}/></label>
          </div>
        </div>
        {notice && <div className="notice" role="status"><Check size={16}/>{notice}</div>}
        {loadError && <div className="error-banner" role="alert">{loadError}<button onClick={() => void load()}>重试读取</button></div>}

        <TabsContent value="map">
          <div className="map-layout">
            <section className="map-panel" aria-label="知识地图">
              <div className="map-heading"><span><span className="tiny-dot"/>{mode === 'demo' ? '示例探索地图' : '我的探索地图'}</span>
                <span>{mode === 'demo' ? '示例数据，不计入个人记录' : '点击节点，查看学习足迹或建立联系'}</span></div>
              <div className="map-scroll">
                <svg viewBox={'0 0 ' + 1000 / zoom + ' ' + 670 / zoom} className="knowledge-map" role="group" aria-label="学科及概念关系图">
                  <defs><pattern id="grid" width="26" height="26" patternUnits="userSpaceOnUse">
                    <circle cx="1" cy="1" r=".8" fill="#27413a"/></pattern>
                    <filter id="glow"><feGaussianBlur stdDeviation="6"/></filter></defs>
                  <rect width="1400" height="1000" fill="url(#grid)"/>
                  {fields.map(field => <g key={field.id}>
                    <circle cx={field.x} cy={field.y} r="119" fill={field.color} opacity=".025"/>
                    <text x={field.x} y={field.y - 128} textAnchor="middle" className="map-region" fill={field.color}>{field.en}</text>
                  </g>)}
                  {visible.filter(key => !positions[key].root).map(key => {
                    const place = positions[key], root = positions[key.split('/')[0]], lit = touched.has(key);
                    return <path key={key} d={'M ' + root.x + ' ' + root.y + ' Q ' + root.x + ' ' + place.y + ' ' + place.x + ' ' + place.y}
                      stroke={place.color} strokeOpacity={lit ? .4 : .14} strokeWidth={lit ? 1.5 : 1}
                      strokeDasharray={lit ? '' : '4 5'} fill="none"/>;
                  })}
                  {showLinks && connections.map(link => {
                    const a = positions[link.a], b = positions[link.b];
                    if (!a || !b) return null;
                    return <path key={link.id} d={'M ' + a.x + ' ' + a.y + ' Q ' + (a.x + b.x) / 2 + ' ' + (Math.min(a.y, b.y) - 65) + ' ' + b.x + ' ' + b.y}
                      fill="none" stroke="#c1dc97" strokeOpacity=".65" strokeDasharray={link.certainty === '待检验的想法' ? '5 6' : undefined}
                      strokeWidth="1.5"/>;
                  })}
                  {visible.map(key => {
                    const place = positions[key];
                    const lit = place.root ? [...touched].some(topic => topic.startsWith(key + '/')) : touched.has(key);
                    return <g key={key} role="button" tabIndex={0}
                      aria-label={place.label + '，' + (lit ? '已探索' : '尚未记录') + '，查看详情'}
                      onClick={() => setSelected(key)}
                      onKeyDown={event => {if (event.key === 'Enter' || event.key === ' ') {event.preventDefault(); setSelected(key);}}}
                      className="node">
                      <circle cx={place.x} cy={place.y} r={place.root ? 27 : 18} fill="transparent"/>
                      {lit && <circle cx={place.x} cy={place.y} r={place.root ? 24 : 12} fill={place.color} opacity=".13" filter="url(#glow)"/>}
                      <circle cx={place.x} cy={place.y} r={place.root ? 17 : 7}
                        fill={lit ? (place.root ? '#19382f' : place.color) : '#11241f'}
                        stroke={place.color} strokeOpacity={lit ? 1 : .35} strokeWidth={place.root ? 1.5 : 1}/>
                      {place.root && <circle cx={place.x} cy={place.y} r="5" fill={place.color} opacity={lit ? 1 : .4}/>}
                      <text x={place.x} y={place.y + (place.root ? 40 : 27)} textAnchor="middle"
                        fill={lit ? '#e8eee5' : '#8a9b90'} fontSize={place.root ? 18 : 14}
                        fontWeight={place.root ? 600 : 400}>{place.label}</text>
                    </g>;
                  })}
                </svg>
              </div>
              <div className="map-bottom"><div className="legend">
                <span><i className="lit"/>已留下足迹</span><span><i/>尚未探索</span>
                <button onClick={() => setShowLinks(!showLinks)} aria-pressed={showLinks}><span className="dash"/>{showLinks ? '隐藏' : '显示'}知识联系</button>
              </div><div className="zoom">
                <button aria-label="缩小地图" disabled={zoom <= .8} onClick={() => setZoom(value => Math.max(.8, value - .1))}>−</button>
                <button aria-label="重置地图比例" onClick={() => setZoom(1)}><RotateCcw size={15}/></button>
                <button aria-label="放大地图" disabled={zoom >= 1.4} onClick={() => setZoom(value => Math.min(1.4, value + .1))}>＋</button>
              </div></div>
            </section>
            <aside className="journal">
              <div className="journal-head"><div className="eyebrow">FIELD NOTES</div><h2>最近走过的路</h2>
                <p>{mode === 'demo' ? '从三段阅读，看看森林如何生长。' : '每一段理解，都值得留下。'}</p></div>
              {mode === 'mine' && loading ? <p className="muted">正在读取你的足迹…</p>
                : ordered.length ? ordered.slice(0, 3).map((entry, index) => <button className="recent" key={entry.id} onClick={() => setSelected(entry.topics[0])}>
                  <div className="recent-number">0{index + 1}</div><div><span className="meta">{entry.kind} · {entry.status}</span>
                    <h3>{entry.title}</h3><p>{entry.progress || '留下了一次学习记录'}</p>
                    <div className="mini-tags">{[...new Set(entry.topics.map(topic => topic.split('/')[0]))].map(name => <span key={name}>{name}</span>)}</div>
                  </div><ArrowUpRight size={17}/></button>)
                : <div className="empty-note"><Leaf size={32}/><h3>第一条路径，从这里开始</h3>
                    <p>记下一本正在读的书，或者今天刚理解的一个概念。</p>
                    <button className="text-button" onClick={() => startRecord()}>留下第一段足迹 <Plus size={15}/></button></div>}
              <button className="all-records" onClick={() => setTab('traces')}>查看时间轴 <ChevronRight size={16}/></button>
              {mode === 'mine' && <button className="all-records" onClick={() => startLink()}>建立知识联系 <Plus size={16}/></button>}
              <div className="journal-quote"><Compass size={21}/><p>不必走遍整座森林，<br/>也能拥有自己的路径。</p></div>
            </aside>
          </div>
        </TabsContent>

        <TabsContent value="traces">
          <section className="content-area">
            <div className="section-heading"><div><span className="eyebrow">LEARNING TIMELINE</span><h2>走过的路，按时间展开</h2></div>
              <span className="muted">{mode === 'demo' ? '以下为示例记录' : entries.length + ' 段学习记录'}</span></div>
            {!ordered.length && <div className="empty-large"><BookOpen size={35}/><h3>你的时间轴还没有开始</h3>
              <p>一本书、一节课、一段思考，都可以成为起点。</p><button className="primary" onClick={() => startRecord()}>记录学习</button></div>}
            <div className="timeline">{Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a)).map(([day, dayEntries]) => <section className="timeline-day" key={day}>
              <div className="timeline-date"><span className="timeline-dot"/><time dateTime={day}>{day}</time><span>{dayEntries.length} 段记录</span></div>
              <div className="timeline-items">{dayEntries.map(entry => <article className="entry-card" key={entry.id}>
                <div className="entry-top"><span>{entry.kind} · {entry.status}</span><span>{entry.topics.length} 个知识位置</span></div>
                <h3>{entry.title}</h3><p className="entry-progress">{entry.progress}</p>
                <p className="entry-notes">{entry.notes || '这次还没有留下笔记。'}</p>
                <div className="entry-topics">{entry.topics.map(place => <button key={place} onClick={() => setSelected(place)}>{place.replaceAll('/', ' › ')}<ArrowUpRight size={13}/></button>)}</div>
                {entry.file_name && <button className="attachment" onClick={() => downloadAttachment(entry)}>下载笔记 · {entry.file_name}</button>}
                {mode === 'mine' && <div className="card-actions">
                  <button className="secondary" disabled={busy} onClick={() => editRecord(entry)}><Pencil size={14}/>编辑</button>
                  <button className="secondary danger-button" disabled={busy} onClick={() => void deleteRecord(entry)}><Trash2 size={14}/>删除</button>
                </div>}
              </article>)}</div>
            </section>)}</div>
          </section>
        </TabsContent>

        <TabsContent value="links">
          <section className="content-area">
            <div className="section-heading"><div><span className="eyebrow">MY CONNECTIONS</span><h2>哪些知识，在你这里相遇？</h2></div>
              <button className="primary" onClick={() => startLink()}><Plus size={17}/>建立联系</button></div>
            <p className="muted">{mode === 'demo'
              ? '这里的联系仅用于演示。切换到「我的森林」，你可以亲手建立、修改和删除自己的联系。'
              : '由你决定两个知识点为什么相连。尚无证据的比较，也可以先保留为待检验的想法。'}</p>
            <div className="connection-grid">{connections.map(link => <article className="connection-card" key={link.id}>
              <Link2 size={23}/><span className="link-certainty">{link.example ? '示例联系' : link.certainty}</span>
              <div className="bridge-names">
                <button onClick={() => setSelected(link.a)}>{link.a.replaceAll('/', ' › ')}</button><span>↔</span>
                <button onClick={() => setSelected(link.b)}>{link.b.replaceAll('/', ' › ')}</button>
              </div>
              <h3>{link.title}</h3><p>{link.note || (link.question || '这条联系还没有补充说明。')}</p>
              {link.question && <blockquote>{link.question}</blockquote>}
              {mode === 'mine' && <div className="card-actions">
                <button className="secondary" disabled={busy} onClick={() => editLink(link)}><Pencil size={14}/>编辑</button>
                <button className="secondary danger-button" disabled={busy} onClick={() => void deleteLink(link)}><Trash2 size={14}/>删除</button>
              </div>}
            </article>)}</div>
            {!connections.length && <div className="empty-large"><Network size={35}/><h3>还没有建立联系</h3>
              <p>你可以把来自不同领域的两个知识点放在一起，写下理由或一个待查的问题。</p>
              <button className="primary" onClick={() => startLink()}>建立第一条联系</button></div>}
          </section>
        </TabsContent>
      </Tabs>
      <footer>知林 <span>一张随你生长的知识地图</span></footer>
    </main>

    <Sheet open={!!selected} onOpenChange={value => {if (!value) setSelected(null);}}>
      <SheetContent className="detail-sheet"><SheetHeader>
        <div className="eyebrow">KNOWLEDGE NODE</div>
        <SheetTitle className="detail-title">{selected?.split('/').at(-1)}</SheetTitle>
        <SheetDescription>{selected?.replaceAll('/', ' › ')} · {relevant.length} 段学习记录</SheetDescription>
      </SheetHeader><div className="detail-body">
        {selected && !selected.includes('/') && <><h3>继续展开这个领域</h3>
          <div className="entry-topics">{Object.keys(positions).filter(key => key.startsWith(selected + '/')).map(key =>
            <button key={key} onClick={() => setSelected(key)}>{key.split('/').at(-1)}<ChevronRight size={14}/></button>)}</div>
          <button className="secondary" onClick={() => {setExpanded(previous => previous.includes(selected) ? previous : [...previous, selected]); setSelected(null);}}>在地图上展开分支</button>
        </>}
        {relevant.map(entry => <article className="detail-entry" key={entry.id}>
          <span className="status-badge">{entry.status}</span><h3>{entry.title}</h3>
          <p className="muted">{entry.progress}</p><p className="entry-notes">{entry.notes}</p>
          {mode === 'mine' && <button className="secondary" onClick={() => editRecord(entry)}><Pencil size={14}/>编辑这段足迹</button>}
        </article>)}
        {!relevant.length && <div className="empty-note"><Leaf/><h3>一片等待探索的地方</h3><p>你可以从一个问题，或一本书开始。</p></div>}
        <div className="detail-actions"><button className="primary" onClick={() => startRecord(selected ?? undefined)}><Plus size={17}/>在这里记录学习</button>
          {selected?.includes('/') && <button className="secondary" onClick={() => startLink(selected)}><Link2 size={16}/>从这里建立联系</button>}</div>
      </div></SheetContent>
    </Sheet>

    <Dialog open={recordOpen} onOpenChange={value => {if (!busy) setRecordOpen(value);}}>
      <DialogContent className="record-dialog"><DialogHeader>
        <div className="eyebrow">{editingId ? 'REVISIT YOUR PATH' : 'LEAVE A TRACE'}</div>
        <DialogTitle className="dialog-title">{editingId ? '编辑学习足迹' : '留下一段学习足迹'}</DialogTitle>
        <DialogDescription>记录会出现在知识地图与时间轴中，只保存在当前浏览器。</DialogDescription>
      </DialogHeader>
      <form onSubmit={event => {event.preventDefault(); void saveRecord();}}>
        <div className="form-row"><label className="grow">学习内容
          <input required maxLength={160} placeholder="例如：苏菲的世界" value={title} onChange={event => setTitle(event.target.value)}/></label>
          <label>类型<Choice value={kind} onChange={setKind} values={['书籍', '课程', '文章', '视频', '讲座', '其他']} label="学习类型"/></label></div>
        <div className="form-row"><label className="grow">学习进度
          <input maxLength={200} placeholder="例如：读至第 5 章" value={progress} onChange={event => setProgress(event.target.value)}/></label>
          <label>学习日期<input type="date" required value={learnedOn} onChange={event => setLearnedOn(event.target.value)}/></label></div>
        <label>我的理解、疑问与笔记<textarea maxLength={20000} placeholder="这次学到了什么？哪些问题还没有想清楚？" value={notes} onChange={event => setNotes(event.target.value)}/></label>
        <label className="upload"><Upload size={16}/>{file ? file.name : existingFileName ? '替换附件 · ' + existingFileName : '导入文字笔记（TXT / Markdown，最多 200KB）'}
          <input type="file" accept=".txt,.md" onChange={event => void importText(event.target.files?.[0])}/></label>
        {editingId && existingFileName && !file && <p className="meta">原附件会保留。重新导入会替换附件及笔记。</p>}
        <label>我目前的理解<Choice value={status} onChange={setStatus}
          values={['接触过', '正在理解', '能够解释', '能够运用']} label="理解程度"/></label>
        <div className="location-header"><strong>确认知识位置</strong>
          <button type="button" className="text-button" onClick={() => {
            const suggested = suggest(title + ' ' + notes);
            setTopics(previous => [...new Set([...previous, ...suggested])].slice(0, 8));
            setHint(suggested.length ? '已按关键词添加建议，请自己确认或调整。' : '暂时没有匹配建议，请在下方选择或添加。');
          }}>根据内容建议位置 <ArrowUpRight size={14}/></button></div>
        <p className="meta">关键词建议仅帮助选位置，不代表已经理解或证明知识间有联系。最多选择 8 个位置。</p>
        {hint && <p className="hint" role="status">{hint}</p>}
        <div className="topic-picker">{fields.map(group => <details key={group.id} open={group.id === field || undefined}>
          <summary onClick={() => setField(group.id)}>{group.id}</summary>
          <div>{group.topics.map(name => <label className="check-label" key={name}>
            <Checkbox checked={topics.includes(group.id + '/' + name)} onCheckedChange={() => toggleTopic(group.id + '/' + name)}/>{name}</label>)}</div>
        </details>)}</div>
        <div className="form-row"><Choice value={field} onChange={setField} values={fields.map(group => group.id)} label="新节点所属领域"/>
          <input className="grow" maxLength={40} placeholder="添加自己的知识节点" value={topic} onChange={event => setTopic(event.target.value)}/>
          <button type="button" className="secondary" disabled={!topic.trim() || topics.length >= 8} onClick={() => {
            toggleTopic(field + '/' + topic.trim().replaceAll('/', '·')); setTopic('');
          }}>添加</button></div>
        <div className="selected-topics">{topics.map(place => <button type="button" key={place} onClick={() => toggleTopic(place)} aria-label={'移除 ' + place}>
          {place.replaceAll('/', ' › ')} ×</button>)}</div>
        {recordError && <p className="form-error" role="alert">{recordError}</p>}
        <div className="edit-form-actions"><button type="button" className="secondary" disabled={busy} onClick={() => setRecordOpen(false)}>取消</button>
          <button type="submit" className="primary save-button" disabled={busy}>{busy ? '正在保存…' : <><Check size={17}/>{editingId ? '保存修改' : '保存学习记录'}</>}</button></div>
      </form></DialogContent>
    </Dialog>

    <Dialog open={linkOpen} onOpenChange={value => {if (!busy) setLinkOpen(value);}}>
      <DialogContent className="record-dialog link-dialog"><DialogHeader>
        <div className="eyebrow">CONNECT YOUR IDEAS</div>
        <DialogTitle className="dialog-title">{linkId ? '编辑知识联系' : '建立知识联系'}</DialogTitle>
        <DialogDescription>这条联系由你提出。先写下猜想，以后再补充依据也可以。</DialogDescription>
      </DialogHeader>
      <form onSubmit={event => {event.preventDefault(); void saveLink();}}>
        <div className="form-row"><label className="grow">从哪里出发
          <select required value={linkA} onChange={event => setLinkA(event.target.value)}>
            <option value="">选择知识位置</option>{allTopics.map(place => <option key={place} value={place}>{place.replaceAll('/', ' › ')}</option>)}
          </select></label>
          <label className="grow">联系到哪里
            <select required value={linkB} onChange={event => setLinkB(event.target.value)}>
              <option value="">选择知识位置</option>{allTopics.map(place => <option key={place} value={place}>{place.replaceAll('/', ' › ')}</option>)}
            </select></label></div>
        <label>这两个知识点怎样联系？<input required maxLength={120} placeholder="例如：两种关于自由的不同理解" value={linkTitle}
          onChange={event => setLinkTitle(event.target.value)}/></label>
        <label>你的理由、材料或想继续查的问题<textarea maxLength={4000} placeholder="写下为什么会想到这条联系；如果还没有依据，也可以写一个问题。" value={linkNote}
          onChange={event => setLinkNote(event.target.value)}/></label>
        <label>目前的把握<Choice value={certainty} onChange={value => setCertainty(value as PersonalLink['certainty'])}
          values={['待检验的想法', '有依据的联系']} label="联系的把握"/></label>
        {linkError && <p className="form-error" role="alert">{linkError}</p>}
        <div className="edit-form-actions"><button type="button" className="secondary" disabled={busy} onClick={() => setLinkOpen(false)}>取消</button>
          <button type="submit" className="primary save-button" disabled={busy}>{busy ? '正在保存…' : <><Check size={17}/>{linkId ? '保存修改' : '加入我的地图'}</>}</button></div>
      </form></DialogContent>
    </Dialog>
  </div>;
}
