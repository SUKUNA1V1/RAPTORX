import sitemap from 'routes/sitemap';
import { MenuItem } from 'routes/sitemap';

export const topListData = sitemap.filter((item) => {
  return item.id !== 'admin-tools';
});

export const bottomListData = sitemap.filter((item) => {
  return item.id === 'admin-tools';
});

export const profileListData: MenuItem | undefined = undefined;
