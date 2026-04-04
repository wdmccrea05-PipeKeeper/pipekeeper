import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function SubscriptionSuccess() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    navigate(`/SubscriptionSuccessFlow${location.search || ''}`, {
      replace: true,
    });
  }, [navigate, location.search]);

  return null;
}