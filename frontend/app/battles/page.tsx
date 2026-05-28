"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchWithTimeout } from "@/lib/api-client";
import { MessageCircle, Zap, Trophy, Plus, X } from "lucide-react";

type Battle = {
  id: string;
  battle_name: string;
  goal_text: string;
  user_1_id: string;
  user_2_id: string;
  user_1_total_effort: number;
  user_2_total_effort: number;
  user_1_weeks_logged: number;
  user_2_weeks_logged: number;
  status: string;
  created_at: string;
  logs: Array<{
    id: string;
    user_id: string;
    week_number: string;
    effort_score: string;
    log_text: string;
    created_at: string;
  }>;
};

function BattleCard({ battle, currentUserId, onSelectBattle }: { battle: Battle; currentUserId: string; onSelectBattle: (id: string) => void }) {
  const isUser1 = currentUserId === battle.user_1_id;
  const myEffort = isUser1 ? battle.user_1_total_effort : battle.user_2_total_effort;
  const opponentEffort = isUser1 ? battle.user_2_total_effort : battle.user_1_total_effort;
  const iWinning = myEffort > opponentEffort;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 hover:border-cyan-300/40 hover:bg-white/[0.08] transition cursor-pointer" onClick={() => onSelectBattle(battle.id)}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.35em] text-cyan-300">Battle</p>
          <h3 className="text-xl font-black uppercase mt-1">{battle.battle_name}</h3>
          <p className="text-sm text-zinc-400 mt-2">{battle.goal_text}</p>
        </div>
        <div className={`text-3xl ${iWinning ? "text-cyan-300" : "text-zinc-500"}`}>{iWinning ? "🔥" : "⚡"}</div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className={`rounded-xl border p-4 ${iWinning ? "border-cyan-300/30 bg-cyan-300/10" : "border-white/10 bg-white/[0.04]"}`}>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">You</p>
            <p className="text-2xl sm:text-3xl font-black mt-2">{myEffort}</p>
          <p className="text-xs text-zinc-400 mt-1">effort pts</p>
        </div>
        <div className={`rounded-xl border p-4 ${!iWinning ? "border-amber-300/30 bg-amber-300/10" : "border-white/10 bg-white/[0.04]"}`}>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">Opponent</p>
            <p className="text-2xl sm:text-3xl font-black mt-2">{opponentEffort}</p>
          <p className="text-xs text-zinc-400 mt-1">effort pts</p>
        </div>
      </div>
    </div>
  );
}

