import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import { TrophyIcon } from './Icons';

interface LevelUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    levelName: string;
}

const ConfettiPiece: React.FC<{ style: React.CSSProperties }> = ({ style }) => (
    <div className="absolute w-2 h-4" style={style}></div>
);

const LevelUpModal: React.FC<LevelUpModalProps> = ({ isOpen, onClose, levelName }) => {
    const [confetti, setConfetti] = useState<React.CSSProperties[]>([]);

    useEffect(() => {
        if (isOpen) {
            const newConfetti = Array.from({ length: 100 }).map(() => ({
                left: `${Math.random() * 100}%`,
                animation: `fall ${2 + Math.random() * 3}s ${Math.random() * 2}s linear forwards`,
                backgroundColor: `hsl(${Math.random() * 360}, 70%, 50%)`,
                transform: `rotate(${Math.random() * 360}deg)`
            }));
            setConfetti(newConfetti);
        }
    }, [isOpen]);

    if (!isOpen) {
        return null;
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} hideFooter title="">
            <div className="relative overflow-hidden text-center p-8">
                {confetti.map((style, index) => <ConfettiPiece key={index} style={style} />)}
                <div className="relative z-10">
                    <TrophyIcon className="h-24 w-24 mx-auto text-amber-400" />
                    <h2 className="mt-4 text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
                        CHÚC MỪNG BẠN ĐÃ LÊN CẤP!
                    </h2>
                    <p className="mt-4 text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">
                        {levelName}
                    </p>
                    <p className="mt-4 text-base text-gray-500 dark:text-gray-400">
                        Thành tích của bạn thật tuyệt vời! Hãy tiếp tục nỗ lực để chinh phục những cột mốc cao hơn và xây dựng một hệ thống vững mạnh.
                    </p>
                    <button
                        onClick={onClose}
                        className="mt-8 inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Tuyệt vời!
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default LevelUpModal;