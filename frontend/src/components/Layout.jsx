'use client'

import React from 'react';
import { Outlet } from 'react-router-dom';
import TopNavBar from './TopNavBar';
import ChatPanel from './ChatPanel';

export default function Layout() {
    return (
        <div className="h-screen flex flex-col overflow-hidden">
            {/* Top Navigation Bar */}
            <TopNavBar />

            {/* Main Content Area with right margin for fixed chat panel */}
            <div className="flex-1 overflow-hidden">
                <main className="h-full overflow-y-auto bg-gray-50" style={{ marginRight: '33.333333%' }}>
                    <div className="py-6 px-6">
                        <Outlet />
                    </div>
                </main>

                {/* Chat Panel - Fixed 1/3 width on right */}
                <ChatPanel />
            </div>
        </div>
    );
}
