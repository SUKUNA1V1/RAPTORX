import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
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
import type { AccessPointsData, AccessPoint } from 'types/onboarding';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box>{children}</Box>}
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
    const loadDraft = async () => {
      try {
        const draft = await OnboardingManager.loadDraft();
        if (draft && draft.step_number >= 4) {
          const data = draft.draft_data as unknown as AccessPointsData;
          setAccessPoints(data.access_points || []);
        }
      } catch {
        // Silently ignore
      }
    };
    void loadDraft();
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
      onPrevious={() => navigate(paths.onboardingStep.replace(':step', '3'))}
      loading={loading}
      nextButtonLabel="Continue to Access Policies"
    >
      <Stack spacing={3}>
        {/* Info Box */}
        <Card sx={{ p: 2, bgcolor: 'info.lighter', border: 'none' }}>
          <Box component="p" sx={{ m: 0 }}>
            Configure access points (doors, readers, gates). You can add them manually or import from CSV.
          </Box>
        </Card>

        {apiError && <Alert severity="error">{apiError}</Alert>}

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab label="Manual Entry" />
            <Tab label="CSV Import" />
            <Tab label={`Review (${accessPoints.length})`} />
          </Tabs>
        </Box>

        {/* Manual Entry Tab */}
        <TabPanel value={tabValue} index={0}>
          <Stack spacing={2}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowDialog(true)}>
              Add Access Point
            </Button>

            {accessPoints.length === 0 ? (
              <Card sx={{ p: 3, textAlign: 'center' }}>
                <Box component="p" sx={{ m: 0, color: 'text.secondary' }}>
                  No access points added yet.
                </Box>
              </Card>
            ) : (
              <TableContainer component={Card}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Restricted</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {accessPoints.map((ap, idx) => (
                      <TableRow key={ap.id}>
                        <TableCell>{ap.name}</TableCell>
                        <TableCell>
                          <Chip label={ap.type} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          <Chip label={ap.status} size="small" color={getStatusColor(ap.status) as any} />
                        </TableCell>
                        <TableCell>{ap.is_restricted ? '✓' : '—'}</TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            color="error"
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
          <CSVImporter
            title="Import Access Points"
            description="Upload a CSV file with your access points. Required columns: name, type, building_id, status, is_restricted"
            headers={['name', 'type', 'building_id', 'status', 'is_restricted']}
            onImport={handleCSVImport}
            loading={csvLoading}
          />
        </TabPanel>

        {/* Review Tab */}
        <TabPanel value={tabValue} index={2}>
          {accessPoints.length === 0 ? (
            <Alert severity="warning">No access points defined yet</Alert>
          ) : (
            <TableContainer component={Card}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Building ID</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>IP Address</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {accessPoints.map(ap => (
                    <TableRow key={ap.id}>
                      <TableCell>{ap.name}</TableCell>
                      <TableCell>{ap.type}</TableCell>
                      <TableCell>{ap.building_id}</TableCell>
                      <TableCell>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        <Chip label={ap.status} size="small" color={getStatusColor(ap.status) as any} />
                      </TableCell>
                      <TableCell>{ap.ip_address || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>
      </Stack>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onClose={() => setShowDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingIndex !== null ? 'Edit Access Point' : 'Add Access Point'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <TextField
              label="Name *"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Door A-101"
            />
            <TextField
              select
              label="Type *"
              fullWidth
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))} // eslint-disable-line @typescript-eslint/no-explicit-any
              SelectProps={{ native: true }}
            >
              <option value="door">Door</option>
              <option value="reader">Reader</option>
              <option value="gate">Gate</option>
            </TextField>
            <TextField
              label="Building ID *"
              fullWidth
              value={formData.building_id}
              onChange={(e) => setFormData(prev => ({ ...prev, building_id: e.target.value }))}
              placeholder="building_123"
            />
            <TextField
              select
              label="Status *"
              fullWidth
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))} // eslint-disable-line @typescript-eslint/no-explicit-any
              SelectProps={{ native: true }}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
            </TextField>
            <TextField
              label="IP Address"
              fullWidth
              value={formData.ip_address || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, ip_address: e.target.value || undefined }))}
              placeholder="192.168.1.100"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddAccessPoint}>
            {editingIndex !== null ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </OnboardingLayout>
  );
};

export { Step4 as default };
