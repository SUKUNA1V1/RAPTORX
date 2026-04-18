import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';

import CollapseListItem from './list-items/CollapseListItem';
import ProfileListItem from './list-items/ProfileListItem';
import ListItem from './list-items/ListItem';
import { topListData, bottomListData, profileListData } from 'data/sidebarListData';
import { MenuItem } from 'routes/sitemap';
import { apiClient } from 'lib/api';

const POLL_INTERVAL_MS = 30_000; // refresh open-alert count every 30 s

const DrawerItems = () => {
  const [openAlertCount, setOpenAlertCount] = useState<number>(0);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const count = await apiClient.getOpenAlertsCount();
        setOpenAlertCount(count);
      } catch {
        // silently ignore — badge just won't show
      }
    };

    void fetchCount();
    const timer = setInterval(() => void fetchCount(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  // Inject the live badge count into the Alerts nav item
  const enrichedTopList: MenuItem[] = topListData.map((item) =>
    item.id === 'alerts' ? { ...item, badge: openAlertCount } : item,
  );

  return (
    <>
      <Stack
        pt={5}
        pb={4}
        px={3.5}
        position={'sticky'}
        top={0}
        bgcolor="info.darker"
        alignItems="center"
        justifyContent="flex-start"
        zIndex={1000}
      >
        <ButtonBase component={Link} href="/" disableRipple>
          <Typography variant="h5" color="text.primary" fontWeight={600} letterSpacing={1}>
            Raptor X
          </Typography>
        </ButtonBase>
      </Stack>

      <List component="nav" sx={{ px: 2.5, overflowY: 'auto', flex: 1, minHeight: 0 }}>
        {enrichedTopList.map((route, index) => (
          <ListItem key={index} {...route} />
        ))}
      </List>

      <Divider />

      <List component="nav" sx={{ px: 2.5 }}>
        {bottomListData.map((route) => {
          if (route.items) {
            return <CollapseListItem key={route.id} {...route} />;
          }
          return <ListItem key={route.id} {...route} />;
        })}
      </List>

      <List component="nav" sx={{ px: 2.5 }}>
        {profileListData && <ProfileListItem {...profileListData} />}
      </List>

      <Box px={3.5} py={2.5} width={1}>
        <Typography variant="caption" color="text.secondary">
          AI Access Control Ops
        </Typography>
      </Box>
    </>
  );
};

export default DrawerItems;
