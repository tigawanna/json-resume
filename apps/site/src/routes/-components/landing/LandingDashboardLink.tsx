import { Button } from "@/components/ui/button";
import { useViewer } from "@/data-access-layer/auth/viewer";
import { Link } from "@tanstack/react-router";

export default function LandingDashboardLink() {
  const { viewer } = useViewer();

  if (viewer?.user) {
    return (
      <Link to="/dashboard">
        <Button size="sm" className="rounded-full px-6">
          Dashboard
        </Button>
      </Link>
    );
  }
  return (
    <Link to="/auth" search={{ returnTo: "/dashboard" }}>
      <Button size="sm" className="rounded-full px-6">
        Get Started
      </Button>
    </Link>
  );
}
