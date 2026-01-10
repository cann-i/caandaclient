import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';

// Component defined outside
const InputField = ({ label, name, value, icon, type = "text", disabled = false, isEditing, onChange, error, maxLength }) => (
    <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{label}</label>
        <div className="relative group">
            <div className="absolute left-4 top-[14px] text-gray-400 group-focus-within:text-indigo-500 transition-colors">
                <i className={`fas ${icon}`}></i>
            </div>
            <input
                type={type}
                disabled={!isEditing || disabled}
                name={name}
                value={value || ''}
                onChange={onChange}
                maxLength={maxLength}
                className={`w-full pl-11 pr-4 py-3 rounded-xl border bg-gray-50 text-gray-700 font-medium transition-all duration-200
                    ${isEditing && !disabled
                        ? `border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 bg-white ${error ? '!border-red-500 !focus:ring-red-500/10' : ''}`
                        : 'border-transparent cursor-default start-0'
                    } ${disabled && isEditing ? 'opacity-60 bg-gray-100' : ''}`}
            />
            {disabled && isEditing && (
                <div className="absolute right-4 top-[14px] text-gray-400">
                    <i className="fas fa-lock" title="Cannot be edited"></i>
                </div>
            )}
        </div>
        {error && <p className="text-xs text-red-500 font-medium ml-1">{error}</p>}
        {disabled && isEditing && !error && (
            <p className="text-[10px] text-gray-400 ml-1">Login ID cannot be changed.</p>
        )}
    </div>
);

