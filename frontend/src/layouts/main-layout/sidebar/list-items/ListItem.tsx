import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MenuItem } from 'routes/sitemap';
import Link from '@mui/material/Link';
import Box from '@mui/material/Box';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import IconifyIcon from 'components/base/IconifyIcon';

const ListItem = ({ subheader, icon, path, active, badge }: MenuItem) => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const isCurrentRoute = path ? location.pathname === path : false;
  const isActive = active || isCurrentRoute;

  const handleClick = () => {
    setOpen(!open);
  };

  return (
    <ListItemButton
      component={Link}
      href={path}
      onClick={handleClick}
      sx={{ opacity: isActive ? 1 : 0.7 }}
    >
      <ListItemIcon sx={{ minWidth: '40px', display: 'flex', alignItems: 'center' }}>
        {icon && (
          <IconifyIcon
            icon={icon}
            sx={{
              fontSize: '1.5rem',
              color: isActive ? 'primary.main' : 'text.secondary',
            }}
          />
        )}
      </ListItemIcon>
      <ListItemText
        primary={subheader}
        sx={{
          '& .MuiListItemText-primary': {
            color: isActive ? 'primary.main' : null,
          },
        }}
      />
      {/* Open-alerts badge */}
      {typeof badge === 'number' && badge > 0 && (
        <Box
          component="span"
          sx={{
            ml: 1,
            minWidth: 20,
            height: 20,
            px: 0.75,
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #ff0844 0%, #ff6b6b 100%)',
            color: '#fff',
            fontSize: '0.68rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            boxShadow: '0 2px 8px rgba(255, 8, 68, 0.45)',
            animation: 'pulse-badge 2s ease-in-out infinite',
            '@keyframes pulse-badge': {
              '0%, 100%': { boxShadow: '0 2px 8px rgba(255, 8, 68, 0.45)' },
              '50%': { boxShadow: '0 2px 14px rgba(255, 8, 68, 0.75)' },
            },
          }}
        >
          {badge > 99 ? '99+' : badge}
        </Box>
      )}
    </ListItemButton>
  );
};

export default ListItem;
