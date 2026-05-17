import { useMemo, useState, useEffect } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
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
import Paper from '@mui/material/Paper';
import Autocomplete from '@mui/material/Autocomplete';
import IconifyIcon from 'components/base/IconifyIcon';
import { apiClient, AccessDecision, AccessPointItem, UserItem } from 'lib/api';

type SimulationResult = AccessDecision & {
  timestampUsed: string;
};

type SimulatorSeedData = {
  usersData: UserItem[];
  accessPointsData: AccessPointItem[];
};

const getRiskLevel = (score: number): 'low' | 'medium' | 'high' | 'critical' => {
  if (score < 0.3) return 'low';
  if (score < 0.5) return 'medium';
  if (score < 0.7) return 'high';
  return 'critical';
};

const loadSimulatorSeedData = async (): Promise<SimulatorSeedData> => {
  const [usersResponse, accessPointsResponse] = await Promise.all([
    apiClient.getUsers(1, 5000), 
    apiClient.getAccessPoints(1, 500),
  ]);

  return {
    usersData: usersResponse.items ?? [],
    accessPointsData: accessPointsResponse.items ?? [],
  };
};

const SimulatorPage = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [accessPoints, setAccessPoints] = useState<AccessPointItem[]>([]);
  
  const [customUserId, setCustomUserId] = useState<string>('');
  const [customApId, setCustomApId] = useState<string>('');
  const [customTime, setCustomTime] = useState<string>(() => {
    const tzOffset = (new Date()).getTimezoneOffset() * 60000;
    return new Date(Date.now() - tzOffset).toISOString().slice(0, 16);
  });
  
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<SimulationResult[]>([]);

  const selectedUser = useMemo(() => users.find(u => String(u.id) === customUserId), [users, customUserId]);
  const selectedAp = useMemo(() => accessPoints.find(ap => String(ap.id) === customApId), [accessPoints, customApId]);

  const summary = useMemo(() => {
    const total = results.length;
    const granted = results.filter((r) => r.decision === 'granted').length;
    const denied = results.filter((r) => r.decision === 'denied').length;
    const avgRisk = total
      ? (results.reduce((acc, item) => acc + Number(item.risk_score || 0), 0) / total).toFixed(3)
      : '0.000';

    return { total, granted, denied, avgRisk };
  }, [results]);

  const ensureSeedDataLoaded = async (): Promise<SimulatorSeedData> => {
    if (users.length && accessPoints.length) {
      return { usersData: users, accessPointsData: accessPoints };
    }

    setBootstrapping(true);
    setError('');
    try {
      const { usersData, accessPointsData } = await loadSimulatorSeedData();
      setUsers(usersData);
      setAccessPoints(accessPointsData);
      return { usersData, accessPointsData };
    } catch (err) {
      const detail = err instanceof Error ? err.message : '';
      setError(detail ? `Failed to load simulator data: ${detail}` : 'Failed to load simulator data.');
      return { usersData: [], accessPointsData: [] };
    } finally {
      setBootstrapping(false);
    }
  };

  useEffect(() => {
    void ensureSeedDataLoaded();
  }, []);

  const handleRunSimulation = async () => {
    if (!customUserId || !customApId) {
      setError('Please select both a user and an access point.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await apiClient.requestAccess({
        badge_id: selectedUser?.badge_id || '',
        access_point_id: Number(customApId),
        timestamp: customTime,
        method: 'badge',
      });

      setResults((prev) => [{ ...result, timestampUsed: customTime }, ...prev]);
    } catch (err: unknown) {
      let errorMessage = 'Simulation failed';
      
      if (err && typeof err === 'object' && 'response' in err) {
        // Safe type narrowing for Axios-like error objects
        const axiosError = err as { response: { data?: { detail?: unknown } } };
        const detail = axiosError.response?.data?.detail;
        
        if (Array.isArray(detail)) {
          errorMessage = `Validation Error: ${detail.map((d: { loc: (string | number)[]; msg: string }) => 
            `${d.loc.join('.')}: ${d.msg}`).join(', ')}`;
        } else if (typeof detail === 'string') {
          errorMessage = `Error: ${detail}`;
        } else if (err instanceof Error) {
          errorMessage = `Error: ${err.message}`;
        } else {
          errorMessage = 'Error: Connection failed or server error';
        }
      } else if (err instanceof Error) {
        errorMessage = `Error: ${err.message}`;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClearResults = () => {
    setResults([]);
  };

  const getPreflightWarnings = () => {
    if (!selectedUser || !selectedAp) return [];
    const warnings: string[] = [];
    const uClr = selectedUser.clearance_level ?? 1;
    const apClr = selectedAp.required_clearance ?? 1;

    if (uClr < apClr) {
      warnings.push(`Clearance Mismatch: User clearance (Level ${uClr}) is lower than the AP requirement (Level ${apClr}).`);
    }
    if (selectedAp.is_restricted && uClr < 3) {
      warnings.push(`Restricted Area: The user does not have sufficient clearance to access restricted zones.`);
    }
    
    const eventDate = new Date(customTime);
    const hour = eventDate.getHours();
    const day = eventDate.getDay();
    if (hour < 7 || hour > 19) {
      warnings.push(`After Hours: Access attempt is occurring outside business hours.`);
    }
    if (day === 0 || day === 6) {
      warnings.push(`Weekend Access: Attempt is occurring on a weekend.`);
    }

    return warnings;
  };

  const preflightWarnings = getPreflightWarnings();

  return (
    <Box sx={{ p: { xs: 2.5, md: 4 } }}>
      <Stack spacing={4} direction="column" alignItems="stretch" sx={{ width: 1 }}>
        {/* Page Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: 'rgba(255, 255, 255, 0.05)', display: 'flex' }}>
            <IconifyIcon icon="mdi:target-variant" sx={{ fontSize: '2rem', color: '#fff' }} />
          </Box>
          <Box>
            <Typography variant="h3" fontWeight={800} sx={{ color: '#fff', letterSpacing: 0.5 }}>
              Manual Event Sandbox
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, mt: 0.5 }}>
              Craft targeted access events and test your ML models dynamically.
            </Typography>
          </Box>
        </Box>

        {/* Global Configuration Grid */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={9}>
            <Box sx={{ p: 3, borderRadius: 4, background: 'linear-gradient(135deg, rgba(8, 145, 178, 0.08) 0%, rgba(8, 145, 178, 0.01) 100%)', backdropFilter: 'blur(10px)', border: '1px solid rgba(8, 145, 178, 0.2)', display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ color: '#0ea5e9', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
                  <IconifyIcon icon="mdi:cogs" /> Injection Parameters
                </Typography>
              </Box>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Autocomplete
                    fullWidth
                    size="small"
                    options={users.filter(u => u.is_active)}
                    getOptionLabel={(u) => `${u.first_name} ${u.last_name} (${u.role})`}
                    value={selectedUser || null}
                    onChange={(_, value) => setCustomUserId(value ? String(value.id) : '')}
                    renderInput={(params) => (
                      <TextField 
                        {...params} 
                        label="Target User" 
                        placeholder="Search users..."
                        sx={{ 
                          '& .MuiOutlinedInput-root': { bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 2 }, 
                          '& .MuiInputLabel-root': { color: 'text.secondary' } 
                        }} 
                      />
                    )}
                  />

                  {/* USER HELPER CARD */}
                  {selectedUser && (
                    <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase' }}>User Profile</Typography>
                      <Stack spacing={1} sx={{ mt: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" sx={{ color: '#e2e8f0' }}>Clearance Level</Typography>
                          <Typography variant="body2" sx={{ color: '#0ea5e9', fontWeight: 700 }}>Level {selectedUser.clearance_level}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" sx={{ color: '#e2e8f0' }}>Department</Typography>
                          <Typography variant="body2" sx={{ color: '#fff' }}>{selectedUser.department?.replace('_', ' ').toUpperCase()}</Typography>
                        </Box>
                      </Stack>
                    </Box>
                  )}
                </Grid>

                <Grid item xs={12} md={4}>
                  <Autocomplete
                    fullWidth
                    size="small"
                    options={accessPoints.filter(ap => ap.status === 'active')}
                    getOptionLabel={(ap) => ap.name}
                    value={selectedAp || null}
                    onChange={(_, value) => setCustomApId(value ? String(value.id) : '')}
                    renderInput={(params) => (
                      <TextField 
                        {...params} 
                        label="Target Access Point" 
                        placeholder="Search points..."
                        sx={{ 
                          '& .MuiOutlinedInput-root': { bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 2 }, 
                          '& .MuiInputLabel-root': { color: 'text.secondary' } 
                        }} 
                      />
                    )}
                  />

                  {/* AP HELPER CARD */}
                  {selectedAp && (
                    <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase' }}>Access Point Data</Typography>
                      <Stack spacing={1} sx={{ mt: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" sx={{ color: '#e2e8f0' }}>Min Clearance</Typography>
                          <Typography variant="body2" sx={{ color: '#f43f5e', fontWeight: 700 }}>Level {selectedAp.required_clearance}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" sx={{ color: '#e2e8f0' }}>Restricted Area?</Typography>
                          <Typography variant="body2" sx={{ color: selectedAp.is_restricted ? '#f43f5e' : '#4caf50', fontWeight: 700 }}>{selectedAp.is_restricted ? 'YES' : 'NO'}</Typography>
                        </Box>
                      </Stack>
                    </Box>
                  )}
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    type="datetime-local"
                    fullWidth
                    size="small"
                    label="Event Timestamp"
                    InputLabelProps={{ shrink: true }}
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 2 }, '& .MuiInputLabel-root': { color: 'text.secondary' } }}
                  />
                  
                  {/* WARNINGS PANEL */}
                  {preflightWarnings.length > 0 && (
                    <Box sx={{ mt: 2, p: 2, borderRadius: 2, border: '1px solid rgba(245, 158, 11, 0.2)', bgcolor: 'rgba(245, 158, 11, 0.05)' }}>
                       <Stack spacing={1}>
                        {preflightWarnings.map((w, idx) => (
                           <Typography key={idx} variant="caption" sx={{ color: '#f59e0b', display: 'flex', gap: 1, alignItems: 'center' }}>
                             <IconifyIcon icon="mdi:alert-outline" /> {w}
                           </Typography>
                        ))}
                       </Stack>
                    </Box>
                  )}
                </Grid>
              </Grid>

              <Box sx={{ mt: 'auto', pt: 3, display: 'flex', gap: 2 }}>
                <Button 
                  variant="contained" 
                  fullWidth 
                  size="large"
                  onClick={() => void handleRunSimulation()}
                  disabled={loading || bootstrapping}
                  startIcon={loading ? <CircularProgress size={20} /> : <IconifyIcon icon="mdi:play" />}
                  sx={{ borderRadius: 3, py: 1.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, boxShadow: '0 8px 16px rgba(0,0,0,0.4)', background: 'linear-gradient(90deg, #0ea5e9 0%, #0284c7 100%)' }}
                >
                  {loading ? 'Processing...' : 'Inject Access Request'}
                </Button>
                <Button 
                  variant="outlined" 
                  onClick={handleClearResults}
                  disabled={results.length === 0}
                  sx={{ borderRadius: 3, px: 3, borderColor: 'rgba(255,255,255,0.2)', color: 'text.secondary', '&:hover': { borderColor: '#fff', color: '#fff' } }}
                >
                  Clear Results
                </Button>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} md={3}>
            <Box sx={{ p: 3, borderRadius: 4, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Typography variant="subtitle2" sx={{ color: 'text.disabled', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, mb: 3 }}>
                Session Metrics
              </Typography>
              
              <Stack spacing={3}>
                <Box>
                  <Typography variant="h4" fontWeight={900}>{summary.total}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>Total Injections</Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="h6" fontWeight={800} sx={{ color: '#4caf50' }}>{summary.granted}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>Granted</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="h6" fontWeight={800} sx={{ color: '#f43f5e' }}>{summary.denied}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>Denied</Typography>
                  </Grid>
                </Grid>
                <Box>
                  <Typography variant="h6" fontWeight={800} sx={{ color: '#a78bfa' }}>{summary.avgRisk}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>Avg Risk Score</Typography>
                </Box>
              </Stack>
            </Box>
          </Grid>
        </Grid>

        {/* Results History */}
        {error && <Alert severity="error" variant="filled" sx={{ borderRadius: 3 }}>{error}</Alert>}
        
        {results.length > 0 && (
          <Box sx={{ animation: 'fadeIn 0.5s ease-out' }}>
            <Typography variant="h5" fontWeight={800} sx={{ mb: 2, color: '#fff', display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <IconifyIcon icon="mdi:history" sx={{ color: '#0ea5e9' }} /> Result Timeline
            </Typography>
            <TableContainer component={Paper} sx={{ borderRadius: 4, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
              <Table>
                <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
                  <TableRow>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 800 }}>Timestamp</TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 800 }}>Decision</TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 800 }}>Risk Score</TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 800 }}>Risk Level</TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 800 }}>Explanation</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {results.map((res, idx) => {
                    const riskLevel = getRiskLevel(res.risk_score || 0);
                    return (
                      <TableRow key={idx} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        <TableCell sx={{ color: '#fff', fontWeight: 500 }}>
                          {new Date(res.timestampUsed).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={res.decision?.toUpperCase()} 
                            size="small" 
                            sx={{ 
                              fontWeight: 900, 
                              bgcolor: res.decision === 'granted' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                              color: res.decision === 'granted' ? '#4caf50' : '#f43f5e',
                              border: `1px solid ${res.decision === 'granted' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 63, 94, 0.2)'}`
                            }} 
                          />
                        </TableCell>
                        <TableCell sx={{ color: '#fff', fontFamily: 'monospace', fontSize: '1.1rem' }}>
                          {(res.risk_score || 0).toFixed(4)}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={riskLevel.toUpperCase()} 
                            size="small" 
                            color={
                              riskLevel === 'low' ? 'success' : 
                              riskLevel === 'medium' ? 'warning' : 
                              riskLevel === 'high' ? 'error' : 'error'
                            }
                            variant={riskLevel === 'critical' ? 'filled' : 'outlined'}
                            sx={{ fontWeight: 800 }}
                          />
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem', maxWidth: 300 }}>
                          {res.reasoning || 'No details available'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Stack>
    </Box>
  );
};

export default SimulatorPage;
