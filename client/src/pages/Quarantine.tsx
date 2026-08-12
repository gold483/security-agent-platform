import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, FileWarning, RefreshCw, Search, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";

function formatDate(value?: Date | string | null) {
  return value ? new Date(value).toLocaleString("ko-KR", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";
}

export default function Quarantine() {
  const [siteId, setSiteId] = useState<number | undefined>();
  const input = useMemo(() => (siteId ? { siteId } : undefined), [siteId]);
  const sites = trpc.security.sites.useQuery();
  const records = trpc.security.quarantine.useQuery(input, { refetchInterval: 30_000 });
  const active = (records.data ?? []).filter(item => item.record.status === "quarantined").length;

  return (
    <div className="page-stack">
      <section className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot amber" /> Defender protection records</div><h1>Quarantine</h1><p>Windows Defender가 탐지하고 격리한 항목을 에이전트별로 확인합니다.</p></div><div className="heading-actions"><Select value={siteId ? String(siteId) : "all"} onValueChange={value => setSiteId(value === "all" ? undefined : Number(value))}><SelectTrigger className="site-filter"><SelectValue placeholder="사업장 전체" /></SelectTrigger><SelectContent><SelectItem value="all">전체 사업장</SelectItem>{(sites.data ?? []).map(site => <SelectItem key={site.id} value={String(site.id)}>{site.name}</SelectItem>)}</SelectContent></Select></div></section>
      <section className="alert-banner"><div className="alert-banner-icon"><ShieldAlert className="h-5 w-5" /></div><div><strong>{active}건의 처리 대기 Quarantine 항목</strong><p>탐지된 위협의 원본 경로와 해시를 확인한 후 별도 승인 절차에 따라 처리하세요.</p></div><div className="alert-banner-count">{active.toString().padStart(2, "0")}</div></section>
      <Card className="panel-card"><CardHeader className="panel-header"><div><div className="eyebrow">Threat inventory</div><CardTitle>탐지 및 격리 항목</CardTitle></div><Button variant="ghost" size="sm" onClick={() => records.refetch()}><RefreshCw className="mr-2 h-4 w-4" />새로고침</Button></CardHeader><CardContent className="p-0">
        {(records.data ?? []).length === 0 ? <div className="empty-state"><div className="empty-icon success"><FileWarning className="h-6 w-6" /></div><strong>표시할 Quarantine 항목이 없습니다.</strong><p>Windows Defender 에이전트가 보호기록을 동기화하면 위협 정보가 이 화면에 나타납니다.</p></div> : <div className="table-wrap"><table className="data-table"><thead><tr><th>상태</th><th>위협명</th><th>파일</th><th>에이전트</th><th>사업장</th><th>탐지 시각</th><th></th></tr></thead><tbody>{(records.data ?? []).map(item => <tr key={item.record.id}><td><Badge className={`quarantine-badge ${item.record.status}`}>{item.record.status === "quarantined" ? "격리됨" : item.record.status}</Badge></td><td><div className="table-primary"><AlertTriangle className="h-4 w-4 text-amber-500" /><strong>{item.record.threatName}</strong></div></td><td><span className="file-cell"><FileWarning className="h-4 w-4" />{item.record.fileName}</span></td><td>{item.agent.hostName}</td><td>{item.site.name}</td><td>{formatDate(item.record.detectedAt)}</td><td><Dialog><DialogTrigger asChild><Button variant="ghost" size="sm"><Search className="mr-1.5 h-4 w-4" />상세</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Quarantine 상세 정보</DialogTitle><DialogDescription>Windows Defender 보호기록 원문에서 수집된 항목입니다.</DialogDescription></DialogHeader><div className="detail-grid"><div><span>위협명</span><strong>{item.record.threatName}</strong></div><div><span>파일명</span><strong>{item.record.fileName}</strong></div><div><span>에이전트</span><strong>{item.agent.hostName}</strong></div><div><span>탐지 시각</span><strong>{formatDate(item.record.detectedAt)}</strong></div><div className="detail-wide"><span>원본 경로</span><code>{item.record.originalPath ?? "수집되지 않음"}</code></div><div className="detail-wide"><span>SHA-256</span><code>{item.record.sha256 ?? "수집되지 않음"}</code></div></div></DialogContent></Dialog></td></tr>)}</tbody></table></div>}
      </CardContent></Card>
    </div>
  );
}
