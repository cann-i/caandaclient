import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

// Toast Notification Component
const Toast = ({ message, type = 'info', onClose }) => {
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
        warning: 'bg-amber-500'
    };

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle',
        warning: 'fa-exclamation-triangle'
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className={`fixed top-8 left-1/2 z-50 ${colors[type]} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[300px] max-w-md`}
        >
            <i className={`fas ${icons[type]} text-xl`}></i>
            <p className="font-semibold flex-1">{message}</p>
            <button onClick={onClose} className="hover:bg-white/20 rounded-full p-1 transition-colors">
                <i className="fas fa-times"></i>
            </button>
        </motion.div>
    );
};

// Modern Input Component with floating labels
const ModernInput = ({ label, name, value, icon, type = "text", disabled = false, isEditing, onChange, error, maxLength, readonly = false }) => (
    <div className="relative">
        <div className={`relative transition-all duration-300 ${isEditing && !disabled ? 'group' : ''}`}>
            <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-300
                ${value || isEditing ? 'text-indigo-500' : 'text-gray-400'}
                ${isEditing && !disabled ? 'group-focus-within:text-indigo-600 scale-110' : ''}`}>
                <i className={`fas ${icon}`}></i>
            </div>

            <div className="relative">
                <label className={`absolute left-11 transition-all duration-300 pointer-events-none
                    ${value || isEditing
                        ? 'top-2 text-xs font-semibold text-indigo-600'
                        : 'top-1/2 -translate-y-1/2 text-gray-500'}`}>
                    {label}
                </label>

                <input
                    type={type}
                    readOnly={readonly}
                    disabled={!isEditing || disabled || readonly}
                    name={name}
                    value={value || ''}
                    onChange={onChange}
                    maxLength={maxLength}
                    className={`w-full pt-6 pb-3 ${value ? 'pl-11' : 'pl-11'} pr-4 rounded-xl border-2 bg-transparent font-medium transition-all duration-300
                        ${readonly ? 'cursor-default bg-gray-50' : ''}
                        ${isEditing && !disabled && !readonly
                            ? `border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 ${error ? '!border-red-400' : ''}`
                            : 'border-transparent'
                        }
                        ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-gray-300'}`}
                />
            </div>

            {(disabled || readonly) && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <i className="fas fa-lock text-sm"></i>
                </div>
            )}
        </div>

        <AnimatePresence>
            {error && (
                <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-xs text-red-400 font-medium mt-2 ml-1"
                >
                    {error}
                </motion.p>
            )}
        </AnimatePresence>
    </div>
);

// Modern Select Component
const ModernSelect = ({ label, name, value, icon, options, disabled = false, isEditing, onChange, readonly = false }) => (
    <div className="relative">
        <div className={`relative transition-all duration-300 ${isEditing && !disabled ? 'group' : ''}`}>
            <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-300
                ${value ? 'text-indigo-500' : 'text-gray-400'}
                ${isEditing && !disabled ? 'group-focus-within:text-indigo-600 scale-110' : ''}`}>
                <i className={`fas ${icon}`}></i>
            </div>

            <label className={`absolute left-11 transition-all duration-300 pointer-events-none
                ${value || isEditing
                    ? 'top-2 text-xs font-semibold text-indigo-600'
                    : 'top-1/2 -translate-y-1/2 text-gray-500'}`}>
                {label}
            </label>

            <select
                disabled={!isEditing || disabled || readonly}
                name={name}
                value={value || ''}
                onChange={onChange}
                className={`w-full pt-6 pb-3 pl-11 pr-10 rounded-xl border-2 bg-transparent font-medium appearance-none transition-all duration-300
                    ${readonly ? 'cursor-default bg-gray-50' : ''}
                    ${isEditing && !disabled && !readonly
                        ? 'border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 cursor-pointer'
                        : 'border-transparent'
                    }
                    ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
                <option value=""></option>
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>

            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <i className="fas fa-chevron-down text-xs"></i>
            </div>
        </div>
    </div>
);

