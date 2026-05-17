import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import IconifyIcon from 'components/base/IconifyIcon';
import { apiClient } from 'lib/api';

interface FeatureContribution {
  name: string;
  value: number;
  contribution: number;
  importance?: number;
  percentile?: number;
}

interface DecisionExplanation {
  access_log_id: number;
  user?: { badge_id: string; timestamp: string };
  explanation: {
    decision: string;
    confidence: number;
    reason: string;
    risk_level: string;
    scores: {
      isolation_forest: number;
      autoencoder: number;
      combined: number;
      threshold: number;
    };
    top_features: FeatureContribution[];
    feature_warnings: string[];
    contributing_factors: Record<string, string>;
  };
}

const getDecisionTheme = (decision: string) => {
  if (decision === 'granted') {
    return { 
      color: '#10b981', 
      gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.05) 100%)',
      glow: 'rgba(16, 185, 129, 0.3)',
      icon: 'mdi:shield-check', 
      label: 'Access Granted' 
    };
  }
  if (decision === 'denied') {
    return { 
      color: '#ef4444', 
      gradient: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.05) 100%)',
      glow: 'rgba(239, 68, 68, 0.3)',
      icon: 'mdi:shield-remove', 
      label: 'Access Denied' 
    };
  }
  return { 
    color: '#f59e0b', 
    gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(245, 158, 11, 0.05) 100%)',
    glow: 'rgba(245, 158, 11, 0.3)',
    icon: 'mdi:shield-alert', 
    label: 'Flagged for Review' 
  };
};

const getFeatureIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('hour') || n.includes('time')) return 'mdi:clock-outline';
  if (n.includes('location') || n.includes('zone')) return 'mdi:map-marker-radius';
  if (n.includes('frequency') || n.includes('count')) return 'mdi:trending-up';
  if (n.includes('role') || n.includes('level') || n.includes('clearance')) return 'mdi:account-shield';
  if (n.includes('restricted')) return 'mdi:lock-alert';
  if (n.includes('weekend')) return 'mdi:calendar-weekend';
  return 'mdi:chart-bubble';
};

