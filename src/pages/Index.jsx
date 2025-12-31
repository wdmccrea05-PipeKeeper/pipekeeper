import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/components/utils/createPageUrl";

export default function IndexPage() {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate(createPageUrl('Home'), { replace: true });
  }, [navigate]);
  
  return null;
}