// Section Header Component
const SectionHeader = ({ icon, title, subtitle, color = "indigo" }) => {
    const colors = {
        indigo: 'bg-indigo-50 text-indigo-600',
        purple: 'bg-purple-50 text-purple-600',
        green: 'bg-green-50 text-green-600',
        blue: 'bg-blue-50 text-blue-600',
        amber: 'bg-amber-50 text-amber-600'
    };

    return (
        <div className="flex items-center gap-4 mb-8">
            <div className={`w-14 h-14 rounded-2xl ${colors[color]} flex items-center justify-center`}>
                <i className={`fas ${icon} text-xl`}></i>
            </div>
            <div>
                <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
                <p className="text-gray-500 font-medium">{subtitle}</p>
            </div>
        </div>
    );
};

// Password Input Component
const PasswordInput = ({ label, value, onChange, error, showPassword, onToggle, name }) => (
    <div className="relative">
        <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-500 transition-colors">
                <i className={`fas ${label.includes('Current') ? 'fa-key' : 'fa-lock'}`}></i>
            </div>

            <input
                type={showPassword ? "text" : "password"}
                name={name}
                value={value}
                onChange={onChange}
                className={`w-full pl-12 pr-12 py-4 rounded-xl border-2 bg-white text-gray-700 font-medium transition-all duration-200 
                    border-gray-200 focus:border-red-400 focus:ring-2 focus:ring-red-500/20 ${error ? '!border-red-400' : ''}`}
                placeholder={label}
            />

            <button
                type="button"
                onClick={onToggle}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </button>
        </div>

        {error && (
            <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-red-400 font-medium mt-2 ml-1"
            >
                {error}
            </motion.p>
        )}
    </div>
);

// Profile Avatar Component
const ProfileAvatar = ({ avatar, name, isEditing, onFileChange, onRemove, showPlaceholder, previewImage }) => {
    const fileInputRef = useRef(null);

    const handleAvatarClick = () => {
        if (isEditing) {
            fileInputRef.current.click();
        }
    };

    const displayAvatar = previewImage || avatar;

    return (
        <div className="relative group">
            <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`relative w-32 h-32 rounded-3xl mx-auto overflow-hidden cursor-pointer
                    ${isEditing ? 'ring-4 ring-offset-4 ring-indigo-500/20 ring-offset-white' : ''}`}
                onClick={handleAvatarClick}
            >
                {!showPlaceholder && displayAvatar ? (
                    <img
                        src={displayAvatar}
                        alt="Profile"
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                        <span className="text-4xl font-bold text-white">
                            {name ? name.split(' ').map(n => n[0]).join('').substring(0, 2) : 'U'}
                        </span>
                    </div>
                )}

                {isEditing && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <i className="fas fa-camera text-2xl text-white"></i>
                    </div>
                )}
            </motion.div>

            {isEditing && displayAvatar && !showPlaceholder && (
                <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onRemove}
                    className="absolute top-0 right-0 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600"
                >
                    <i className="fas fa-times text-xs"></i>
                </motion.button>
            )}

            <input
                type="file"
                ref={fileInputRef}
                onChange={onFileChange}
                className="hidden"
                accept="image/*"
            />
        </div>
    );
};

