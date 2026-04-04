import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import IconifyIcon from 'components/base/IconifyIcon';
import { apiClient } from 'lib/api';

interface DecisionExplainerProps {
  logId?: number;
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
    top_features: Array<{ name: string; value: number; contribution: number }>;
    feature_warnings: string[];
    contributing_factors: Record<string, unknown>;
  };
}

const getDecisionColor = (decision: string) => {
  if (decision === 'granted') return '#4caf50';
  if (decision === 'denied') return '#d32f2f';
  return '#ff9800';
};

const getRiskColor = (riskLevel: string) => {
  if (riskLevel === 'low') return '#4caf50';
  if (riskLevel === 'medium') return '#ff9800';
  if (riskLevel === 'high') return '#ff6f00';
  return '#d32f2f';
};

const DecisionExplainer = ({ logId: propLogId }: DecisionExplainerProps) => {
  const navigate = useNavigate();
  const { logId: paramLogId } = useParams<{ logId: string }>();
  const logId = propLogId || (paramLogId ? parseInt(paramLogId, 10) : null);

  const [explanation, setExplanation] = useState<DecisionExplanation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!logId) return;

    const loadExplanation = async () => {
      try {
        setLoading(true);
        setError('');
        console.log(`Fetching explanation for log ID: ${logId}`);
        const data = await apiClient.getDecisionExplanation(logId);
        setExplanation(data as unknown as DecisionExplanation);
      } catch (err) {
        console.error('Error loading explanation:', err);
        const errorMsg = err instanceof Error ? err.message : 'Failed to load explanation';
        setError(`Error: ${errorMsg}`);
      } finally {
        setLoading(false);
      }
    };

    void loadExplanation();
  }, [logId]);

  if (!logId) return null;

  return (
    <Box sx={{ minHeight: '100vh', py: 3 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <Button
            startIcon={<IconifyIcon icon="mdi:arrow-left" />}
            onClick={() => navigate(-1)}
            variant="outlined"
            sx={{ 
              textTransform: 'none', 
              borderRadius: 3, 
              color: 'text.secondary', 
              borderColor: 'rgba(255,255,255,0.1)',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.05)',
                borderColor: 'rgba(255,255,255,0.2)'
              }
            }}
          >
            Back
          </Button>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(167, 139, 250, 0.1)' }}>
              <IconifyIcon icon="mdi:lightbulb" sx={{ fontSize: '1.75rem', color: '#a78bfa' }} />
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: 0.5 }}>
              Decision Explanation
            </Typography>
          </Box>
        </Box>

        {/* Content */}
        <Box sx={{ maxWidth: '900px' }}>
          {loading && (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <CircularProgress />
              <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                Loading decision explanation...
              </Typography>
            </Box>
          )}

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {explanation && !loading && (
            <>
              {/* Decision Header - Large and Prominent */}
              <Box sx={{ mb: 4 }}>
                <Box sx={{ 
                  p: 4, 
                  borderRadius: 4, 
                  background: 'rgba(255, 255, 255, 0.02)', 
                  backdropFilter: 'blur(10px)', 
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: '100%',
                    width: '6px',
                    background: getDecisionColor(explanation.explanation.decision),
                    boxShadow: `0 0 16px ${getDecisionColor(explanation.explanation.decision)}`
                  }
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: '16px',
                          background: `linear-gradient(135deg, ${getDecisionColor(explanation.explanation.decision)}20 0%, ${getDecisionColor(explanation.explanation.decision)}05 100%)`,
                          border: `1px solid ${getDecisionColor(explanation.explanation.decision)}40`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <IconifyIcon icon={explanation.explanation.decision === 'granted' ? 'mdi:check-circle' : explanation.explanation.decision === 'denied' ? 'mdi:close-circle' : 'mdi:clock'} sx={{ fontSize: '3rem', color: getDecisionColor(explanation.explanation.decision) }} />
                      </Box>
                      <Box>
                        <Typography variant="h3" sx={{ fontWeight: 800, mb: 0.5, letterSpacing: 1, color: '#fff' }}>
                          {explanation.explanation.decision.toUpperCase()}
                        </Typography>
                        <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                          Access Decision Outcome
                        </Typography>
                      </Box>
                    </Box>
                    <Chip
                      label={`RISK: ${explanation.explanation.risk_level.toUpperCase()}`}
                      sx={{
                        bgcolor: `${getRiskColor(explanation.explanation.risk_level)}15`,
                        color: getRiskColor(explanation.explanation.risk_level),
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        height: 36,
                        px: 1,
                        border: `1px solid ${getRiskColor(explanation.explanation.risk_level)}40`
                      }}
                    />
                  </Box>

                  {/* Reason */}
                  <Box sx={{ mb: 4, p: 3, borderRadius: 3, bgcolor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                      AI Generated Reasoning
                    </Typography>
                    <Typography variant="h6" sx={{ fontStyle: 'italic', lineHeight: 1.6, color: '#e2e8f0', fontWeight: 500 }}>
                      "{explanation.explanation.reason}"
                    </Typography>
                  </Box>

                  {/* Confidence Bar */}
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Prediction Confidence
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 800, color: getDecisionColor(explanation.explanation.decision) }}>
                        {(explanation.explanation.confidence * 100).toFixed(1)}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={explanation.explanation.confidence * 100}
                      sx={{
                        height: 10,
                        borderRadius: 5,
                        bgcolor: 'rgba(0, 0, 0, 0.3)',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: getDecisionColor(explanation.explanation.decision),
                          borderRadius: 5,
                          boxShadow: `0 0 12px ${getDecisionColor(explanation.explanation.decision)}`
                        },
                      }}
                    />
                  </Box>
                </Box>
              </Box>



              {/* Features Section */}
              {explanation.explanation.top_features && explanation.explanation.top_features.length > 0 && (
                <Box sx={{ mb: 4 }}>
                  <Box sx={{ 
                    p: 4, 
                    borderRadius: 4, 
                    background: 'rgba(255, 255, 255, 0.02)', 
                    backdropFilter: 'blur(10px)', 
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                      <Box sx={{ p: 1, bgcolor: 'rgba(251, 191, 36, 0.1)', borderRadius: 2 }}>
                        <IconifyIcon icon="mdi:trending-up" sx={{ fontSize: '1.5rem', color: '#fbbf24' }} />
                      </Box>
                      <Typography variant="h5" sx={{ fontWeight: 800, color: '#fff' }}>
                        Top Contributing Features
                      </Typography>
                    </Box>
                    <Table size="small" sx={{ 
                      '& td, & th': { borderBottom: '1px solid rgba(255,255,255,0.05)', py: 2 },
                      '& th': { color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }
                    }}>
                      <TableHead>
                        <TableRow>
                          <TableCell>Feature Vector</TableCell>
                          <TableCell align="right">Snapshot Value</TableCell>
                          <TableCell align="right">SHAP Impact</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {explanation.explanation.top_features.map((f, idx) => (
                          <TableRow key={idx} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' }, transition: 'all 0.2s' }}>
                            <TableCell sx={{ fontSize: '1rem', fontWeight: 600, color: '#e2e8f0' }}>{f.name}</TableCell>
                            <TableCell align="right" sx={{ fontSize: '1rem', fontFamily: 'monospace', color: 'text.secondary' }}>
                              {Number(f.value).toFixed(3)}
                            </TableCell>
                            <TableCell align="right" sx={{ fontSize: '1rem', fontWeight: 800, color: '#fbbf24' }}>
                              +{Number(f.contribution).toFixed(3)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                </Box>
              )}


            </>
          )}
        </Box>
      </Container>
    </Box>
  );
};

export default DecisionExplainer;
