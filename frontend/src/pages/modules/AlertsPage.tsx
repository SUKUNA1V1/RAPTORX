import { useEffect, useMemo, useState, useCallback } from 'react';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Tooltip from '@mui/material/Tooltip';
import TablePagination from '@mui/material/TablePagination';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Snackbar from '@mui/material/Snackbar';
import Fade from '@mui/material/Fade';
import Collapse from '@mui/material/Collapse';
import LinearProgress from '@mui/material/LinearProgress';
import IconifyIcon from 'components/base/IconifyIcon';
import { AlertItem, apiClient } from 'lib/api';

type TabValue = 'all' | 'open' | 'resolved' | 'false_positive';

const TAB_OPTIONS: { label: string; value: TabValue; color: string }[] = [
  { label: 'All',           value: 'all',           color: '#94a3b8' },
  { label: 'Open',          value: 'open',          color: '#f87171' },
  { label: 'Resolved',      value: 'resolved',      color: '#4ade80' },
  { label: 'False Positive', value: 'false_positive', color: '#fb923c' },
];

const SEVERITY_STYLE: Record<string, { bg: string; color: string; border: string; glow: string }> = {
  high:   { bg: 'rgba(239,68,68,0.12)',  color: '#f87171', border: 'rgba(239,68,68,0.35)',  glow: '0 0 10px rgba(239,68,68,0.22)' },
  medium: { bg: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: 'rgba(245,158,11,0.35)', glow: 'none' },
  low:    { bg: 'rgba(99,102,241,0.12)', color: '#818cf8', border: 'rgba(99,102,241,0.35)', glow: 'none' },
};

const STATUS_STYLE: Record<string, { icon: string; color: string; label: string }> = {
  open:           { icon: 'mdi:alert-circle',  color: '#f87171', label: 'Open'           },
  resolved:       { icon: 'mdi:check-circle',   color: '#4ade80', label: 'Resolved'       },
  false_positive: { icon: 'mdi:flag-remove',    color: '#fb923c', label: 'False Positive' },
};