const ProfilePage = () => {
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState({});

    const [user, setUser] = useState({
        name: '',
        role: 'Chartered Accountant',
        email: '',
        phone: '',
        user_type: '',
        status: '',
        avatar: null,
        joinDate: ''
    });

    const [formData, setFormData] = useState({});
    const [previewImage, setPreviewImage] = useState(null);
    const [removeAvatar, setRemoveAvatar] = useState(false); // New state for removal
    const fileInputRef = useRef(null);

    // Fetch User Data
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    setIsLoading(false);
                    return;
                }

                const response = await axios.get('http://localhost:5000/api/auth/profile', {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const data = response.data;
                const formattedUser = {
                    name: data.name || '',
                    role: data.user_type === 'ca' ? 'Chartered Accountant' : 'Client',
                    user_type: data.user_type,
                    email: data.email || '',
                    phone: data.mobile || '',
                    joinDate: new Date(data.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                    status: data.is_active ? 'Active' : 'Inactive',
                    avatar: data.profile_image
                        ? (data.profile_image.startsWith('http') ? data.profile_image : `http://localhost:5000${data.profile_image}`)
                        : null
                };

                setUser(formattedUser);
                setFormData(formattedUser);
            } catch (error) {
                console.error("Failed to load profile:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'phone') {
            if (value && !/^\d*$/.test(value)) return;
            setErrors(prev => ({ ...prev, phone: '' }));
        }
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({ ...prev, avatarFile: file }));
            // Create preview URL
            const objectUrl = URL.createObjectURL(file);
            setPreviewImage(objectUrl);
            setRemoveAvatar(false); // Reset removal if new file selected
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current.click();
    };

    const handleRemoveAvatar = () => {
        setRemoveAvatar(true);
        setPreviewImage(null);
        setFormData(prev => ({ ...prev, avatarFile: null })); // Clear selected file
    };

    const handleSave = async () => {
        if (formData.phone && formData.phone.length !== 10) {
            setErrors({ phone: 'Mobile number must be exactly 10 digits' });
            return;
        }

        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
            const data = new FormData();
            data.append('name', formData.name);
            data.append('mobile', formData.phone);

            if (removeAvatar) {
                data.append('remove_avatar', 'true');
            } else if (formData.avatarFile) {
                data.append('avatar', formData.avatarFile);
            }

            const response = await axios.put('http://localhost:5000/api/auth/profile', data, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            // Update user state with response data
            const updatedUser = {
                ...user,
                name: formData.name,
                phone: formData.phone,
            };

            if (removeAvatar) {
                updatedUser.avatar = null;
            } else if (response.data.user.profile_image) {
                updatedUser.avatar = `http://localhost:5000${response.data.user.profile_image}`;
            } else if (previewImage) {
                updatedUser.avatar = previewImage;
            }

            setUser(updatedUser);
            setIsEditing(false);
            setErrors({});
            setPreviewImage(null);
            setRemoveAvatar(false);
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Failed to update profile");
        } finally {
            setIsSaving(false);
        }
    };

    const StatusBadge = ({ status }) => (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider
            ${status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
            <span className={`w-2 h-2 rounded-full ${status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></span>
            {status}
        </span>
    );

    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.4,
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    // Determine which image to show based on state
    // If pending removal -> show placeholder
    // Else if preview -> show preview
    // Else -> show user.avatar (or placeholder if null)
    const showPlaceholder = removeAvatar || (!previewImage && !user.avatar);
    const displayAvatar = !removeAvatar ? (previewImage || user.avatar) : null;

    return (
        <div className="min-h-screen bg-gray-50/50 p-4 md:p-6 lg:p-8 font-sans">
            <motion.div
                initial="hidden"
                animate="visible"
                variants={containerVariants}
                className="max-w-5xl mx-auto space-y-6"
            >
                {/* Header Section */}
                <motion.div variants={itemVariants} className="relative bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-900 rounded-3xl shadow-xl p-8 text-white overflow-hidden">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-white opacity-5 rounded-full blur-3xl -mr-20 -mt-20"></div>
                    <div className="absolute bottom-0 left-0 w-60 h-60 bg-indigo-500 opacity-20 rounded-full blur-3xl -ml-10 -mb-10"></div>

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight mb-2">My Profile</h1>
                            <p className="text-indigo-200 font-medium flex items-center gap-2">
                                <i className="fas fa-id-badge"></i>
                                Manage your personal account details
                            </p>
                        </div>
                        <div className="flex gap-3">
                            {isEditing ? (
                                <>
                                    <button
                                        onClick={() => {
                                            setIsEditing(false);
                                            setFormData(user); // Reset
                                            setErrors({});
                                            setPreviewImage(null);
                                            setRemoveAvatar(false);
                                        }}
                                        className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold backdrop-blur-md transition-all border border-white/10"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="px-6 py-2.5 rounded-xl bg-white text-indigo-900 font-bold hover:bg-indigo-50 shadow-lg transition-all flex items-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
                                    >
                                        {isSaving ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-save"></i>}
                                        Save Changes
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold backdrop-blur-md transition-all border border-white/10 flex items-center gap-2"
                                >
                                    <i className="fas fa-pen"></i>
                                    Edit Profile
                                </button>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left Column: User Card */}
                    <motion.div variants={itemVariants} className="lg:col-span-1 bg-white rounded-3xl shadow-sm border border-gray-100 p-6 text-center relative overflow-hidden h-fit">
                        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-indigo-500 to-purple-600"></div>

                        <div className="relative z-10 -mt-2 mb-4">
                            <div className="w-28 h-28 mx-auto rounded-2xl bg-white p-1.5 shadow-lg rotate-3 hover:rotate-0 transition-transform duration-300 relative group">
                                {!showPlaceholder ? (
                                    <img src={displayAvatar} alt="Profile" className="w-full h-full object-cover rounded-xl" />
                                ) : (
                                    <div className="w-full h-full rounded-xl bg-indigo-100 flex items-center justify-center text-3xl font-bold text-indigo-600 border-2 border-dashed border-indigo-200">
                                        {user.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2) : 'U'}
                                    </div>
                                )}

                                {isEditing && (
                                    <>
                                        {/* Overlay for actions */}
                                        <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-3">
                                            <button onClick={triggerFileInput} className="w-10 h-10 rounded-full bg-white text-indigo-600 flex items-center justify-center hover:bg-gray-100 pointer-events-auto" title="Change Photo">
                                                <i className="fas fa-camera"></i>
                                            </button>
                                            {!showPlaceholder && (
                                                <button onClick={handleRemoveAvatar} className="w-10 h-10 rounded-full bg-white text-red-500 flex items-center justify-center hover:bg-gray-100 pointer-events-auto" title="Remove Photo">
                                                    <i className="fas fa-trash"></i>
                                                </button>
                                            )}
                                        </div>

                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                            className="hidden"
                                            accept="image/*"
                                        />

                                        {/* Always visible small camera icon if not hovering (optional, but keeping it simpler for now) */}
                                        <button onClick={triggerFileInput} className="absolute bottom-0 right-1/2 translate-x-14 translate-y-2 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 shadow-md transition-colors z-20 group-hover:opacity-0">
                                            <i className="fas fa-camera text-xs"></i>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        <h2 className="text-xl font-bold text-gray-800 mb-1">{user.name}</h2>
                        <p className="text-indigo-600 font-medium text-sm">{user.role}</p>
                        <p className="text-gray-500 text-xs mb-4">Senior Partner</p>

                        <div className="flex justify-center gap-2 mb-6">
                            <StatusBadge status={user.status} />
                        </div>

                        <div className="border-t border-gray-100 pt-6 space-y-4 text-left">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 font-medium">Joined</span>
                                <span className="text-gray-900 font-bold">{user.joinDate}</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Right Column: Details */}
                    <motion.div variants={itemVariants} className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
                        <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <i className="fas fa-user-circle text-lg"></i>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Account Details</h3>
                                <p className="text-sm text-gray-500">View and update your personal information</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <InputField
                                    label="Full Name"
                                    name="name"
                                    value={formData.name}
                                    icon="fa-user"
                                    isEditing={isEditing}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <InputField
                                    label="Email Address"
                                    name="email"
                                    value={formData.email}
                                    icon="fa-envelope"
                                    type="email"
                                    disabled={true}
                                    isEditing={isEditing}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <InputField
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
                            </div>
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
};

export default ProfilePage;