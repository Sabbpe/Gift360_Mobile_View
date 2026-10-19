// src/pages/admin/QuizPerformanceTab.tsx
// Admin tab: Dussehra payment-cancel quiz funnel + coin-credit leakage.
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download } from "lucide-react";
import { downloadCsv } from "@/api/adminApi";
import {
  fetchQuizRewards,
  fetchQuizSummary,
  type QuizRewardFilter,
} from "@/api/adminQuizApi";

const num = (v: unknown) => Number(v ?? 0) || 0;
const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1)}%` : "-");
const fmtTs = (v: unknown) => (v ? String(v).replace("T", " ").slice(0, 19) : "-");

function Stat({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: number | string;
  sub?: string;
  tone?: "default" | "good" | "bad";
}) {
  const color =
    tone === "bad" ? "text-red-600" : tone === "good" ? "text-green-600" : "text-[#111827]";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-[#6B7280] mb-1">{label}</div>
        <div className={`text-xl font-bold ${color}`}>
          {typeof value === "number" ? value.toLocaleString("en-IN") : value}
        </div>
        {sub && <div className="text-[11px] text-[#6B7280] mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}

const FILTER_LABELS: Record<QuizRewardFilter, string> = {
  leakage: "Leakage (won, coins not credited)",
  all: "All quiz offers",
  won: "Won",
  credited: "Coins credited",
  lost: "Lost",
  abandoned: "Started, not finished",
};

export default function QuizPerformanceTab({ from, to }: { from: string; to: string }) {
  const [summary, setSummary] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState<QuizRewardFilter>("leakage");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, r] = await Promise.all([
        fetchQuizSummary({ from, to }),
        fetchQuizRewards({ from, to, filter, size: 200 }),
      ]);
      setSummary(s);
      setRows(r.data ?? []);
    } catch (err) {
      console.error("Admin quiz: failed to load:", err);
      setError("Could not load quiz data. Check that the backend with the quiz admin endpoints is deployed.");
    } finally {
      setLoading(false);
    }
  }, [from, to, filter]);

  useEffect(() => {
    load();
  }, [load]);

  const t = summary?.totals;
  const leakage = num(t?.leakage);
  const callouts = num(t?.callouts);
  const started = num(t?.started);
  const completed = num(t?.completed);
  const won = num(t?.won);
  const linked = num(t?.linked_to_order);
  const credited = num(t?.credited);

  const funnel = [
    { step: "Quiz offers opened (cancelled payments)", n: callouts, base: callouts },
    { step: "Started the quiz", n: started, base: callouts },
    { step: "Finished the quiz", n: completed, base: started },
    { step: "Won (all answers correct)", n: won, base: completed },
    { step: "Bought within 5 min (bonus linked to order)", n: linked, base: won },
    { step: "Coins credited", n: credited, base: linked },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[#6B7280]">
          Campaign {summary?.campaign ?? "-"} - {from} to {to}. Counts use the date the quiz offer was opened.
        </p>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {leakage > 0 && (
        <div className="rounded-lg bg-red-50 border border-red-300 px-4 py-3 text-sm text-red-800">
          <b>{leakage}</b> winner{leakage === 1 ? "" : "s"} made a qualifying purchase in the 5-minute window but did
          not get their coins - <b>{num(t?.coins_owed)}</b> SuperCoins owed.{" "}
          {num(t?.leakage_not_linked)} never linked to the order, {num(t?.leakage_not_credited)} linked but the credit
          did not complete. See the Leakage list below.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Stat label="Quiz offers" value={callouts} />
        <Stat label="Players" value={num(t?.players)} />
        <Stat label="Started" value={started} sub={pct(started, callouts) + " of offers"} />
        <Stat label="Finished" value={completed} sub={pct(completed, started) + " of started"} />
        <Stat label="Won" value={won} sub={pct(won, completed) + " of finished"} />
        <Stat label="Lost" value={num(t?.lost)} />
        <Stat label="Bought in 5 min" value={linked} sub={pct(linked, won) + " of winners"} />
        <Stat label="Coins credited" value={credited} sub={`${num(t?.coins_credited)} SuperCoins`} tone="good" />
        <Stat
          label="Leakage (not credited)"
          value={leakage}
          sub={leakage > 0 ? `${num(t?.coins_owed)} coins owed` : "none"}
          tone={leakage > 0 ? "bad" : "good"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Step</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead className="text-right">% of previous step</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {funnel.map((f) => (
                <TableRow key={f.step}>
                  <TableCell>{f.step}</TableCell>
                  <TableCell className="text-right">{f.n}</TableCell>
                  <TableCell className="text-right">{pct(f.n, f.base)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">By day</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Day</TableHead>
                <TableHead className="text-right">Offers</TableHead>
                <TableHead className="text-right">Players</TableHead>
                <TableHead className="text-right">Started</TableHead>
                <TableHead className="text-right">Finished</TableHead>
                <TableHead className="text-right">Won</TableHead>
                <TableHead className="text-right">Credited</TableHead>
                <TableHead className="text-right">Leakage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(summary?.daily ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-[#6B7280]">
                    No quiz activity in this range.
                  </TableCell>
                </TableRow>
              )}
              {(summary?.daily ?? []).map((d: any) => (
                <TableRow key={String(d.day)}>
                  <TableCell>{String(d.day).slice(0, 10)}</TableCell>
                  <TableCell className="text-right">{num(d.callouts)}</TableCell>
                  <TableCell className="text-right">{num(d.players)}</TableCell>
                  <TableCell className="text-right">{num(d.started)}</TableCell>
                  <TableCell className="text-right">{num(d.completed)}</TableCell>
                  <TableCell className="text-right">{num(d.won)}</TableCell>
                  <TableCell className="text-right">{num(d.credited)}</TableCell>
                  <TableCell className={`text-right ${num(d.leakage) > 0 ? "text-red-600 font-semibold" : ""}`}>
                    {num(d.leakage)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">Quiz offers</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={(v) => setFilter(v as QuizRewardFilter)}>
              <SelectTrigger className="w-[260px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(FILTER_LABELS) as QuizRewardFilter[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {FILTER_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={rows.length === 0}
              onClick={() => downloadCsv(rows, `quiz_${filter}_${from}_${to}.csv`)}
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Attempt</TableHead>
                <TableHead>Quiz finished</TableHead>
                <TableHead>Reward expires</TableHead>
                <TableHead>Linked order</TableHead>
                <TableHead>Qualifying order</TableHead>
                <TableHead>Coins</TableHead>
                <TableHead>Issue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-[#6B7280]">
                    {loading ? "Loading..." : "Nothing in this view."}
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.public_id} className={r.leakage ? "bg-red-50" : ""}>
                  <TableCell>{r.client_name ?? r.client_id}</TableCell>
                  <TableCell>{r.client_mobile ?? "-"}</TableCell>
                  <TableCell>{r.outcome}</TableCell>
                  <TableCell>{r.attempt_number ?? "-"}</TableCell>
                  <TableCell>{fmtTs(r.quiz_completed_at)}</TableCell>
                  <TableCell>{fmtTs(r.expires_at)}</TableCell>
                  <TableCell>{r.reserved_order_number ?? "-"}</TableCell>
                  <TableCell>{r.qualifying_order ?? "-"}</TableCell>
                  <TableCell>{r.cashback_amount_credited ?? "-"}</TableCell>
                  <TableCell>{r.leak_reason ?? (r.status === "REDEEMED" ? "Credited" : "-")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
