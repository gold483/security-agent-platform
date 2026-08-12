import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Activity, Check, Copy, KeyRound, Laptop, RefreshCw, Server, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

function formatDate(value?: Date | string | null) {
  return value ? new Date(value).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "기록 없음";
}

export default function Agents() {
  const [siteId, setSiteId] = useState<number | undefined>();
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [tokenResult, setTokenResult] = useState<{ rawToken: string; expiresAt: Date } | null>(null);
  const input = useMemo(() => (siteId ? { siteId } : undefined), [siteId]);
  const sites = trpc.security.sites.useQuery();
  const agents = trpc.security.agents.useQuery(input, { refetchInterval: 30_000 });
  const issueToken = trpc.security.issueRegistrationToken.useMutation({
    onSuccess: result => { setTokenResult({ rawToken: result.rawToken, expiresAt: result.expiresAt }); toast.success("등록 토큰이 발급되었습니다."); },
    onError: error => toast.error(error.message),
  });

  const copyToken = async () => {
    if (!tokenResult) return;
    await navigator.clipboard?.writeText(tokenResult.rawToken);
    toast.success("등록 토큰을 클립보드에 복사했습니다.");
  };

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div><div className="eyebrow"><span className="eyebrow-dot" /> Agent fleet</div><h1>에이전트</h1><p>하남, 평동, 소촌의 PC 에이전트 등록 현황과 연결 상태를 관리합니다.</p></div>
        <div className="heading-actions">
          <Select value={siteId ? String(siteId) : "all"} onValueChange={value => setSiteId(value === "all" ? undefined : Number(value))}><SelectTrigger className="site-filter"><SelectValue placeholder="사업장 전체" /></SelectTrigger><SelectContent><SelectItem value="all">전체 사업장</SelectItem>{(sites.data ?? []).map(site => <SelectItem key={site.id} value={String(site.id)}>{site.name}</SelectItem>)}</SelectContent></Select>
          <Dialog open={tokenDialogOpen} onOpenChange={setTokenDialogOpen}>
            <DialogTrigger asChild><Button className="primary-action"><KeyRound className="mr-2 h-4 w-4" />등록 토큰 발급</Button></DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader><DialogTitle>에이전트 등록 토큰</DialogTitle><DialogDescription>설치할 PC가 속한 사업장과 유효시간을 선택하세요. 토큰 원문은 발급 직후에만 확인할 수 있습니다.</DialogDescription></DialogHeader>
              <div className="space-y-4 py-2">
                <div><label className="field-label">사업장</label><Select value={siteId ? String(siteId) : ""} onValueChange={value => setSiteId(Number(value))}><SelectTrigger><SelectValue placeholder="사업장을 선택하세요" /></SelectTrigger><SelectContent>{(sites.data ?? []).map(site => <SelectItem key={site.id} value={String(site.id)}>{site.name}</SelectItem>)}</SelectContent></Select></div>
                {tokenResult ? <div className="token-box"><div className="token-label"><span>ONE-TIME ENROLLMENT TOKEN</span><Badge variant="outline">24시간 유효</Badge></div><Textarea readOnly value={tokenResult.rawToken} className="token-value" /><Button variant="outline" onClick={copyToken} className="mt-3 w-full"><Copy className="mr-2 h-4 w-4" />토큰 복사</Button><p className="token-expiry">만료 시각: {formatDate(tokenResult.expiresAt)}</p></div> : <div className="callout-info"><KeyRound className="h-4 w-4" /><p>토큰은 서버에서 해시로 저장되며, 한 번 사용하면 재사용할 수 없습니다.</p></div>}
              </div>
              <DialogFooter>{tokenResult ? <Button onClick={() => { setTokenResult(null); setTokenDialogOpen(false); }}>닫기</Button> : <Button disabled={!siteId || issueToken.isPending} onClick={() => siteId && issueToken.mutate({ siteId, expiresInHours: 24 })}>{issueToken.isPending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}발급하기</Button>}</DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      <section className="metric-strip"><div><span className="strip-label">현재 필터</span><strong>{siteId ? (sites.data ?? []).find(site => site.id === siteId)?.name : "전체 사업장"}</strong></div><div><span className="strip-label">전체 에이전트</span><strong>{agents.data?.length ?? 0}</strong></div><div><span className="strip-label">온라인</span><strong className="text-emerald-600">{(agents.data ?? []).filter(agent => agent.effectiveStatus === "online").length}</strong></div><div><span className="strip-label">오프라인</span><strong className="text-slate-500">{(agents.data ?? []).filter(agent => agent.effectiveStatus === "offline").length}</strong></div></section>

      <Card className="panel-card"><CardHeader className="panel-header"><div><div className="eyebrow">Managed endpoints</div><CardTitle>에이전트 목록</CardTitle></div><Button variant="ghost" size="sm" onClick={() => agents.refetch()}><RefreshCw className="mr-2 h-4 w-4" />새로고침</Button></CardHeader><CardContent className="p-0">
        {(agents.data ?? []).length === 0 ? <div className="empty-state"><div className="empty-icon"><Server className="h-6 w-6" /></div><strong>아직 연결된 PC가 없습니다.</strong><p>등록 토큰을 발급하고 Windows 에이전트 설치 과정에서 사용하면 이 목록에 나타납니다.</p><Button className="mt-4" onClick={() => setTokenDialogOpen(true)}><KeyRound className="mr-2 h-4 w-4" />등록 토큰 발급</Button></div> : <div className="table-wrap"><table className="data-table"><thead><tr><th>상태</th><th>호스트명</th><th>사업장</th><th>Defender</th><th>에이전트 버전</th><th>마지막 하트비트</th><th></th></tr></thead><tbody>{(agents.data ?? []).map(agent => <tr key={agent.id}><td><span className={`inline-status ${agent.effectiveStatus}`}><span />{agent.effectiveStatus === "online" ? "온라인" : agent.effectiveStatus === "degraded" ? "주의" : "오프라인"}</span></td><td><div className="table-primary"><Laptop className="h-4 w-4" /><strong>{agent.hostName}</strong></div><span className="table-secondary">{agent.ipAddress ?? "IP 미수집"}</span></td><td>{agent.siteName}</td><td><span className={`defender-state ${agent.defenderEnabled ? "healthy" : "warning"}`}><ShieldCheck className="h-4 w-4" />{agent.defenderEnabled ? "보호 중" : "확인 필요"}</span></td><td>{agent.agentVersion ?? "-"}</td><td>{formatDate(agent.lastHeartbeatAt)}</td><td><Button asChild variant="ghost" size="sm"><Link href={`/agents/${agent.id}`}>상세 보기</Link></Button></td></tr>)}</tbody></table></div>}
      </CardContent></Card>
    </div>
  );
}
