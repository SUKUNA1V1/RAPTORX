import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Alert from '@mui/material/Alert';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import OnboardingLayout from 'components/onboarding/OnboardingLayout';
import CSVImporter from 'components/onboarding/CSVImporter';
import { OnboardingManager } from 'lib/onboarding';
import paths from 'routes/paths';
import IconifyIcon from 'components/base/IconifyIcon';
import type { Building, BuildingsZonesData, Floor, Room, Zone } from 'types/onboarding';
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

const departmentOptions = [
  'General',
  'Security',
  'HR',
  'IT',
  'Executive',
  'Lobby',
  'Parking',
];

const createId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const Step3 = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [csvLoading, setCsvLoading] = useState(false);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [showBuildingDialog, setShowBuildingDialog] = useState(false);
  const [showZoneDialog, setShowZoneDialog] = useState(false);
  const [selectedFloorForZone, setSelectedFloorForZone] = useState<{ floorId: string } | null>(null);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [buildingFormData, setBuildingFormData] = useState<Building>({
    name: '',
    number_of_floors: 1,
    rooms_per_floor: 10,
    building_type: 'office',
    floors: [],
  });
  const [floorFormData, setFloorFormData] = useState<{ name: string; number_of_rooms: number }>({
    name: '',
    number_of_rooms: 10,
  });
  const [zoneFormData, setZoneFormData] = useState<{
    name: string;
    department: string;
    min_clearance_level: number;
    typical_occupancy: number;
    is_restricted: boolean;
  }>({
    name: '',
    department: 'General',
    min_clearance_level: 1,
    typical_occupancy: 10,
    is_restricted: false,
  });

  useEffect(() => {
    const stepData = OnboardingManager.loadStepData(3) as BuildingsZonesData | null;
    if (stepData?.buildings) {
      setBuildings(stepData.buildings);
    }
  }, []);

  const resetBuildingForm = () => {
    setBuildingFormData({
      name: '',
      number_of_floors: 1,
      rooms_per_floor: 10,
      building_type: 'office',
      floors: [],
    });
    setFloorFormData({ name: '', number_of_rooms: 10 });
    setApiError('');
  };

  const resetZoneForm = () => {
    setZoneFormData({
      name: '',
      department: 'General',
      min_clearance_level: 1,
      typical_occupancy: 10,
      is_restricted: false,
    });
    setSelectedFloorForZone(null);
    setEditingZoneId(null);
  };

  const openAddZoneDialog = (floorId: string) => {
    setSelectedFloorForZone({ floorId });
    setEditingZoneId(null);
    setZoneFormData({
      name: '',
      department: 'General',
      min_clearance_level: 1,
      typical_occupancy: 10,
      is_restricted: false,
    });
    setShowZoneDialog(true);
  };

  const openEditZoneDialog = (floorId: string | undefined, zone: Zone) => {
    if (!floorId || !zone.id) {
      return;
    }

    setSelectedFloorForZone({ floorId });
    setEditingZoneId(zone.id);
    setZoneFormData({
      name: zone.name,
      department: zone.department || 'General',
      min_clearance_level: zone.min_clearance_level || 1,
      typical_occupancy: zone.typical_occupancy || 0,
      is_restricted: zone.is_restricted || false,
    });
    setShowZoneDialog(true);
  };

  const handleAddBuilding = () => {
    if (!buildingFormData.name.trim()) {
      setApiError('Building name is required');
      return;
    }

    const newBuilding: Building = {
      ...buildingFormData,
      id: createId('building'),
      floors: buildingFormData.floors || [],
    };

    setBuildings(prev => [...prev, newBuilding]);
    resetBuildingForm();
    setShowBuildingDialog(false);
  };

  const handleAddFloor = () => {
    if (!floorFormData.name.trim()) {
      setApiError('Floor name is required');
      return;
    }

    const newFloor: Floor = {
      id: createId('floor'),
      name: floorFormData.name.trim(),
      number_of_rooms: floorFormData.number_of_rooms,
      zones: [],
    };

    setBuildingFormData(prev => ({
      ...prev,
      floors: [...(prev.floors || []), newFloor],
    }));
    setFloorFormData({ name: '', number_of_rooms: 10 });
    setApiError('');
  };

  const handleRemoveFloor = (floorId: string | undefined) => {
    setBuildingFormData(prev => ({
      ...prev,
      floors: prev.floors?.filter(floor => floor.id !== floorId) || [],
    }));
  };

  const handleSaveZone = () => {
    if (!selectedFloorForZone || !zoneFormData.name.trim()) {
      setApiError('Please enter a zone name');
      return;
    }

    const upsertZoneInFloor = (floor: Floor): Floor => {
      const existingZones = floor.zones || [];

      if (editingZoneId) {
        return {
          ...floor,
          zones: existingZones.map(zone =>
            zone.id === editingZoneId
              ? {
                  ...zone,
                  name: zoneFormData.name.trim(),
                  department: zoneFormData.department,
                  min_clearance_level: zoneFormData.min_clearance_level,
                  typical_occupancy: zoneFormData.typical_occupancy,
                  is_restricted: zoneFormData.is_restricted,
                }
              : zone
          ),
        };
      }

      const newZone: Zone = {
        id: createId('zone'),
        name: zoneFormData.name.trim(),
        floor_id: floor.id,
        department: zoneFormData.department,
        min_clearance_level: zoneFormData.min_clearance_level,
        typical_occupancy: zoneFormData.typical_occupancy,
        is_restricted: zoneFormData.is_restricted,
        rooms: [],
      };

      return {
        ...floor,
        zones: [...existingZones, newZone],
      };
    };

    setBuildingFormData(prev => ({
      ...prev,
      floors: (prev.floors || []).map(floor => {
        if (floor.id !== selectedFloorForZone.floorId) {
          return floor;
        }

        return upsertZoneInFloor(floor);
      }),
    }));

    setBuildings(prev =>
      prev.map(building => ({
        ...building,
        floors: (building.floors || []).map(floor =>
          floor.id === selectedFloorForZone.floorId ? upsertZoneInFloor(floor) : floor
        ),
      }))
    );

    resetZoneForm();
    setShowZoneDialog(false);
    setApiError('');
  };

  const handleDeleteZone = (floorId: string | undefined, zoneId: string | undefined) => {
    if (!floorId || !zoneId) {
      return;
    }

    setBuildingFormData(prev => ({
      ...prev,
      floors: (prev.floors || []).map(floor =>
        floor.id === floorId
          ? {
              ...floor,
              zones: (floor.zones || []).filter(zone => zone.id !== zoneId),
            }
          : floor
      ),
    }));

    setBuildings(prev =>
      prev.map(building => ({
        ...building,
        floors: (building.floors || []).map(floor =>
          floor.id === floorId
            ? {
                ...floor,
                zones: (floor.zones || []).filter(zone => zone.id !== zoneId),
              }
            : floor
        ),
      }))
    );
  };

  const saveCurrentStep = async () => {
    const data: BuildingsZonesData = {
      buildings,
      csv_import_count: 0,
    };
    await OnboardingManager.saveDraft(3, data);
  };

  const handleCSVImport = async (rows: Record<string, unknown>[]) => {
    try {
      setCsvLoading(true);
      const buildingMap = new Map<string, Building>();

      rows.forEach(row => {
        const buildingName = String(row.building_name || '').trim();
        const floorName = String(row.floor_name || '').trim();
        const zoneName = String(row.zone_name || '').trim();
        const roomName = String(row.room_name || '').trim();

        if (!buildingName) {
          return;
        }

        if (!buildingMap.has(buildingName)) {
          buildingMap.set(buildingName, {
            id: createId('building'),
            name: buildingName,
            floors: [],
          });
        }

        const building = buildingMap.get(buildingName)!;
        let floor = building.floors?.find(item => item.name === floorName);

        if (!floor) {
          floor = {
            id: createId('floor'),
            name: floorName || 'Floor',
            zones: [],
          };
          building.floors = [...(building.floors || []), floor];
        }

        let zone = floor.zones?.find(item => item.name === zoneName);
        if (!zone) {
          zone = {
            id: createId('zone'),
            name: zoneName || 'Zone',
            floor_id: floor.id,
            rooms: [],
          };
          floor.zones = [...(floor.zones || []), zone];
        }

        if (roomName) {
          const roomExists = zone.rooms?.some(room => room.name === roomName);
          if (!roomExists) {
            const room: Room = { name: roomName, zone_id: zone.id };
            zone.rooms = [...(zone.rooms || []), room];
          }
        }
      });

      setBuildings(prev => [...prev, ...Array.from(buildingMap.values())]);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'CSV import failed');
    } finally {
      setCsvLoading(false);
    }
  };

  const handleNext = async () => {
    if (!buildings.length) {
      setApiError('At least one building is required');
      return;
    }

    try {
      setLoading(true);
      await saveCurrentStep();
      navigate(paths.onboardingStep.replace(':step', '4'));
    } catch {
      setApiError('Failed to save draft. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = async () => {
    try {
      setLoading(true);
      await saveCurrentStep();
    } finally {
      setLoading(false);
      navigate(paths.onboardingStep.replace(':step', '2'));
    }
  };

  return (
    <OnboardingLayout
      currentStep={3}
      onNext={handleNext}
      onPrevious={handlePrevious}
      loading={loading}
      nextButtonLabel="Continue to Access Points"
    >
      <Stack spacing={4} direction="column" sx={formContainerSx}>
        {apiError && <Alert severity="error">{apiError}</Alert>}

        <Box>
          <Box sx={sectionHeaderSx}>
            <Box sx={iconWrapperSx('234, 179, 8')}>
              <IconifyIcon icon="mingcute:department-fill" fontSize={24} sx={{ color: '#eab308' }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 0.25, color: 'text.primary' }}>Buildings & Zones</Typography>
              <Typography variant="caption" color="text.secondary">Define buildings, floors, departments, and restricted zones.</Typography>
            </Box>
          </Box>

          <Box sx={{ p: 2.5, bgcolor: 'rgba(168, 85, 247, 0.05)', border: '1px solid', borderColor: 'rgba(168, 85, 247, 0.2)', borderRadius: 2.5, mb: 3 }}>
            <Stack spacing={1}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'rgba(168, 85, 247, 1)' }}>
                <IconifyIcon icon="mingcute:data-analytics-fill" fontSize={18} />
                ML Feature Collection
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ pl: 3 }}>
                Building and zone structure helps the model learn location patterns, department boundaries, zone clearance mismatches, and restricted area behavior.
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
                '& .MuiTabs-indicator': { backgroundColor: 'primary.main', height: 3, borderRadius: '3px 3px 0 0' },
              }}
            >
              <Tab label="Manual Entry" />
              <Tab label="CSV Import" />
              <Tab label={`Review List (${buildings.length})`} />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <Stack spacing={2}>
              {buildings.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary', bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 3, border: '2px dashed rgba(255,255,255,0.1)' }}>
                  <IconifyIcon icon="mingcute:building-3-line" fontSize={48} sx={{ opacity: 0.3, mb: 2 }} />
                  <Typography variant="subtitle1" fontWeight={600}>No buildings mapped yet</Typography>
                  <Typography variant="body2" sx={{ mb: 3 }}>Add your first building to start mapping your access control topology.</Typography>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowBuildingDialog(true)} sx={{ borderRadius: 2 }}>
                    Add Building
                  </Button>
                </Box>
              ) : (
                <Stack spacing={2}>
                  {buildings.map(building => (
                    <Box key={building.id} sx={{ p: 2.5, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 2.5, border: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" color="text.primary" fontWeight={700}>{building.name}</Typography>
                        <Stack direction="row" spacing={2} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                          <Typography variant="caption" color="text.secondary"><strong>Floors:</strong> {building.floors?.length || 0}</Typography>
                          <Typography variant="caption" color="text.secondary"><strong>Type:</strong> {building.building_type || 'office'}</Typography>
                        </Stack>
                      </Box>
                      <IconButton size="small" sx={{ color: 'error.main' }} onClick={() => setBuildings(prev => prev.filter(item => item.id !== building.id))}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                  <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setShowBuildingDialog(true)} sx={{ borderRadius: 2.5, borderStyle: 'dashed', borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)', color: 'text.primary', opacity: 0.8 }}>
                    Add Another Building
                  </Button>
                </Stack>
              )}
            </Stack>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Box sx={{ p: 3, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)' }}>
              <CSVImporter
                title="Import Buildings & Zones"
                description="Upload a CSV file with building_name, floor_name, zone_name, and room_name columns."
                headers={['building_name', 'floor_name', 'zone_name', 'room_name']}
                onImport={handleCSVImport}
                loading={csvLoading}
              />
            </Box>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Stack spacing={2}>
              {buildings.map(building => (
                <Box key={building.id} sx={{ p: 2.5, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 2.5, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="subtitle1" color="text.primary" fontWeight={700}>{building.name}</Typography>
                    <IconButton size="small" sx={{ color: 'error.main' }} onClick={() => setBuildings(prev => prev.filter(item => item.id !== building.id))}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    {building.floors?.length || 0} floor(s) | {building.building_type || 'office'}
                  </Typography>
                  <Stack spacing={1.2}>
                    {building.floors?.map(floor => (
                      <Box key={floor.id} sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600 }}>{floor.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{floor.number_of_rooms || 0} rooms</Typography>
                          </Box>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              if (building.id && floor.id) {
                                openAddZoneDialog(floor.id);
                              }
                            }}
                          >
                            Add Zone
                          </Button>
                        </Box>
                        <Stack spacing={1} sx={{ mt: 1.5 }}>
                          {floor.zones?.map(zone => (
                            <Box key={zone.id} sx={{ p: 1, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 500 }}>{zone.name}</Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.75rem' }}>
                                  Dept: {zone.department || 'N/A'} | Level: {zone.min_clearance_level || 1} | Occupancy: {zone.typical_occupancy || 0}
                                </Typography>
                              </Box>
                              <Button size="small" variant="text" onClick={() => openEditZoneDialog(floor.id, zone)} sx={{ minWidth: 'auto', px: 1 }}>Edit</Button>
                              <IconButton size="small" onClick={() => handleDeleteZone(floor.id, zone.id)} sx={{ color: 'error.main' }}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              ))}
            </Stack>
          </TabPanel>
        </Box>
      </Stack>

      <Dialog
        open={showBuildingDialog}
        onClose={() => {
          setShowBuildingDialog(false);
          resetBuildingForm();
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: '#1a1a24', backgroundImage: 'none', border: '1px solid rgba(255,255,255,0.1)' } }}
      >
        <DialogTitle sx={{ color: 'text.primary', fontWeight: 700 }}>Add Building Details</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>Building Name *</Typography>
              <TextField fullWidth placeholder="e.g. Main Office HQ" variant="outlined" value={buildingFormData.name} onChange={(e) => setBuildingFormData(prev => ({ ...prev, name: e.target.value }))} sx={premiumInputSx} />
            </Box>

            <Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>Building Type</Typography>
              <TextField
                select
                fullWidth
                variant="outlined"
                value={buildingFormData.building_type || 'office'}
                onChange={(e) => setBuildingFormData(prev => ({ ...prev, building_type: e.target.value }))}
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
                <MenuItem value="office">Office</MenuItem>
                <MenuItem value="hospital">Hospital</MenuItem>
                <MenuItem value="factory">Factory</MenuItem>
                <MenuItem value="retail">Retail</MenuItem>
                <MenuItem value="data_center">Data Center</MenuItem>
                <MenuItem value="research">Research</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </TextField>
            </Box>

            <Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>Number of Floors</Typography>
              <TextField fullWidth type="number" variant="outlined" value={buildingFormData.number_of_floors || 1} onChange={(e) => setBuildingFormData(prev => ({ ...prev, number_of_floors: parseInt(e.target.value, 10) || 1 }))} inputProps={{ min: 1 }} sx={premiumInputSx} />
            </Box>

            <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.08)' }} />

            <Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1.5 }}>Floors & Room Configuration</Typography>
              <Stack spacing={1.5} sx={{ mb: 2 }}>
                {buildingFormData.floors?.map(floor => (
                  <Box key={floor.id} sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>{floor.name}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{floor.number_of_rooms || 0} rooms</Typography>
                    </Box>
                    <IconButton size="small" onClick={() => handleRemoveFloor(floor.id)} sx={{ color: 'error.main' }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Stack>

              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <TextField fullWidth placeholder="e.g. Floor 1, Level 2" variant="outlined" size="small" value={floorFormData.name} onChange={(e) => setFloorFormData(prev => ({ ...prev, name: e.target.value }))} sx={premiumInputSx} />
                <TextField type="number" placeholder="Rooms" variant="outlined" size="small" value={floorFormData.number_of_rooms} onChange={(e) => setFloorFormData(prev => ({ ...prev, number_of_rooms: parseInt(e.target.value, 10) || 1 }))} inputProps={{ min: 1 }} sx={{ ...premiumInputSx, width: '100px' }} />
                <Button variant="outlined" size="small" onClick={handleAddFloor} sx={{ borderRadius: 1.5 }}>Add Floor</Button>
              </Stack>
            </Box>

            <Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>Zones by Floor</Typography>
              {buildingFormData.floors?.length ? (
                <Stack spacing={1.5}>
                  {buildingFormData.floors.map(floor => (
                    <Box key={floor.id} sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1.5, border: '1px solid rgba(255,255,255,0.1)' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>{floor.name}</Typography>
                        <Button size="small" variant="outlined" onClick={() => {
                          if (floor.id) {
                            openAddZoneDialog(floor.id);
                          }
                        }} sx={{ borderRadius: 1 }}>Add Zone</Button>
                      </Box>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{floor.zones?.length || 0} zones</Typography>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>Add floors first to configure zones</Typography>
              )}
            </Box>

            <Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>Address</Typography>
              <TextField fullWidth placeholder="e.g. 123 Main St" variant="outlined" value={buildingFormData.address || ''} onChange={(e) => setBuildingFormData(prev => ({ ...prev, address: e.target.value }))} sx={premiumInputSx} />
            </Box>

            <Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>City</Typography>
              <TextField fullWidth placeholder="e.g. San Francisco" variant="outlined" value={buildingFormData.city || ''} onChange={(e) => setBuildingFormData(prev => ({ ...prev, city: e.target.value }))} sx={premiumInputSx} />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => { setShowBuildingDialog(false); resetBuildingForm(); }} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button variant="contained" onClick={handleAddBuilding} sx={{ borderRadius: 2 }}>Create Building</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showZoneDialog}
        onClose={() => {
          setShowZoneDialog(false);
          resetZoneForm();
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: '#1a1a24', backgroundImage: 'none', border: '1px solid rgba(255,255,255,0.1)' } }}
      >
        <DialogTitle sx={{ color: 'text.primary', fontWeight: 700 }}>Add Zone Details</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>Zone Name *</Typography>
              <TextField fullWidth placeholder="e.g. Executive Suite" variant="outlined" value={zoneFormData.name} onChange={(e) => setZoneFormData(prev => ({ ...prev, name: e.target.value }))} sx={premiumInputSx} />
            </Box>

            <Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>Department</Typography>
              <TextField
                select
                fullWidth
                variant="outlined"
                value={zoneFormData.department}
                onChange={(e) => setZoneFormData(prev => ({ ...prev, department: e.target.value }))}
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
                {departmentOptions.map((option: string) => (
                  <MenuItem key={option} value={option}>{option}</MenuItem>
                ))}
              </TextField>
            </Box>

            <Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>Minimum Clearance Level (1-10)</Typography>
              <TextField type="number" fullWidth variant="outlined" value={zoneFormData.min_clearance_level} onChange={(e) => setZoneFormData(prev => ({ ...prev, min_clearance_level: Math.min(10, Math.max(1, parseInt(e.target.value, 10) || 1)) }))} inputProps={{ min: 1, max: 10 }} sx={premiumInputSx} />
            </Box>

            <Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>Typical Occupancy</Typography>
              <TextField type="number" fullWidth variant="outlined" value={zoneFormData.typical_occupancy} onChange={(e) => setZoneFormData(prev => ({ ...prev, typical_occupancy: parseInt(e.target.value, 10) || 0 }))} inputProps={{ min: 0 }} sx={premiumInputSx} />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Checkbox checked={zoneFormData.is_restricted} onChange={(e) => setZoneFormData(prev => ({ ...prev, is_restricted: e.target.checked }))} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>Mark this zone as restricted</Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => { setShowZoneDialog(false); resetZoneForm(); }} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveZone} sx={{ borderRadius: 2 }}>{editingZoneId ? 'Save Zone' : 'Add Zone'}</Button>
        </DialogActions>
      </Dialog>
    </OnboardingLayout>
  );
};

export { Step3 as default };
