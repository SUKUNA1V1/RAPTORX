import { useEffect, useState } from 'react';
import { fontFamily } from 'theme/typography';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Product from './Product';
import { apiClient, FeatureImportanceItem } from 'lib/api';

const Products = () => {
  const [features, setFeatures] = useState<FeatureImportanceItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await apiClient.getFeatureImportance();
        setFeatures(data.slice(0, 3));
      } catch (err) {
        console.error('Failed to fetch features:', err);
      }
    };
    void fetchData();
  }, []);

  const data = features.map((f, i) => ({
    id: i + 1,
    rank: i + 1,
    name: f.feature,
    inStock: Math.round(f.importance * 1000),
    price: `${(f.importance * 100).toFixed(1)}%`,
  }));

  return (
    <Stack direction="column" gap={3.75} component={Paper} height={300}>
      <Typography variant="h6" fontWeight={400} fontFamily={fontFamily.workSans}>
        ML Top Features
      </Typography>

      <Stack justifyContent="space-between" direction="row">
        <Typography variant="caption" fontWeight={400}>
          Feature Vector
        </Typography>
        <Typography variant="caption" fontWeight={400}>
          Impact %
        </Typography>
      </Stack>

      <Stack spacing={2} sx={{ overflowY: 'auto' }}>
        {data.map((item) => {
          return <Product key={item.id} data={item} />;
        })}
        {data.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No feature importance data returned by backend.
          </Typography>
        )}
      </Stack>
    </Stack>
  );
};

export default Products;
