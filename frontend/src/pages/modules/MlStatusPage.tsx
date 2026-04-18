import { useEffect, useState, useMemo } from 'react';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Chip from '@mui/material/Chip';
import IconifyIcon from 'components/base/IconifyIcon';
import { apiClient, MlStatus } from 'lib/api';
import { useTheme } from '@mui/material/styles';
import * as echarts from 'echarts/core';
import { PieChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { TooltipComponent, LegendComponent } from 'echarts/components';
import ReactEchart from 'components/base/ReactEchart';

echarts.use([TooltipComponent, LegendComponent, PieChart, CanvasRenderer]);

interface ModelStatus {
  name: string;
  icon: string;
  isLoaded: boolean;
  artifactFound: boolean;
  health: number; // 0-100
}

interface MlRuntimeStatus extends Record<string, unknown> {
  isolation_forest?: boolean;
  autoencoder?: boolean;
  if_artifact_found?: boolean;
  ae_artifact_found?: boolean;
  mode?: string;
  is_loaded?: boolean;
  grant_threshold?: number;
  deny_threshold?: number;
  if_weight?: number;
  ae_weight?: number;
}

const MlStatusPage = () => {
  const theme = useTheme();
  const [status, setStatus] = useState<MlStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modelStatuses, setModelStatuses] = useState<ModelStatus[]>([]);

  const asRuntimeStatus = (value: MlStatus | null): MlRuntimeStatus =>
    ((value ?? {}) as MlRuntimeStatus);

  const computeModelHealth = (isLoaded: boolean, artifactFound: boolean) => {
    if (isLoaded && artifactFound) return 100;
    if (isLoaded || artifactFound) return 60;
    return 0;
  };

  const formatWeightPct = (weight: unknown) => {
    const numeric = typeof weight === 'number' ? weight : Number(weight);
    return Number.isFinite(numeric) ? `${(numeric * 100).toFixed(0)}%` : '—';
  };

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiClient.getMlStatus();
        setStatus(data);

        const runtime = asRuntimeStatus(data);

        // Calculate model statuses
        const models: ModelStatus[] = [
          {
            name: 'Isolation Forest',
            icon: 'mdi:pine-tree',
            isLoaded: runtime.isolation_forest === true,
            artifactFound: runtime.if_artifact_found === true,
            health: computeModelHealth(runtime.isolation_forest === true, runtime.if_artifact_found === true),
          },
          {
            name: 'Autoencoder',
            icon: 'mdi:brain',
            isLoaded: runtime.autoencoder === true,
            artifactFound: runtime.ae_artifact_found === true,
            health: computeModelHealth(runtime.autoencoder === true, runtime.ae_artifact_found === true),
          },
        ];

        setModelStatuses(models);
        setError('');
      } catch {
        setError('Failed to load ML status from backend API.');
      } finally {
        setLoading(false);
      }
    };

    void load();
    const interval = setInterval(() => void load(), 5000);
    return () => clearInterval(interval);
  }, []);

  const overallHealth = useMemo(() => {
    if (modelStatuses.length === 0) return 0;
    return Math.round(modelStatuses.reduce((sum, m) => sum + m.health, 0) / modelStatuses.length);
  }, [modelStatuses]);

  const healthChartOptions = useMemo(
    () => ({
      tooltip: { trigger: 'item' },
      legend: { orient: 'vertical' as const, left: 'left', textStyle: { color: '#fff', fontSize: 17, fontWeight: 'bold' } },
      series: [
        {
          name: 'Model Health',
          type: 'pie',
          radius: '50%',
          data: [
            { value: overallHealth, name: 'Healthy', itemStyle: { color: '#4caf50' } },
            { value: 100 - overallHealth, name: 'Issues', itemStyle: { color: '#ff9800' } },
          ],
          label: { color: '#fff', fontSize: 19, fontWeight: 'bold' },
        },
      ],
    }),
    [overallHealth]
  );

  const getHealthColor = (health: number) => {
    if (health >= 80) return theme.palette.success.main;
    if (health >= 60) return '#ff9800';
    return '#d32f2f';
  };

  const getStatusLabel = (health: number) => {
    if (health >= 80) return 'Healthy';
    if (health >= 60) return 'Warning';
    return 'Critical';
  };

  return (
    <Grid container spacing={{ xs: 2.5, sm: 3, lg: 3.75 }}>
      {loading && (
        <Grid item xs={12}>
          <Stack alignItems="center" py={4}>
            <CircularProgress sx={{ color: '#9c27b0' }} />
          </Stack>
        </Grid>
      )}

      {error && (
        <Grid item xs={12}>
          <Alert severity="error" sx={{ borderRadius: 3, bgcolor: 'rgba(211, 47, 47, 0.1)', color: '#ff8a80' }}>
            {error}
          </Alert>
        </Grid>
      )}

      {!loading && !error && status && (
        <>
          {/* Header */}
          <Grid item xs={12} sx={{ mb: 1 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #b5179e 0%, #7209b7 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    boxShadow: '0 8px 32px rgba(181, 23, 158, 0.3)',
                  }}
                >
                  <IconifyIcon icon="mdi:brain" sx={{ fontSize: '2rem' }} />
                </Box>
                <Box>
                  <Typography variant="h3" fontWeight={800} sx={{ background: 'linear-gradient(to right, #fff, #d8b4fe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', mb: 0.5 }}>
                    ML Models Live Status
                  </Typography>
                  <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                    Real-time model health and anomaly detection tracking.
                  </Typography>
                </Box>
              </Box>
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1.5, 
                  px: 2.5, 
                  py: 1, 
                  background: 'rgba(16, 185, 129, 0.1)', 
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: 3,
                  boxShadow: '0 0 16px rgba(16, 185, 129, 0.1)',
                }}
              >
                <IconifyIcon icon="mdi:heart-pulse" sx={{ fontSize: '1.2rem', color: '#10b981' }} />
                <Typography variant="body2" sx={{ color: '#34d399', fontWeight: 800, letterSpacing: 0.5 }}>
                  LIVE • {new Date().toLocaleTimeString()}
                </Typography>
              </Box>
            </Stack>
          </Grid>

          {/* Overall Health Chart */}
          <Grid item xs={12} md={6}>
            <Paper 
              sx={{ 
                height: 320, 
                borderRadius: 4, 
                background: 'rgba(255, 255, 255, 0.02)', 
                backdropFilter: 'blur(10px)', 
                border: '1px solid rgba(255, 255, 255, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 4px 24px rgba(0,0,0,0.2)'
              }}
            >
              <Typography variant="h6" sx={{ p: 3, pb: 0, color: 'text.primary', fontWeight: 800 }}>
                Overall ML Health
              </Typography>
              <Box sx={{ flex: 1, minHeight: 0 }}>
                <ReactEchart echarts={echarts} option={healthChartOptions} style={{ height: '100%' }} />
              </Box>
            </Paper>
          </Grid>

          {/* Health Summary Card */}
          <Grid item xs={12} md={6}>
            <Paper 
              sx={{ 
                p: { xs: 3, md: 4 }, 
                height: 320,
                borderRadius: 4, 
                background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                boxShadow: '0 8px 32px rgba(59, 130, 246, 0.1)',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Stack spacing={4} sx={{ width: '100%' }}>
                <Box>
                  <Typography variant="body2" sx={{ color: '#7dd3fc', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                    System Health Score
                  </Typography>
                  <Typography variant="h1" sx={{ color: '#fff', fontWeight: 900, mt: 1, fontSize: '4rem', textShadow: '0 0 20px rgba(56, 189, 248, 0.4)' }}>
                    {overallHealth}%
                  </Typography>
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="body2" sx={{ color: '#e0f2fe', fontWeight: 600 }}>
                      Current Status:
                    </Typography>
                    <Chip
                      label={getStatusLabel(overallHealth).toUpperCase()}
                      size="small"
                      sx={{
                        bgcolor: getHealthColor(overallHealth),
                        color: '#000',
                        fontWeight: 900,
                        boxShadow: `0 0 12px ${getHealthColor(overallHealth)}`,
                      }}
                    />
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={overallHealth}
                    sx={{
                      height: 10,
                      borderRadius: 5,
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: getHealthColor(overallHealth),
                        borderRadius: 5,
                      },
                    }}
                  />
                </Box>
              </Stack>
            </Paper>
          </Grid>

          {/* System Settings Mini Cards */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 3, borderRadius: 4, background: 'rgba(255, 255, 255, 0.02)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.05)', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)', bgcolor: 'rgba(25, 118, 210, 0.05)', borderColor: 'rgba(25, 118, 210, 0.3)' } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', display: 'flex' }}>
                  <IconifyIcon icon="mdi:cog-outline" sx={{ fontSize: '1.25rem', color: '#fff' }} />
                </Box>
                <Stack spacing={0}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}>Mode</Typography>
                  <Typography variant="body1" sx={{ color: '#10b981', fontWeight: 800, textTransform: 'capitalize' }}>
                    {String(asRuntimeStatus(status).mode || 'Unknown')}
                  </Typography>
                </Stack>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 3, borderRadius: 4, background: 'rgba(255, 255, 255, 0.02)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.05)', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)', bgcolor: 'rgba(76, 175, 80, 0.05)', borderColor: 'rgba(76, 175, 80, 0.3)' } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', display: 'flex' }}>
                  <IconifyIcon icon="mdi:check-circle-outline" sx={{ fontSize: '1.25rem', color: '#fff' }} />
                </Box>
                <Stack spacing={0}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}>System Loaded</Typography>
                  <Typography variant="body1" sx={{ color: '#fff', fontWeight: 800 }}>
                    {asRuntimeStatus(status).is_loaded === true ? 'Active' : 'Offline'}
                  </Typography>
                </Stack>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 3, borderRadius: 4, background: 'rgba(255, 255, 255, 0.02)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.05)', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)', bgcolor: 'rgba(255, 152, 0, 0.05)', borderColor: 'rgba(255, 152, 0, 0.3)' } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, background: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)', display: 'flex' }}>
                  <IconifyIcon icon="mdi:shield-outline" sx={{ fontSize: '1.25rem', color: '#fff' }} />
                </Box>
                <Stack spacing={0}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}>Grant Threshold</Typography>
                  <Typography variant="body1" sx={{ color: '#fbbf24', fontWeight: 800 }}>
                    {asRuntimeStatus(status).grant_threshold !== undefined ? Number(asRuntimeStatus(status).grant_threshold).toFixed(2) : '—'}
                  </Typography>
                </Stack>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 3, borderRadius: 4, background: 'rgba(255, 255, 255, 0.02)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.05)', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)', bgcolor: 'rgba(244, 67, 54, 0.05)', borderColor: 'rgba(244, 67, 54, 0.3)' } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, background: 'linear-gradient(135deg, #ff0844 0%, #ffb199 100%)', display: 'flex' }}>
                  <IconifyIcon icon="mdi:alert-octagon-outline" sx={{ fontSize: '1.25rem', color: '#fff' }} />
                </Box>
                <Stack spacing={0}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}>Deny Threshold</Typography>
                  <Typography variant="body1" sx={{ color: '#f87171', fontWeight: 800 }}>
                    {asRuntimeStatus(status).deny_threshold !== undefined ? Number(asRuntimeStatus(status).deny_threshold).toFixed(2) : '—'}
                  </Typography>
                </Stack>
              </Box>
            </Paper>
          </Grid>

          {/* Detailed Model Health Cards */}
          <Grid item xs={12} sx={{ mt: 4, mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h5" fontWeight={800} sx={{ color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(167, 139, 250, 0.1)' }}>
                  <IconifyIcon icon="mdi:server-network-outline" sx={{ color: '#a78bfa' }} />
                </Box>
                Algorithm Operations
              </Typography>
            </Box>
          </Grid>

          {modelStatuses.map((model) => {
            const healthColor = getHealthColor(model.health);
            return (
              <Grid item xs={12} key={model.name}>
                <Paper
                  sx={{
                    p: { xs: 3, md: 4 },
                    borderRadius: 4,
                    border: '1px solid rgba(255,255,255,0.05)',
                    background: 'rgba(255,255,255,0.02)',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    alignItems: { xs: 'flex-start', md: 'center' },
                    justifyContent: 'space-between',
                    gap: 4,
                    '&:hover': {
                      background: 'rgba(255,255,255,0.04)',
                      transform: 'translateY(-2px)',
                      borderColor: `${healthColor}40`,
                      boxShadow: `0 8px 32px ${healthColor}10`,
                    },
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      height: '100%',
                      width: '4px',
                      background: healthColor,
                      boxShadow: `0 0 12px ${healthColor}`
                    }
                  }}
                >
                  {/* Model Identity (Left) */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, minWidth: { md: 280 } }}>
                    <Box sx={{ 
                      p: 2, 
                      borderRadius: '16px', 
                      background: `linear-gradient(135deg, ${healthColor}20 0%, ${healthColor}05 100%)`,
                      border: `1px solid ${healthColor}30`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <IconifyIcon icon={model.icon} sx={{ fontSize: '2.5rem', color: healthColor }} />
                    </Box>
                    <Stack spacing={0.5}>
                      <Typography variant="h4" fontWeight={800} sx={{ color: '#fff', letterSpacing: 0.5 }}>
                        {model.name}
                      </Typography>
                      <Chip
                        label={getStatusLabel(model.health).toUpperCase()}
                        size="small"
                        sx={{
                          bgcolor: `${healthColor}15`,
                          color: healthColor,
                          fontWeight: 800,
                          border: `1px solid ${healthColor}40`,
                          height: 24,
                          alignSelf: 'flex-start'
                        }}
                      />
                    </Stack>
                  </Box>

                  {/* Operational Health (Middle) */}
                  <Box sx={{ flex: 1, width: '100%', px: { md: 4 }, py: { xs: 2, md: 0 }, borderLeft: { md: '1px solid rgba(255,255,255,0.05)' }, borderRight: { md: '1px solid rgba(255,255,255,0.05)' }, borderTop: { xs: '1px solid rgba(255,255,255,0.05)', md: 'none' }, borderBottom: { xs: '1px solid rgba(255,255,255,0.05)', md: 'none' } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                        Integration Weight: {formatWeightPct(model.name === 'Isolation Forest' ? asRuntimeStatus(status).if_weight : asRuntimeStatus(status).ae_weight)}
                      </Typography>
                      <Typography variant="h6" fontWeight={800} sx={{ color: healthColor, lineHeight: 1 }}>
                        {model.health}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(model.health, 100)}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: 'rgba(0,0,0,0.2)',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: healthColor,
                          borderRadius: 4,
                          boxShadow: `0 0 10px ${healthColor}`
                        },
                      }}
                    />
                  </Box>

                  {/* System Checks (Right) */}
                  <Stack spacing={2} sx={{ minWidth: 200, pl: { md: 2 }, width: { xs: '100%', md: 'auto' } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ display: 'flex', p: 1, borderRadius: '50%', background: model.isLoaded ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${model.isLoaded ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}` }}>
                        <IconifyIcon
                          icon={model.isLoaded ? 'mdi:check' : 'mdi:close'}
                          sx={{ fontSize: '1.2rem', color: model.isLoaded ? '#10b981' : '#ef4444' }}
                        />
                      </Box>
                      <Stack spacing={0}>
                        <Typography variant="body2" sx={{ color: '#e2e8f0', fontWeight: 600 }}>Memory Loaded</Typography>
                        <Typography variant="caption" sx={{ color: model.isLoaded ? '#34d399' : '#f87171', fontWeight: 700 }}>{model.isLoaded ? 'ACTIVE' : 'OFFLINE'}</Typography>
                      </Stack>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ display: 'flex', p: 1, borderRadius: '50%', background: model.artifactFound ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', border: `1px solid ${model.artifactFound ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}` }}>
                        <IconifyIcon
                          icon={model.artifactFound ? 'mdi:check' : 'mdi:alert-outline'}
                          sx={{ fontSize: '1.2rem', color: model.artifactFound ? '#10b981' : '#f59e0b' }}
                        />
                      </Box>
                      <Stack spacing={0}>
                        <Typography variant="body2" sx={{ color: '#e2e8f0', fontWeight: 600 }}>Artifact Status</Typography>
                        <Typography variant="caption" sx={{ color: model.artifactFound ? '#34d399' : '#fbbf24', fontWeight: 700 }}>{model.artifactFound ? 'HEALTHY' : 'MISSING'}</Typography>
                      </Stack>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>
            );
          })}
        </>
      )}
    </Grid>
  );
};

export default MlStatusPage;