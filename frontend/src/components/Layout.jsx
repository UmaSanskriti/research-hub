'use client'

import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
    Dialog,
    DialogBackdrop,
    DialogPanel,
    TransitionChild,
} from '@headlessui/react';
import {
    Bars3Icon,
    DocumentTextIcon,
    UserGroupIcon,
    XMarkIcon,
    AcademicCapIcon,
    ClockIcon,
} from '@heroicons/react/24/outline';
import ClaudeChat from './ClaudeChat';

// Navigation with research-focused labels
const appNavigation = [
    { name: 'Papers', to: '/papers', icon: DocumentTextIcon },
    { name: 'Researchers', to: '/researchers', icon: UserGroupIcon },
    { name: 'Import History', to: '/import-history', icon: ClockIcon },
];

// Organization data
const organizations = [
    { id: 1, name: 'Research Hub', href: '#', initial: 'R', status: 'active' },
];

const user = {
    name: 'User',
    imageUrl: '/llama.png'
};

function classNames(...classes) {
    return classes.filter(Boolean).join(' ');
}

export default function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const location = useLocation();

    // Update time every second
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatDate = (date) => {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getCurrentPageName = () => {
        const page = appNavigation.find(item => item.to === location.pathname);
        return page ? page.name : 'Papers';
    };

    return (
        <>
            <div className="h-full">
                {/* Mobile Sidebar Dialog */}
                <Dialog open={sidebarOpen} onClose={setSidebarOpen} className="relative z-50 lg:hidden">
                    <DialogBackdrop
                        transition
                        className="fixed inset-0 bg-gray-900/80 transition-opacity duration-300 ease-linear data-[closed]:opacity-0"
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
                                        className="rounded-md p-2.5 text-white hover:bg-gray-700/10"
                                    >
                                        <span className="sr-only">Close sidebar</span>
                                        <XMarkIcon aria-hidden="true" className="size-6" />
                                    </button>
                                </div>
                            </TransitionChild>
                            {/* Mobile Sidebar */}
                            <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4">
                                {/* Mobile Header */}
                                <div className="flex h-16 items-center border-b border-gray-200">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                                            <AcademicCapIcon className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <div className="text-gray-900 text-base font-semibold font-ui tracking-tight">Research Hub</div>
                                        </div>
                                    </div>
                                </div>

                                <nav className="flex flex-1 flex-col">
                                    <ul role="list" className="flex flex-1 flex-col gap-y-7">
                                        <li>
                                            <ul role="list" className="space-y-1">
                                                {appNavigation.map((item) => (
                                                    <li key={item.name}>
                                                        <NavLink
                                                            to={item.to}
                                                            className={({ isActive }) =>
                                                                classNames(
                                                                    'group flex items-center gap-x-3 px-3 py-2 text-sm font-medium rounded-lg transition-all font-ui',
                                                                    isActive
                                                                        ? 'bg-gray-900 text-white'
                                                                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
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
                                            <div className="text-xs font-medium text-gray-500 mb-2 font-ui uppercase tracking-wider">
                                                Organization
                                            </div>
                                            <ul role="list" className="space-y-1">
                                                {organizations.map((org) => (
                                                    <li key={org.name}>
                                                        <a
                                                            href={org.href}
                                                            className="group flex items-center gap-x-3 px-3 py-2 text-sm rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 transition-all font-ui"
                                                        >
                                                            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-gray-900 text-white text-xs font-semibold">
                                                                {org.initial}
                                                            </span>
                                                            <span className="truncate flex-1">{org.name}</span>
                                                            {org.status === 'active' && (
                                                                <div className="size-2 rounded-full bg-green-500" />
                                                            )}
                                                        </a>
                                                    </li>
                                                ))}
                                            </ul>
                                        </li>

                                        {/* User Profile */}
                                        <li className="mt-auto">
                                            <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
                                                <div className="flex items-center gap-x-3">
                                                    <img
                                                        alt="User Avatar"
                                                        src={user.imageUrl}
                                                        className="size-10 rounded-full border-2 border-gray-900"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="text-sm text-gray-900 font-medium">{user.name}</div>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                                            <span className="text-gray-600 text-xs">Online</span>
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
                    <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-6 border-r border-gray-200">
                        {/* Header Section */}
                        <div className="flex flex-col pt-6 pb-4 border-b border-gray-200">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                                    <AcademicCapIcon className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1">
                                    <div className="text-gray-900 text-lg font-bold">Research Hub</div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                        <span className="text-gray-600 text-xs">Online</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <nav className="flex flex-1 flex-col">
                            <ul role="list" className="flex flex-1 flex-col gap-y-7">
                                {/* Main Navigation */}
                                <li>
                                    <ul role="list" className="space-y-1">
                                        {appNavigation.map((item) => (
                                            <li key={item.name}>
                                                <NavLink
                                                    to={item.to}
                                                    className={({ isActive }) =>
                                                        classNames(
                                                            'group flex items-center gap-x-3 px-3 py-2 text-sm font-medium rounded-lg transition-all font-ui',
                                                            isActive
                                                                ? 'bg-gray-900 text-white'
                                                                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
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
                                    <div className="text-xs font-medium text-gray-500 mb-2 font-ui uppercase tracking-wider">Organization</div>
                                    <ul role="list" className="space-y-1">
                                        {organizations.map((org) => (
                                            <li key={org.name}>
                                                <a
                                                    href={org.href}
                                                    className="group flex items-center gap-x-3 px-3 py-2 text-sm rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 transition-all font-ui"
                                                >
                                                    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-gray-900 text-white text-xs font-semibold">
                                                        {org.initial}
                                                    </span>
                                                    <span className="truncate flex-1">{org.name}</span>
                                                    {org.status === 'active' && (
                                                        <div className="size-2 rounded-full bg-green-500" />
                                                    )}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </li>

                                {/* User Profile */}
                                <li className="mt-auto">
                                    <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
                                        <div className="flex items-center gap-x-3">
                                            <div className="relative">
                                                <img
                                                    alt="User Avatar"
                                                    src={user.imageUrl}
                                                    className="size-10 rounded-full border-2 border-gray-900"
                                                />
                                                <div className="absolute -bottom-0.5 -right-0.5 size-3 bg-green-500 rounded-full border-2 border-white"></div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm text-gray-900 font-medium truncate font-ui">{user.name}</div>
                                                <div className="text-xs text-gray-600 font-ui">
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
                <div className="sticky top-0 z-40 flex items-center gap-x-4 bg-white px-4 py-3 border-b border-gray-200 lg:hidden">
                    <button
                        type="button"
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 rounded-md text-gray-700 hover:bg-gray-100"
                    >
                        <span className="sr-only">Open sidebar</span>
                        <Bars3Icon aria-hidden="true" className="size-6" />
                    </button>
                    <div className="flex-1 text-sm font-semibold text-gray-900 font-ui">
                        {getCurrentPageName()}
                    </div>
                    <a href="#">
                        <span className="sr-only">Your profile</span>
                        <img
                            alt="User Avatar"
                            src={user.imageUrl}
                            className="size-8 rounded-full border-2 border-gray-900"
                        />
                    </a>
                </div>

                {/* Main Content Area */}
                <main className="py-8 lg:pl-80 h-full min-h-screen bg-gray-50">
                    <div className="px-4 sm:px-6 lg:px-8 pb-24">
                        <Outlet />
                    </div>

                    {/* Claude Chat */}
                    <ClaudeChat />
                </main>
            </div>
        </>
    );
}
