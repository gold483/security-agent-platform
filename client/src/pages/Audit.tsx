import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { FileClock, Filter, LockKeyhole, RefreshCw, ShieldCheck } from "lucide-react";

function formatDate(value?: Date | string | null) {
  return value ? new Date(value).toLocaleString("ko-KR", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "-";
}

function actionLabel(action: string) {
  if (action === "inspection_command.created") return "검사 명령 생성";
  if (action === "rdp.token_issued") return "RDP 접속 토큰 발급";
  return action;
}

export default function Audit() {
  const logs = trpc.security.auditLogs.useQuery(undefined, { refetchInterval: 30_000 });
  return (
    <div className="page-stack">
      <section className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot" /> Governance & traceability</div><h1>감사 로그</h1><p>보안관제 시스템에서 수행된 원격 명령과 RDP 접속 토큰 발급 내역을 추적합니다.</p></div><Button variant="outline" onClick={() => logs.refetch()}><RefreshCw className="mr-2 h-4 w-4" />새로고침</Button></section>
      <section className="audit-callout"><div className="audit-callout-icon"><LockKeyhole className="h-5 w-5" /></div><div><strong>관리자 작업은 삭제할 수 없는 이벤트로 기록됩니다.</strong><p>로그의 메타데이터는 서버에서 JSON으로 보존되며, 운영 검토와 사고 대응에 사용됩니다.</p></div><ShieldCheck className="ml-auto hidden h-6 w-6 text-emerald-500 sm:block" /></section>
      <Card className="panel-card"><CardHeader className="panel-header"><div><div className="eyebrow">Immutable event stream</div><CardTitle>최근 감사 이벤트</CardTitle></div><div className="header-meta"><Filter className="h-4 w-4" /> 최근 100건</div></CardHeader><CardContent className="p-0">{(logs.data ?? []).length === 0 ? <div className="empty-state"><div className="empty-icon"><FileClock className="h-6 w-6" /></div><strong>기록된 감사 이벤트가 없습니다.</strong><p>검사 명령을 실행하거나 RDP 접속 토큰을 발급하면 이곳에 이벤트가 누적됩니다.</p></div> : <div className="table-wrap"><table className="data-table"><thead><tr><th>시각</th><th>작업</th><th>대상</th><th>수행자</th><th>이벤트 ID</th><th>메타데이터</th></tr></thead><tbody>{(logs.data ?? []).map(log => <tr key={log.id}><td className="nowrap">{formatDate(log.createdAt)}</td><td><span className="audit-action"><FileClock className="h-4 w-4" />{actionLabel(log.action)}</span></td><td><Badge variant="outline">{log.entityType}</Badge> {log.entityId ?? "-"}</td><td>관리자 #{log.actorUserId ?? "system"}</td><td className="muted-mono">#{log.id.toString().padStart(6, "0")}</td><td><code className="metadata-cell">{log.metadata ?? "-"}</code></td></tr>)}</tbody></table></div>}</CardContent></Card>
    </div>
  );
}
