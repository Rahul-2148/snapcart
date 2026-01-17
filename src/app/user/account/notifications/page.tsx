
"use client";
import { useState } from "react";

export default function NotificationsPage() {
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Notifications</h1>
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
          <div>
            <h3 className="text-lg font-medium">Push Notifications</h3>
            <p className="text-sm text-gray-500">
              Receive push notifications on your device.
            </p>
          </div>
          <button
            onClick={() => setPushNotifications(!pushNotifications)}
            className={`${
              pushNotifications ? "bg-indigo-600" : "bg-gray-200"
            } relative inline-flex items-center h-6 rounded-full w-11`}
          >
            <span
              className={`${
                pushNotifications ? "translate-x-6" : "translate-x-1"
              } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
            />
          </button>
        </div>
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
          <div>
            <h3 className="text-lg font-medium">Email Notifications</h3>
            <p className="text-sm text-gray-500">
              Receive email notifications about your account.
            </p>
          </div>
          <button
            onClick={() => setEmailNotifications(!emailNotifications)}
            className={`${
              emailNotifications ? "bg-indigo-600" : "bg-gray-200"
            } relative inline-flex items-center h-6 rounded-full w-11`}
          >
            <span
              className={`${
                emailNotifications ? "translate-x-6" : "translate-x-1"
              } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
