import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Slider from '@mui/material/Slider';
import Grid from '@mui/material/Grid';
import TablePagination from '@mui/material/TablePagination';
import Chip from '@mui/material/Chip';
import IconifyIcon from 'components/base/IconifyIcon';
import { apiClient, AccessLogItem } from 'lib/api';

const AccessLogsPage = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AccessLogItem[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AccessLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter states
  const [searchText, setSearchText] = useState('');
  const [decisionFilter, setDecisionFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState<[number, number]>([0, 1]);

  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const openExplainer = (logId: number) => {
    navigate(`/pages/decision-explanation/${logId}`);
  };

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await apiClient.getAccessLogs();
      const items = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
          ? data
          : [];
      setLogs(items);
    } catch (err) {
      let detail = '';
      if (err instanceof Error) {
        detail = err.message;
      }
      setError(
        detail
          ? `Failed to load access logs from backend API: ${detail}`
          : 'Failed to load access logs from backend API.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  // Apply filters whenever logs or filter state changes
  useEffect(() => {
    let filtered = logs;

    if (searchText) {
      const lower = searchText.toLowerCase();
      filtered = filtered.filter(log =>
        (log.user?.first_name || '').toLowerCase().includes(lower) ||
        (log.user?.last_name || '').toLowerCase().includes(lower) ||
        (log.access_point?.name || '').toLowerCase().includes(lower)
      );
    }

    if (decisionFilter) {
      filtered = filtered.filter(log => log.decision === decisionFilter);
    }

    filtered = filtered.filter(log => {
      const risk = Number(log.risk_score || 0);
      return risk >= riskFilter[0] && risk <= riskFilter[1];
    });

    setFilteredLogs(filtered);
    setPage(0); // Reset pagination on filter change
  }, [logs, searchText, decisionFilter, riskFilter]);

  return (
    <Stack spacing={4} sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 8px 32px rgba(253, 160, 133, 0.3)',
          }}
        >
          <IconifyIcon icon="mdi:file-document-outline" sx={{ fontSize: '2rem' }} />
        </Box>
        <Box>
          <Typography variant="h3" fontWeight={800} sx={{ background: 'linear-gradient(to right, #fff, #a1a1aa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', mb: 0.5 }}>
            Access Logs
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            Real-time tracking of AI-powered access control decisions.
          </Typography>
        </Box>
      </Box>

      {/* Filters Section */}
      {!loading && !error && logs.length > 0 && (
        <Box 
          sx={{ 
            p: 3, 
            bgcolor: 'rgba(255, 255, 255, 0.02)', 
            borderRadius: 4, 
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.2)'
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>
            Filters
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Search User / Access Point"
                size="small"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Type to search..."
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Decision"
                size="small"
                select
                value={decisionFilter}
                onChange={(e) => setDecisionFilter(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              >
                <MenuItem value="">All Decisions</MenuItem>
                <MenuItem value="granted">Granted</MenuItem>
                <MenuItem value="denied">Denied</MenuItem>
                <MenuItem value="delayed">Delayed</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={12} md={6}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: 'text.secondary' }}>
                Risk Score Range: <Typography component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>{riskFilter[0].toFixed(2)} - {riskFilter[1].toFixed(2)}</Typography>
              </Typography>
              <Box sx={{ px: 2 }}>
                <Slider
                  value={riskFilter}
                  onChange={(_, newValue) => setRiskFilter(newValue as [number, number])}
                  min={0}
                  max={1}
                  step={0.1}
                  marks={[
                    { value: 0, label: '0' },
                    { value: 1, label: '1' },
                  ]}
                  valueLabelDisplay="auto"
                  sx={{ color: '#fda085' }}
                />
              </Box>
            </Grid>
          </Grid>
        </Box>
      )}

      {loading && (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 4, background: 'rgba(255, 255, 255, 0.01)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <CircularProgress size={48} sx={{ color: '#fda085' }} />
          <Typography variant="body1" sx={{ mt: 3, color: 'text.secondary', fontWeight: 500 }}>
            Loading access logs...
          </Typography>
        </Paper>
      )}
      {error && <Alert severity="error" sx={{ borderRadius: 3, bgcolor: 'rgba(211, 47, 47, 0.1)', color: '#ff8a80' }}>{error}</Alert>}
      {!loading && !error && logs.length === 0 && (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 4, bgcolor: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <IconifyIcon icon="mdi:inbox-outline" sx={{ fontSize: 3, color: 'text.disabled', mb: 2 }} />
          <Typography variant="body1" sx={{ color: 'text.secondary', mb: 1, fontWeight: 500 }}>
            No access logs found yet.
          </Typography>
        </Paper>
      )}

      {!loading && !error && logs.length > 0 && (
        <Stack spacing={2}>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            Showing {filteredLogs.length} of {logs.length} records
          </Typography>
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
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>Timestamp</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>User</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>Access Point</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>Decision</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>Risk</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredLogs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((log) => {
                  const isGranted = log.decision === 'granted';
                  const riskColor = Number(log.risk_score || 0) > 0.7 ? '#ef4444' : Number(log.risk_score || 0) > 0.4 ? '#f59e0b' : '#10b981';
                  
                  return (
                    <TableRow 
                      key={log.id}
                      sx={{
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        cursor: 'default',
                        '&:hover': { 
                          bgcolor: 'rgba(255, 255, 255, 0.05)',
                          transform: 'translateY(-1px)',
                        },
                        '&:last-child td, &:last-child th': { border: 0 }
                      }}
                    >
                      <TableCell sx={{ fontWeight: 500 }}>{new Date(log.timestamp).toLocaleString()}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{log.user ? `${log.user.first_name} ${log.user.last_name}` : 'N/A'}</TableCell>
                      <TableCell>{log.access_point?.name || 'N/A'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={log.decision.toUpperCase()} 
                          size="small" 
                          sx={{ 
                            bgcolor: isGranted ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: isGranted ? '#34d399' : '#f87171',
                            fontWeight: 800,
                            border: `1px solid ${isGranted ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                            borderRadius: 1.5
                          }} 
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 700, color: riskColor }}>
                          {Number(log.risk_score || 0).toFixed(3)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          startIcon={<IconifyIcon icon="mdi:lightbulb" />}
                          onClick={() => openExplainer(log.id)}
                          variant="outlined"
                          sx={{ 
                            borderRadius: 2, 
                            color: '#a78bfa', 
                            borderColor: 'rgba(167, 139, 250, 0.3)',
                            '&:hover': { borderColor: '#a78bfa', bgcolor: 'rgba(167, 139, 250, 0.1)' }
                          }}
                        >
                          Explain
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={filteredLogs.length}
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
        </Stack>
      )}
      {error && (
        <Button variant="outlined" size="small" onClick={() => void load()} sx={{ width: 'fit-content', borderRadius: 2 }}>
          Retry
        </Button>
      )}
    </Stack>
  );
};

export default AccessLogsPage;