import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  DocumentTextIcon,
  UserGroupIcon,
  ClockIcon,
  AcademicCapIcon,
  HomeIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Papers', to: '/papers', icon: DocumentTextIcon },
  { name: 'Researchers', to: '/researchers', icon: UserGroupIcon },
  { name: 'Import History', to: '/import-history', icon: ClockIcon },
];

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

// Generate breadcrumbs from current path
function getBreadcrumbs(pathname) {
  const paths = pathname.split('/').filter(Boolean);
  const breadcrumbs = [{ name: 'Home', to: '/', icon: HomeIcon }];

  if (paths.length === 0) return breadcrumbs;

  // Add section breadcrumb
  const section = paths[0];
  const sectionName = section.charAt(0).toUpperCase() + section.slice(1);
  breadcrumbs.push({ name: sectionName, to: `/${section}` });

  // Add detail breadcrumb if exists
  if (paths.length > 1) {
    const id = paths[1];
    breadcrumbs.push({ name: `#${id}`, to: pathname });
  }

  return breadcrumbs;
}

export default function TopNavBar() {
  const location = useLocation();
  const breadcrumbs = getBreadcrumbs(location.pathname);

  return (
    <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
      {/* Main Navigation Row */}
      <div className="flex items-center h-12 px-6">
        {/* Logo + Brand */}
        <div className="flex items-center gap-3 mr-8">
          <div className="w-7 h-7 bg-gray-900 rounded-md flex items-center justify-center">
            <AcademicCapIcon className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-900">Research Hub</span>
        </div>

        {/* Horizontal Tabs */}
        <nav className="flex items-center gap-1 flex-1">
          {navigation.map((item) => {
            const isActive = location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.name}
                to={item.to}
                className={classNames(
                  'flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                  isActive
                    ? 'text-gray-900 bg-gray-100'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </NavLink>
            );
          })}
        </nav>

        {/* User Menu Placeholder */}
        <div className="flex items-center gap-3">
          <img
            src="/llama.png"
            alt="User"
            className="w-7 h-7 rounded-full border border-gray-200"
          />
        </div>
      </div>

      {/* Breadcrumbs Row */}
      <div className="flex items-center h-9 px-6 bg-gray-50 border-t border-gray-100">
        <nav className="flex items-center gap-1 text-xs">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.to}>
              {index > 0 && (
                <ChevronRightIcon className="w-3 h-3 text-gray-400 mx-1" />
              )}
              <NavLink
                to={crumb.to}
                className={classNames(
                  'flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-100 transition-colors',
                  index === breadcrumbs.length - 1
                    ? 'text-gray-900 font-medium'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {index === 0 && crumb.icon && (
                  <crumb.icon className="w-3 h-3" />
                )}
                {crumb.name}
              </NavLink>
            </React.Fragment>
          ))}
        </nav>
      </div>
    </div>
  );
}
