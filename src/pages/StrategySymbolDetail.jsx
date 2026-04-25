/**
 * Strategy + single symbol: /strategies/:id/:ticker
 * Multiple snapshot runs; pick one to view. Parameters shown on the detail view.
 */

import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, Play, BarChart3, Plus } from 'lucide-react';
import {
  getStrategy,
  getStrategySymbolSnapshot,
  recalculateStrategySymbolRun,
} from '../data/strategies';
import { deleteSymbolRun } from '../data/backtests';
import StrategyBacktestSymbolDetail from './StrategyBacktestSymbolDetail';
import StrategySymbolBacktestRunModal from '../components/StrategySymbolBacktestRunModal';
import TaskProgress from '../components/TaskProgress';

/** Run picker: name · #id · date only */
function snapshotRunSelectLabel(s) {
  const fromParam = (s.parameters?.name && String(s.parameters.name).trim()) || '';
  const snapLabel = (s.label && String(s.label).trim()) || '';
  const name = snapLabel || fromParam || '—';
  const dateStr = s.created_at ? new Date(s.created_at).toLocaleDateString() : '—';
  return `${name} · #${s.backtest_id} · ${dateStr}`;
}

export default function StrategySymbolDetail() {
  const { id, ticker } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [strategy, setStrategy] = useState(null);
  const [snapshotPayload, setSnapshotPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [runModalOpen, setRunModalOpen] = useState(false);
  const [taskId, setTaskId] = useState(null);
  const [showTaskProgress, setShowTaskProgress] = useState(false);
  const [pendingBacktestId, setPendingBacktestId] = useState(null);
  const [pendingRunName, setPendingRunName] = useState('');
  const [recalculateBusy, setRecalculateBusy] = useState(false);
  /** Bumped so embedded `StrategyBacktestSymbolDetail` refetches when run id is unchanged (e.g. in-place recalculate). */
  const [symbolRunReloadNonce, setSymbolRunReloadNonce] = useState(0);

  const runs = snapshotPayload?.runs ?? [];
  const runParam = searchParams.get('run');

  const selectedRunId = useMemo(() => {
    if (pendingBacktestId != null) return Number(pendingBacktestId);
    if (runParam) {
      const n = parseInt(runParam, 10);
      if (!Number.isNaN(n)) return n;
    }
    const first = runs[0]?.run_id ?? runs[0]?.id;
    return first != null ? Number(first) : null;
  }, [runParam, runs, pendingBacktestId]);

  const loadStrategy = useCallback(async () => {
    const data = await getStrategy(id);
    setStrategy(data && typeof data === 'object' ? data : null);
  }, [id]);

  const loadSnapshot = useCallback(async () => {
    try {
      const data = await getStrategySymbolSnapshot(id, ticker);
      setSnapshotPayload(data);
    } catch (e) {
      console.error(e);
      setSnapshotPayload(null);
    }
  }, [id, ticker]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await Promise.all([loadStrategy(), loadSnapshot()]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadStrategy, loadSnapshot]);

  const selectedRun = useMemo(
    () => runs.find((r) => Number(r.run_id ?? r.id) === Number(selectedRunId)),
    [runs, selectedRunId],
  );

  useEffect(() => {
    if (!runs.length) return;
    if (pendingBacktestId != null) return;
    if (runParam) {
      const exists = runs.some((r) => String(r.run_id ?? r.id) === String(runParam));
      if (!exists) {
        const first = runs[0]?.run_id ?? runs[0]?.id;
        if (first != null) setSearchParams({ run: String(first) }, { replace: true });
      }
      return;
    }
    const first = runs[0]?.run_id ?? runs[0]?.id;
    if (first != null) setSearchParams({ run: String(first) }, { replace: true });
  }, [runs, runParam, pendingBacktestId, setSearchParams]);

  useEffect(() => {
    if (selectedRun?.run_id || selectedRun?.id) {
      setPendingBacktestId(null);
    }
  }, [selectedRun?.run_id, selectedRun?.id]);

  const status = selectedRun?.status;

  useEffect(() => {
    const active =
      status === 'running' ||
      status === 'pending' ||
      pendingBacktestId != null ||
      runs.some((r) => r.status === 'running' || r.status === 'pending');
    if (!active) return undefined;
    const t = setInterval(() => {
      loadSnapshot();
    }, 3000);
    return () => clearInterval(t);
  }, [status, pendingBacktestId, runs, loadSnapshot]);

  const handleStarted = ({ taskId: tid, backtestId: bid, runName }) => {
    if (bid != null) {
      setPendingBacktestId(bid);
      if (runName) setPendingRunName(String(runName));
      setSearchParams({ run: String(bid) }, { replace: true });
    }
    if (tid) {
      setTaskId(tid);
      setShowTaskProgress(true);
    }
    loadSnapshot();
  };

  const handleTaskComplete = useCallback(async () => {
    setShowTaskProgress(false);
    setTaskId(null);
    setPendingBacktestId(null);
    setPendingRunName('');
    await loadSnapshot();
    setSymbolRunReloadNonce((n) => n + 1);
  }, [loadSnapshot]);

  const openNewRun = () => {
    setRunModalOpen(true);
  };

  const recalculateSelectedRun = useCallback(async () => {
    const rid = selectedRun?.run_id ?? selectedRun?.id;
    if (!strategy?.id || rid == null) return;
    if (selectedRun.status === 'running' || selectedRun.status === 'pending') return;
    setRecalculateBusy(true);
    try {
      const backtest = await recalculateStrategySymbolRun(strategy.id, ticker, rid);
      if (backtest.id != null) {
        setPendingBacktestId(backtest.id);
        setSearchParams({ run: String(backtest.id) }, { replace: true });
      }
      if (backtest.task_id) {
        setTaskId(backtest.task_id);
        setShowTaskProgress(true);
      }
      await loadSnapshot();
      setSymbolRunReloadNonce((n) => n + 1);
    } catch (e) {
      console.error(e);
      alert(e.message || 'Failed to recalculate');
    } finally {
      setRecalculateBusy(false);
    }
  }, [strategy, selectedRun, ticker, loadSnapshot, setSearchParams]);

  const onSelectSnapshot = (e) => {
    const v = e.target.value;
    if (v) setSearchParams({ run: v }, { replace: true });
  };

  const deleteSelectedRun = useCallback(async () => {
    const rid = selectedRun?.run_id ?? selectedRun?.id;
    if (!rid) return;
    if (selectedRun?.status === 'running' || selectedRun?.status === 'pending') {
      alert('Wait for the run to finish before deleting it.');
      return;
    }
    const ok = window.confirm(`Delete this run (#${rid})?\n\nThis will delete the stored trades/statistics for it too. This cannot be undone.`);
    if (!ok) return;
    try {
      await deleteSymbolRun(rid);
      // refresh list and jump to newest remaining
      await loadSnapshot();
      setSymbolRunReloadNonce((n) => n + 1);
      setPendingBacktestId(null);
      setPendingRunName('');
      const nextId = (runs ?? []).find((r) => Number(r.run_id ?? r.id) !== Number(rid))?.run_id;
      if (!nextId) navigate(`/strategies/${id}`);
      else setSearchParams({ run: String(nextId) }, { replace: true });
    } catch (e) {
      console.error(e);
      alert(e.message || 'Failed to delete run');
    }
  }, [selectedRun, loadSnapshot, runs, navigate, id, setSearchParams]);

  if (loading && !strategy) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-8">Loading…</div>
      </div>
    );
  }

  if (!strategy) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-center text-gray-600">Strategy not found</p>
        <button
          type="button"
          onClick={() => navigate('/strategies')}
          className="mt-4 mx-auto block px-4 py-2 bg-primary-600 text-white rounded-lg"
        >
          Back
        </button>
      </div>
    );
  }

  if (runs.length === 0 && !pendingBacktestId) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showTaskProgress && taskId && (
          <TaskProgress taskId={taskId} onComplete={handleTaskComplete} onClose={handleTaskComplete} />
        )}
        <button
          type="button"
          onClick={() => navigate(`/strategies/${id}`)}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to strategy
        </button>

        <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-xl mx-auto">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {strategy.name} — {ticker}
          </h1>
          <p className="text-gray-600 mb-6">
            No single-symbol runs yet. Create one to store results for this strategy and ticker. You can add more runs
            with different parameters later.
          </p>
          <button
            type="button"
            onClick={openNewRun}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Play className="w-5 h-5" />
            New single-symbol run
          </button>
        </div>

        <StrategySymbolBacktestRunModal
          open={runModalOpen}
          onClose={() => setRunModalOpen(false)}
          strategy={strategy}
          ticker={ticker}
          onStarted={handleStarted}
        />
      </div>
    );
  }

  const effectiveRunId = selectedRunId;

  return (
    <>
      {showTaskProgress && taskId && (
        <TaskProgress taskId={taskId} onComplete={handleTaskComplete} onClose={handleTaskComplete} />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 border-b border-gray-200 bg-gray-50/80">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(`/strategies/${id}`)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Strategy
            </button>
            <span className="text-gray-300">|</span>
            <label htmlFor="snap-select" className="text-sm text-gray-600">
              Run to view
            </label>
            <select
              id="snap-select"
              value={effectiveRunId != null ? String(effectiveRunId) : ''}
              onChange={onSelectSnapshot}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white min-w-0 max-w-xl flex-1 sm:min-w-[20rem]"
            >
              {runs.map((r) => (
                <option key={r.id} value={String(r.run_id ?? r.id)}>
                  {snapshotRunSelectLabel({ ...r, backtest_id: r.run_id ?? r.id })}
                </option>
              ))}
              {pendingBacktestId &&
                !runs.some((r) => String(r.run_id ?? r.id) === String(pendingBacktestId)) && (
                  <option value={String(pendingBacktestId)}>
                    {snapshotRunSelectLabel({
                      parameters: { name: pendingRunName || 'Starting' },
                      created_at: new Date().toISOString(),
                      backtest_id: pendingBacktestId,
                    })}
                  </option>
                )}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openNewRun}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Plus className="w-4 h-4" />
              New run
            </button>
          </div>
        </div>
      </div>

      {effectiveRunId != null && (
        <StrategyBacktestSymbolDetail
          key={effectiveRunId}
          embeddedRunId={effectiveRunId}
          symbolRunReloadNonce={symbolRunReloadNonce}
          standalone
          onRecalculate={recalculateSelectedRun}
          onDeleteRun={deleteSelectedRun}
          recalculateDisabled={
            recalculateBusy ||
            selectedRun?.status === 'running' ||
            selectedRun?.status === 'pending'
          }
        />
      )}

      <StrategySymbolBacktestRunModal
        open={runModalOpen}
        onClose={() => setRunModalOpen(false)}
        strategy={strategy}
        ticker={ticker}
        onStarted={handleStarted}
      />
    </>
  );
}
