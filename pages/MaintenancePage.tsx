

import React, { useState, useEffect } from 'react';
import { Cog6ToothIcon } from '../components/Icons';
import { useSettings } from '../features/settings/useSettings';

const MaintenancePage: React.FC = () => {
    const { settingsState: { systemSettings } } = useSettings();
    const { maintenanceEndTime } = systemSettings;
    const [countdown, setCountdown] = useState('');

    useEffect(() => {
        if (!maintenanceEndTime) return;

        const interval = setInterval(() => {
            const endTime = new Date(maintenanceEndTime).getTime();
            const now = new Date().getTime();
            const distance = endTime - now;

            if (distance < 0) {
                setCountdown('');
                clearInterval(interval);
                // The main App component will handle navigation once maintenance is over
                return;
            }
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            
            let countdownString = '';
            if (days > 0) countdownString += `${days} ngày `;
            countdownString += `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            setCountdown(countdownString);
        }, 1000);

        return () => clearInterval(interval);
    }, [maintenanceEndTime]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
            <div className="text-center p-8 max-w-lg">
                <div className="mx-auto h-16 w-16 animate-spin" style={{ animationDuration: '3s' }}>
                    <Cog6ToothIcon className="h-full w-full text-indigo-500" />
                </div>
                <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                    Hệ thống đang bảo trì
                </h1>
                <p className="mt-4 text-base text-slate-600 dark:text-slate-400">
                    Chúng tôi đang thực hiện một số nâng cấp để cải thiện trải nghiệm của bạn. Hệ thống sẽ sớm hoạt động trở lại.
                </p>
                {countdown && (
                    <div className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                        <p className="font-medium text-indigo-800 dark:text-indigo-200">Thời gian dự kiến hoạt động lại sau:</p>
                        <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 tabular-nums tracking-wider mt-1">{countdown}</p>
                    </div>
                )}
                <p className="mt-4 text-base text-slate-600 dark:text-slate-400">
                    Vui lòng quay lại sau. Xin cảm ơn!
                </p>
            </div>
        </div>
    );
};

export default MaintenancePage;
