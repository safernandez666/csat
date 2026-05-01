import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Control, DashboardSummary, Evidence, CommentItem, AuditLogItem, User, TrendData } from "../types";

export function useControls(params?: Record<string, string>) {
  const [data, setData] = useState<Control[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    api.getControls(params)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [JSON.stringify(params)]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useControl(id: number) {
  const [data, setData] = useState<Control | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    api.getControl(id)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh, setData };
}

export function useDashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [trends, setTrends] = useState<TrendData | null>(null);
  const [radar, setRadar] = useState<{ group: string; score: number; total: number }[] | null>(null);
  const [igProgress, setIgProgress] = useState<Record<string, { total: number; implemented: number; score: number }> | null>(null);
  const [controlScores, setControlScores] = useState<{ id: number; cis_id: string; name: string; status: string; group: string; score: number; total: number; implemented: number }[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([api.getDashboardSummary(), api.getDashboardTrends(), api.getDashboardRadar(), api.getDashboardIgProgress(), api.getDashboardControlScores()])
      .then(([summary, trendData, radarData, igData, scoresData]) => {
        setData(summary);
        setTrends(trendData);
        setRadar(radarData.radar);
        setIgProgress(igData);
        setControlScores(scoresData.scores);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, trends, radar, igProgress, controlScores, loading, error, refresh };
}

export function useEvidence(controlId?: number) {
  const [data, setData] = useState<Evidence[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    api.getEvidence(controlId)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [controlId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useComments(controlId?: number) {
  const [data, setData] = useState<CommentItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    api.getComments(controlId)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [controlId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useAuditLogs(params?: Record<string, string>) {
  const [data, setData] = useState<AuditLogItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    api.getAuditLogs(params)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [JSON.stringify(params)]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useUsers() {
  const [data, setData] = useState<User[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    api.getUsers()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useMe() {
  const [data, setData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.me()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}
