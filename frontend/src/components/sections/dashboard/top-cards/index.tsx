import { useEffect, useState } from 'react';
import Grid from '@mui/material/Grid';
import TopCard from './TopCard';
import { apiClient, OverviewStats } from 'lib/api';

const TopCards = () => {
  const [stats, setStats] = useState<OverviewStats | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await apiClient.getOverview();
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
    };
    void fetchData();
  }, []);

  // Compute real rates from live data
  const total = stats?.total_accesses_today ?? 0;
  const grantRate = total > 0 ? ((stats!.granted_today / total) * 100).toFixed(1) + '%' : '—';
  const denyRate = total > 0 ? ((stats!.denied_today / total) * 100).toFixed(1) + '%' : '—';
  const delayRate = total > 0 ? ((stats!.delayed_today / total) * 100).toFixed(1) + '%' : '—';
  // Compact alert count for the fixed-width RateChip
  const alertCount = stats?.active_alerts_count ?? 0;
  const alertRate = alertCount > 0 ? `${alertCount} alert${alertCount > 1 ? 's' : ''}` : 'Clear';

  const cardsData = [
    {
      id: 1,
      title: 'Total Accesses',
      value: stats ? stats.total_accesses_today.toLocaleString() : 'Loading...',
      rate: delayRate,
      isUp: (stats?.delayed_today ?? 0) === 0,
      icon: 'solar:shield-keyhole-bold',
    },
    {
      id: 2,
      title: 'Granted Accesses',
      value: stats ? stats.granted_today.toLocaleString() : 'Loading...',
      rate: grantRate,
      isUp: true,
      icon: 'solar:check-circle-bold',
    },
    {
      id: 3,
      title: 'Denied Accesses',
      value: stats ? stats.denied_today.toLocaleString() : 'Loading...',
      rate: denyRate,
      isUp: false,
      icon: 'solar:shield-cross-bold',
    },
    {
      id: 4,
      title: 'Total Users',
      value: stats ? stats.total_users.toLocaleString() : 'Loading...',
      rate: alertRate,
      isUp: (stats?.active_alerts_count ?? 0) === 0,
      icon: 'solar:users-group-rounded-bold',
    },
  ];

  return (
    <Grid container spacing={{ xs: 2.5, sm: 3, lg: 3.75 }}>
      {cardsData.map((item) => {
        return (
          <TopCard
            key={item.id}
            title={item.title}
            value={item.value}
            rate={item.rate}
            isUp={item.isUp}
            icon={item.icon}
          />
        );
      })}
    </Grid>
  );
};

export default TopCards;