function BattleDetailModal({ battle, currentUserId, onClose, onLogWeek }: { battle: Battle; currentUserId: string; onClose: () => void; onLogWeek: (data: any) => void }) {
  const currentWeek = Math.ceil((Date.now() - new Date(battle.created_at).getTime()) / (1000 * 60 * 60 * 24 * 7)) || 1;
  const alreadyLoggedThisWeek = battle.logs.some(
    (l) => l.user_id === currentUserId && String(l.week_number) === String(currentWeek)
  );
  const [effortScore, setEffortScore] = useState("5");
  const [logText, setLogText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (alreadyLoggedThisWeek) return;
    setSubmitting(true);
    await onLogWeek({
      week_number: currentWeek,
      effort_score: Number(effortScore),
      log_text: logText,
    });
    setSubmitting(false);
    setEffortScore("5");
    setLogText("");
  };

  const isUser1 = currentUserId === battle.user_1_id;
  const user1Logs = battle.logs.filter((l) => l.user_id === battle.user_1_id);
  const user2Logs = battle.logs.filter((l) => l.user_id === battle.user_2_id);
  const myLogs = isUser1 ? user1Logs : user2Logs;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-md sm:items-center">
      <div className="w-full max-w-2xl overflow-hidden rounded-t-[2.5rem] border border-white/10 bg-[#08051a] shadow-2xl sm:rounded-[2.5rem]">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-300">Battle Arena</p>
            <h2 className="mt-1 text-2xl font-black uppercase">{battle.battle_name}</h2>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-zinc-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Leaderboard */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.07] p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-300">You</p>
            <p className="text-3xl sm:text-4xl font-black mt-3">{isUser1 ? battle.user_1_total_effort : battle.user_2_total_effort}</p>
              <p className="text-xs text-zinc-400 mt-1">{myLogs.length} weeks logged</p>
            </div>
            <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.07] p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-300">Opponent</p>
                <p className="text-3xl sm:text-4xl font-black mt-3">{isUser1 ? battle.user_2_total_effort : battle.user_1_total_effort}</p>
              <p className="text-xs text-zinc-400 mt-1">{isUser1 ? user2Logs.length : user1Logs.length} weeks logged</p>
            </div>
          </div>

          {/* Log Week Form */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-zinc-400 mb-4">Log This Week</p>
            
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">Effort Score</label>
                <span className="text-lg font-black text-cyan-300">{effortScore}/10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={effortScore}
                onChange={(e) => setEffortScore(e.target.value)}
                className="w-full accent-cyan-400"
              />
            </div>
            <textarea
              placeholder="What happened this week?"
              value={logText}
              onChange={(e) => setLogText(e.target.value)}
              className="w-full mb-4 p-3 rounded-xl border border-white/10 bg-black/50 text-white text-sm placeholder:text-zinc-600 min-h-24"
            />
            {alreadyLoggedThisWeek ? (
              <div className="w-full py-3 text-center text-sm font-black uppercase text-zinc-500 border border-white/10 rounded-xl">
                Already logged week {currentWeek} — come back next week
              </div>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 py-3 text-sm font-black uppercase text-[#03020a] rounded-xl hover:scale-[1.01] disabled:opacity-50 transition"
              >
                {submitting ? "Logging..." : `Submit Week ${currentWeek} →`}
              </button>
            )}
          </div>

          {/* Recent Logs */}
          <div>
            <p className="text-xs font-black uppercase tracking-[0.35em] text-zinc-400 mb-4">Your Battle Log</p>
            <div className="space-y-2">
              {myLogs.length === 0 ? (
                <p className="text-sm text-zinc-500">No weeks logged yet. Start the battle!</p>
              ) : (
                myLogs.map((log) => (
                  <div key={log.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-black text-cyan-300">Week {log.week_number}</p>
                        <p className="text-xs text-zinc-400 mt-1">{log.log_text}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black">{log.effort_score}/10</p>
                        <p className="text-[10px] text-zinc-500">effort</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateBattleModal({ onClose, onCreate, currentUserId }: { onClose: () => void; onCreate: (data: any) => void; currentUserId: string }) {
  const [battleName, setBattleName] = useState("");
  const [goalText, setGoalText] = useState("");
const [opponentId, setOpponentId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!battleName || !goalText || !opponentId) {
      alert("Fill in all fields");
      return;
    }
    if (opponentId === currentUserId) {
      alert("You can't battle yourself!");
      return;
    }
    setSubmitting(true);
    await onCreate({
      battle_name: battleName,
      goal_text: goalText,
      user_2_id: opponentId,
    });
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-md sm:items-center">
      <div className="w-full max-w-md overflow-hidden rounded-t-[2.5rem] border border-white/10 bg-[#08051a] shadow-2xl sm:rounded-[2.5rem]">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-fuchsia-300">Challenge</p>
            <h2 className="mt-1 text-2xl font-black uppercase">New Battle</h2>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-zinc-400 hover:text-white">
            ✕
          </button>
        </div>

            <div className="p-4 sm:p-6 space-y-4">
              <input
            type="text"
            placeholder="Battle Name"
            value={battleName}
            onChange={(e) => setBattleName(e.target.value)}
            className="w-full p-3 rounded-xl border border-white/10 bg-black/50 text-white text-sm placeholder:text-zinc-600"
          />
          <input
            type="text"
            placeholder="Goal (e.g., Write a novel)"
            value={goalText}
            onChange={(e) => setGoalText(e.target.value)}
            className="w-full p-3 rounded-xl border border-white/10 bg-black/50 text-white text-sm placeholder:text-zinc-600"
          />
          <input
            type="text"
            placeholder="Opponent User ID (they can copy it from their dashboard)"
            value={opponentId}
            onChange={(e) => setOpponentId(e.target.value)}
            className="w-full p-3 rounded-xl border border-white/10 bg-black/50 text-white text-sm placeholder:text-zinc-600"
          />
          <button
            onClick={handleCreate}
            disabled={submitting}
            className="w-full bg-gradient-to-r from-fuchsia-400 to-cyan-400 py-3 text-sm font-black uppercase text-[#03020a] rounded-xl hover:scale-[1.01] disabled:opacity-50 transition"
          >
            {submitting ? "Creating..." : "Start Battle →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function BattlesInner({ session }: { session: any }) {
  const router = useRouter();
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
  const [battles, setBattles] = useState<Battle[]>([]);
  const [selectedBattle, setSelectedBattle] = useState<Battle | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadBattles = useCallback(async () => {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/api/users/${session.user.id}/battles`, {
        method: "GET",
      });
      const data = await res.json();
      setBattles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load battles", err);
      setBattles([]);
    } finally {
      setLoading(false);
    }
  }, [session.user.id, API_BASE_URL]);

  useEffect(() => {
    loadBattles();
  }, [loadBattles]);

  const handleCreateBattle = async (data: any) => {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/api/battles/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          battle_name: data.battle_name,
          goal_text: data.goal_text,
          user_1_id: session.user.id,
          user_2_id: data.user_2_id,
        }),
      });
      const newBattle = await res.json();
      setBattles([newBattle, ...battles]);
    } catch (err) {
      console.error("Failed to create battle", err);
      alert("Failed to create battle");
    }
  };

  const handleLogWeek = async (data: any) => {
    if (!selectedBattle) return;
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/api/battles/${selectedBattle.id}/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: session.user.id,
          week_number: data.week_number,
          effort_score: data.effort_score,
          log_text: data.log_text,
        }),
      });
      await res.json();
      await loadBattles();
      setSelectedBattle(null);
    } catch (err) {
      console.error("Failed to log week", err);
      alert("Failed to log week");
    }
  };

  const handleSelectBattle = async (battleId: string) => {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/api/battles/${battleId}`, {
        method: "GET",
      });
      const data = await res.json();
      setSelectedBattle(data);
    } catch (err) {
      console.error("Failed to load battle details", err);
    }
  };

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-[#03020a] px-4 pb-28 pt-6 text-white sm:px-10 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.55em] text-fuchsia-300">Competition</p>
              <h1 className="mt-2 text-3xl sm:text-5xl font-black uppercase tracking-[-0.06em]">Spiral Battles</h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-zinc-300">Challenge someone to chase the same goal. Race each other for 6 months. May the most spiraling builder win.</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-400 to-cyan-400 px-6 py-3 text-sm font-black uppercase text-[#03020a] shadow-lg hover:scale-105 transition"
            >
              <Plus className="h-4 w-4" />
              New Battle
            </button>
          </div>
        </header>

        {loading ? (
          <div className="text-center py-20">
            <p className="text-zinc-400">Loading battles...</p>
          </div>
        ) : battles.length === 0 ? (
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 sm:p-12 text-center">
            <Trophy className="h-16 w-16 mx-auto text-zinc-600 mb-4" />
            <p className="text-xl font-black uppercase">No battles yet</p>
            <p className="mt-2 text-sm text-zinc-400">Challenge someone to get started</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {battles.map((battle) => (
              <BattleCard key={battle.id} battle={battle} currentUserId={session.user.id} onSelectBattle={handleSelectBattle} />
            ))}
          </div>
        )}

        {selectedBattle && <BattleDetailModal battle={selectedBattle} currentUserId={session.user.id} onClose={() => setSelectedBattle(null)} onLogWeek={handleLogWeek} />}
        {showCreateModal && <CreateBattleModal onClose={() => setShowCreateModal(false)} onCreate={handleCreateBattle} currentUserId={session.user.id} />}
      </div>
    </main>
  );
}

export default function BattlesPage() {
  return (
    <ProtectedRoute>
      {(authValue: any) => {
        const session = authValue?.user?.id ? authValue : authValue?.session?.user?.id ? authValue.session : authValue?.data?.session?.user?.id ? authValue.data.session : authValue?.id ? { user: authValue } : authValue;
        return (
          <div className="relative min-h-screen bg-[#03020a] text-white">
            <BattlesInner session={session} />
          </div>
        );
      }}
    </ProtectedRoute>
  );
}