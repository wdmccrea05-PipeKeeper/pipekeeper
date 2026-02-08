import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a2c42] p-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-[#E0D8C8] mb-4">404</h1>
        <p className="text-2xl font-semibold text-[#E0D8C8] mb-2">Page not found</p>
        <p className="text-[#E0D8C8]/70 mb-8">
          The page you're looking for doesn't exist.
        </p>
        <Button onClick={() => navigate("/")} className="bg-amber-700 hover:bg-amber-800">
          Go Home
        </Button>
      </div>
    </div>
  );
}