import React from 'react';
import type { View } from '../types';
import { GraphIcon, UsersIcon, SearchIcon, TagsIcon, SettingsIcon, ImageIcon, AnalyticsIcon, TimelineIcon } from './Icons';

interface SidebarProps {
  activeView: View;
  onSetActiveView: (view: View) => void;
}

const NavItem: React.FC<{
  label: string;
  viewName: View;
  activeView: View;
  onClick: (view: View) => void;
  children: React.ReactNode;
}> = ({ label, viewName, activeView, onClick, children }) => {
  const isActive = activeView === viewName;
  return (
    <button
      title={label}
      onClick={() => onClick(viewName)}
      className={`flex items-center justify-center w-12 h-12 rounded-lg transition-colors duration-200 ${isActive
          ? 'bg-indigo-600 text-white'
          : 'text-gray-400 hover:bg-gray-700 hover:text-white'
        }`}
    >
      {children}
    </button>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ activeView, onSetActiveView }) => {
  return (
    <nav className="bg-gray-800 p-2 flex flex-col items-center space-y-4 border-r border-gray-700">
      <NavItem label="關係圖" viewName="graph" activeView={activeView} onClick={onSetActiveView}>
        <GraphIcon className="w-6 h-6" />
      </NavItem>
      <NavItem label="角色列表" viewName="characters" activeView={activeView} onClick={onSetActiveView}>
        <UsersIcon className="w-6 h-6" />
      </NavItem>
      <NavItem label="圖片列表" viewName="images" activeView={activeView} onClick={onSetActiveView}>
        <ImageIcon className="w-6 h-6" />
      </NavItem>
      <NavItem label="搜尋" viewName="search" activeView={activeView} onClick={onSetActiveView}>
        <SearchIcon className="w-6 h-6" />
      </NavItem>
      <NavItem label="管理 Tag" viewName="tags" activeView={activeView} onClick={onSetActiveView}>
        <TagsIcon className="w-6 h-6" />
      </NavItem>
      <NavItem label="Tag 使用分析" viewName="analytics" activeView={activeView} onClick={onSetActiveView}>
        <AnalyticsIcon className="w-6 h-6" />
      </NavItem>
      <NavItem label="時間軸" viewName="timeline" activeView={activeView} onClick={onSetActiveView}>
        <TimelineIcon className="w-6 h-6" />
      </NavItem>
      <div className="flex-grow" />
      <NavItem label="設定" viewName="settings" activeView={activeView} onClick={onSetActiveView}>
        <SettingsIcon className="w-6 h-6" />
      </NavItem>
    </nav>
  );
};

export default Sidebar;