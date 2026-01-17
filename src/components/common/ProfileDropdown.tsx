'use client';
import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { User, Package, LogOut } from 'lucide-react';
import { IUser } from '@/models/user.model';

export const ProfileDropdown = ({ user }: { user: IUser }) => {
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!user) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            <div
                className="bg-white rounded-full w-10 h-10 flex items-center justify-center overflow-hidden shadow-sm cursor-pointer"
                onClick={() => setOpen((prev) => !prev)}
            >
                {user.image?.url ? (
                    <Image src={user.image.url} alt={user.name} fill className="object-cover" />
                ) : (
                    <User className="h-6 w-6 text-gray-500" />
                )}
            </div>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border z-50 p-2"
                    >
                         <div className="flex items-center gap-3 px-2 py-2 border-b mb-2">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden relative">
                                 {user.image?.url ? (
                                    <Image src={user.image.url} alt={user.name} fill className="object-cover" />
                                ) : (
                                    <User className="h-6 w-6 text-gray-500"/>
                                )}
                            </div>
                            <div>
                                <div className="font-semibold text-gray-800">{user.name}</div>
                                <div className="text-xs text-gray-500 capitalize">{user.role}</div>
                            </div>
                        </div>

                        <Link
                            href="/user/account"
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                            onClick={() => setOpen(false)}
                        >
                            <User className="w-4 h-4" /> My Account
                        </Link>

                        {user.role === 'user' && (
                            <Link
                                href="/user/orders"
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                                onClick={() => setOpen(false)}
                            >
                                <Package className="w-4 h-4" /> My Orders
                            </Link>
                        )}

                         <button
                            type="button"
                            className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
                            onClick={() => {
                                setOpen(false);
                                signOut({ redirect: true, callbackUrl: '/login' });
                            }}
                        >
                            <LogOut className="w-4 h-4" /> Logout
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
