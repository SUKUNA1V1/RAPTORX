import { useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import IconifyIcon from 'components/base/IconifyIcon';
import { apiClient, AccessDecision, AccessPointItem, UserItem } from 'lib/api';

type ScenarioType =
  | 'normal'
  | 'unusual_hours'
  | 'badge_cloning'
  | 'restricted_access'
  | 'high_frequency'
  | 'anomalous'
  | 'repeat_normal'
  | 'weekend_normal'
  | 'cross_dept'
  | 'sequential_restricted'
  | 'early_morning';

const scenarioConfig: Record<
  ScenarioType,
  {
    label: string;
    description: string;
    severity: 'success' | 'warning' | 'error' | 'info';
  }
> = {
  normal: {
    label: 'Normal Traffic',
    description: 'Expected work-hour entry patterns with low-risk behavior.',
    severity: 'success',
  },
  unusual_hours: {
    label: 'Unusual Hours',
    description: 'Requests generated late night and early morning.',
    severity: 'warning',
  },
  badge_cloning: {
    label: 'Badge Cloning',
    description: 'Same badge used in multiple points within short intervals.',
    severity: 'error',
  },
  restricted_access: {
    label: 'Restricted Access',
    description: 'Low-clearance users request high-security doors.',
    severity: 'error',
  },
  high_frequency: {
    label: 'High Frequency',
    description: 'Burst traffic to stress anomaly and rate behavior.',
    severity: 'warning',
  },
  anomalous: {
    label: 'Random Anomalous',
    description: 'Mixes multiple anomaly patterns in one simulation run.',
    severity: 'info',
  },
  repeat_normal: {
    label: 'Repeated Normal Access',
    description: 'Same user accessing same location multiple times (should be GRANTED every time).',
    severity: 'success',
  },
  weekend_normal: {
    label: 'Weekend Regular Employee',
    description: 'Regular employee accessing during weekend (may trigger false positive).',
    severity: 'warning',
  },
  cross_dept: {
    label: 'Cross-Department Manager',
    description: 'Manager accessing different department areas (legitimate but may be flagged).',
    severity: 'info',
  },
  sequential_restricted: {
    label: 'Sequential Restricted Access',
    description: 'User attempts multiple restricted areas in succession (should be DENIED).',
    severity: 'error',
  },
  early_morning: {
    label: 'Early Morning Access',
    description: 'Access at 6-7 AM (transitional hours - should be low risk for morning shift).',
    severity: 'warning',
  },
};

const anomalyScenarios: Array<Exclude<ScenarioType, 'normal' | 'anomalous'>> = [
  'unusual_hours',
  'badge_cloning',
  'restricted_access',
  'high_frequency',
  'repeat_normal',
  'weekend_normal',
  'cross_dept',
  'sequential_restricted',
  'early_morning',
];

type ExpectedResult = {
  decision: 'granted' | 'denied' | 'delayed';
  allowedDecisions: Array<'granted' | 'denied' | 'delayed'>;
  minRisk: number;
  maxRisk: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  successRate: number; // Expected percentage of passes (0-100)
};

type SimulationResult = AccessDecision & {
  expected: ExpectedResult;
  scenarioUsed: ScenarioType;
};

const getExpectedResults = (scenario: ScenarioType): ExpectedResult => {
  const expectations: Record<ScenarioType, ExpectedResult> = {
    normal: { decision: 'granted', allowedDecisions: ['granted'], minRisk: 0.0, maxRisk: 0.35, riskLevel: 'low', successRate: 95 },
    unusual_hours: { decision: 'delayed', allowedDecisions: ['delayed', 'denied'], minRisk: 0.30, maxRisk: 1.0, riskLevel: 'high', successRate: 85 },
    badge_cloning: { decision: 'denied', allowedDecisions: ['denied'], minRisk: 0.60, maxRisk: 1.0, riskLevel: 'critical', successRate: 90 },
    restricted_access: { decision: 'denied', allowedDecisions: ['denied'], minRisk: 0.85, maxRisk: 1.0, riskLevel: 'critical', successRate: 95 },
    high_frequency: { decision: 'delayed', allowedDecisions: ['delayed', 'denied'], minRisk: 0.35, maxRisk: 1.0, riskLevel: 'high', successRate: 80 },
    repeat_normal: { decision: 'granted', allowedDecisions: ['granted'], minRisk: 0.0, maxRisk: 0.35, riskLevel: 'low', successRate: 100 },
    weekend_normal: { decision: 'granted', allowedDecisions: ['granted', 'delayed'], minRisk: 0.0, maxRisk: 0.55, riskLevel: 'medium', successRate: 90 },
    cross_dept: { decision: 'granted', allowedDecisions: ['granted', 'delayed'], minRisk: 0.0, maxRisk: 0.50, riskLevel: 'medium', successRate: 95 },
    sequential_restricted: { decision: 'denied', allowedDecisions: ['denied'], minRisk: 0.85, maxRisk: 1.0, riskLevel: 'critical', successRate: 95 },
    early_morning: { decision: 'granted', allowedDecisions: ['granted', 'delayed'], minRisk: 0.0, maxRisk: 0.45, riskLevel: 'low', successRate: 90 },
    anomalous: { decision: 'delayed', allowedDecisions: ['delayed', 'denied'], minRisk: 0.35, maxRisk: 1.0, riskLevel: 'high', successRate: 75 },
  };
  return expectations[scenario];
};

const getRiskLevel = (score: number): 'low' | 'medium' | 'high' | 'critical' => {
  if (score < 0.3) return 'low';
  if (score < 0.5) return 'medium';
  if (score < 0.7) return 'high';
  return 'critical';
};

const randomItem = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

const pickNormalTarget = (users: UserItem[], accessPoints: AccessPointItem[]) => {
  const activeUsers = users.filter((u) => u.is_active);
  if (!activeUsers.length || !accessPoints.length) {
    return null;
  }

  // For normal traffic, ensure user can actually access the point
  let user = randomItem(activeUsers);
  let userClearance = user.clearance_level ?? 1;
  
  // Filter to points the user has clearance for (no buffer for normal traffic)
  let accessible = accessPoints.filter(
    (ap) => ap.status === 'active' && !ap.is_restricted && (ap.required_clearance ?? 1) <= userClearance
  );

  // If no accessible points, pick a less restricted user
  if (!accessible.length) {
    const highClearanceUsers = activeUsers.filter((u) => (u.clearance_level ?? 1) >= 2);
    if (highClearanceUsers.length) {
      user = randomItem(highClearanceUsers);
      userClearance = user.clearance_level ?? 1;
      accessible = accessPoints.filter(
        (ap) => ap.status === 'active' && !ap.is_restricted && (ap.required_clearance ?? 1) <= userClearance
      );
    }
  }

  if (!accessible.length) {
    return null;
  }

  return {
    user,
    accessPoint: randomItem(accessible),
  };
};

const pickRestrictedTarget = (users: UserItem[], accessPoints: AccessPointItem[]) => {
  const activeUsers = users.filter((u) => u.is_active && (u.clearance_level ?? 1) <= 2);
  const restrictedPoints = accessPoints.filter(
    (ap) => ap.status === 'active' && ((ap.is_restricted ?? false) || (ap.required_clearance ?? 1) >= 3)
  );

  if (!activeUsers.length || !restrictedPoints.length) {
    return null;
  }

  return {
    user: randomItem(activeUsers),
    accessPoint: randomItem(restrictedPoints),
  };
};

const pickAnomalousTarget = (users: UserItem[], accessPoints: AccessPointItem[]) => {
  const activeUsers = users.filter(
    (u) => u.is_active && (u.clearance_level ?? 1) <= 2 && u.role !== 'admin' && u.role !== 'security'
  );
  const activePoints = accessPoints.filter((ap) => ap.status === 'active');
  const suspiciousPoints = activePoints.filter(
    (ap) => (ap.is_restricted ?? false) || (ap.required_clearance ?? 1) >= 3
  );

  if (!activeUsers.length || !activePoints.length) {
    return null;
  }

  return {
    user: randomItem(activeUsers),
    accessPoint: randomItem(suspiciousPoints.length ? suspiciousPoints : activePoints),
  };
};

const pickUnusualHourTimestamp = (baseDate?: Date) => {
  const unusualHours = [2, 3, 4, 23];
  const now = baseDate ? new Date(baseDate) : new Date();
  now.setHours(randomItem(unusualHours), Math.floor(Math.random() * 60), Math.floor(Math.random() * 60), 0);
  return now.toISOString();
};

const pickEarlyMorningTimestamp = (baseDate?: Date) => {
  const earlyHours = [6, 7];
  const now = baseDate ? new Date(baseDate) : new Date();
  now.setHours(randomItem(earlyHours), Math.floor(Math.random() * 60), Math.floor(Math.random() * 60), 0);
  return now.toISOString();
};

const pickWeekendTimestamp = (baseDate?: Date) => {
  const now = baseDate ? new Date(baseDate) : new Date();
  // Shift to next Saturday or Sunday
  const dayOfWeek = now.getDay();
  const addDays = dayOfWeek === 0 ? 0 : dayOfWeek === 6 ? 0 : (6 - dayOfWeek);
  now.setDate(now.getDate() + addDays);
  now.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), Math.floor(Math.random() * 60), 0);
  return now.toISOString();
};

