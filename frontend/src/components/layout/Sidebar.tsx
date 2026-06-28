import { Link, useLocation } from 'react-router-dom';
import { Home, Truck, Settings, User } from 'lucide-react';
import { mockUser } from '@/lib/mockData';

const Sidebar = () => {
  const location = useLocation();
  
  const navItems = [
    { path: '/overview', label: 'Overview', icon: Home },
    { path: '/fleet', label: 'Fleet (Devices)', icon: Truck },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];
  
  const isActive = (path: string) => location.pathname.startsWith(path);
  
  return (
    <div className="w-64 bg-white border-r border-slate-200 h-screen flex flex-col fixed left-0 top-0">
      {/* Logo Area */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
            <Truck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-900">RIS Africa</h1>
            <p className="text-xs text-slate-500">Fleet Telemetry</p>
          </div>
        </div>
      </div>
      
      {/* Navigation Links */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                    ${active 
                      ? 'bg-blue-50 text-blue-700 font-medium' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      {/* User Profile at Bottom */}
      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
            {mockUser.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">
              {mockUser.name}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {mockUser.email}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
