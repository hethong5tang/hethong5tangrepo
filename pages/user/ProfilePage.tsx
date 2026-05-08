
import React, { useState, useEffect, useRef } from 'react';
import { AdminManagedUser } from '../../features/users/types';
import { XCircleIcon, ArrowPathIcon, KeyIcon, CameraIcon, ClipboardDocumentIcon } from '../../components/Icons';
import { useAuth } from '../../features/auth/useAuth';
import { useActions } from '../../features/actions/useActions';
import { useToast } from '../../components/ToastProvider';
import Modal from '../../components/Modal';

const InfoRow: React.FC<{
    label: string;
    value: string;
    name: keyof AdminManagedUser;
    isEditing: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    error?: string;
    inputType?: string;
}> = ({ label, value, name, isEditing, onChange, error, inputType = 'text' }) => (
    <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
        <dt className="text-sm font-medium leading-6 text-slate-900 dark:text-slate-200">{label}</dt>
        <dd className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-400 sm:col-span-2 sm:mt-0">
            {isEditing ? (
                <div>
                    <div className="relative group">
                        <input
                            type={inputType}
                            name={name}
                            value={value}
                            onChange={onChange}
                            className={`block w-full px-3 py-1.5 border rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm pr-8 ${error ? 'border-red-500' : 'border-gray-200 dark:border-slate-600'}`}
                        />
                        {value && (
                            <button
                                type="button"
                                onClick={() => onChange({ target: { name, value: '' } } as any)}
                                className="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400 hover:text-slate-600 opacity-0 group-focus-within:opacity-100 transition-opacity"
                                aria-label={`Clear ${label}`}
                            >
                                <XCircleIcon className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
                </div>
            ) : (
                value
            )}
        </dd>
    </div>
);

const PasswordConfirmModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (password: string) => Promise<boolean>;
}> = ({ isOpen, onClose, onConfirm }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isConfirming, setIsConfirming] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setPassword('');
            setError('');
            setIsConfirming(false);
        }
    }, [isOpen]);

    const handleConfirm = async () => {
        setError('');
        setIsConfirming(true);
        const success = await onConfirm(password);
        if (!success) {
            setError('Mật khẩu không chính xác.');
        }
        setIsConfirming(false);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Xác thực để Lưu"
            confirmText={isConfirming ? "Đang xác thực..." : "Xác nhận"}
            onConfirm={handleConfirm}
            isConfirmDisabled={isConfirming || !password}
        >
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Vì lý do bảo mật, vui lòng nhập lại mật khẩu của bạn để xác nhận thay đổi thông tin cá nhân.
            </p>
            <div className="relative">
                <KeyIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu của bạn"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 focus:ring-indigo-500 focus:border-indigo-500"
                />
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </Modal>
    );
};


