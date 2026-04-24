import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Alert from '@mui/material/Alert';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';

import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import OnboardingLayout from 'components/onboarding/OnboardingLayout';
import CSVImporter from 'components/onboarding/CSVImporter';
import { OnboardingManager } from 'lib/onboarding';
import paths from 'routes/paths';
import IconifyIcon from 'components/base/IconifyIcon';
import type { AccessPointsData, AccessPoint } from 'types/onboarding';
import { premiumInputSx, formContainerSx, sectionHeaderSx, iconWrapperSx } from 'components/onboarding/PremiumStyles';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const Step4 = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [accessPoints, setAccessPoints] = useState<AccessPoint[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [formData, setFormData] = useState<Omit<AccessPoint, 'id'>>({
    name: '',
    type: 'door',
    building_id: '',
    status: 'active',
    is_restricted: false,
  });

  useEffect(() => {
    const stepData = OnboardingManager.loadStepData(4) as AccessPointsData | null;
    if (stepData?.access_points) {
      setAccessPoints(stepData.access_points);
    }
  }, []);

  const handleAddAccessPoint = () => {
    if (!formData.name || !formData.building_id) {
      setApiError('Name and building are required');
      return;
    }

    if (editingIndex !== null) {
      setAccessPoints(prev => {
        const updated = [...prev];
        updated[editingIndex] = { ...formData, id: updated[editingIndex].id };
        return updated;
      });
      setEditingIndex(null);
    } else {
      setAccessPoints(prev => [...prev, { ...formData, id: `ap_${Date.now()}` }]);
    }

    setFormData({
      name: '',
      type: 'door',
      building_id: '',
      status: 'active',
      is_restricted: false,
    });
    setShowDialog(false);
    setApiError('');
  };

  const handleCSVImport = async (data: Record<string, unknown>[]) => {
    try {
      setCsvLoading(true);
      const importedPoints = data.map((row, idx) => ({
        id: `ap_${Date.now()}_${idx}`,
        name: String(row.name || ''),
        type: (String(row.type || 'door').toLowerCase() as 'door' | 'reader' | 'gate') || 'door',
        building_id: String(row.building_id || ''),
        floor_id: row.floor_id ? String(row.floor_id) : undefined,
        room_id: row.room_id ? String(row.room_id) : undefined,
        zone_id: row.zone_id ? String(row.zone_id) : undefined,
        status: (String(row.status || 'active').toLowerCase() as 'active' | 'inactive' | 'maintenance') || 'active',
        required_clearance: row.required_clearance ? parseInt(String(row.required_clearance), 10) : undefined,
        is_restricted: String(row.is_restricted || 'false').toLowerCase() === 'true',
        ip_address: row.ip_address ? String(row.ip_address) : undefined,
      }));

      setAccessPoints(prev => [...prev, ...importedPoints]);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'CSV import failed');
    } finally {
      setCsvLoading(false);
    }
  };

  const handleNext = async () => {
    if (!accessPoints.length) {
      setApiError('At least one access point is required');
      return;
    }

    try {
      setLoading(true);
      const data: AccessPointsData = {
        access_points: accessPoints,
        csv_import_count: 0,
      };
      await OnboardingManager.saveDraft(4, data as unknown as Record<string, unknown>);
      navigate(paths.onboardingStep.replace(':step', '5'));
    } catch (err) {
      setApiError('Failed to save draft. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = async () => {
    try {
      setLoading(true);
      const data: AccessPointsData = {
        access_points: accessPoints,
        csv_import_count: 0,
      };
      await OnboardingManager.saveDraft(4, data as unknown as Record<string, unknown>);
    } finally {
      setLoading(false);
      navigate(paths.onboardingStep.replace(':step', '3'));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'error';
      case 'maintenance':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <OnboardingLayout
      currentStep={4}
      onNext={handleNext}
      onPrevious={handlePrevious}
      loading={loading}
      nextButtonLabel="Continue to Access Policies"
    >
      <Stack spacing={4} direction="column" sx={{ ...formContainerSx, maxWidth: 800 }}>
        {apiError && <Alert severity="error">{apiError}</Alert>}

        <Box>
          <Box sx={sectionHeaderSx}>
            <Box sx={iconWrapperSx('16, 185, 129')}>
              <IconifyIcon icon="mingcute:door-fill" fontSize={24} sx={{ color: '#10b981' }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 0.25, color: 'text.primary' }}>Access Points</Typography>
              <Typography variant="caption" color="text.secondary">Configure access points (doors, readers, gates).</Typography>
            </Box>
          </Box>

          <Box sx={{ p: 2.5, bgcolor: 'rgba(16, 185, 129, 0.05)', border: '1px solid', borderColor: 'rgba(16, 185, 129, 0.2)', borderRadius: 2.5, mb: 3 }}>
            <Stack spacing={1}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'rgba(16, 185, 129, 1)' }}>
                <IconifyIcon icon="mingcute:data-analytics-fill" fontSize={18} />
                ML Feature Collection
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ pl: 3 }}>
                Geographic coordinates (latitude/longitude) are used to compute <strong>geographic_impossibility</strong>, <strong>distance_between_scans_km</strong>, and <strong>velocity_km_per_min</strong> features for detecting physical impossibilities and badge cloning.
              </Typography>
            </Stack>
          </Box>

          <Box sx={{ borderBottom: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
            <Tabs 
              value={tabValue} 
              onChange={(_, newValue) => setTabValue(newValue)}
              sx={{
                '& .MuiTab-root': { color: 'text.secondary', fontWeight: 600, textTransform: 'none', fontSize: '0.95rem' },
                '& .Mui-selected': { color: 'primary.light' },
                '& .MuiTabs-indicator': { backgroundColor: 'primary.main', height: 3, borderRadius: '3px 3px 0 0' }
              }}
            >
              <Tab label="Manual Entry" />
              <Tab label="CSV Import" />
              <Tab label={`Review (${accessPoints.length})`} />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <Stack spacing={2} direction="column">
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowDialog(true)} sx={{ alignSelf: 'flex-start', borderRadius: 2 }}>
                Add Access Point
              </Button>

              {accessPoints.length === 0 ? (
                <Box sx={{ 
                  p: 4, textAlign: 'center', color: 'text.secondary', 
                  bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 3, 
                  border: '2px dashed rgba(255,255,255,0.1)' 
                }}>
                  <IconifyIcon icon="mingcute:sensor-line" fontSize={48} sx={{ opacity: 0.3, mb: 2 }} />
                  <Typography variant="subtitle1" fontWeight={600}>No access points added yet</Typography>
                </Box>
              ) : (
                <TableContainer component={Box} sx={{ 
                  bgcolor: 'rgba(255,255,255,0.02)', 
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 3,
                  overflow: 'hidden'
                }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.04)' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Name</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Restricted</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: 'text.primary', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                          Actions
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {accessPoints.map((ap, idx) => (
                        <TableRow key={ap.id}>
                          <TableCell sx={{ color: 'text.secondary', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{ap.name}</TableCell>
                          <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <Chip label={ap.type} size="small" variant="outlined" sx={{ color: 'text.secondary', borderColor: 'rgba(255,255,255,0.2)' }} />
                          </TableCell>
                          <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            <Chip label={ap.status} size="small" color={getStatusColor(ap.status) as any} />
                          </TableCell>
                          <TableCell sx={{ color: 'text.secondary', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{ap.is_restricted ? '✓' : '—'}</TableCell>
                          <TableCell align="right" sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <IconButton
                              size="small"
                              sx={{ color: 'error.main', '&:hover': { bgcolor: 'rgba(239,68,68,0.1)' } }}
                              onClick={() => setAccessPoints(prev => prev.filter((_, i) => i !== idx))}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Stack>
          </TabPanel>

          {/* CSV Import Tab */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{
              p: 3, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 3, 
              border: '1px solid rgba(255,255,255,0.08)'
            }}>
              <CSVImporter
                title="Import Access Points"
                description="Upload a CSV file with your access points. Required columns: name, type, building_id, status, is_restricted"
                headers={['name', 'type', 'building_id', 'status', 'is_restricted']}
                onImport={handleCSVImport}
                loading={csvLoading}
              />
            </Box>
          </TabPanel>

          {/* Review Tab */}
          <TabPanel value={tabValue} index={2}>
            {accessPoints.length === 0 ? (
              <Alert severity="warning">No access points defined yet</Alert>
            ) : (
              <TableContainer component={Box} sx={{ 
                bgcolor: 'rgba(255,255,255,0.02)', 
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 3,
                overflow: 'hidden'
              }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.04)' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, color: 'text.primary', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.primary', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.primary', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Building ID</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.primary', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.primary', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>IP Address</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {accessPoints.map(ap => (
                      <TableRow key={ap.id}>
                        <TableCell sx={{ color: 'text.secondary', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{ap.name}</TableCell>
                        <TableCell sx={{ color: 'text.secondary', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{ap.type}</TableCell>
                        <TableCell sx={{ color: 'text.secondary', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{ap.building_id}</TableCell>
                        <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          <Chip label={ap.status} size="small" color={getStatusColor(ap.status) as any} />
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{ap.ip_address || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>
        </Box>
      </Stack>

      <Dialog open={showDialog} onClose={() => setShowDialog(false)} maxWidth="sm" fullWidth PaperProps={{
        sx: { bgcolor: '#1a1a24', backgroundImage: 'none', border: '1px solid rgba(255,255,255,0.1)' }
      }}>
        <DialogTitle sx={{ color: 'text.primary', fontWeight: 700 }}>
          {editingIndex !== null ? 'Edit Access Point' : 'Add Access Point'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2.5} direction="column">
            <Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>Name *</Typography>
              <TextField
                fullWidth
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Door A-101"
                variant="outlined"
                sx={premiumInputSx}
              />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>Type *</Typography>
              <TextField
                select
                fullWidth
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))} // eslint-disable-line @typescript-eslint/no-explicit-any
                variant="outlined"
                sx={premiumInputSx}
                SelectProps={{
                  MenuProps: {
                    PaperProps: {
                      sx: {
                        bgcolor: '#1a1a24',
                        backgroundImage: 'none',
                        border: '1px solid rgba(255,255,255,0.1)',
                        '& .MuiMenuItem-root': {
                          color: 'text.primary',
                          '&:hover': {
                            bgcolor: 'rgba(255,255,255,0.1)',
                          },
                          '&.Mui-selected': {
                            bgcolor: 'rgba(59, 130, 246, 0.2)',
                            '&:hover': {
                              bgcolor: 'rgba(59, 130, 246, 0.3)',
                            },
                          },
                        },
                      },
                    },
                  },
                }}
              >
                <MenuItem value="door">Door</MenuItem>
                <MenuItem value="reader">Reader</MenuItem>
                <MenuItem value="gate">Gate</MenuItem>
              </TextField>
            </Box>
            <Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>Building ID *</Typography>
              <TextField
                fullWidth
                value={formData.building_id}
                onChange={(e) => setFormData(prev => ({ ...prev, building_id: e.target.value }))}
                placeholder="building_123"
                variant="outlined"
                sx={premiumInputSx}
              />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>Status *</Typography>
              <TextField
                select
                fullWidth
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))} // eslint-disable-line @typescript-eslint/no-explicit-any
                variant="outlined"
                sx={premiumInputSx}
                SelectProps={{
                  MenuProps: {
                    PaperProps: {
                      sx: {
                        bgcolor: '#1a1a24',
                        backgroundImage: 'none',
                        border: '1px solid rgba(255,255,255,0.1)',
                        '& .MuiMenuItem-root': {
                          color: 'text.primary',
                          '&:hover': {
                            bgcolor: 'rgba(255,255,255,0.1)',
                          },
                          '&.Mui-selected': {
                            bgcolor: 'rgba(59, 130, 246, 0.2)',
                            '&:hover': {
                              bgcolor: 'rgba(59, 130, 246, 0.3)',
                            },
                          },
                        },
                      },
                    },
                  },
                }}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="maintenance">Maintenance</MenuItem>
              </TextField>
            </Box>
            <Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>IP Address</Typography>
              <TextField
                fullWidth
                value={formData.ip_address || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, ip_address: e.target.value || undefined }))}
                placeholder="192.168.1.100"
                variant="outlined"
                sx={premiumInputSx}
              />
            </Box>

            <Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>Restricted Area</Typography>
              <TextField
                select
                fullWidth
                value={formData.is_restricted ? 'true' : 'false'}
                onChange={(e) => setFormData(prev => ({ ...prev, is_restricted: e.target.value === 'true' }))}
                variant="outlined"
                helperText="Is this access point for restricted areas?"
                sx={premiumInputSx}
                SelectProps={{
                  MenuProps: {
                    PaperProps: {
                      sx: {
                        bgcolor: '#1a1a24',
                        backgroundImage: 'none',
                        border: '1px solid rgba(255,255,255,0.1)',
                        '& .MuiMenuItem-root': {
                          color: 'text.primary',
                          '&:hover': {
                            bgcolor: 'rgba(255,255,255,0.1)',
                          },
                          '&.Mui-selected': {
                            bgcolor: 'rgba(59, 130, 246, 0.2)',
                            '&:hover': {
                              bgcolor: 'rgba(59, 130, 246, 0.3)',
                            },
                          },
                        },
                      },
                    },
                  },
                }}
              >
                <MenuItem value="false">No</MenuItem>
                <MenuItem value="true">Yes</MenuItem>
              </TextField>
            </Box>

            <Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>Latitude</Typography>
              <TextField
                fullWidth
                type="number"
                value={formData.latitude || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, latitude: e.target.value ? parseFloat(e.target.value) : undefined }))}
                placeholder="37.7749"
                variant="outlined"
                inputProps={{ step: 0.0001 }}
                helperText="For geographic distance calculations (model feature)"
                sx={premiumInputSx}
              />
            </Box>

            <Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>Longitude</Typography>
              <TextField
                fullWidth
                type="number"
                value={formData.longitude || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, longitude: e.target.value ? parseFloat(e.target.value) : undefined }))}
                placeholder="-122.4194"
                variant="outlined"
                inputProps={{ step: 0.0001 }}
                helperText="For geographic distance calculations (model feature)"
                sx={premiumInputSx}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setShowDialog(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button variant="contained" onClick={handleAddAccessPoint} sx={{ borderRadius: 2 }}>
            {editingIndex !== null ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </OnboardingLayout>
  );
};

export { Step4 as default };
