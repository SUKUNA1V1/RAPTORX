/**
 * Role selector component for admin role assignment
 */
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';

interface RoleOption {
  value: 'super_admin' | 'admin';
  title: string;
  description: string;
  permissions: string[];
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    value: 'super_admin',
    title: 'Super Admin',
    description: 'Full system access. Can manage all configurations, users, and settings.',
    permissions: [
      'Manage all settings',
      'Create/delete organizations',
      'View all system logs',
      'Configure policies',
      'Manage users',
      'Access all audit reports',
    ],
  },
  {
    value: 'admin',
    title: 'Admin',
    description: 'Organizational admin. Can manage access points, policies, and users within organization.',
    permissions: [
      'Manage access points',
      'Configure policies',
      'Manage users',
      'View organization logs',
      'Configure buildings/zones',
      'Generate reports',
    ],
  },
];

interface RoleSelectorProps {
  value: 'super_admin' | 'admin';
  onChange: (role: 'super_admin' | 'admin') => void;
  disabled?: boolean;
}

const RoleSelector = ({ value, onChange, disabled = false }: RoleSelectorProps) => {
  return (
    <RadioGroup value={value} onChange={(e) => onChange(e.target.value as 'super_admin' | 'admin')}>
      <Grid container spacing={2}>
        {ROLE_OPTIONS.map((role) => (
          <Grid item xs={12} md={6} key={role.value}>
            <Card
              sx={{
                p: 2.5,
                cursor: disabled ? 'default' : 'pointer',
                border: '2px solid',
                borderColor: value === role.value ? 'primary.main' : 'divider',
                bgcolor: value === role.value ? 'primary.lighter' : 'background.paper',
                transition: 'all 0.2s',
                '&:hover': disabled ? {} : { borderColor: 'primary.main', boxShadow: 2 },
              }}
              onClick={() => !disabled && onChange(role.value)}
            >
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <FormControlLabel
                    value={role.value}
                    control={<Radio disabled={disabled} />}
                    label={
                      <Stack spacing={0.5}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {role.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {role.description}
                        </Typography>
                      </Stack>
                    }
                    sx={{ m: 0, flex: 1 }}
                  />
                </Box>

                <Box sx={{ pl: 4 }}>
                  <Typography variant="caption" fontWeight={600} display="block" sx={{ mb: 1 }}>
                    Permissions:
                  </Typography>
                  <Stack component="ul" spacing={0.5} sx={{ pl: 1, m: 0 }}>
                    {role.permissions.map((perm, idx) => (
                      <Typography component="li" key={idx} variant="caption" sx={{ color: 'text.secondary' }}>
                        {perm}
                      </Typography>
                    ))}
                  </Stack>
                </Box>
              </Stack>
            </Card>
          </Grid>
        ))}
      </Grid>
    </RadioGroup>
  );
};

export default RoleSelector;
