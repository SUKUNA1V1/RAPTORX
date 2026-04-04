import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconifyIcon from 'components/base/IconifyIcon';

interface ModelInsights {
  isolation_forest?: { description: string; architecture?: string; features?: string[] };
  autoencoder?: { description: string; architecture?: string; features?: string[] };
  ensemble?: { description: string; method?: string };
}

interface ModelArchitectureCardProps {
  insights: ModelInsights | null;
}

const ModelArchitectureCard = ({ insights }: ModelArchitectureCardProps) => {
  if (!insights) return null;

  return (
    <Grid container spacing={3} sx={{ mt: 1, mb: 1 }}>
        {insights.isolation_forest && (
          <Grid item xs={12} md={4}>
          <Paper 
            sx={{ 
              p: 3, 
              borderRadius: 4, 
              border: '1px solid rgba(123, 31, 162, 0.4)', 
              background: 'linear-gradient(180deg, rgba(123, 31, 162, 0.05) 0%, rgba(123, 31, 162, 0.01) 100%)', 
              backdropFilter: 'blur(12px)',
              height: '100%',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'default',
              boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
              '&:hover': {
                transform: 'translateY(-6px)',
                boxShadow: '0 12px 32px rgba(123, 31, 162, 0.2)',
                border: '1px solid rgba(123, 31, 162, 0.6)',
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(123, 31, 162, 0.4)'
                }}
              >
                <IconifyIcon icon="mdi:pine-tree" sx={{ fontSize: '1.5rem' }} />
              </Box>
              <Typography variant="h6" fontWeight={700}>
                Isolation Forest
              </Typography>
            </Box>
            <Typography variant="body1" sx={{ color: 'text.secondary', mb: 2, lineHeight: 1.6 }}>
              {insights.isolation_forest.description}
            </Typography>
            {insights.isolation_forest.architecture && (
              <Box sx={{ p: 1.5, borderRadius: 2, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', color: '#ce93d8' }}>
                  {insights.isolation_forest.architecture}
                </Typography>
              </Box>
            )}
          </Paper>
          </Grid>
        )}

        {insights.autoencoder && (
          <Grid item xs={12} md={4}>
          <Paper 
            sx={{ 
              p: 3, 
              borderRadius: 4, 
              border: '1px solid rgba(25, 118, 210, 0.4)', 
              background: 'linear-gradient(180deg, rgba(25, 118, 210, 0.05) 0%, rgba(25, 118, 210, 0.01) 100%)', 
              backdropFilter: 'blur(12px)',
              height: '100%',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'default',
              boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
              '&:hover': {
                transform: 'translateY(-6px)',
                boxShadow: '0 12px 32px rgba(25, 118, 210, 0.2)',
                border: '1px solid rgba(25, 118, 210, 0.6)',
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #42a5f5 0%, #1976d2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(25, 118, 210, 0.4)'
                }}
              >
                <IconifyIcon icon="mdi:lan" sx={{ fontSize: '1.5rem' }} />
              </Box>
              <Typography variant="h6" fontWeight={700}>
                Autoencoder
              </Typography>
            </Box>
            <Typography variant="body1" sx={{ color: 'text.secondary', mb: 2, lineHeight: 1.6 }}>
              {insights.autoencoder.description}
            </Typography>
            {insights.autoencoder.architecture && (
              <Box sx={{ p: 1.5, borderRadius: 2, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', color: '#90caf9' }}>
                  {insights.autoencoder.architecture}
                </Typography>
              </Box>
            )}
          </Paper>
          </Grid>
        )}

        {insights.ensemble && (
          <Grid item xs={12} md={4}>
          <Paper 
            sx={{ 
              p: 3, 
              borderRadius: 4, 
              border: '1px solid rgba(76, 175, 80, 0.4)', 
              background: 'linear-gradient(180deg, rgba(76, 175, 80, 0.05) 0%, rgba(76, 175, 80, 0.01) 100%)', 
              backdropFilter: 'blur(12px)',
              height: '100%',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'default',
              boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
              '&:hover': {
                transform: 'translateY(-6px)',
                boxShadow: '0 12px 32px rgba(76, 175, 80, 0.2)',
                border: '1px solid rgba(76, 175, 80, 0.6)',
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #66bb6a 0%, #4caf50 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(76, 175, 80, 0.4)'
                }}
              >
                <IconifyIcon icon="mdi:cube-outline" sx={{ fontSize: '1.5rem' }} />
              </Box>
              <Typography variant="h6" fontWeight={700}>
                Ensemble Strategy
              </Typography>
            </Box>
            <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3, lineHeight: 1.6 }}>
              {insights.ensemble.description}
            </Typography>
            {insights.ensemble.method && (
              <Chip 
                label={`Method: ${insights.ensemble.method}`} 
                sx={{ 
                  background: 'rgba(76,175,80,0.1)', 
                  color: '#a5d6a7', 
                  border: '1px solid rgba(76,175,80,0.3)',
                  fontWeight: 600
                }} 
              />
            )}
          </Paper>
          </Grid>
        )}
      </Grid>
    );
  };
  
export default ModelArchitectureCard;
