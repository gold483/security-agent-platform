import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { ExternalLink, KeyRound, MonitorUp, RefreshCw, ShieldCheck, TimerReset } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function formatDate(value?: Date | string | null) {
  return value ? new Date(value).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "진행 중";
}

export default function Rdp() {
  const [agentId, setAgentId] = useState("");
  const [path, setPath] = useState<"internal" | "external">("external");
  const [session, setSession] = useState<{ token: string; expiresAt: Date; guacamolePath: string } | null>(null);
  const agents = trpc.security.agents.useQuery(undefined, { refetchInterval: 30_000 });
  const sessions = trpc.security.rdpSessions.useQuery(undefined, { refetchInterval: 15_000 });
  const issueToken = trpc.security.issueRdpToken.useMutation({ onSuccess: result => { setSession(result); toast.success("1회성 Guacamole 접속 토큰이 발급되었습니다."); }, onError: error => toast.error(error.message) });
  const selectedAgent = (agents.data ?? []).find(agent => agent.id === Number(agentId));

  return (
    <div className="page-stack">
      <section className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot violet" /> Remote access gateway</div><h1>RDP 원격제어</h1><p>Apache Guacamole 기반 웹 게이트웨이를 통해 외부망에서도 안전하게 원격 세션을 시작합니다.</p></div><div className="gateway-chip"><span className="gateway-dot" /> guacd gateway</div></section>
      <section className="rdp-grid"><Card className="panel-card connect-card"><CardHeader className="panel-header"><div><div className="eyebrow">New connection</div><CardTitle>세션 시작</CardTitle></div><MonitorUp className="h-5 w-5 text-violet-500" /></CardHeader><CardContent className="space-y-5"><div><label className="field-label">대상 에이전트</label><Select value={agentId} onValueChange={setAgentId}><SelectTrigger><SelectValue placeholder="원격 PC를 선택하세요" /></SelectTrigger><SelectContent>{(agents.data ?? []).map(agent => <SelectItem key={agent.id} value={String(agent.id)}>{agent.hostName} · {agent.siteName}</SelectItem>)}</SelectContent></Select></div><div><label className="field-label">접속 경로</label><div className="path-toggle"><button className={path === "external" ? "selected" : ""} onClick={() => setPath("external")}><span>External</span><small>Apache Guacamole 웹 세션</small></button><button className={path === "internal" ? "selected" : ""} onClick={() => setPath("internal")}><span>Internal</span><small>사내망 인증 프록시</small></button></div></div><div className="callout-info violet"><ShieldCheck className="h-4 w-4" /><p>접속 토큰은 1회성으로 발급되며 <strong>30초 후 자동 만료</strong>됩니다. 모든 세션은 감사 로그에 남습니다.</p></div><Button className="w-full primary-action" disabled={!selectedAgent || issueToken.isPending} onClick={() => selectedAgent && issueToken.mutate({ agentId: selectedAgent.id, path })}>{issueToken.isPending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}1회성 접속 토큰 발급</Button></CardContent></Card><Card className="panel-card gateway-card"><CardHeader className="panel-header"><div><div className="eyebrow">Gateway posture</div><CardTitle>접속 정책</CardTitle></div></CardHeader><CardContent><div className="gateway-hero"><div className="gateway-orbit"><MonitorUp className="h-7 w-7" /></div><strong>Apache Guacamole</strong><span>RDP over HTTPS</span></div><div className="policy-list"><div><span>외부망 포트 노출</span><Badge variant="outline" className="policy-good">차단</Badge></div><div><span>토큰 유효시간</span><strong>30초</strong></div><div><span>세션 감사</span><strong>항상 기록</strong></div><div><span>기록 보관</span><strong>정책 기반</strong></div></div></CardContent></Card></section>
      <Card className="panel-card"><CardHeader className="panel-header"><div><div className="eyebrow">Session history</div><CardTitle>RDP 세션 감사</CardTitle></div><Button variant="ghost" size="sm" onClick={() => sessions.refetch()}><RefreshCw className="mr-2 h-4 w-4" />새로고침</Button></CardHeader><CardContent className="p-0">{(sessions.data ?? []).length === 0 ? <div className="empty-state"><div className="empty-icon"><TimerReset className="h-6 w-6" /></div><strong>최근 RDP 세션이 없습니다.</strong><p>세션을 시작하면 접속자, 대상, 경로, 시작·종료 시각이 자동 기록됩니다.</p></div> : <div className="table-wrap"><table className="data-table"><thead><tr><th>대상</th><th>접속자</th><th>경로</th><th>시작 시각</th><th>종료 시각</th></tr></thead><tbody>{(sessions.data ?? []).map(item => <tr key={item.session.id}><td><div className="table-primary"><MonitorUp className="h-4 w-4" /><strong>{item.agent.hostName}</strong></div><span className="table-secondary">{item.site.name}</span></td><td>{item.user.name ?? item.user.email ?? "관리자"}</td><td><Badge className={`path-badge ${item.session.path}`}>{item.session.path === "external" ? "External" : "Internal"}</Badge></td><td>{formatDate(item.session.startedAt)}</td><td>{formatDate(item.session.endedAt)}</td></tr>)}</tbody></table></div>}</CardContent></Card>
      <Dialog open={!!session} onOpenChange={open => !open && setSession(null)}><DialogContent><DialogHeader><DialogTitle>Guacamole 접속 토큰 준비 완료</DialogTitle><DialogDescription>토큰은 1회만 사용할 수 있고 30초 후 만료됩니다. 새 창에서 Apache Guacamole 세션을 시작하세요.</DialogDescription></DialogHeader>{session && <div className="token-box"><div className="token-label"><span>SHORT-LIVED TOKEN</span><Badge variant="outline">30 sec</Badge></div><code className="token-code">{session.token}</code><p className="token-expiry">만료 시각: {formatDate(session.expiresAt)}</p></div>}<DialogFooter><Button variant="outline" onClick={() => setSession(null)}>취소</Button>{session && <Button asChild><a href={session.guacamolePath} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Guacamole 열기</a></Button>}</DialogFooter></DialogContent></Dialog>
    </div>
  );
}
