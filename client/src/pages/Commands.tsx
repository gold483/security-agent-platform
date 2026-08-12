import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Activity, CheckCircle2, Clock3, Download, Loader2, Play, RefreshCw, ScanLine, ShieldCheck, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function formatDate(value?: Date | string | null) {
  return value ? new Date(value).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";
}

const commandTypes = [
  { value: "Full Scan" as const, label: "Full Scan", description: "전체 파일 및 프로세스 검사", icon: ScanLine, tone: "blue" },
  { value: "Quick Scan" as const, label: "Quick Scan", description: "주요 시스템 영역 빠른 검사", icon: Play, tone: "violet" },
  { value: "서명 업데이트" as const, label: "서명 업데이트", description: "Windows Defender 정의 파일 최신화", icon: Download, tone: "green" },
];

export default function Commands() {
  const [agentId, setAgentId] = useState<string>("");
  const agents = trpc.security.agents.useQuery(undefined, { refetchInterval: 30_000 });
  const commands = trpc.security.commands.useQuery(undefined, { refetchInterval: 10_000 });
  const createCommand = trpc.security.createCommand.useMutation({ onSuccess: () => { commands.refetch(); toast.success("명령이 큐에 등록되었습니다."); }, onError: error => toast.error(error.message) });
  const selectedAgent = (agents.data ?? []).find(agent => agent.id === Number(agentId));

  return (
    <div className="page-stack">
      <section className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot violet" /> Remote operations</div><h1>검사 명령</h1><p>관리자 승인 하에 원격 PC의 Windows Defender 작업을 실행하고 처리 상태를 추적합니다.</p></div><Button variant="outline" onClick={() => commands.refetch()}><RefreshCw className="mr-2 h-4 w-4" />상태 새로고침</Button></section>
      <Card className="command-launcher"><CardContent className="p-6"><div className="launcher-heading"><div><div className="eyebrow">Command center</div><h2>새 명령 실행</h2><p>대상 에이전트를 선택하면 실행 가능한 작업이 활성화됩니다.</p></div><div className="launcher-signal"><Activity className="h-4 w-4" /> Queue protected</div></div><Select value={agentId} onValueChange={setAgentId}><SelectTrigger className="agent-select"><SelectValue placeholder="대상 에이전트를 선택하세요" /></SelectTrigger><SelectContent>{(agents.data ?? []).map(agent => <SelectItem key={agent.id} value={String(agent.id)}>{agent.hostName} · {agent.siteName} · {agent.effectiveStatus === "online" ? "온라인" : "오프라인"}</SelectItem>)}</SelectContent></Select><div className="command-options">{commandTypes.map(command => { const Icon = command.icon; return <Button key={command.value} variant="outline" className={`command-option ${command.tone}`} disabled={!selectedAgent || createCommand.isPending} onClick={() => selectedAgent && createCommand.mutate({ agentId: selectedAgent.id, commandType: command.value })}><span className="command-option-icon"><Icon className="h-4 w-4" /></span><span className="text-left"><strong>{command.label}</strong><small>{command.description}</small></span><Play className="ml-auto h-4 w-4" /></Button>; })}</div><div className="security-note"><ShieldCheck className="h-4 w-4" /><span>명령은 감사 로그에 기록되고 에이전트의 다음 heartbeat 주기에 전달됩니다.</span></div></CardContent></Card>
      <Card className="panel-card"><CardHeader className="panel-header"><div><div className="eyebrow">Execution history</div><CardTitle>명령 처리 현황</CardTitle></div><span className="result-count">최근 100건</span></CardHeader><CardContent className="p-0">{(commands.data ?? []).length === 0 ? <div className="empty-state"><div className="empty-icon"><Clock3 className="h-6 w-6" /></div><strong>아직 실행된 명령이 없습니다.</strong><p>대상 에이전트를 선택하고 Full Scan, Quick Scan 또는 서명 업데이트를 실행하세요.</p></div> : <div className="table-wrap"><table className="data-table"><thead><tr><th>상태</th><th>명령</th><th>대상</th><th>요청 시각</th><th>완료 시각</th><th>결과</th></tr></thead><tbody>{(commands.data ?? []).map(item => <tr key={item.command.id}><td><CommandStatus status={item.command.status} /></td><td><strong>{item.command.commandType}</strong></td><td>{item.agent.hostName}<span className="table-secondary">{item.site.name}</span></td><td>{formatDate(item.command.requestedAt)}</td><td>{formatDate(item.command.finishedAt)}</td><td>{item.command.resultMessage ?? "처리 대기 중"}</td></tr>)}</tbody></table></div>}</CardContent></Card>
    </div>
  );
}

function CommandStatus({ status }: { status: "queued" | "running" | "succeeded" | "failed" }) {
  const config = { queued: ["대기", Clock3, "queued"], running: ["실행 중", Loader2, "running"], succeeded: ["성공", CheckCircle2, "succeeded"], failed: ["실패", XCircle, "failed"] } as const;
  const [label, Icon, tone] = config[status];
  return <span className={`command-status ${tone}`}><Icon className={`h-4 w-4 ${status === "running" ? "animate-spin" : ""}`} />{label}</span>;
}
