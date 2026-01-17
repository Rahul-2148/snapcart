'use client';
import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import axios from 'axios';
import useSocket from '@/hooks/useSocket';
import { Bell } from 'lucide-react';
import { NotificationClient } from '@/types/custom';

export const NotificationDropdown = ({ userId }: { userId: string }) => {
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState<NotificationClient[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const socket = useSocket(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');



    useEffect(() => {
        if (userId) {
            const fetchNotifications = async () => {
                try {
                    const res = await axios.get('/api/notifications');
                    setNotifications(res.data);
                    setUnreadCount(res.data.filter((n: NotificationClient) => !n.read).length);
                } catch (error) {
                    console.error('Error fetching notifications:', error);
                }
            };
            fetchNotifications();
        }
    }, [userId]);

    useEffect(() => {
        if (socket && userId) {
            socket.emit('join_user_room', userId);
            socket.on('new_notification', (notification: NotificationClient) => {
                setNotifications((prev) => [notification, ...prev]);
                if (!notification.read) {
                    setUnreadCount((prev) => prev + 1);
                }
            });
        }
        return () => {
            if (socket) socket.off('new_notification');
        };
    }, [socket, userId]);

    const handleReadAll = async () => {
        try {
            await axios.put('/api/notifications/read-all');
            setNotifications(notifications.map((n) => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error("Error marking all as read:", error);
        }
    };

    const handleNotificationClick = async (notification: NotificationClient) => {
        if (!notification.read) {
            try {
                await axios.put(`/api/notifications/${notification._id}/read`);
                setNotifications((prev) =>
                    prev.map((n) => (n._id === notification._id ? { ...n, read: true } : n))
                );
                setUnreadCount((prev) => Math.max(0, prev - 1));
            } catch (error) {
                console.error("Error marking notification as read:", error);
            }
        }
        if (notification.link) {
            window.location.href = notification.link;
        }
    };

    if (!userId) return null;

    return (
        <div
            className="relative"
            ref={dropdownRef}
            onMouseEnter={() => setShowNotifications(true)}
            onMouseLeave={() => setShowNotifications(false)}
        >
            <div
                className="relative bg-white rounded-full w-10 h-10 flex items-center justify-center shadow-sm cursor-pointer"
            >
                <Bell className="h-6 w-6 text-gray-500" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full font-semibold">
                        {unreadCount}
                    </span>
                )}
            </div>

            <AnimatePresence>
                {showNotifications && (
                     <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border z-50 p-3 max-h-96 overflow-y-auto"
                    >
                        <div className="flex justify-between items-center mb-2">
                             <h3 className="font-semibold text-lg">Notifications</h3>
                             {notifications.length > 0 && (
                                <button onClick={handleReadAll} className="text-sm text-blue-600 hover:underline">
                                    Mark all as read
                                </button>
                             )}
                        </div>
                        {notifications.length === 0 ? (
                            <p className="text-gray-500 text-sm p-4 text-center">No new notifications.</p>
                        ) : (
                            <div>
                                {notifications.map((notification) => (
                                    <div
                                        key={notification._id as any}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={`p-2 rounded-lg mb-1 cursor-pointer ${
                                            notification.read ? 'bg-gray-50' : 'bg-blue-50'
                                        } hover:bg-gray-100`}
                                    >
                                        <p className={`text-sm ${notification.read ? 'text-gray-600' : 'text-gray-800 font-medium'}`}>
                                            {notification.message}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {new Date(notification.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
