import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  User,
  Mail,
  Phone,
  Camera,
  Trash2,
  Save,
  X,
  Edit2,
  ShieldCheck,
  Calendar,
  Lock
} from 'lucide-react';
import Button from '../../components/ui/Button';

// Component defined outside
const InputField = ({ label, name, value, icon: Icon, type = "text", disabled = false, isEditing, onChange, error, maxLength }) => (
    <div className="space-y-1.5">
        <label className="text-xs font-mono text-secondary uppercase tracking-wider ml-1">{label}</label>
        <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary group-focus-within:text-accent transition-colors">
                <Icon size={18} />
            </div>
            <input
                type={type}
                disabled={!isEditing || disabled}
                name={name}
                value={value || ''}
                onChange={onChange}
                maxLength={maxLength}
                className={`w-full pl-11 pr-4 py-3 rounded-xl border bg-background text-primary font-medium transition-all duration-200 outline-none
                    ${isEditing && !disabled
                        ? `border-border focus:border-accent focus:ring-1 focus:ring-accent ${error ? '!border-error !focus:ring-error/10' : ''}`
                        : 'border-transparent cursor-default start-0'
                    } ${disabled && isEditing ? 'opacity-60 bg-surface' : ''}`}
            />
            {disabled && isEditing && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary">
                    <Lock size={16} />
                </div>
            )}
        </div>
        {error && <p className="text-xs text-error font-medium ml-1">{error}</p>}
        {disabled && isEditing && !error && (
            <p className="text-[10px] text-secondary ml-1">This field cannot be changed.</p>
        )}
    </div>
);

const ProfilePage = ({ showToast }) => {
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
    const [removeAvatar, setRemoveAvatar] = useState(false);
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
            const objectUrl = URL.createObjectURL(file);
            setPreviewImage(objectUrl);
            setRemoveAvatar(false);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current.click();
    };

    const handleRemoveAvatar = () => {
        setRemoveAvatar(true);
        setPreviewImage(null);
        setFormData(prev => ({ ...prev, avatarFile: null }));
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
            if (showToast) showToast('Profile updated successfully', 'success');
        } catch (error) {
            console.error("Error updating profile:", error);
            if (showToast) showToast("Failed to update profile", 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const StatusBadge = ({ status }) => (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border
            ${status === 'Active' ? 'bg-success/10 text-success border-success/20' : 'bg-secondary/10 text-secondary border-border'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status === 'Active' ? 'bg-success animate-pulse' : 'bg-secondary'}`}></span>
            {status}
        </span>
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
            </div>
        );
    }

    const showPlaceholder = removeAvatar || (!previewImage && !user.avatar);
    const displayAvatar = !removeAvatar ? (previewImage || user.avatar) : null;

    return (
        <div className="max-w-5xl mx-auto space-y-6">

            {/* Header Section */}
            <div className="relative bg-surface border border-border rounded-3xl shadow-lg p-8 overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-2xl font-bold text-primary tracking-tight mb-2">My Profile</h1>
                        <p className="text-secondary text-sm font-medium flex items-center gap-2">
                            <ShieldCheck size={16} className="text-accent" />
                            Manage your personal account details
                        </p>
                    </div>
                    <div className="flex gap-3">
                        {isEditing ? (
                            <>
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        setIsEditing(false);
                                        setFormData(user);
                                        setErrors({});
                                        setPreviewImage(null);
                                        setRemoveAvatar(false);
                                    }}
                                    className="border border-border"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="accent"
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="w-32"
                                >
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </>
                        ) : (
                            <Button
                                variant="secondary"
                                onClick={() => setIsEditing(true)}
                                className="gap-2"
                            >
                                <Edit2 size={16} /> Edit Profile
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: User Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="lg:col-span-1 bg-surface border border-border rounded-3xl p-6 text-center relative overflow-hidden h-fit"
                >
                    <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-surface-highlight to-surface"></div>

                    <div className="relative z-10 -mt-2 mb-4">
                        <div className="w-28 h-28 mx-auto rounded-2xl bg-surface p-1.5 shadow-lg border border-border relative group">
                            {!showPlaceholder ? (
                                <img src={displayAvatar} alt="Profile" className="w-full h-full object-cover rounded-xl" />
                            ) : (
                                <div className="w-full h-full rounded-xl bg-surface-highlight flex items-center justify-center text-3xl font-bold text-accent border-2 border-dashed border-border">
                                    {user.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2) : 'U'}
                                </div>
                            )}

                            {isEditing && (
                                <>
                                    <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-3 backdrop-blur-sm">
                                        <button onClick={triggerFileInput} className="p-2 rounded-lg bg-surface text-primary hover:bg-surface-highlight hover:text-accent transition-colors" title="Change Photo">
                                            <Camera size={18} />
                                        </button>
                                        {!showPlaceholder && (
                                            <button onClick={handleRemoveAvatar} className="p-2 rounded-lg bg-surface text-error hover:bg-error/10 transition-colors" title="Remove Photo">
                                                <Trash2 size={18} />
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
                                    <button onClick={triggerFileInput} className="absolute bottom-0 right-0 translate-x-2 translate-y-2 p-2 rounded-full bg-accent text-white shadow-lg z-20 group-hover:opacity-0 transition-opacity">
                                        <Camera size={14} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <h2 className="text-xl font-bold text-primary mb-1">{user.name}</h2>
                    <p className="text-accent font-medium text-sm">{user.role}</p>
                    <p className="text-secondary text-xs mb-4">DocuCA Member</p>

                    <div className="flex justify-center gap-2 mb-6">
                        <StatusBadge status={user.status} />
                    </div>

                    <div className="border-t border-border pt-6 space-y-4 text-left">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-secondary font-medium flex items-center gap-2">
                               <Calendar size={14} /> Joined
                            </span>
                            <span className="text-primary font-bold">{user.joinDate}</span>
                        </div>
                    </div>
                </motion.div>

                {/* Right Column: Details */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="lg:col-span-2 bg-surface border border-border rounded-3xl p-6 md:p-8"
                >
                    <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
                        <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center border border-accent/20">
                            <User size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-primary">Account Details</h3>
                            <p className="text-sm text-secondary">View and update your personal information</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <InputField
                                label="Full Name"
                                name="name"
                                value={formData.name}
                                icon={User}
                                isEditing={isEditing}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div className="md:col-span-2">
                            <InputField
                                label="Email Address"
                                name="email"
                                value={formData.email}
                                icon={Mail}
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
                                icon={Phone}
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
        </div>
    );
};

export default ProfilePage;