const pickHighClearanceUser = (users: UserItem[]) => {
  return users.find((u) => u.is_active && (u.clearance_level ?? 1) >= 3) || randomItem(users.filter((u) => u.is_active));
};

const SimulatorPage = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [accessPoints, setAccessPoints] = useState<AccessPointItem[]>([]);
  const [scenario, setScenario] = useState<ScenarioType>('normal');
  const [iterations, setIterations] = useState(10);
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<SimulationResult[]>([]);

  const summary = useMemo(() => {
    const total = results.length;
    const granted = results.filter((r) => r.decision === 'granted').length;
    const denied = results.filter((r) => r.decision === 'denied').length;
    const delayed = results.filter((r) => r.decision === 'delayed').length;
    const avgRisk = total
      ? (results.reduce((acc, item) => acc + Number(item.risk_score || 0), 0) / total).toFixed(3)
      : '0.000';

    return { total, granted, denied, delayed, avgRisk };
  }, [results]);

  const ensureSeedDataLoaded = async (): Promise<{ usersData: UserItem[]; accessPointsData: AccessPointItem[] }> => {
    if (users.length && accessPoints.length) {
      return { usersData: users, accessPointsData: accessPoints };
    }

    setBootstrapping(true);
    setError('');
    try {
      const [usersData, accessPointsData] = await Promise.all([apiClient.getUsers(), apiClient.getAccessPoints()]);
      const normalizedUsers = Array.isArray(usersData) ? usersData : [];
      const normalizedAccessPoints = Array.isArray(accessPointsData) ? accessPointsData : [];
      setUsers(normalizedUsers);
      setAccessPoints(normalizedAccessPoints);
      return { usersData: normalizedUsers, accessPointsData: normalizedAccessPoints };
    } catch (err) {
      const detail = err instanceof Error ? err.message : '';
      setError(detail ? `Failed to load simulator data: ${detail}` : 'Failed to load simulator data.');
      return { usersData: [], accessPointsData: [] };
    } finally {
      setBootstrapping(false);
    }
  };

  const runScenario = async () => {
    const { usersData, accessPointsData } = await ensureSeedDataLoaded();

    if (!usersData.length || !accessPointsData.length) {
      setError('Simulator cannot run because users or access points are missing.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const generatedResults: SimulationResult[] = [];
      const safeIterations = Math.max(1, Math.min(100, iterations));
      // Use a future anchor to avoid contamination from existing recent logs.
      const runBaseMs = Date.now() + 7 * 24 * 60 * 60 * 1000;

      for (let i = 0; i < safeIterations; i += 1) {
        const effectiveScenario = scenario === 'anomalous' ? randomItem(anomalyScenarios) : scenario;
        const expectedForEvent = getExpectedResults(effectiveScenario);
        let target: { user: UserItem; accessPoint: AccessPointItem } | null = null;
        const eventBase = new Date(runBaseMs + i * 90 * 1000);
        let timestamp: string | undefined = eventBase.toISOString();

        if (effectiveScenario === 'restricted_access') {
          target = pickRestrictedTarget(usersData, accessPointsData);
        } else if (
          effectiveScenario === 'unusual_hours' ||
          effectiveScenario === 'high_frequency' ||
          effectiveScenario === 'badge_cloning'
        ) {
          target = pickAnomalousTarget(usersData, accessPointsData);
        } else if (effectiveScenario === 'cross_dept') {
          const manager = pickHighClearanceUser(usersData);
          // Cross-dept: manager accessing different departments (not restricted areas)
          const deptPoints = accessPointsData.filter((ap) => ap.status === 'active' && !ap.is_restricted && (ap.required_clearance ?? 1) <= (manager?.clearance_level ?? 1));
          target = manager && deptPoints.length ? { user: manager, accessPoint: randomItem(deptPoints) } : null;
        } else {
          target = pickNormalTarget(usersData, accessPointsData);
        }

        if (!target) {
          throw new Error('No eligible users/access points found for selected scenario.');
        }

        if (effectiveScenario === 'unusual_hours') {
          timestamp = pickUnusualHourTimestamp(eventBase);
        } else if (effectiveScenario === 'weekend_normal') {
          timestamp = pickWeekendTimestamp(eventBase);
        } else if (effectiveScenario === 'early_morning') {
          timestamp = pickEarlyMorningTimestamp(eventBase);
        }

        if (effectiveScenario === 'badge_cloning') {
          const altPoints = accessPointsData.filter((ap) => ap.id !== target.accessPoint.id && ap.status === 'active');
          const firstResult = await apiClient.requestAccess({
            badge_id: target.user.badge_id,
            access_point_id: target.accessPoint.id,
            method: 'simulator',
            timestamp: eventBase.toISOString(),
          });
          generatedResults.push({
            ...firstResult,
            expected: expectedForEvent,
            scenarioUsed: effectiveScenario,
          });

          if (altPoints.length) {
            const secondResult = await apiClient.requestAccess({
              badge_id: target.user.badge_id,
              access_point_id: randomItem(altPoints).id,
              method: 'simulator',
              timestamp: new Date(eventBase.getTime() + 30 * 1000).toISOString(),
            });
            generatedResults.push({
              ...secondResult,
              expected: expectedForEvent,
              scenarioUsed: effectiveScenario,
            });
          }
          continue;
        }

        if (effectiveScenario === 'high_frequency') {
          for (let burst = 0; burst < 12; burst += 1) {
            const burstResult = await apiClient.requestAccess({
              badge_id: target.user.badge_id,
              access_point_id: target.accessPoint.id,
              method: 'simulator',
              timestamp: new Date(eventBase.getTime() + burst * 2000).toISOString(),
            });
            generatedResults.push({
              ...burstResult,
              expected: expectedForEvent,
              scenarioUsed: effectiveScenario,
            });
          }
          continue;
        }

        if (effectiveScenario === 'repeat_normal') {
          // Same user, same location, 5 times over 2 hours
          for (let repeat = 0; repeat < 5; repeat += 1) {
            const repeatResult = await apiClient.requestAccess({
              badge_id: target.user.badge_id,
              access_point_id: target.accessPoint.id,
              method: 'simulator',
              timestamp: new Date(eventBase.getTime() + repeat * 24 * 60 * 1000).toISOString(), // Every 24 min
            });
            generatedResults.push({
              ...repeatResult,
              expected: expectedForEvent,
              scenarioUsed: effectiveScenario,
            });
          }
          continue;
        }

        if (effectiveScenario === 'sequential_restricted') {
          // Sequential restricted: LOW-clearance user attempting multiple restricted areas
          const lowClearanceTarget = pickRestrictedTarget(usersData, accessPointsData);
          if (!lowClearanceTarget) {
            throw new Error('Cannot find low-clearance user for sequential restricted scenario');
          }
          const restrictedPoints = accessPointsData.filter(
            (ap) => ap.status === 'active' && ((ap.is_restricted ?? false) || (ap.required_clearance ?? 1) >= 3)
          );
          for (let seq = 0; seq < Math.min(3, restrictedPoints.length); seq += 1) {
            const seqResult = await apiClient.requestAccess({
              badge_id: lowClearanceTarget.user.badge_id,
              access_point_id: restrictedPoints[seq].id,
              method: 'simulator',
              timestamp: new Date(eventBase.getTime() + seq * 5 * 60 * 1000).toISOString(), // 5 min apart
            });
            generatedResults.push({
              ...seqResult,
              expected: expectedForEvent,
              scenarioUsed: effectiveScenario,
            });
          }
          continue;
        }

        const result = await apiClient.requestAccess({
          badge_id: target.user.badge_id,
          access_point_id: target.accessPoint.id,
          method: 'simulator',
          timestamp,
        });
        generatedResults.push({
          ...result,
          expected: expectedForEvent,
          scenarioUsed: effectiveScenario,
        });
      }

      setResults((prev) => [...generatedResults, ...prev].slice(0, 200));
    } catch (err) {
      const detail = err instanceof Error ? err.message : '';
      setError(detail ? `Simulation failed: ${detail}` : 'Simulation failed.');
    } finally {
      setLoading(false);
    }
  };

  const getDecisionColor = (decision: string) => {
    if (decision === 'granted') return '#4caf50';
    if (decision === 'denied') return '#f44336';
    if (decision === 'delayed') return '#ff9800';
    return '#e2e8f0';
  };

  return (
    <Box sx={{ p: { xs: 2.5, md: 4 } }}>
      <Stack spacing={4} direction="column" alignItems="stretch" sx={{ width: 1 }}>
        {/* Page Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: 'rgba(255, 255, 255, 0.05)', display: 'flex' }}>
            <IconifyIcon icon="mdi:play-circle-outline" sx={{ fontSize: '2rem', color: '#fff' }} />
          </Box>
          <Box>
            <Typography variant="h3" fontWeight={800} sx={{ color: '#fff', letterSpacing: 0.5 }}>
              Traffic Simulator
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, mt: 0.5 }}>
              Structured workspace for generating access traffic and testing threat scenarios.
            </Typography>
          </Box>
        </Box>

        {/* Global Configuration & Status Grid */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Box sx={{ p: 3, borderRadius: 4, background: 'rgba(255, 255, 255, 0.02)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                Live Seed Data
              </Typography>
              <Stack spacing={2} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ color: '#e2e8f0', display: 'flex', gap: 1, alignItems: 'center' }}>
                    <IconifyIcon icon="mdi:account-group" sx={{ color: '#689f38' }} /> Active Users
                  </Typography>
                  <Typography variant="h6" fontWeight={800} color="#fff">{users.length}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ color: '#e2e8f0', display: 'flex', gap: 1, alignItems: 'center' }}>
                    <IconifyIcon icon="mdi:door-closed" sx={{ color: '#fbbf24' }} /> Access Points
                  </Typography>
                  <Typography variant="h6" fontWeight={800} color="#fff">{accessPoints.length}</Typography>
                </Box>
              </Stack>
              <Box sx={{ mt: 'auto', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Button 
                  variant="outlined" 
                  fullWidth 
                  onClick={() => void ensureSeedDataLoaded()} 
                  disabled={loading || bootstrapping}
                  startIcon={bootstrapping ? <CircularProgress size={16} /> : <IconifyIcon icon="mdi:refresh" />}
                  sx={{ borderColor: 'rgba(255,255,255,0.1)', color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.2)' } }}
                >
                  Refresh Data
                </Button>
              </Box>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 3, borderRadius: 4, background: 'linear-gradient(135deg, rgba(8, 145, 178, 0.08) 0%, rgba(8, 145, 178, 0.01) 100%)', backdropFilter: 'blur(10px)', border: '1px solid rgba(8, 145, 178, 0.2)', display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Typography variant="subtitle2" sx={{ color: '#0ea5e9', mb: 2, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
                <IconifyIcon icon="mdi:cogs" /> Engine Configurator
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={8}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Threat Scenario"
                    value={scenario}
                    onChange={(e) => setScenario(e.target.value as ScenarioType)}
                    disabled={loading || bootstrapping}
                    sx={{
                      '& .MuiOutlinedInput-root': { bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 2 },
                      '& .MuiInputLabel-root': { color: 'text.secondary' }
                    }}
                  >
                    {(Object.keys(scenarioConfig) as ScenarioType[]).map((key) => (
                      <MenuItem key={key} value={key}>
                        {scenarioConfig[key].label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    type="number"
                    fullWidth
                    size="small"
                    label="Iterations"
                    inputProps={{ min: 1, max: 100 }}
                    value={iterations}
                    onChange={(e) => setIterations(Number(e.target.value || 1))}
                    disabled={loading || bootstrapping}
                    sx={{
                      '& .MuiOutlinedInput-root': { bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 2 },
                      '& .MuiInputLabel-root': { color: 'text.secondary' }
                    }}
                  />
                </Grid>
              </Grid>

              <Alert 
                severity={scenarioConfig[scenario].severity} 
                icon={<IconifyIcon icon="mdi:information-outline" />}
                sx={{ mt: 2, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', '& .MuiAlert-message': { color: '#e2e8f0' } }}
              >
                {scenarioConfig[scenario].description}
              </Alert>

              <Box sx={{ mt: 'auto', pt: 3 }}>
                <Button 
                  variant="contained" 
                  fullWidth
                  onClick={() => void runScenario()} 
                  disabled={loading || bootstrapping}
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <IconifyIcon icon="mdi:play" />}
                  sx={{ 
                    py: 1.5, 
                    fontWeight: 800, 
                    fontSize: '1.05rem', 
                    letterSpacing: 1,
                    bgcolor: loading ? 'rgba(255,255,255,0.1)' : '#0ea5e9',
                    boxShadow: loading ? 'none' : '0 4px 14px 0 rgba(14, 165, 233, 0.39)',
                    '&:hover': { bgcolor: '#0284c7' }
                  }}
                >
                  {loading ? 'EXECUTING SIMULATION...' : 'EXECUTE RUN'}
                </Button>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} md={3}>
            <Box sx={{ p: 3, borderRadius: 4, background: 'rgba(255, 255, 255, 0.02)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 2, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
                <IconifyIcon icon="mdi:poll" /> Run Summary
              </Typography>

              <Box sx={{ mb: 2, pb: 2, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <Typography variant="caption" sx={{ color: '#0ea5e9', fontWeight: 700, mb: 1, display: 'block' }}>📊 ACTUAL RESULTS</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                   <Box>
                      <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>Total Events</Typography>
                      <Typography variant="h5" sx={{ color: '#fff', fontWeight: 800 }}>{summary.total}</Typography>
                   </Box>
                   <Box>
                      <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>Avg Risk</Typography>
                      <Typography variant="h5" sx={{ color: '#a78bfa', fontWeight: 800 }}>{summary.avgRisk}</Typography>
                   </Box>
                   <Box>
                      <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>Granted</Typography>
                      <Typography variant="h5" sx={{ color: '#4caf50', fontWeight: 800 }}>{summary.granted}</Typography>
                   </Box>
                   <Box>
                      <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>Denied</Typography>
                      <Typography variant="h5" sx={{ color: '#f44336', fontWeight: 800 }}>{summary.denied}</Typography>
                   </Box>
                </Box>
              </Box>

              {results.length > 0 && (
                <Box>
                  <Typography variant="caption" sx={{ color: '#f9a825', fontWeight: 700, mb: 1, display: 'block' }}>🎯 EXPECTED vs ACTUAL</Typography>
                  {(() => {
                    const expected = results[0]?.expected ?? getExpectedResults(scenario);
                    const actualDecision = summary.denied > 0 ? 'denied' : (summary.granted > summary.delayed ? 'granted' : 'delayed');
                    const successMatch = expected.allowedDecisions.includes(actualDecision);
                    const riskColor = { low: '#4caf50', medium: '#ff9800', high: '#f57c00', critical: '#f44336' }[getRiskLevel(parseFloat(summary.avgRisk))];
                    const avgRisk = parseFloat(summary.avgRisk);
                    const riskMatch = avgRisk >= expected.minRisk && avgRisk <= expected.maxRisk;
                    
                    return (
                      <Stack spacing={1}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>Decision</Typography>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Chip label={`expected: ${expected.decision}`} size="small" variant="outlined" sx={{ borderColor: 'rgba(255,255,255,0.2)', color: '#e2e8f0' }} />
                            <Chip label={`actual: ${actualDecision}`} size="small" sx={{ bgcolor: successMatch ? '#4caf5033' : '#f4433633', color: successMatch ? '#4caf50' : '#f44336' }} />
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>Risk Level</Typography>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Chip label={`expected: ${expected.riskLevel}`} size="small" variant="outlined" sx={{ borderColor: 'rgba(255,255,255,0.2)', color: '#e2e8f0' }} />
                            <Chip label={`actual: ${getRiskLevel(parseFloat(summary.avgRisk))}`} size="small" sx={{ bgcolor: `${riskColor}33`, color: riskColor }} />
                          </Box>
                        </Box>
                        <Box sx={{ mt: 1, p: 1, bgcolor: 'rgba(0,0,0,0.3)', borderRadius: 1, textAlign: 'center' }}>
                          {successMatch && riskMatch ? (
                            <Typography variant="caption" sx={{ color: '#4caf50', fontWeight: 700 }}>✅ RESULTS MATCH EXPECTATIONS</Typography>
                          ) : (
                            <Typography variant="caption" sx={{ color: '#f44336', fontWeight: 700 }}>⚠️ RESULTS DIFFER FROM EXPECTED</Typography>
                          )}
                        </Box>
                      </Stack>
                    );
                  })()}
                </Box>
              )}

              <Button 
                variant="outlined" 
                color="error"
                fullWidth 
                onClick={() => setResults([])} 
                disabled={loading || !results.length}
                startIcon={<IconifyIcon icon="mdi:delete-outline" />}
                sx={{ mt: 2, borderRadius: 2, borderWidth: 2, '&:hover': { borderWidth: 2 } }}
              >
                Clear Log
              </Button>
            </Box>
          </Grid>
        </Grid>

        {error && (
          <Alert severity="error" sx={{ borderRadius: 3, bgcolor: 'rgba(244, 67, 54, 0.1)', color: '#ff8a80', '& .MuiAlert-icon': { color: '#ff8a80' } }}>
            {error}
          </Alert>
        )}

        {/* Live Results Feed */}
        <Box sx={{ p: 4, borderRadius: 4, background: 'rgba(255, 255, 255, 0.02)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ p: 1, bgcolor: 'rgba(167, 139, 250, 0.1)', borderRadius: 2 }}>
                <IconifyIcon icon="mdi:table-eye" sx={{ fontSize: '1.5rem', color: '#a78bfa' }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#fff' }}>
                Live Stream Results
              </Typography>
            </Box>
            {loading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#0ea5e9' }}>
                <CircularProgress size={16} color="inherit" />
                <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>Receiving Data...</Typography>
              </Box>
            )}
          </Box>

          {results.length === 0 ? (
             <Box sx={{ py: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 3, border: '1px dashed rgba(255,255,255,0.1)' }}>
               <IconifyIcon icon="mdi:chart-timeline" sx={{ fontSize: '4rem', color: 'rgba(255,255,255,0.1)', mb: 2 }} />
               <Typography variant="h6" color="text.secondary" fontWeight={600}>Awaiting Simulation Run</Typography>
               <Typography variant="body2" color="text.disabled">Select a scenario above and execute to populate the live feed.</Typography>
             </Box>
          ) : (
            <TableContainer sx={{ 
              borderRadius: 2, 
              maxHeight: 500, 
              '&::-webkit-scrollbar': { width: 8, height: 8 },
              '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4 }
            }}>
              <Table size="medium" stickyHeader>
                <TableHead>
                  <TableRow>
                    {['Subject / User', 'Target Access Point', 'Expected', 'Actual Decision', 'Risk Score', 'Match?', 'Reasoning'].map((header) => (
                      <TableCell key={header} sx={{ bgcolor: 'rgba(0,0,0,0.6)', color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid rgba(255,255,255,0.05)', py: 2 }}>
                        {header}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {results.slice(0, 100).map((result, idx) => {
                    const expected = result.expected;
                    const riskScore = Number(result.risk_score || 0);
                    const isMatch = expected.allowedDecisions.includes(
                      result.decision as 'granted' | 'denied' | 'delayed'
                    );
                    const riskLevelMatch = riskScore >= expected.minRisk && riskScore <= expected.maxRisk;
                    const overallMatch = isMatch && riskLevelMatch;
                    return (
                      <TableRow 
                        key={`${result.log_id || idx}-${idx}`} 
                        sx={{ 
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' },
                          transition: 'background-color 0.2s',
                          '& td': { borderBottom: '1px solid rgba(255,255,255,0.02)', py: 2 },
                          bgcolor: overallMatch ? 'rgba(76, 175, 80, 0.05)' : 'rgba(244, 67, 54, 0.05)',
                        }}
                      >
                        <TableCell sx={{ color: '#fff', fontWeight: 600 }}>{result.user_name || 'Unknown'}</TableCell>
                        <TableCell sx={{ color: '#e2e8f0' }}>{result.access_point_name || 'Invalid'}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Chip label={expected.decision.toUpperCase()} size="small" variant="outlined" sx={{ borderColor: 'rgba(255,255,255,0.2)', color: '#e2e8f0' }} />
                            <Chip label={expected.riskLevel.toUpperCase()} size="small" variant="outlined" sx={{ borderColor: 'rgba(255,255,255,0.2)', color: '#a78bfa' }} />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={result.decision.toUpperCase()}
                            size="small"
                            sx={{
                              fontWeight: 800,
                              letterSpacing: 0.5,
                              bgcolor: `${getDecisionColor(result.decision)}22`,
                              color: getDecisionColor(result.decision),
                              border: `1px solid ${getDecisionColor(result.decision)}55`,
                              borderRadius: 1.5,
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ color: '#fbbf24', fontWeight: 700, fontFamily: 'monospace', fontSize: '1rem' }}>
                          {Number(result.risk_score || 0).toFixed(3)} ({getRiskLevel(Number(result.risk_score || 0))})
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: '1.5rem', textAlign: 'center' }}>
                            {overallMatch ? '✅' : '❌'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary', maxWidth: 250, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.85rem' }}>
                          {result.reasoning || 'Standard flow'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Stack>
    </Box>
  );
};

export default SimulatorPage;
