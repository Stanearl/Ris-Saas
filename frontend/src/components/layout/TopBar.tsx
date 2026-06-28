import { LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Badge } from '@/components/ui/Badge';
import { useQuery } from '@tanstack/react-query';
import { fleetAPI } from '@/lib/api';

const TopBar = () => {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  
  // Fetch fleet status
  const { data: fleetStatus, isLoading } = useQuery({
    queryKey: ['fleet-status'],
    queryFn: fleetAPI.getStatus,
    refetchInterval: 60000, // Refresh every minute
    retry: 1,
  });
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  // Determine badge variant and text based on fleet status
  const getBadgeConfig = () => {
    if (isLoading || !fleetStatus) {
      return {
        variant: 'default' as const,
        text: 'LOADING',
        color: 'bg-slate-500',
        pulse: false,
      };
    }
    
    switch (fleetStatus.overall_status) {
      case 'all_active':
        return {
          variant: 'success' as const,
          text: 'ALL ACTIVE',
          color: 'bg-green-500',
          pulse: true,
        };
      case 'partial':
        return {
          variant: 'warning' as const,
          text: 'PARTIAL',
          color: 'bg-yellow-500',
          pulse: true,
        };
      case 'inactive':
        return {
          variant: 'destructive' as const,
          text: 'INACTIVE',
          color: 'bg-red-500',
          pulse: false,
        };
      default:
        return {
          variant: 'default' as const,
          text: 'UNKNOWN',
          color: 'bg-slate-500',
          pulse: false,
        };
    }
  };
  
  const badgeConfig = getBadgeConfig();
  
  return (
    <div className="h-16 bg-white border-b border-slate-200 fixed top-0 right-0 left-0 md:left-64 z-10">
      <div className="h-full px-4 md:px-6 flex items-center justify-end gap-2 md:gap-4">
        {/* Dynamic Fleet Status Badge */}
        <Badge 
          variant={badgeConfig.variant} 
          className="px-3 py-1 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate('/settings')}
          title={fleetStatus ? `${fleetStatus.active_devices}/${fleetStatus.total_devices} devices active` : 'Loading...'}
        >
          <span className={`w-2 h-2 ${badgeConfig.color} rounded-full mr-2 ${badgeConfig.pulse ? 'animate-pulse' : ''}`}></span>
          {badgeConfig.text}
        </Badge>
        
        {/* User Icon */}
        <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <User className="w-5 h-5 text-slate-600" />
        </button>
        
        {/* Logout Icon */}
        <button 
          onClick={handleLogout}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          title="Logout"
        >
          <LogOut className="w-5 h-5 text-slate-600" />
        </button>
      </div>
    </div>
  );
};

export default TopBar;