const ModernClientProfile = () => {
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [showPasswordSection, setShowPasswordSection] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [toast, setToast] = useState(null);

    const [user, setUser] = useState({
        name: '',
        role: 'Client',
        email: '',
        phone: '',
        user_type: '',
        status: '',
        avatar: null,
        joinDate: ''
    });

    const [clientData, setClientData] = useState({
        business_name: '',
        client_code: '',
        client_category: 'individual',
        pan_number: '',
        aadhar_number: '',
        gstin: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        date_of_birth: '',
        notes: ''
    });

    const [formData, setFormData] = useState({});
    const [previewImage, setPreviewImage] = useState(null);
    const [removeAvatar, setRemoveAvatar] = useState(false);

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });
    const [passwordErrors, setPasswordErrors] = useState({});

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    setIsLoading(false);
                    return;
                }

                const userResponse = await axios.get('http://localhost:5000/api/auth/profile', {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const userData = userResponse.data;
                const formattedUser = {
                    id: userData.id,
                    name: userData.name || '',
                    role: userData.user_type === 'ca' ? 'Chartered Accountant' : 'Client',
                    user_type: userData.user_type,
                    email: userData.email || '',
                    phone: userData.mobile || '',
                    joinDate: new Date(userData.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                    status: userData.is_active ? 'Active' : 'Inactive',
                    avatar: userData.profile_image
                        ? (userData.profile_image.startsWith('http') ? userData.profile_image : `http://localhost:5000${userData.profile_image}`)
                        : null
                };

                setUser(formattedUser);

                try {
                    const clientResponse = await axios.get(`http://localhost:5000/api/clients/by-user/${userData.id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    const client = clientResponse.data;
                    const formattedClient = {
                        business_name: client.business_name || '',
                        client_code: client.client_code || '',
                        client_category: client.client_category || 'individual',
                        pan_number: client.pan_number || '',
                        aadhar_number: client.aadhar_number || '',
                        gstin: client.gstin || '',
                        address: client.address || '',
                        city: client.city || '',
                        state: client.state || '',
                        pincode: client.pincode || '',
                        date_of_birth: client.date_of_birth ? client.date_of_birth.split('T')[0] : '',
                        notes: client.notes || ''
                    };

                    setClientData(formattedClient);
                    setFormData({ ...formattedUser, ...formattedClient });
                } catch (clientError) {
                    console.log('No client record found for this user');
                    setFormData(formattedUser);
                }
            } catch (error) {
                console.error("Failed to load profile:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const handleEditClick = () => {
        if (isEditing) {
            setIsEditing(false);
        } else {
            setIsEditing(true);
            // Show toast notification when entering edit mode
            setToast({
                message: 'Please contact your CA to modify official records (PAN, Aadhar, GSTIN)',
                type: 'info'
            });
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        // Prevent editing of official documents
        if (['pan_number', 'aadhar_number', 'gstin', 'client_code'].includes(name)) {
            setToast({
                message: 'This information cannot be changed. Please contact your CA.',
                type: 'warning'
            });
            return;
        }

        if (name === 'phone') {
            if (value && !/^\d*$/.test(value)) return;
            setErrors(prev => ({ ...prev, phone: '' }));
        }
        if (name === 'pincode') {
            if (value && !/^\d*$/.test(value)) return;
            setErrors(prev => ({ ...prev, pincode: '' }));
        }
        if (name === 'aadhar_number') {
            if (value && !/^\d*$/.test(value)) return;
            setErrors(prev => ({ ...prev, aadhar_number: '' }));
        }
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({ ...prev, avatarFile: file }));
            const objectUrl = URL.createObjectURL(file);
            setPreviewImage(objectUrl);
            setRemoveAvatar(false);
        }
    };

    const handleRemoveAvatar = () => {
        setRemoveAvatar(true);
        setPreviewImage(null);
        setFormData(prev => ({ ...prev, avatarFile: null }));
    };

    const handleSave = async () => {
        const newErrors = {};
        if (formData.phone && formData.phone.length !== 10) {
            newErrors.phone = 'Mobile number must be exactly 10 digits';
        }
        if (formData.pincode && formData.pincode.length !== 6) {
            newErrors.pincode = 'Pincode must be exactly 6 digits';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');

            const userData = new FormData();
            userData.append('name', formData.name);
            userData.append('mobile', formData.phone);

            if (removeAvatar) {
                userData.append('remove_avatar', 'true');
            } else if (formData.avatarFile) {
                userData.append('avatar', formData.avatarFile);
            }

            const userResponse = await axios.put('http://localhost:5000/api/auth/profile', userData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            const clientPayload = {
                business_name: formData.business_name,
                address: formData.address,
                city: formData.city,
                state: formData.state,
                pincode: formData.pincode,
                date_of_birth: formData.date_of_birth,
                notes: formData.notes
            };

            await axios.put(`http://localhost:5000/api/clients/profile/${user.id}`, clientPayload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const updatedUser = {
                ...user,
                name: formData.name,
                phone: formData.phone,
            };

            if (removeAvatar) {
                updatedUser.avatar = null;
            } else if (userResponse.data.user.profile_image) {
                updatedUser.avatar = `http://localhost:5000${userResponse.data.user.profile_image}`;
            } else if (previewImage) {
                updatedUser.avatar = previewImage;
            }

            setUser(updatedUser);
            setClientData({
                ...clientData,
                business_name: formData.business_name,
                address: formData.address,
                city: formData.city,
                state: formData.state,
                pincode: formData.pincode,
                date_of_birth: formData.date_of_birth,
                notes: formData.notes
            });

            setIsEditing(false);
            setErrors({});
            setPreviewImage(null);
            setRemoveAvatar(false);

            // Show success toast
            setToast({
                message: 'Profile updated successfully!',
                type: 'success'
            });
        } catch (error) {
            console.error("Error updating profile:", error);
            setToast({
                message: 'Failed to update profile',
                type: 'error'
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();

        const newErrors = {};
        if (!passwordData.currentPassword) {
            newErrors.currentPassword = 'Current password is required';
        }
        if (!passwordData.newPassword) {
            newErrors.newPassword = 'New password is required';
        } else if (passwordData.newPassword.length < 6) {
            newErrors.newPassword = 'Password must be at least 6 characters';
        }
        if (!passwordData.confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password';
        } else if (passwordData.newPassword !== passwordData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }
        if (passwordData.currentPassword === passwordData.newPassword) {
            newErrors.newPassword = 'New password must be different from current password';
        }

        if (Object.keys(newErrors).length > 0) {
            setPasswordErrors(newErrors);
            return;
        }

        setIsChangingPassword(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5000/api/auth/change-password', passwordData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setPasswordErrors({});
            setShowPasswordSection(false);
            setShowPasswords({ current: false, new: false, confirm: false });

            setToast({
                message: 'Password changed successfully!',
                type: 'success'
            });
        } catch (error) {
            console.error("Error changing password:", error);
            setToast({
                message: error.response?.data?.message || 'Failed to change password',
                type: 'error'
            });
        } finally {
            setIsChangingPassword(false);
        }
    };

    const handlePasswordInputChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({ ...prev, [name]: value }));
        setPasswordErrors(prev => ({ ...prev, [name]: '' }));
    };

    const togglePasswordVisibility = (field) => {
        setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const clientCategoryOptions = [
        { value: 'individual', label: 'Individual' },
        { value: 'business', label: 'Business' },
        { value: 'partnership', label: 'Partnership' },
        { value: 'company', label: 'Company' }
    ];

    const showPlaceholder = removeAvatar || (!previewImage && !user.avatar);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-gray-300 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-600 font-medium">Loading profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
            {/* Toast Notification */}
            <AnimatePresence>
                {toast && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast(null)}
                    />
                )}
            </AnimatePresence>

            {/* Animated Background Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-indigo-200 to-purple-200 rounded-full opacity-20 blur-3xl"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-blue-200 to-cyan-200 rounded-full opacity-20 blur-3xl"></div>
            </div>

            <div className="relative container mx-auto px-4 py-8 max-w-6xl">
                {/* Header */}
                <motion.header
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="mb-12"
                >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900 mb-2">Client Profile</h1>
                            <p className="text-gray-600 font-medium">Manage your account and personal information</p>
                        </div>

                        <div className="flex gap-3">
                            {isEditing ? (
                                <>
                                    <button
                                        onClick={() => {
                                            setIsEditing(false);
                                            setFormData({ ...user, ...clientData });
                                            setErrors({});
                                            setPreviewImage(null);
                                            setRemoveAvatar(false);
                                        }}
                                        className="px-6 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold hover:from-indigo-600 hover:to-purple-600 shadow-lg transition-all flex items-center gap-2 disabled:opacity-75"
                                    >
                                        {isSaving ? (
                                            <>
                                                <i className="fas fa-circle-notch fa-spin"></i>
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fas fa-check"></i>
                                                Save Changes
                                            </>
                                        )}
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={handleEditClick}
                                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-gray-900 to-gray-700 text-white font-semibold hover:from-gray-800 hover:to-gray-600 shadow-lg transition-all flex items-center gap-2"
                                >
                                    <i className="fas fa-pen"></i>
                                    Edit Profile
                                </button>
                            )}
                        </div>
                    </div>
                </motion.header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Profile Card with Change Password */}
                    <motion.div
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className="lg:col-span-1 space-y-8"
                    >
                        {/* Profile Card */}
                        <div className="bg-white rounded-3xl shadow-xl p-8 sticky top-8">
                            <ProfileAvatar
                                avatar={user.avatar}
                                name={user.name}
                                isEditing={isEditing}
                                onFileChange={handleFileChange}
                                onRemove={handleRemoveAvatar}
                                showPlaceholder={showPlaceholder}
                                previewImage={previewImage}
                            />

                            <div className="text-center mt-6">
                                <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
                                <p className="text-indigo-600 font-medium mt-1">{user.role}</p>

                                {clientData.client_code && (
                                    <div className="inline-block bg-gray-100 text-gray-700 px-4 py-1 rounded-full text-sm font-medium mt-3">
                                        {clientData.client_code}
                                    </div>
                                )}
                            </div>

                            <div className="mt-8 space-y-4">
                                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                                    <span className="text-gray-500 font-medium">Status</span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${user.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {user.status}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                                    <span className="text-gray-500 font-medium">Category</span>
                                    <span className="text-gray-900 font-semibold capitalize">
                                        {clientData.client_category}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between py-3">
                                    <span className="text-gray-500 font-medium">Member Since</span>
                                    <span className="text-gray-900 font-bold">{user.joinDate}</span>
                                </div>
                            </div>
                        </div>

                        {/* Change Password Section (Always Visible in Sidebar) */}
                        <div className="bg-white rounded-3xl shadow-xl p-8 sticky top-[calc(100vh-400px)]">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                    <i className="fas fa-shield-alt text-xl"></i>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Security</h3>
                                    <p className="text-sm text-gray-500">Update your password</p>
                                </div>
                            </div>

                            {!showPasswordSection ? (
                                <div className="text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-4">
                                        <i className="fas fa-lock text-2xl"></i>
                                    </div>
                                    <button
                                        onClick={() => setShowPasswordSection(true)}
                                        className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold hover:from-amber-600 hover:to-orange-600 shadow-lg transition-all flex items-center justify-center gap-2"
                                    >
                                        <i className="fas fa-key"></i>
                                        Change Password
                                    </button>
                                </div>
                            ) : (
                                <motion.form
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    onSubmit={handlePasswordChange}
                                    className="space-y-6"
                                >
                                    <PasswordInput
                                        label="Current Password"
                                        name="currentPassword"
                                        value={passwordData.currentPassword}
                                        onChange={handlePasswordInputChange}
                                        error={passwordErrors.currentPassword}
                                        showPassword={showPasswords.current}
                                        onToggle={() => togglePasswordVisibility('current')}
                                    />

                                    <PasswordInput
                                        label="New Password"
                                        name="newPassword"
                                        value={passwordData.newPassword}
                                        onChange={handlePasswordInputChange}
                                        error={passwordErrors.newPassword}
                                        showPassword={showPasswords.new}
                                        onToggle={() => togglePasswordVisibility('new')}
                                    />

                                    <PasswordInput
                                        label="Confirm New Password"
                                        name="confirmPassword"
                                        value={passwordData.confirmPassword}
                                        onChange={handlePasswordInputChange}
                                        error={passwordErrors.confirmPassword}
                                        showPassword={showPasswords.confirm}
                                        onToggle={() => togglePasswordVisibility('confirm')}
                                    />

                                    <div className="flex gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowPasswordSection(false)}
                                            className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-all text-sm"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isChangingPassword}
                                            className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-semibold hover:from-red-600 hover:to-orange-600 shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-75"
                                        >
                                            {isChangingPassword ? (
                                                <>
                                                    <i className="fas fa-circle-notch fa-spin"></i>
                                                    Updating
                                                </>
                                            ) : (
                                                <>
                                                    <i className="fas fa-lock"></i>
                                                    Update
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </motion.form>
                            )}
                        </div>
                    </motion.div>

                    {/* Right Column - Forms */}
                    <motion.div
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className="lg:col-span-2 space-y-8"
                    >
                        {/* Personal Information with PAN, Aadhar, GSTIN */}
                        <div className="bg-white rounded-3xl shadow-xl p-8">
                            <SectionHeader
                                icon="fa-user-circle"
                                title="Personal Information"
                                subtitle="Your personal and official details"
                                color="indigo"
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <ModernInput
                                    label="Full Name"
                                    name="name"
                                    value={formData.name}
                                    icon="fa-user"
                                    isEditing={isEditing}
                                    onChange={handleInputChange}
                                />

                                <ModernInput
                                    label="Email Address"
                                    name="email"
                                    value={formData.email}
                                    icon="fa-envelope"
                                    type="email"
                                    readonly={true}
                                    isEditing={isEditing}
                                    onChange={handleInputChange}
                                />

                                <ModernInput
                                    label="Mobile Number"
                                    name="phone"
                                    value={formData.phone}
                                    icon="fa-phone"
                                    type="tel"
                                    maxLength={10}
                                    isEditing={isEditing}
                                    onChange={handleInputChange}
                                    error={errors.phone}
                                />

                                <ModernInput
                                    label="Date of Birth"
                                    name="date_of_birth"
                                    value={formData.date_of_birth}
                                    icon="fa-calendar"
                                    type="date"
                                    isEditing={isEditing}
                                    onChange={handleInputChange}
                                />

                                {/* Official Documents */}
                                <ModernInput
                                    label="PAN Number"
                                    name="pan_number"
                                    value={formData.pan_number}
                                    icon="fa-id-card"
                                    readonly={true}
                                    isEditing={isEditing}
                                    onChange={handleInputChange}
                                />

                                <ModernInput
                                    label="Aadhar Number"
                                    name="aadhar_number"
                                    value={formData.aadhar_number}
                                    icon="fa-id-badge"
                                    type="text"
                                    maxLength={12}
                                    readonly={true}
                                    isEditing={isEditing}
                                    onChange={handleInputChange}
                                />

                                <div className="md:col-span-2">
                                    <ModernInput
                                        label="GSTIN"
                                        name="gstin"
                                        value={formData.gstin}
                                        icon="fa-receipt"
                                        readonly={true}
                                        isEditing={isEditing}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Business Information */}
                        <div className="bg-white rounded-3xl shadow-xl p-8">
                            <SectionHeader
                                icon="fa-briefcase"
                                title="Business Information"
                                subtitle="Company and professional details"
                                color="purple"
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="md:col-span-2">
                                    <ModernInput
                                        label="Business Name"
                                        name="business_name"
                                        value={formData.business_name}
                                        icon="fa-building"
                                        isEditing={isEditing}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <ModernInput
                                    label="Client Code"
                                    name="client_code"
                                    value={formData.client_code}
                                    icon="fa-hashtag"
                                    readonly={true}
                                    isEditing={isEditing}
                                    onChange={handleInputChange}
                                />

                                <ModernSelect
                                    label="Client Category"
                                    name="client_category"
                                    value={formData.client_category}
                                    icon="fa-tag"
                                    options={clientCategoryOptions}
                                    readonly={true}
                                    isEditing={isEditing}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        {/* Address Information */}
                        <div className="bg-white rounded-3xl shadow-xl p-8">
                            <SectionHeader
                                icon="fa-map-marker-alt"
                                title="Address Information"
                                subtitle="Your location and contact address"
                                color="blue"
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="md:col-span-2">
                                    <ModernInput
                                        label="Address"
                                        name="address"
                                        value={formData.address}
                                        icon="fa-home"
                                        isEditing={isEditing}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <ModernInput
                                    label="City"
                                    name="city"
                                    value={formData.city}
                                    icon="fa-city"
                                    isEditing={isEditing}
                                    onChange={handleInputChange}
                                />

                                <ModernInput
                                    label="State"
                                    name="state"
                                    value={formData.state}
                                    icon="fa-map"
                                    isEditing={isEditing}
                                    onChange={handleInputChange}
                                />

                                <ModernInput
                                    label="Pincode"
                                    name="pincode"
                                    value={formData.pincode}
                                    icon="fa-mail-bulk"
                                    type="text"
                                    maxLength={6}
                                    isEditing={isEditing}
                                    onChange={handleInputChange}
                                    error={errors.pincode}
                                />
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default ModernClientProfile;