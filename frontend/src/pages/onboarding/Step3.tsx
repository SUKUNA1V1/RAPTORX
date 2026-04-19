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
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import FormLabel from '@mui/material/FormLabel';
import DeleteIcon from '@mui/icons-material/Delete';

import AddIcon from '@mui/icons-material/Add';
import OnboardingLayout from 'components/onboarding/OnboardingLayout';
import CSVImporter from 'components/onboarding/CSVImporter';
import { OnboardingManager } from 'lib/onboarding';
import paths from 'routes/paths';
import type { BuildingsZonesData, Building } from 'types/onboarding';

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

const Step3 = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [buildings, setBuildings] = useState<Building[]>([]);

  const [showBuildingDialog, setShowBuildingDialog] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);

  useEffect(() => {
    const loadDraft = async () => {
      try {
        const draft = await OnboardingManager.loadDraft();
        if (draft && draft.step_number >= 3) {
          const data = draft.draft_data as unknown as BuildingsZonesData;
          setBuildings(data.buildings || []);
        }
      } catch {
        // Silently ignore
      }
    };
    void loadDraft();
  }, []);

  const handleAddBuilding = async (building: Building) => {
    if (!building.name) {
      setApiError('Building name is required');
      return;
    }
    setBuildings(prev => [...prev, { ...building, id: `building_${Date.now()}` }]);
    setShowBuildingDialog(false);
  };

  const handleCSVImport = async (data: Record<string, unknown>[]) => {
    try {
      setCsvLoading(true);
      // Parse CSV data into building hierarchy
      const buildingMap = new Map<string, Building>();

      data.forEach(row => {
        const buildingName = String(row.building_name || '');
        const floorName = String(row.floor_name || '');
        const zoneName = String(row.zone_name || '');
        const roomName = String(row.room_name || '');

        if (!buildingMap.has(buildingName)) {
          buildingMap.set(buildingName, {
            name: buildingName,
            id: `building_${Date.now()}_${Math.random()}`,
            floors: [],
          });
        }

        const building = buildingMap.get(buildingName)!;
        let floor = building.floors?.find(f => f.name === floorName);
        if (!floor) {
          floor = {
            name: floorName,
            id: `floor_${Date.now()}_${Math.random()}`,
            building_id: building.id,
            zones: [],
          };
          if (!building.floors) building.floors = [];
          building.floors.push(floor);
        }

        let zone = floor.zones?.find(z => z.name === zoneName);
        if (!zone) {
          zone = {
            name: zoneName,
            id: `zone_${Date.now()}_${Math.random()}`,
            floor_id: floor.id,
            rooms: [],
          };
          if (!floor.zones) floor.zones = [];
          floor.zones.push(zone);
        }

        if (roomName) {
          const room = zone.rooms?.find(r => r.name === roomName);
          if (!room) {
            if (!zone.rooms) zone.rooms = [];
            zone.rooms.push({
              name: roomName,
              zone_id: zone.id,
            });
          }
        }
      });

      const importedBuildings = Array.from(buildingMap.values());
      setBuildings(prev => [...prev, ...importedBuildings]);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'CSV import failed');
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
      const data: BuildingsZonesData = {
        buildings,
        csv_import_count: 0,
      };
      await OnboardingManager.saveDraft(3, data as unknown as Record<string, unknown>);
      navigate(paths.onboardingStep.replace(':step', '4'));
    } catch (err) {
      setApiError('Failed to save draft. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingLayout
      currentStep={3}
      onNext={handleNext}
      onPrevious={() => navigate(paths.onboardingStep.replace(':step', '2'))}
      loading={loading}
      nextButtonLabel="Continue to Access Points"
    >
      <Stack spacing={3}>
        {/* Info Box */}
        <Card sx={{ p: 2, bgcolor: 'info.lighter', border: 'none' }}>
          <Box component="p" sx={{ m: 0 }}>
            Define your physical infrastructure: buildings, floors, zones, and rooms. You can add them manually or import from CSV.
          </Box>
        </Card>

        {apiError && <Alert severity="error">{apiError}</Alert>}

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab label="Manual Entry" />
            <Tab label="CSV Import" />
            <Tab label={`Review (${buildings.length})`} />
          </Tabs>
        </Box>

        {/* Manual Entry Tab */}
        <TabPanel value={tabValue} index={0}>
          <Stack spacing={2}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowBuildingDialog(true)}>
              Add Building
            </Button>

            {buildings.length === 0 ? (
              <Card sx={{ p: 3, textAlign: 'center' }}>
                <Box component="p" sx={{ m: 0, color: 'text.secondary' }}>
                  No buildings added yet. Add one to get started.
                </Box>
              </Card>
            ) : (
              <List>
                {buildings.map(building => (
                  <Card key={building.id} sx={{ mb: 1, p: 1.5 }}>
                    <ListItem
                      disablePadding
                      secondaryAction={
                        <IconButton edge="end" size="small" color="error" onClick={() => setBuildings(prev => prev.filter(b => b.id !== building.id))}>
                          <DeleteIcon />
                        </IconButton>
                      }
                    >
                      <ListItemText
                        primary={<strong>{building.name}</strong>}
                        secondary={`${building.floors?.length || 0} floor(s)`}
                      />
                    </ListItem>
                  </Card>
                ))}
              </List>
            )}
          </Stack>
        </TabPanel>

        {/* CSV Import Tab */}
        <TabPanel value={tabValue} index={1}>
          <CSVImporter
            title="Import Buildings & Zones"
            description="Upload a CSV file with your building hierarchy. Required columns: building_name, floor_name, zone_name"
            headers={['building_name', 'floor_name', 'zone_name', 'room_name']}
            onImport={handleCSVImport}
            loading={csvLoading}
          />
        </TabPanel>

        {/* Review Tab */}
        <TabPanel value={tabValue} index={2}>
          {buildings.length === 0 ? (
            <Alert severity="warning">No buildings defined yet</Alert>
          ) : (
            <Stack spacing={2}>
              {buildings.map(building => (
                <Card key={building.id} sx={{ p: 2 }}>
                  <Stack spacing={1}>
                    <FormLabel sx={{ fontWeight: 600 }}>📍 {building.name}</FormLabel>
                    {building.floors?.map(floor => (
                      <Box key={floor.id} sx={{ pl: 2 }}>
                        <FormLabel sx={{ fontSize: '0.9rem' }}>🏢 {floor.name}</FormLabel>
                        <Stack sx={{ pl: 2 }}>
                          {floor.zones?.map(zone => (
                            <Box key={zone.id}>
                              <FormLabel sx={{ fontSize: '0.85rem' }}>🔲 {zone.name}</FormLabel>
                              {zone.rooms?.length ? (
                                <Box sx={{ pl: 2, fontSize: '0.8rem', color: 'text.secondary' }}>
                                  Rooms: {zone.rooms.map(r => r.name).join(', ')}
                                </Box>
                              ) : null}
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </Card>
              ))}
            </Stack>
          )}
        </TabPanel>
      </Stack>

      {/* Building Dialog */}
      <Dialog open={showBuildingDialog} onClose={() => setShowBuildingDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Building</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            autoFocus
            label="Building Name"
            fullWidth
            placeholder="Main Office"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                const value = (e.target as HTMLInputElement).value;
                handleAddBuilding({ name: value, floors: [] });
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowBuildingDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              const input = document.querySelector('input[placeholder="Main Office"]') as HTMLInputElement;
              if (input?.value) {
                handleAddBuilding({ name: input.value, floors: [] });
              }
            }}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </OnboardingLayout>
  );
};

export { Step3 as default };
