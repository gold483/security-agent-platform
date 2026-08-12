import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Activity, ArrowUpRight, CheckCircle2, ChevronRight, Clock3, Laptop, ShieldAlert, ShieldCheck, WifiOff } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";

function formatDate(value?: Date | string | null) {
  if (!value) return "기록 없음";
  return new Date(value).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const statusLabel = {
  online: "온라인",
  offline: "오프라인",
  degraded: "주의",
} as const;

export default function Home() {
  const [siteId, setSiteId] = useState<number | undefined>();
  const input = useMemo(() => (siteId ? { siteId } : undefined), [siteId]);
  const summary = trpc.security.dashboard.useQuery(input, { refetchInterval: 30_000 });
  const agents = trpc.security.agents.useQuery(input, { refetchInterval: 30_000 });
  const sites = trpc.security.sites.useQuery();

  const cards = [
    { label: "등록 에이전트", value: summary.data?.totalAgents ?? 0, note: `${summary.data?.onlineAgents ?? 0}대 온라인`, icon: Laptop, tone: "blue" },
    { label: "Defender 보호", value: summary.data?.defenderHealthy ?? 0, note: `전체 ${summary.data?.totalAgents ?? 0}대 기준`, icon: ShieldCheck, tone: "green" },
    { label: "Quarantine", value: summary.data?.quarantinedThreats ?? 0, note: "처리 대기 위협", icon: ShieldAlert, tone: "amber" },
    { label: "대기 명령", value: summary.data?.queuedCommands ?? 0, note: "에이전트 처리 대기", icon: Activity, tone: "violet" },
  ];

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-dot" /> Security Operations Center</div>
          <h1>관제 개요</h1>
          <p>여러 사업장의 Windows Defender 보안 상태와 원격 작업을 한 화면에서 확인합니다.</p>
        </div>
        <div className="heading-actions">
          <Select value={siteId ? String(siteId) : "all"} onValueChange={value => setSiteId(value === "all" ? undefined : Number(value))}>
            <SelectTrigger className="site-filter"><SelectValue placeholder="사업장 전체" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 사업장</SelectItem>
              {(sites.data ?? []).map(site => <SelectItem key={site.id} value={String(site.id)}>{site.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="metric-grid">
        {cards.map(card => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className={`metric-card metric-${card.tone}`}>
              <CardContent className="p-0">
                <div className="metric-topline"><span>{card.label}</span><Icon className="h-4 w-4" /></div>
                <div className="metric-value">{card.value}</div>
                <div className="metric-note">{card.note}</div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="dashboard-grid">
        <Card className="panel-card dashboard-panel-main">
          <CardHeader className="panel-header">
            <div><div className="eyebrow">Live inventory</div><CardTitle>에이전트 상태</CardTitle></div>
            <Link href="/agents" className="text-link">전체 보기 <ArrowUpRight className="h-4 w-4" /></Link>
          </CardHeader>
          <CardContent className="p-0">
            {(agents.data ?? []).length === 0 ? (
              <div className="empty-state compact"><div className="empty-icon"><Laptop className="h-5 w-5" /></div><div><strong>등록된 에이전트가 없습니다.</strong><p>사업장을 선택하고 등록 토큰을 발급해 첫 번째 PC를 연결하세요.</p></div><Link href="/agents" className="empty-action">등록 시작 <ChevronRight className="h-4 w-4" /></Link></div>
            ) : (
              <div className="agent-list">
                {(agents.data ?? []).slice(0, 8).map(agent => (
                  <div key={agent.id} className="agent-row">
                    <div className={`status-orb ${agent.effectiveStatus}`} />
                    <div className="agent-primary"><strong>{agent.hostName}</strong><span>{agent.siteName} · {agent.ipAddress ?? "IP 미수집"}</span></div>
                    <div className="agent-defender"><ShieldCheck className="h-4 w-4" /><span>{agent.defenderEnabled ? "Defender 보호 중" : "보호 확인 필요"}</span></div>
                    <Badge className={`status-badge ${agent.effectiveStatus}`}>{statusLabel[agent.effectiveStatus]}</Badge>
                    <span className="agent-time"><Clock3 className="h-3.5 w-3.5" />{formatDate(agent.lastHeartbeatAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="panel-card posture-panel">
          <CardHeader className="panel-header"><div><div className="eyebrow">Posture snapshot</div><CardTitle>보안 상태</CardTitle></div><ShieldCheck className="h-5 w-5 text-emerald-500" /></CardHeader>
          <CardContent>
            <div className="posture-summary"><span className="posture-ring"><span>{summary.data?.totalAgents ? Math.round(((summary.data?.defenderHealthy ?? 0) / summary.data.totalAgents) * 100) : 0}%</span></span><div><strong>Defender 최신 상태</strong><p>최근 7일 내 서명 업데이트가 확인된 에이전트 비율입니다.</p></div></div>
            <div className="posture-line"><span>온라인</span><strong>{summary.data?.onlineAgents ?? 0}대</strong><div className="mini-progress"><span style={{ width: `${summary.data?.totalAgents ? ((summary.data.onlineAgents / summary.data.totalAgents) * 100) : 0}%` }} /></div></div>
            <div className="posture-line"><span>오프라인</span><strong>{summary.data?.offlineAgents ?? 0}대</strong><WifiOff className="ml-auto h-4 w-4 text-slate-400" /></div>
          </CardContent>
        </Card>
      </section>

      <section className="dashboard-grid bottom-grid">
        <Card className="panel-card">
          <CardHeader className="panel-header"><div><div className="eyebrow">Quarantine watch</div><CardTitle>최근 위협</CardTitle></div><Link href="/quarantine" className="text-link">Quarantine 열기 <ArrowUpRight className="h-4 w-4" /></Link></CardHeader>
          <CardContent className="p-0">
            <div className="empty-state compact"><div className="empty-icon success"><CheckCircle2 className="h-5 w-5" /></div><div><strong>현재 표시할 Quarantine 항목이 없습니다.</strong><p>에이전트가 Defender 보호기록을 전송하면 이곳에 최신 탐지 내역이 표시됩니다.</p></div></div>
          </CardContent>
        </Card>
        <Card className="panel-card quick-panel">
          <CardHeader className="panel-header"><div><div className="eyebrow">Operator shortcuts</div><CardTitle>빠른 작업</CardTitle></div></CardHeader>
          <CardContent className="quick-actions">
            <Link href="/commands" className="quick-action"><span className="quick-icon blue"><Activity className="h-4 w-4" /></span><span><strong>보안 검사 명령</strong><small>Full Scan · Quick Scan · 서명 업데이트</small></span><ChevronRight className="ml-auto h-4 w-4" /></Link>
            <Link href="/rdp" className="quick-action"><span className="quick-icon violet"><MonitorIcon /></span><span><strong>RDP 원격제어</strong><small>Apache Guacamole 세션 시작</small></span><ChevronRight className="ml-auto h-4 w-4" /></Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function MonitorIcon() {
  return <Laptop className="h-4 w-4" />;
}
