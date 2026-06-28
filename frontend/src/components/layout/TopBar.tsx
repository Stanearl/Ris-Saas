import { LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Badge } from '@/components/ui/Badge';

const TopBar = () => {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  return (
    <div className="h-16 bg-white border-b border-slate-200 fixed top-0 right-0 left-64 z-10">
      <div className="h-full px-6 flex items-center justify-end gap-4">
        {/* Active Status Badge */}
        <Badge variant="success" className="px-3 py-1">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
          ACTIVE
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
