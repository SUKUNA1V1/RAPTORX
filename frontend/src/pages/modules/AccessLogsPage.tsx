import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  const [searchParams] = useSearchParams();
  
  const [logs, setLogs] = useState<AccessLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter states
  const [searchText, setSearchText] = useState('');
  const [decisionFilter, setDecisionFilter] = useState(searchParams.get('decision') || '');
  const [dateFromFilter] = useState(searchParams.get('date_from') || '');
  const [riskFilter, setRiskFilter] = useState<[number, number]>([0, 1]);

  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const [totalRecords, setTotalRecords] = useState(0);

  const openExplainer = (logId: number) => {
    navigate(`/pages/decision-explanation/${logId}`);
  };

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      
      const filters: { search?: string; decision?: string; min_risk?: number; max_risk?: number; date_from?: string } = {};
      if (searchText) filters.search = searchText;
      if (decisionFilter && decisionFilter !== 'all') filters.decision = decisionFilter;
      if (dateFromFilter) filters.date_from = dateFromFilter;
      if (riskFilter[0] > 0 || riskFilter[1] < 1) {
        filters.min_risk = riskFilter[0];
        filters.max_risk = riskFilter[1];
      }

      const data = await apiClient.getAccessLogs(page + 1, rowsPerPage, filters);
      
      const items = Array.isArray(data?.items) ? data.items : [];
      setLogs(items);
      setTotalRecords(data?.total || 0);
    } catch (err) {
      setError('Failed to load access logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [page, rowsPerPage, decisionFilter, dateFromFilter, riskFilter]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      void load();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchText]);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Stack spacing={4} sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3)',
          }}
        >
          <IconifyIcon icon="mdi:format-list-bulleted" sx={{ fontSize: '2rem' }} />
        </Box>
        <Box>
          <Typography variant="h3" fontWeight={800} sx={{ background: 'linear-gradient(to right, #fff, #a1a1aa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', mb: 0.5 }}>
            Access Logs
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            Real-time audit trail of all entry requests and AI-driven access decisions.
          </Typography>
        </Box>
      </Box>

      {/* Filters Section */}
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
          Live Filtering
        </Typography>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Global Search"
              size="small"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="User or point name..."
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
          <Grid item xs={12} md={6}>
            <Box sx={{ px: 2 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1, display: 'block' }}>
                Risk Score Range: {riskFilter[0].toFixed(2)} - {riskFilter[1].toFixed(2)}
              </Typography>
              <Slider
                value={riskFilter}
                onChange={(_, newValue) => setRiskFilter(newValue as [number, number])}
                valueLabelDisplay="auto"
                min={0}
                max={1}
                step={0.01}
                sx={{ color: '#6366f1' }}
              />
            </Box>
          </Grid>
        </Grid>
      </Box>

      {error && <Alert severity="error" sx={{ borderRadius: 3 }}>{error}</Alert>}

      <Stack spacing={2}>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
          Total Audit Records: <Typography component="span" fontWeight={700} color="text.primary">{totalRecords}</Typography>
        </Typography>
        <Paper 
          sx={{ 
            borderRadius: 4, 
            overflow: 'hidden',
            background: 'rgba(255, 255, 255, 0.02)', 
            backdropFilter: 'blur(10px)', 
            border: '1px solid rgba(255,255,255,0.05)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
            position: 'relative'
          }}
        >
          {loading && (
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.3)', zIndex: 10 }}>
              <CircularProgress size={32} sx={{ color: '#6366f1' }} />
            </Box>
          )}
          <Table size="medium">
            <TableHead>
              <TableRow sx={{ bgcolor: 'rgba(255, 255, 255, 0.03)' }}>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>Timestamp</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>User</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>Access Point</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>Risk Score</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>Decision</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>Insights</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log) => {
                const decision = log.decision || 'granted';
                const risk = Number(log.risk_score || 0);
                return (
                  <TableRow 
                    key={log.id}
                    sx={{
                      '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.05)' },
                      '&:last-child td, &:last-child th': { border: 0 }
                    }}
                  >
                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {log.user ? `${log.user.first_name} ${log.user.last_name}` : 'Unknown'}
                      <Typography variant="caption" display="block" sx={{ color: 'text.disabled', fontWeight: 400 }}>
                        {log.user?.role || 'System'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {log.access_point?.name || 'External Reader'}
                      <Typography variant="caption" display="block" sx={{ color: 'text.disabled' }}>
                        {log.access_point?.building || 'Main Site'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ flexGrow: 1, height: 6, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 3, width: 80, overflow: 'hidden' }}>
                          <Box 
                            sx={{ 
                              height: '100%', 
                              width: `${risk * 100}%`, 
                              bgcolor: risk > 0.7 ? '#ef4444' : risk > 0.4 ? '#f59e0b' : '#10b981',
                              boxShadow: `0 0 10px ${risk > 0.7 ? 'rgba(239, 68, 68, 0.4)' : risk > 0.4 ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`
                            }} 
                          />
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 35, color: risk > 0.7 ? '#fca5a5' : risk > 0.4 ? '#fcd34d' : '#6ee7b7' }}>
                          {(risk * 100).toFixed(0)}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={decision.toUpperCase()} 
                        size="small" 
                        sx={{ 
                          bgcolor: decision === 'granted' ? 'rgba(16, 185, 129, 0.1)' : decision === 'denied' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                          color: decision === 'granted' ? '#34d399' : decision === 'denied' ? '#f87171' : '#fbbf24',
                          fontWeight: 800,
                          borderRadius: 1.5,
                          border: `1px solid ${decision === 'granted' ? 'rgba(16, 185, 129, 0.2)' : decision === 'denied' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`
                        }} 
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button 
                        size="small" 
                        variant="outlined" 
                        onClick={() => openExplainer(log.id)}
                        sx={{ 
                          borderRadius: 2, 
                          textTransform: 'none',
                          borderColor: 'rgba(255,255,255,0.1)',
                          color: 'text.secondary',
                          '&:hover': { borderColor: '#6366f1', color: '#818cf8', bgcolor: 'rgba(99, 102, 241, 0.05)' }
                        }}
                      >
                        Explain
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {logs.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No audit records match your search criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={totalRecords}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[20, 50, 100]}
            sx={{
              color: 'text.secondary',
              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          />
        </Paper>
      </Stack>
    </Stack>
  );
};

export default AccessLogsPage;