const AlertsPage = () => {
  const [alerts, setAlerts]       = useState<AlertItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [tab, setTab]             = useState<TabValue>('all');
  const [selected, setSelected]   = useState<Set<number>>(new Set());
  const [actionLoading, setActionLoading] = useState<Record<number, 'resolve' | 'false_positive' | null>>({});
  const [bulkProgress, setBulkProgress]   = useState<{ active: boolean; done: number; total: number }>({ active: false, done: 0, total: 0 });
  const [snackbar, setSnackbar]   = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  /* ------------------------------------------------------------------ fetch */
  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setSelected(new Set());
      const data = await apiClient.getAlerts();
      setAlerts(data.items);
    } catch {
      setError('Failed to load alerts from the backend API.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  /* ---------------------------------------------------------------- derived */
  const filtered = useMemo(() =>
    tab === 'all' ? alerts : alerts.filter((a) => a.status === tab),
    [alerts, tab],
  );



  const counts = useMemo(() => ({
    all:           alerts.length,
    open:          alerts.filter((a) => a.status === 'open').length,
    resolved:      alerts.filter((a) => a.status === 'resolved').length,
    false_positive: alerts.filter((a) => a.status === 'false_positive').length,
  }), [alerts]);

  /* When tab changes, clear selection and reset page */
  useEffect(() => { 
    setSelected(new Set()); 
    setPage(0);
  }, [tab]);

  /* -------------------------------------------------------- selection logic */
  const selectableIds = useMemo(() => filtered.map((a) => a.id), [filtered]);
  const allSelected   = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));
  const someSelected  = selectableIds.some((id) => selected.has(id)) && !allSelected;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(selectableIds));
    }
  };

  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /* --------------------------------------------------------- single actions */
  const handleResolve = async (id: number) => {
    setActionLoading((p) => ({ ...p, [id]: 'resolve' }));
    try {
      const updated = await apiClient.resolveAlert(id);
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status: updated.status } : a)));
      setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
      showSnack('Alert marked as resolved.', 'success');
    } catch (err) {
      console.error('[AlertsPage] Failed to resolve alert:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to resolve alert. Try again.';
      showSnack(errorMsg, 'error');
    } finally {
      setActionLoading((p) => ({ ...p, [id]: null }));
    }
  };

  const handleFalsePositive = async (id: number) => {
    setActionLoading((p) => ({ ...p, [id]: 'false_positive' }));
    try {
      const updated = await apiClient.markAlertFalsePositive(id);
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status: updated.status } : a)));
      setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
      showSnack('Alert marked as false positive.', 'success');
    } catch (err) {
      console.error('[AlertsPage] Failed to mark as false positive:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to mark as false positive. Try again.';
      showSnack(errorMsg, 'error');
    } finally {
      setActionLoading((p) => ({ ...p, [id]: null }));
    }
  };

  /* ---------------------------------------------------------- bulk actions */
  const runBulk = async (action: 'resolve' | 'false_positive') => {
    const ids = [...selected];
    setBulkProgress({ active: true, done: 0, total: ids.length });

    let successCount = 0;
    let failCount    = 0;

    for (const id of ids) {
      try {
        const updated = action === 'resolve'
          ? await apiClient.resolveAlert(id)
          : await apiClient.markAlertFalsePositive(id);
        setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status: updated.status } : a)));
        setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
        successCount++;
      } catch (err) {
        console.error(`[AlertsPage] Bulk ${action} failed for alert ${id}:`, err);
        failCount++;
      }
      setBulkProgress((p) => ({ ...p, done: p.done + 1 }));
    }

    setBulkProgress({ active: false, done: 0, total: 0 });

    if (failCount === 0) {
      showSnack(`${successCount} alert${successCount > 1 ? 's' : ''} ${action === 'resolve' ? 'resolved' : 'marked as false positive'}.`, 'success');
    } else {
      showSnack(`${successCount} succeeded, ${failCount} failed.`, 'error');
    }
  };

  const showSnack = (message: string, severity: 'success' | 'error') =>
    setSnackbar({ open: true, message, severity });

  /* ----------------------------------------------------------------------- */
  const selectedCount  = selected.size;
  const bulkInProgress = bulkProgress.active;

  return (
    <Stack spacing={4} sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>

      {/* ── Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
          <Box sx={{
            width: 56, height: 56, borderRadius: '16px',
            background: 'linear-gradient(135deg, #ff0844 0%, #ffb199 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', flexShrink: 0, boxShadow: '0 8px 32px rgba(255,8,68,0.3)',
          }}>
            <IconifyIcon icon="mdi:bell-alert-outline" sx={{ fontSize: '2rem' }} />
          </Box>
          <Box>
            <Typography variant="h3" fontWeight={800} sx={{
              background: 'linear-gradient(to right, #fff, #ef4444)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', mb: 0.5,
            }}>
              System Alerts
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              Critical notifications and anomaly warnings detected by the AI.
            </Typography>
          </Box>
        </Box>

        <Tooltip title="Refresh alerts">
          <IconButton
            onClick={() => void load()}
            disabled={loading || bulkInProgress}
            sx={{
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2,
              color: 'text.secondary',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.06)', color: 'white' },
            }}
          >
            {loading
              ? <CircularProgress size={18} sx={{ color: '#ff0844' }} />
              : <IconifyIcon icon="mdi:refresh" />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* ── Filter Tabs ── */}
      <Paper sx={{
        borderRadius: 3, background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)', px: 1, overflow: 'hidden',
      }}>
        <Tabs
          value={tab}
          onChange={(_, v: TabValue) => setTab(v)}
          TabIndicatorProps={{ style: { display: 'none' } }}
          sx={{ minHeight: 52 }}
        >
          {TAB_OPTIONS.map((opt) => (
            <Tab
              key={opt.value}
              value={opt.value}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>{opt.label}</span>
                  <Chip
                    label={counts[opt.value]}
                    size="small"
                    sx={{
                      height: 20, fontSize: '0.7rem', fontWeight: 700,
                      bgcolor: tab === opt.value ? `${opt.color}22` : 'rgba(255,255,255,0.06)',
                      color:   tab === opt.value ? opt.color : 'text.disabled',
                      border: `1px solid ${tab === opt.value ? `${opt.color}44` : 'transparent'}`,
                      transition: 'all 0.2s',
                      '& .MuiChip-label': { px: 1 },
                    }}
                  />
                </Box>
              }
              sx={{
                minHeight: 52, fontWeight: 600, fontSize: '0.85rem',
                textTransform: 'none', borderRadius: 2, mx: 0.5, my: 0.5,
                transition: 'all 0.2s',
                color: tab === opt.value ? opt.color : 'text.secondary',
                bgcolor: tab === opt.value ? `${opt.color}11` : 'transparent',
                '&:hover': { bgcolor: `${opt.color}0d`, color: opt.color },
              }}
            />
          ))}
        </Tabs>
      </Paper>

      {/* ── Bulk Action Toolbar ── */}
      <Collapse in={selectedCount > 0}>
        <Paper sx={{
          borderRadius: 3, overflow: 'hidden',
          border: '1px solid rgba(99,102,241,0.3)',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.06) 100%)',
          boxShadow: '0 4px 24px rgba(99,102,241,0.12)',
        }}>
          {/* Progress bar */}
          {bulkInProgress && (
            <LinearProgress
              variant="determinate"
              value={(bulkProgress.done / bulkProgress.total) * 100}
              sx={{
                height: 3,
                bgcolor: 'rgba(255,255,255,0.05)',
                '& .MuiLinearProgress-bar': { bgcolor: '#818cf8' },
              }}
            />
          )}
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 2,
            px: 3, py: 1.5, flexWrap: 'wrap',
          }}>
            {/* Count badge */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, flex: 1 }}>
              <Box sx={{
                width: 32, height: 32, borderRadius: '10px',
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <IconifyIcon icon="mdi:checkbox-multiple-marked" sx={{ fontSize: '1rem', color: 'white' }} />
              </Box>
              <Typography fontWeight={700} sx={{ color: '#c7d2fe', fontSize: '0.9rem' }}>
                {selectedCount} alert{selectedCount > 1 ? 's' : ''} selected
              </Typography>
              {bulkInProgress && (
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                  Processing {bulkProgress.done}/{bulkProgress.total}…
                </Typography>
              )}
            </Box>

            {/* Actions */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                id="bulk-resolve-btn"
                variant="contained"
                size="small"
                disabled={bulkInProgress}
                onClick={() => void runBulk('resolve')}
                startIcon={
                  bulkInProgress && bulkProgress.active
                    ? <CircularProgress size={14} sx={{ color: 'white' }} />
                    : <IconifyIcon icon="mdi:check-circle-outline" />
                }
                sx={{
                  borderRadius: 2, fontWeight: 700, textTransform: 'none',
                  bgcolor: 'rgba(74,222,128,0.15)',
                  color: '#4ade80',
                  border: '1px solid rgba(74,222,128,0.3)',
                  boxShadow: 'none',
                  '&:hover': { bgcolor: 'rgba(74,222,128,0.25)', boxShadow: '0 4px 16px rgba(74,222,128,0.2)' },
                  '&:disabled': { opacity: 0.5 },
                }}
              >
                Resolve Selected
              </Button>

              <Button
                id="bulk-false-positive-btn"
                variant="contained"
                size="small"
                disabled={bulkInProgress}
                onClick={() => void runBulk('false_positive')}
                startIcon={<IconifyIcon icon="mdi:flag-outline" />}
                sx={{
                  borderRadius: 2, fontWeight: 700, textTransform: 'none',
                  bgcolor: 'rgba(251,146,60,0.15)',
                  color: '#fb923c',
                  border: '1px solid rgba(251,146,60,0.3)',
                  boxShadow: 'none',
                  '&:hover': { bgcolor: 'rgba(251,146,60,0.25)', boxShadow: '0 4px 16px rgba(251,146,60,0.2)' },
                  '&:disabled': { opacity: 0.5 },
                }}
              >
                False Positive
              </Button>

              <Tooltip title="Clear selection">
                <IconButton
                  size="small"
                  onClick={() => setSelected(new Set())}
                  disabled={bulkInProgress}
                  sx={{
                    borderRadius: 1.5, color: 'text.secondary',
                    border: '1px solid rgba(255,255,255,0.08)',
                    width: 32, height: 32,
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.06)', color: 'white' },
                  }}
                >
                  <IconifyIcon icon="mdi:close" sx={{ fontSize: '1rem' }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Paper>
      </Collapse>

      {/* ── Error ── */}
      {error && (
        <Alert
          severity="error"
          sx={{ borderRadius: 3, bgcolor: 'rgba(211,47,47,0.1)', color: '#ff8a80', '& .MuiAlert-icon': { color: '#ff8a80' } }}
          icon={<IconifyIcon icon="mdi:alert-circle" />}
        >
          {error}
        </Alert>
      )}

      {/* ── Loading ── */}
      {loading && (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 4, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <CircularProgress size={48} sx={{ color: '#ff0844' }} />
          <Typography variant="body1" sx={{ mt: 3, color: 'text.secondary', fontWeight: 500 }}>
            Loading alerts…
          </Typography>
        </Paper>
      )}

      {/* ── Empty ── */}
      {!loading && !error && filtered.length === 0 && (
        <Fade in>
          <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 4, bgcolor: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <IconifyIcon icon="mdi:shield-check-outline" sx={{ fontSize: '3rem', color: '#4ade80', mb: 2, display: 'block', mx: 'auto' }} />
            <Typography variant="body1" sx={{ color: 'text.secondary', mb: 1, fontWeight: 500 }}>
              No {tab === 'all' ? '' : tab.replace('_', ' ')} alerts
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              {tab === 'open' ? 'All clear — no open alerts at this time.' : 'Nothing to show for this filter.'}
            </Typography>
          </Paper>
        </Fade>
      )}

      {/* ── Table ── */}
      {!loading && !error && filtered.length > 0 && (
        <Fade in>
          <Paper sx={{
            borderRadius: 4, overflow: 'hidden',
            background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
          }}>
            <Table size="medium">
              <TableHead>
                <TableRow sx={{ bgcolor: 'rgba(255,255,255,0.03)' }}>
                  <TableCell padding="checkbox" sx={{ pl: 2 }}>
                    {selectableIds.length > 0 && (
                      <Checkbox
                        id="select-all-alerts"
                        size="small"
                        checked={allSelected}
                        indeterminate={someSelected}
                        onChange={toggleSelectAll}
                        disabled={bulkInProgress}
                        sx={{
                          color: 'rgba(255,255,255,0.2)',
                          '&.Mui-checked, &.MuiCheckbox-indeterminate': { color: '#818cf8' },
                        }}
                      />
                    )}
                  </TableCell>
                  {['Time Generated', 'Alert Type', 'Severity', 'Status', 'Related User', 'Actions'].map((h) => (
                    <TableCell key={h} sx={{
                      fontWeight: 700, color: 'text.secondary', py: 2,
                      fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((item) => {
                  const sev        = SEVERITY_STYLE[item.severity] ?? SEVERITY_STYLE.medium;
                  const statusInfo = STATUS_STYLE[item.status]     ?? STATUS_STYLE.open;
                  const isOpen     = item.status === 'open';
                  const isSelected = selected.has(item.id);
                  const rowAction  = actionLoading[item.id];

                  return (
                    <TableRow
                      key={item.id}
                      selected={isSelected}
                      sx={{
                        transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
                        opacity: rowAction ? 0.65 : 1,
                        backgroundColor: isSelected
                          ? 'rgba(99,102,241,0.07)'
                          : (isOpen && item.severity === 'high' ? 'rgba(239,68,68,0.03)' : 'transparent'),
                        '&:hover': { bgcolor: isSelected ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.04)' },
                        '&:last-child td, &:last-child th': { border: 0 },
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        outline: isSelected ? '1px solid rgba(99,102,241,0.2)' : 'none',
                      }}
                    >
                      {/* Checkbox */}
                      <TableCell padding="checkbox" sx={{ pl: 2 }}>
                        <Checkbox
                          id={`select-alert-${item.id}`}
                          size="small"
                          checked={isSelected}
                          onChange={() => toggleOne(item.id)}
                          disabled={bulkInProgress || !!rowAction}
                          sx={{
                            color: 'rgba(255,255,255,0.15)',
                            '&.Mui-checked': { color: '#818cf8' },
                            transition: 'all 0.15s',
                          }}
                        />
                      </TableCell>

                      {/* Time */}
                      <TableCell sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                        {new Date(item.created_at).toLocaleString()}
                      </TableCell>

                      {/* Alert Type */}
                      <TableCell sx={{ fontWeight: 600, color: '#e2e8f0', maxWidth: 220 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <IconifyIcon icon="mdi:alert-decagram-outline" sx={{ color: sev.color, fontSize: '1rem', flexShrink: 0 }} />
                          <span style={{ fontSize: '0.85rem' }}>{item.alert_type}</span>
                        </Box>
                      </TableCell>

                      {/* Severity */}
                      <TableCell>
                        <Chip
                          label={item.severity.toUpperCase()}
                          size="small"
                          sx={{
                            bgcolor: sev.bg, color: sev.color, fontWeight: 800,
                            fontSize: '0.7rem', border: `1px solid ${sev.border}`,
                            borderRadius: 1.5, boxShadow: sev.glow,
                          }}
                        />
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                          <IconifyIcon icon={statusInfo.icon} sx={{ fontSize: '1rem', color: statusInfo.color }} />
                          <Typography variant="body2" sx={{ color: statusInfo.color, fontWeight: 600, fontSize: '0.8rem' }}>
                            {statusInfo.label}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* User */}
                      <TableCell sx={{ color: 'text.secondary', fontSize: '0.83rem' }}>
                        {item.user ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{
                              width: 26, height: 26, borderRadius: '50%',
                              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.65rem', fontWeight: 700, color: 'white', flexShrink: 0,
                            }}>
                              {item.user.name.charAt(0).toUpperCase()}
                            </Box>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.8rem', lineHeight: 1.2 }}>
                                {item.user.name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem' }}>
                                {item.user.role}
                              </Typography>
                            </Box>
                          </Box>
                        ) : '—'}
                      </TableCell>

                      {/* Per-row Actions */}
                      <TableCell>
                        {isOpen ? (
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title="Resolve" arrow>
                              <span>
                                <IconButton
                                  id={`resolve-alert-${item.id}`}
                                  size="small"
                                  disabled={!!rowAction || bulkInProgress}
                                  onClick={() => void handleResolve(item.id)}
                                  sx={{
                                    border: '1px solid rgba(74,222,128,0.25)', borderRadius: 1.5,
                                    color: '#4ade80', width: 32, height: 32, transition: 'all 0.18s',
                                    '&:hover': { bgcolor: 'rgba(74,222,128,0.12)', borderColor: 'rgba(74,222,128,0.5)', transform: 'scale(1.08)' },
                                    '&:disabled': { opacity: 0.35 },
                                  }}
                                >
                                  {rowAction === 'resolve'
                                    ? <CircularProgress size={14} sx={{ color: '#4ade80' }} />
                                    : <IconifyIcon icon="mdi:check-circle-outline" sx={{ fontSize: '1rem' }} />}
                                </IconButton>
                              </span>
                            </Tooltip>

                            <Tooltip title="Mark as False Positive" arrow>
                              <span>
                                <IconButton
                                  id={`false-positive-alert-${item.id}`}
                                  size="small"
                                  disabled={!!rowAction || bulkInProgress}
                                  onClick={() => void handleFalsePositive(item.id)}
                                  sx={{
                                    border: '1px solid rgba(251,146,60,0.25)', borderRadius: 1.5,
                                    color: '#fb923c', width: 32, height: 32, transition: 'all 0.18s',
                                    '&:hover': { bgcolor: 'rgba(251,146,60,0.12)', borderColor: 'rgba(251,146,60,0.5)', transform: 'scale(1.08)' },
                                    '&:disabled': { opacity: 0.35 },
                                  }}
                                >
                                  {rowAction === 'false_positive'
                                    ? <CircularProgress size={14} sx={{ color: '#fb923c' }} />
                                    : <IconifyIcon icon="mdi:flag-outline" sx={{ fontSize: '1rem' }} />}
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Box>
                        ) : (
                          <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>—</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={filtered.length}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[20, 50, 100]}
              sx={{
                color: 'text.secondary',
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            />
          </Paper>
        </Fade>
      )}

      {/* ── Snackbar ── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{
            borderRadius: 3, fontWeight: 600, boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            bgcolor: snackbar.severity === 'success' ? 'rgba(34,197,94,0.9)' : 'rgba(239,68,68,0.9)',
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
};

export default AlertsPage;