const ProfilePage: React.FC = () => {
    const { loggedInUser: user } = useAuth();
    const { handleUpdateUser } = useActions();
    const { addToast } = useToast();
    const [profile, setProfile] = useState<AdminManagedUser | null>(user);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setProfile(user);
    }, [user]);

    if (!user || !profile) {
        return null;
    }

    const validateProfile = (profileData: AdminManagedUser): Record<string, string> => {
        const errors: Record<string, string> = {};
        const phoneRegex = /^0\d{9}$/;
        
        if (profileData.phone && !phoneRegex.test(profileData.phone)) {
            errors.phone = "Số điện thoại phải bắt đầu bằng 0 và có 10 chữ số.";
        }
        
        return errors;
    }

    const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        let processedValue = value;
        
        if (name === 'phone') {
            processedValue = value.replace(/[^0-9]/g, '');
        }

        setProfile(p => p ? ({...p, [name]: processedValue}) : null);

        if (profileErrors[name]) {
            setProfileErrors(prev => {
                const newErrors = {...prev};
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setProfile(prev => prev ? ({ ...prev, avatar: event.target?.result as string }) : null);
                }
            };
            reader.readAsDataURL(e.target.files[0]);
        }
        e.target.value = ''; // Reset input to allow re-uploading same file
    };

    const handleSave = async () => {
        const validationErrors = validateProfile(profile);
        if (Object.keys(validationErrors).length > 0) {
            setProfileErrors(validationErrors);
            return;
        }

        // Check sensitive changes (Phone, Email)
        const sensitiveFields: (keyof AdminManagedUser)[] = ['phone', 'email'];
        const hasSensitiveChanges = sensitiveFields.some(field => profile[field] !== user[field]);

        if (hasSensitiveChanges) {
            setIsPasswordModalOpen(true);
        } else {
            setIsSaving(true);
            await new Promise(res => setTimeout(res, 500));
            const result = handleUpdateUser(profile);
            if(result.success) {
                setIsEditing(false);
            }
            setIsSaving(false);
        }
    };

    const handleConfirmSaveWithPassword = async (password: string): Promise<boolean> => {
        if (password !== user.password) {
            return false; // Let the modal show wrong password error.
        }

        // Password is correct, now try to update.
        const result = handleUpdateUser(profile);
        
        // Regardless of result, close password modal. The toast from onUpdateUser will show the error if any.
        setIsPasswordModalOpen(false);

        if (result.success) {
            setIsEditing(false); // Exit edit mode on success
        }

        // Return true to indicate password was correct, preventing modal from showing "wrong password" error.
        return true;
    };
    
    return (
        <div className="space-y-6">
            <PasswordConfirmModal
                isOpen={isPasswordModalOpen}
                onClose={() => setIsPasswordModalOpen(false)}
                onConfirm={handleConfirmSaveWithPassword}
            />
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Thông tin cá nhân</h2>
                {isEditing ? (
                        <div className="flex gap-2">
                            <button onClick={() => { setIsEditing(false); setProfile(user); setProfileErrors({}); }} className="px-4 py-2 text-sm font-medium bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600">Hủy</button>
                            <button onClick={handleSave} disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400">
                                {isSaving && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
                                {isSaving ? 'Đang lưu...' : 'Lưu'}
                            </button>
                        </div>
                ) : (
                    <button onClick={() => setIsEditing(true)} className="px-4 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900">Chỉnh sửa</button>
                )}
            </div>
            
            <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6">
                <div className="flex items-center gap-4 mb-6">
                     <div className="relative group">
                         <img 
                            src={profile.avatar} 
                            alt={profile.name} 
                            className={`w-20 h-20 rounded-full border-2 border-white dark:border-slate-700 shadow-sm object-cover ${isEditing ? 'cursor-pointer opacity-90 group-hover:opacity-100' : ''}`}
                            onClick={() => isEditing && fileInputRef.current?.click()}
                        />
                         {isEditing && (
                            <div 
                                className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <CameraIcon className="w-6 h-6 text-white" />
                            </div>
                         )}
                         <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleAvatarUpload} 
                            className="hidden" 
                            accept="image/*"
                         />
                     </div>
                     <div>
                         <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{profile.name}</h3>
                         <p className="text-sm text-slate-500 dark:text-slate-400">Thành viên từ: {profile.joinDate}</p>
                         {isEditing && <p className="text-xs text-indigo-500 mt-1 cursor-pointer hover:underline" onClick={() => fileInputRef.current?.click()}>Thay đổi ảnh đại diện</p>}
                     </div>
                </div>

                 <div className="border-t border-gray-200 dark:border-slate-700">
                    <dl className="divide-y divide-gray-200 dark:divide-slate-700">
                        <InfoRow label="Họ và tên" value={profile.name} name="name" isEditing={isEditing} onChange={handleProfileChange} />
                        <InfoRow label="Địa chỉ Email" value={profile.email} name="email" isEditing={isEditing} onChange={handleProfileChange} />
                        <InfoRow label="Số điện thoại liên hệ" value={profile.phone} name="phone" isEditing={isEditing} onChange={handleProfileChange} error={profileErrors.phone} inputType="tel" />
                        
                        <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                            <dt className="text-sm font-medium leading-6 text-slate-900 dark:text-slate-200">Mã giới thiệu của bạn</dt>
                            <dd className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-400 sm:col-span-2 sm:mt-0 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 tracking-wider transition-all">{user.id}</span>
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(user.id);
                                            addToast('Đã sao chép mã giới thiệu!', 'success');
                                        }}
                                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
                                        title="Sao chép"
                                    >
                                        <ClipboardDocumentIcon className="h-4 w-4 text-slate-400" />
                                    </button>
                                </div>
                                <span className="text-[10px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-tight">Hệ thống</span>
                            </dd>
                        </div>

                        {user.parentId && (
                            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                                <dt className="text-sm font-medium leading-6 text-slate-900 dark:text-slate-200">Người giới thiệu</dt>
                                <dd className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-400 sm:col-span-2 sm:mt-0">
                                    {user.parentId}
                                </dd>
                            </div>
                        )}
                    </dl>
                 </div>
            </div>
        </div>
    );
};

export default ProfilePage;
