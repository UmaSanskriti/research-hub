'use client'

import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import logo from '../../public/logo.png';
import avatar from '../../public/llama.png';
import {
    Dialog,
    DialogBackdrop,
    DialogPanel,
    TransitionChild,
} from '@headlessui/react';
import {
    Bars3Icon,
    CommandLineIcon,
    ServerIcon,
    UserGroupIcon,
    XMarkIcon,
    SignalIcon,
    CpuChipIcon,
} from '@heroicons/react/24/outline';
import ClaudeChat from './ClaudeChat';

// Navigation with clean labels
const appNavigation = [
    { name: 'Dashboard', to: '/', icon: CommandLineIcon },
    { name: 'Repositories', to: '/repositories', icon: ServerIcon },
    { name: 'Contributors', to: '/contributors', icon: UserGroupIcon },
];

// Organization data
const organizations = [
    { id: 1, name: 'Anthropic Claude', href: '#', initial: 'A', status: 'active' },
];

const user = {
    name: 'User',
    imageUrl: avatar
};

function classNames(...classes) {
    return classes.filter(Boolean).join(' ');
}

export default function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const location = useLocation();

    // Update time every second for that authentic command center feel
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatStardate = (date) => {
        const year = date.getFullYear();
        const dayOfYear = Math.floor((date - new Date(year, 0, 0)) / 86400000);
        return `${year}.${dayOfYear.toString().padStart(3, '0')}`;
    };

    const getCurrentPageName = () => {
        const page = appNavigation.find(item => item.to === location.pathname);
        return page ? page.name : 'COMMAND CENTER';
    };

    return (
        <>
            <div className="h-full scanline-effect">
                {/* Mobile Sidebar Dialog */}
                <Dialog open={sidebarOpen} onClose={setSidebarOpen} className="relative z-50 lg:hidden">
                    <DialogBackdrop
                        transition
                        className="fixed inset-0 bg-black/90 transition-opacity duration-300 ease-linear data-[closed]:opacity-0"
                    />
                    <div className="fixed inset-0 flex">
                        <DialogPanel
                            transition
                            className="relative mr-16 flex w-full max-w-xs flex-1 transform transition duration-300 ease-in-out data-[closed]:-translate-x-full"
                        >
                            <TransitionChild>
                                <div className="absolute top-0 left-full flex w-16 justify-center pt-5 duration-300 ease-in-out data-[closed]:opacity-0">
                                    <button
                                        type="button"
                                        onClick={() => setSidebarOpen(false)}
                                        className="lcars-button bg-[#ff3366] hover:bg-[#ff9966] p-2 lcars-corner-tr lcars-corner-br"
                                    >
                                        <span className="sr-only">Close sidebar</span>
                                        <XMarkIcon aria-hidden="true" className="size-6 text-black" />
                                    </button>
                                </div>
                            </TransitionChild>
                            {/* Mobile Sidebar */}
                            <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-[#0a0e27] px-4 pb-4 border-r-2 border-[#00d9ff]">
                                {/* Mobile Header */}
                                <div className="flex h-16 items-center border-b border-[#00d9ff]/30">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-[#00d9ff] rounded-lg flex items-center justify-center">
                                            <CpuChipIcon className="w-6 h-6 text-black" />
                                        </div>
                                        <div>
                                            <div className="text-white text-base font-bold">Claude Hack Rhythm</div>
                                        </div>
                                    </div>
                                </div>

                                <nav className="flex flex-1 flex-col">
                                    <ul role="list" className="flex flex-1 flex-col gap-y-7">
                                        <li>
                                            <ul role="list" className="space-y-2">
                                                {appNavigation.map((item) => (
                                                    <li key={item.name}>
                                                        <NavLink
                                                            to={item.to}
                                                            className={({ isActive }) =>
                                                                classNames(
                                                                    'group flex items-center gap-x-3 px-3 py-2.5 text-sm font-semibold rounded-md transition-all',
                                                                    isActive
                                                                        ? 'bg-[#00d9ff] text-black'
                                                                        : 'text-[#e0e7ff] hover:bg-[#1a1f3a] hover:text-[#00d9ff]'
                                                                )
                                                            }
                                                            onClick={() => setSidebarOpen(false)}
                                                        >
                                                            <item.icon aria-hidden="true" className="size-5 shrink-0" />
                                                            {item.name}
                                                        </NavLink>
                                                    </li>
                                                ))}
                                            </ul>
                                        </li>

                                        {/* Organizations */}
                                        <li>
                                            <div className="text-xs font-semibold text-[#ff9966] mb-2">
                                                Organization
                                            </div>
                                            <ul role="list" className="space-y-1">
                                                {organizations.map((org) => (
                                                    <li key={org.name}>
                                                        <a
                                                            href={org.href}
                                                            className="group flex items-center gap-x-3 px-3 py-2 text-sm rounded-md bg-[#1a1f3a] text-[#e0e7ff] hover:bg-[#2a2f4a] transition-all"
                                                        >
                                                            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-[#00d9ff] text-black text-xs font-semibold">
                                                                {org.initial}
                                                            </span>
                                                            <span className="truncate flex-1">{org.name}</span>
                                                            {org.status === 'active' && (
                                                                <SignalIcon className="size-4 text-[#00ff41] status-active" />
                                                            )}
                                                        </a>
                                                    </li>
                                                ))}
                                            </ul>
                                        </li>

                                        {/* User Profile */}
                                        <li className="mt-auto">
                                            <div className="bg-[#1a1f3a] rounded-lg border border-[#00d9ff]/30 p-3">
                                                <div className="flex items-center gap-x-3">
                                                    <img
                                                        alt="User Avatar"
                                                        src={user.imageUrl}
                                                        className="size-10 rounded-full border-2 border-[#00d9ff]"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="text-sm text-white font-medium">{user.name}</div>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <div className="w-1.5 h-1.5 bg-[#00ff41] rounded-full status-active"></div>
                                                            <span className="text-[#00d9ff] text-xs">Online</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </li>
                                    </ul>
                                </nav>
                            </div>
                        </DialogPanel>
                    </div>
                </Dialog>

                {/* Static sidebar for desktop */}
                <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
                    <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-[#0a0e27] px-6 pb-6 border-r-2 border-[#00d9ff]">
                        {/* Header Section */}
                        <div className="flex flex-col pt-6 pb-4 border-b border-[#00d9ff]/30">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[#00d9ff] rounded-lg flex items-center justify-center">
                                    <CpuChipIcon className="w-6 h-6 text-black" />
                                </div>
                                <div className="flex-1">
                                    <div className="text-white text-lg font-bold">Claude Hack Rhythm</div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <div className="w-1.5 h-1.5 bg-[#00ff41] rounded-full status-active"></div>
                                        <span className="text-[#00d9ff] text-xs">Online</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <nav className="flex flex-1 flex-col">
                            <ul role="list" className="flex flex-1 flex-col gap-y-7">
                                {/* Main Navigation */}
                                <li>
                                    <ul role="list" className="space-y-2">
                                        {appNavigation.map((item) => (
                                            <li key={item.name}>
                                                <NavLink
                                                    to={item.to}
                                                    className={({ isActive }) =>
                                                        classNames(
                                                            'group flex items-center gap-x-3 px-3 py-2.5 text-sm font-semibold rounded-md transition-all',
                                                            isActive
                                                                ? 'bg-[#00d9ff] text-black'
                                                                : 'text-[#e0e7ff] hover:bg-[#1a1f3a] hover:text-[#00d9ff]'
                                                        )
                                                    }
                                                >
                                                    <item.icon aria-hidden="true" className="size-5 shrink-0" />
                                                    {item.name}
                                                </NavLink>
                                            </li>
                                        ))}
                                    </ul>
                                </li>

                                {/* Organizations Section */}
                                <li>
                                    <div className="text-xs font-semibold text-[#ff9966] mb-2">Organization</div>
                                    <ul role="list" className="space-y-1">
                                        {organizations.map((org) => (
                                            <li key={org.name}>
                                                <a
                                                    href={org.href}
                                                    className="group flex items-center gap-x-3 px-3 py-2 text-sm rounded-md bg-[#1a1f3a] text-[#e0e7ff] hover:bg-[#2a2f4a] transition-all"
                                                >
                                                    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-[#00d9ff] text-black text-xs font-semibold">
                                                        {org.initial}
                                                    </span>
                                                    <span className="truncate flex-1">{org.name}</span>
                                                    {org.status === 'active' && (
                                                        <SignalIcon className="size-4 text-[#00ff41] status-active" />
                                                    )}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </li>

                                {/* User Profile */}
                                <li className="mt-auto">
                                    <div className="bg-[#1a1f3a] rounded-lg border border-[#00d9ff]/30 p-3">
                                        <div className="flex items-center gap-x-3">
                                            <div className="relative">
                                                <img
                                                    alt="User Avatar"
                                                    src={user.imageUrl}
                                                    className="size-10 rounded-full border-2 border-[#00d9ff]"
                                                />
                                                <div className="absolute -bottom-0.5 -right-0.5 size-3 bg-[#00ff41] rounded-full status-active border-2 border-[#0a0e27]"></div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm text-white font-medium truncate">{user.name}</div>
                                                <div className="text-xs text-[#00d9ff]">
                                                    {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            </ul>
                        </nav>
                    </div>
                </div>

                {/* Top Bar (Mobile Only) */}
                <div className="sticky top-0 z-40 flex items-center gap-x-4 bg-[#0a0e27] px-4 py-3 border-b-2 border-[#00d9ff] lg:hidden">
                    <button
                        type="button"
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 rounded-md bg-[#00d9ff] hover:bg-[#ff9966] transition-all"
                    >
                        <span className="sr-only">Open sidebar</span>
                        <Bars3Icon aria-hidden="true" className="size-5 text-black" />
                    </button>
                    <div className="flex-1 text-sm font-semibold text-white">
                        {getCurrentPageName()}
                    </div>
                    <a href="#">
                        <span className="sr-only">Your profile</span>
                        <img
                            alt="User Avatar"
                            src={user.imageUrl}
                            className="size-8 rounded-full border-2 border-[#00d9ff]"
                        />
                    </a>
                </div>

                {/* Main Content Area */}
                <main className="py-8 lg:pl-80 h-full min-h-screen bg-[#0a0e27] grid-background">
                    <div className="px-4 sm:px-6 lg:px-8 pb-24">
                        <Outlet />
                    </div>

                    {/* Ship's Computer (ClaudeChat) */}
                    <ClaudeChat />
                </main>
            </div>
        </>
    );
}