import { useEffect, useState } from 'react';
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
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import IconifyIcon from 'components/base/IconifyIcon';
import { apiClient, FeatureImportanceItem } from 'lib/api';
import ModelArchitectureCard from 'components/ModelArchitectureCard';

interface ModelInsights {
  isolation_forest?: { description: string; architecture?: string; features?: string[] };
  autoencoder?: { description: string; architecture?: string; features?: string[] };
  ensemble?: { description: string; method?: string };
}

const ExplainabilityPage = () => {
  const [items, setItems] = useState<FeatureImportanceItem[]>([]);
  const [insights, setInsights] = useState<ModelInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await apiClient.getFeatureImportance();
        setItems(Array.isArray(data) ? data : []);

        try {
          const insightsData = await apiClient.getModelInsights();
          setInsights(insightsData as ModelInsights);
        } catch {
          // Silently handle insights error
        }
      } catch {
        setError('Failed to load explainability data from backend API.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const getRankColor = (rank: number) => {
    if (rank === 1) return '#fbbf24'; // Gold
    if (rank === 2) return '#c0c0c0'; // Silver
    if (rank === 3) return '#cd7f32'; // Bronze
    return '#94a3b8'; // Default
  };

  return (
    <Stack spacing={4} sx={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 8px 32px rgba(118, 75, 162, 0.3)',
          }}
        >
          <IconifyIcon icon="mdi:lightbulb-outline" sx={{ fontSize: '2rem' }} />
        </Box>
        <Box>
          <Typography variant="h3" fontWeight={800} sx={{ background: 'linear-gradient(to right, #fff, #a1a1aa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', mb: 0.5 }}>
            Model Explainability
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            Discover the key drivers and feature importance behind our AI's decisions.
          </Typography>
        </Box>
      </Box>

      {loading && (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 4, background: 'rgba(255, 255, 255, 0.01)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <CircularProgress size={48} sx={{ color: '#667eea' }} />
          <Typography variant="body1" sx={{ mt: 3, color: 'text.secondary', fontWeight: 500 }}>
            Analyzing decision drivers...
          </Typography>
        </Paper>
      )}

      {error && (
        <Alert severity="error" sx={{ borderRadius: 3, bgcolor: 'rgba(211, 47, 47, 0.1)', color: '#ff8a80', '& .MuiAlert-icon': { color: '#ff8a80' } }} icon={<IconifyIcon icon="mdi:alert-circle" />}>
          {error}
        </Alert>
      )}

      {!loading && !error && items.length === 0 && (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 4, bgcolor: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <IconifyIcon icon="mdi:inbox-outline" sx={{ fontSize: 3, color: 'text.disabled', mb: 2 }} />
          <Typography variant="body1" sx={{ color: 'text.secondary', mb: 1, fontWeight: 500 }}>
            No feature importance data yet
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            Run the robust ML pipeline to compute insights
          </Typography>
        </Paper>
      )}

      {/* Model Architecture Card */}
      {!loading && !error && insights && <ModelArchitectureCard insights={insights} />}

      {!loading && !error && items.length > 0 && (
        <Stack spacing={2} sx={{ display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2 }}>
            <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(102, 126, 234, 0.1)', color: '#667eea', display: 'flex' }}>
              <IconifyIcon icon="mdi:format-list-checks" sx={{ fontSize: '1.25rem' }} />
            </Box>
            <Typography variant="h5" fontWeight={700}>
              All Features <Typography component="span" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '1.2rem', ml: 0.5 }}>({items.length})</Typography>
            </Typography>
          </Box>

          <Paper 
            sx={{ 
              borderRadius: 4, 
              overflow: 'hidden', 
              background: 'rgba(255, 255, 255, 0.02)', 
              backdropFilter: 'blur(10px)', 
              border: '1px solid rgba(255,255,255,0.05)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.2)'
            }}
          >
            <Table size="medium">
              <TableHead>
                <TableRow sx={{ bgcolor: 'rgba(255, 255, 255, 0.03)' }}>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>Rank</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>Feature</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>Importance Score</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item, idx) => {
                  const itemRankColor = getRankColor(item.rank || idx + 1);
                  const isTop3 = idx < 3;
                  return (
                    <TableRow
                      key={`${item.feature}-${idx}`}
                      sx={{
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        cursor: 'default',
                        backgroundColor: isTop3 ? `rgba(${idx === 0 ? '251, 191, 36' : idx === 1 ? '192, 192, 192' : '205, 127, 50'}, 0.03)` : 'transparent',
                        '&:hover': { 
                          bgcolor: 'rgba(255, 255, 255, 0.05)',
                          transform: 'translateY(-1px)',
                        },
                        '&:last-child td, &:last-child th': { border: 0 }
                      }}
                    >
                      <TableCell>
                        <Chip
                          label={`#${item.rank || idx + 1}`}
                          size="small"
                          sx={{
                            backgroundColor: isTop3 ? itemRankColor : 'rgba(255,255,255,0.05)',
                            color: isTop3 ? '#000' : 'text.primary',
                            fontWeight: 800,
                            boxShadow: isTop3 ? `0 0 10px ${itemRankColor}66` : 'none',
                            px: 1
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: itemRankColor,
                              boxShadow: `0 0 8px ${itemRankColor}`,
                            }}
                          />
                          <Typography variant="body1" fontWeight={isTop3 ? 600 : 400}>
                            {item.feature}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                          <LinearProgress
                            variant="determinate"
                            value={Number(item.importance || 0) * 100}
                            sx={{
                              width: 120,
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: 'rgba(255,255,255,0.05)',
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 3,
                                background: `linear-gradient(90deg, ${itemRankColor} 0%, ${itemRankColor}dd 100%)`,
                                boxShadow: `0 0 10px ${itemRankColor}44`
                              },
                            }}
                          />
                          <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 55, color: isTop3 ? 'text.primary' : 'text.secondary' }}>
                            {(Number(item.importance || 0) * 100).toFixed(1)}%
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Paper>
        </Stack>
      )}
    </Stack>
  );
};

export default ExplainabilityPage;