const DecisionExplainer = () => {
  const navigate = useNavigate();
  const { logId: paramLogId } = useParams<{ logId: string }>();
  const logId = paramLogId ? parseInt(paramLogId, 10) : null;

  const [explanation, setExplanation] = useState<DecisionExplanation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!logId) return;
    const load = async () => {
      try {
        setLoading(true);
        const data = await apiClient.getDecisionExplanation(logId);
        setExplanation(data as unknown as DecisionExplanation);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load explanation');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [logId]);

  if (!logId) return null;
  if (loading) return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: 3 }}>
      <CircularProgress size={64} thickness={4} sx={{ color: '#6366f1' }} />
      <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 500 }}>Deconstructing AI Decision Logic...</Typography>
    </Box>
  );

  if (error) return (
    <Container maxWidth="sm" sx={{ py: 10 }}>
      <Alert severity="error" variant="filled" sx={{ borderRadius: 4 }}>{error}</Alert>
      <Button fullWidth onClick={() => navigate(-1)} sx={{ mt: 2 }} variant="outlined">Back to Logs</Button>
    </Container>
  );

  if (!explanation) return null;

  const theme = getDecisionTheme(explanation.explanation.decision);
  const { top_features, feature_warnings, contributing_factors, scores } = explanation.explanation;

  return (
    <Box sx={{ py: 4, minHeight: '100vh', bgcolor: '#0B0F19', color: '#fff' }}>
      <Container maxWidth="xl">
        {/* Navigation */}
        <Button
          startIcon={<IconifyIcon icon="mdi:chevron-left" />}
          onClick={() => navigate(-1)}
          sx={{ mb: 4, color: '#94A3B8', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.05)' }, borderRadius: 2, px: 2 }}
        >
          Back to Access Logs
        </Button>

        {/* One Big Card Wrapping Everything */}
        <Paper sx={{ 
          p: { xs: 3, md: 5 }, 
          borderRadius: 4, 
          background: 'rgba(30, 41, 59, 0.4)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.05)',
          boxShadow: `0 0 50px -10px ${theme.glow}`,
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Background Glow */}
          <Box sx={{ 
            position: 'absolute', 
            top: '-20%', 
            right: '-10%', 
            width: '500px', 
            height: '500px', 
            background: `radial-gradient(circle, ${theme.glow} 0%, transparent 70%)`,
            zIndex: 0,
            opacity: 0.3
          }} />

          {/* Hero Section (Inside the Big Card) */}
          <Box sx={{ position: 'relative', zIndex: 1, mb: 5 }}>
            <Grid container spacing={4} alignItems="center">
              <Grid item xs={12} md={8}>
                <Stack direction="row" alignItems="center" spacing={3} sx={{ mb: 2 }}>
                  <Box sx={{ 
                    width: 64, 
                    height: 64, 
                    borderRadius: '20px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    background: theme.gradient,
                    border: `1px solid ${theme.color}`,
                    boxShadow: `0 0 20px ${theme.glow}`
                  }}>
                    <IconifyIcon icon={theme.icon} sx={{ fontSize: '2.5rem', color: theme.color }} />
                  </Box>
                  <Box>
                    <Typography variant="h3" sx={{ fontWeight: 800, color: '#fff' }}>
                      {theme.label}
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#94A3B8', fontWeight: 500 }}>
                      Access Request Assessment
                    </Typography>
                  </Box>
                </Stack>
                <Typography variant="h5" sx={{ mt: 3, fontWeight: 500, color: '#E2E8F0', lineHeight: 1.6, fontStyle: 'italic' }}>
                  "{explanation.explanation.reason}"
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Box sx={{ p: 3, bgcolor: 'rgba(15, 23, 42, 0.6)', borderRadius: 3, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#94A3B8' }}>
                      Confidence Score
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: theme.color }}>
                      {(explanation.explanation.confidence * 100).toFixed(1)}%
                    </Typography>
                  </Stack>
                  <LinearProgress 
                    variant="determinate" 
                    value={explanation.explanation.confidence * 100} 
                    sx={{ 
                      height: 8, 
                      borderRadius: 4, 
                      bgcolor: 'rgba(255,255,255,0.05)',
                      '& .MuiLinearProgress-bar': { 
                        bgcolor: theme.color,
                        borderRadius: 4,
                        boxShadow: `0 0 10px ${theme.glow}`
                      }
                    }}
                  />
                  <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mt: 1, textAlign: 'right', fontWeight: 600 }}>
                    Threshold: {(scores.threshold * 100).toFixed(0)}%
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>

          <Divider sx={{ my: 4, borderColor: 'rgba(255,255,255,0.05)' }} />

          {/* The Big Table Section */}
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 3, display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative', zIndex: 1 }}>
            <IconifyIcon icon="mdi:clipboard-text-search-outline" sx={{ color: '#6366f1' }} />
            AI Forensic Audit Table
          </Typography>

          <TableContainer component={Box} sx={{ position: 'relative', zIndex: 1, bgcolor: 'rgba(15, 23, 42, 0.4)', borderRadius: 3, border: '1px solid rgba(255,255,255,0.05)' }}>
            <Table sx={{ minWidth: 650 }} aria-label="forensic audit table">
              <TableHead sx={{ bgcolor: 'rgba(30, 41, 59, 0.8)' }}>
                <TableRow>
                  <TableCell sx={{ color: '#94A3B8', fontWeight: 700, py: 2 }}>Component / Factor</TableCell>
                  <TableCell sx={{ color: '#94A3B8', fontWeight: 700, py: 2 }}>Details & Analysis</TableCell>
                  <TableCell align="right" sx={{ color: '#94A3B8', fontWeight: 700, py: 2 }}>Impact / Score</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {/* SECTION 1: RATIONALE */}
                <TableRow sx={{ bgcolor: 'rgba(99, 102, 241, 0.05)' }}>
                  <TableCell colSpan={3} sx={{ py: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ color: '#6366f1', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                      Decision Rationale
                    </Typography>
                  </TableCell>
                </TableRow>
                {Object.entries(contributing_factors).map(([key, val], idx) => (
                  <TableRow key={`factor-${idx}`} sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                    <TableCell sx={{ color: '#E2E8F0', fontWeight: 700, textTransform: 'capitalize' }}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <IconifyIcon icon="mdi:brain" sx={{ color: '#6366f1' }} />
                        <Box>{key.replace(/_/g, ' ')}</Box>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ color: '#94A3B8', fontWeight: 500 }}>{val}</TableCell>
                    <TableCell align="right" sx={{ color: '#64748B', fontWeight: 600 }}>—</TableCell>
                  </TableRow>
                ))}

                {/* SECTION 2: ANOMALIES */}
                {feature_warnings.length > 0 && (
                  <>
                    <TableRow sx={{ bgcolor: 'rgba(239, 68, 68, 0.05)' }}>
                      <TableCell colSpan={3} sx={{ py: 1.5 }}>
                        <Typography variant="subtitle2" sx={{ color: '#EF4444', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                          Anomalies Detected
                        </Typography>
                      </TableCell>
                    </TableRow>
                    {feature_warnings.map((w, idx) => (
                      <TableRow key={`warning-${idx}`} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                        <TableCell sx={{ color: '#EF4444', fontWeight: 700 }}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <IconifyIcon icon="mdi:alert-circle" />
                            <Box>Alert</Box>
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ color: '#FCA5A5', fontWeight: 500 }}>{w}</TableCell>
                        <TableCell align="right" sx={{ color: '#EF4444', fontWeight: 700 }}>HIGH</TableCell>
                      </TableRow>
                    ))}
                  </>
                )}

                {/* SECTION 3: FEATURE IMPACT */}
                <TableRow sx={{ bgcolor: 'rgba(20, 184, 166, 0.05)' }}>
                  <TableCell colSpan={3} sx={{ py: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ color: '#14b8a6', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                      Feature Impact Analysis
                    </Typography>
                  </TableCell>
                </TableRow>
                {top_features.map((f, idx) => {
                  const impactColor = f.contribution > 0.1 ? '#EF4444' : f.contribution > 0.05 ? '#F59E0B' : '#10B981';
                  return (
                    <TableRow key={`feature-${idx}`} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                      <TableCell sx={{ color: '#E2E8F0', fontWeight: 700, textTransform: 'capitalize' }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <IconifyIcon icon={getFeatureIcon(f.name)} sx={{ color: '#94A3B8' }} />
                          <Box>{f.name.replace(/_/g, ' ')}</Box>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ color: '#94A3B8', fontWeight: 500 }}>
                        Raw Value: <Box component="span" sx={{ color: '#F1F5F9', fontFamily: 'monospace' }}>{Number(f.value).toFixed(3)}</Box>
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: impactColor }}>
                            {(f.contribution * 100).toFixed(1)}%
                          </Typography>
                          <Box sx={{ width: 50 }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={Math.min(f.contribution * 100 * 5, 100)}
                              sx={{ 
                                height: 4, 
                                borderRadius: 2, 
                                bgcolor: 'rgba(255,255,255,0.05)',
                                '& .MuiLinearProgress-bar': { bgcolor: impactColor }
                              }}
                            />
                          </Box>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {/* SECTION 4: MODEL SCORES */}
                <TableRow sx={{ bgcolor: 'rgba(6, 182, 212, 0.05)' }}>
                  <TableCell colSpan={3} sx={{ py: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ color: '#06b6d4', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                      Model Scores
                    </Typography>
                  </TableCell>
                </TableRow>
                <TableRow sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                  <TableCell sx={{ color: '#E2E8F0', fontWeight: 700 }}>Main Risk Score</TableCell>
                  <TableCell sx={{ color: '#94A3B8', fontWeight: 500 }}>Final aggregated risk score used for decision.</TableCell>
                  <TableCell align="right" sx={{ color: theme.color, fontWeight: 800 }}>{(scores.combined * 100).toFixed(1)}</TableCell>
                </TableRow>

                {/* SECTION 5: CONTEXT */}
                <TableRow sx={{ bgcolor: 'rgba(100, 116, 139, 0.05)' }}>
                  <TableCell colSpan={3} sx={{ py: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                      Session Context
                    </Typography>
                  </TableCell>
                </TableRow>
                <TableRow sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                  <TableCell sx={{ color: '#E2E8F0', fontWeight: 700 }}>Log Identifier</TableCell>
                  <TableCell sx={{ color: '#94A3B8', fontWeight: 500 }}>Internal database record reference.</TableCell>
                  <TableCell align="right" sx={{ color: '#F1F5F9', fontWeight: 700, fontFamily: 'monospace' }}>#{explanation.access_log_id}</TableCell>
                </TableRow>
                <TableRow sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                  <TableCell sx={{ color: '#E2E8F0', fontWeight: 700 }}>Subject Badge</TableCell>
                  <TableCell sx={{ color: '#94A3B8', fontWeight: 500 }}>Identifier of the user requesting access.</TableCell>
                  <TableCell align="right" sx={{ color: '#F1F5F9', fontWeight: 700 }}>{explanation.user?.badge_id || 'N/A'}</TableCell>
                </TableRow>
                <TableRow sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                  <TableCell sx={{ color: '#E2E8F0', fontWeight: 700 }}>Timestamp</TableCell>
                  <TableCell sx={{ color: '#94A3B8', fontWeight: 500 }}>Exact time the event was observed.</TableCell>
                  <TableCell align="right" sx={{ color: '#F1F5F9', fontWeight: 700 }}>
                    {explanation.user?.timestamp ? new Date(explanation.user.timestamp).toLocaleString() : 'N/A'}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Container>
    </Box>
  );
};

export default DecisionExplainer;
