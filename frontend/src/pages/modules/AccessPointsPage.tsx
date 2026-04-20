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
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import IconifyIcon from 'components/base/IconifyIcon';
import { AccessPointItem, apiClient } from 'lib/api';

const AccessPointsPage = () => {
  const [points, setPoints] = useState<AccessPointItem[]>([]);
  const [filteredPoints, setFilteredPoints] = useState<AccessPointItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter states
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Get unique values for filters
  const types = [...new Set(points.map(p => p.type))].sort();
  const buildings = [...new Set(points.map(p => p.building))].sort();
  const zones = [...new Set(points.map(p => p.zone).filter(Boolean))].sort() as string[];

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await apiClient.getAccessPoints();
        setPoints(data.items);
      } catch {
        setError('Failed to load access points from backend API.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = points;

    if (searchText) {
      const lower = searchText.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(lower));
    }

    if (typeFilter) {
      filtered = filtered.filter(p => p.type === typeFilter);
    }

    if (buildingFilter) {
      filtered = filtered.filter(p => p.building === buildingFilter);
    }

    if (zoneFilter) {
      filtered = filtered.filter(p => p.zone === zoneFilter);
    }

    if (statusFilter) {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    setFilteredPoints(filtered);
  }, [points, searchText, typeFilter, buildingFilter, zoneFilter, statusFilter]);

  return (
    <Stack spacing={4} sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 8px 32px rgba(0, 242, 254, 0.3)',
          }}
        >
          <IconifyIcon icon="mdi:door-open" sx={{ fontSize: '2rem' }} />
        </Box>
        <Box>
          <Typography variant="h3" fontWeight={800} sx={{ background: 'linear-gradient(to right, #fff, #a1a1aa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', mb: 0.5 }}>
            Access Points
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            Manage and view status of physical doors, turnstiles, and entry zones.
          </Typography>
        </Box>
      </Box>

      {/* Filters Section */}
      {!loading && !error && points.length > 0 && (
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
            <Grid item xs={12} sm={6} md={2.4}>
              <TextField
                fullWidth
                label="Search Name"
                size="small"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Type to search..."
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <TextField
                fullWidth
                label="Type"
                size="small"
                select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              >
                <MenuItem value="">All Types</MenuItem>
                {types.map(type => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <TextField
                fullWidth
                label="Building"
                size="small"
                select
                value={buildingFilter}
                onChange={(e) => setBuildingFilter(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              >
                <MenuItem value="">All Buildings</MenuItem>
                {buildings.map(building => (
                  <MenuItem key={building} value={building}>{building}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <TextField
                fullWidth
                label="Zone"
                size="small"
                select
                value={zoneFilter}
                onChange={(e) => setZoneFilter(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              >
                <MenuItem value="">All Zones</MenuItem>
                {zones.map(zone => (
                  <MenuItem key={zone} value={zone}>{zone}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <TextField
                fullWidth
                label="Status"
                size="small"
                select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              >
                <MenuItem value="">All Status</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </Box>
      )}

      {loading && (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 4, background: 'rgba(255, 255, 255, 0.01)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <CircularProgress size={48} sx={{ color: '#00f2fe' }} />
          <Typography variant="body1" sx={{ mt: 3, color: 'text.secondary', fontWeight: 500 }}>
            Loading access points...
          </Typography>
        </Paper>
      )}
      {error && <Alert severity="error" sx={{ borderRadius: 3, bgcolor: 'rgba(211, 47, 47, 0.1)', color: '#ff8a80' }}>{error}</Alert>}
      {!loading && !error && points.length === 0 && (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 4, bgcolor: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <IconifyIcon icon="mdi:inbox-outline" sx={{ fontSize: 3, color: 'text.disabled', mb: 2 }} />
          <Typography variant="body1" sx={{ color: 'text.secondary', mb: 1, fontWeight: 500 }}>
            No access points found.
          </Typography>
        </Paper>
      )}

      {!loading && !error && points.length > 0 && (
        <Stack spacing={2}>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            Showing {filteredPoints.length} of {points.length} access points
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
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>Building</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>Zone</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPoints.map((point) => {
                  const isActive = point.status === 'active';
                  return (
                    <TableRow 
                      key={point.id}
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
                      <TableCell sx={{ fontWeight: 600, color: '#e2e8f0' }}>{point.name}</TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{point.type}</TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>{point.building}</TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>{point.zone || '—'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={point.status.toUpperCase()} 
                          size="small" 
                          sx={{ 
                            bgcolor: isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                            color: isActive ? '#34d399' : '#fbbf24',
                            fontWeight: 800,
                            border: `1px solid ${isActive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                            borderRadius: 1.5,
                            boxShadow: isActive ? '0 0 10px rgba(16, 185, 129, 0.1)' : 'none'
                          }} 
                        />
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

export default AccessPointsPage;