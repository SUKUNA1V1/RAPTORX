import { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import paths from 'routes/paths';
import { isAdmin } from 'lib/auth';

const RequireAdmin = ({ children }: PropsWithChildren) => {
  const location = useLocation();

  if (!isAdmin()) {
    return <Navigate to={paths.login} state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
};

export default RequireAdmin;