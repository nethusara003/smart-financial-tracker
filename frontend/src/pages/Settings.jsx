import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { useCurrency, CURRENCIES } from "../context/CurrencyContext";
import { useUser } from "../context/UserContext";
import GuestRestricted from "../components/GuestRestricted";
import { InlineEditor, useToast } from "../components/ui";
import { clearAuthStorage } from "../utils/authStorage";
import {
  useSettingsProfile,
  useUpdateProfileSettings,
  useUpdateNotificationSettings,
  useUpdatePrivacySettings,
  useUpdateCurrencySetting,
  useChangePasswordSetting,
  useExportUserData,
  useDeleteAccount,
} from "../hooks/useSettings";
import { 
  User, 
  Bell, 
  Shield, 
  Key, 
  Globe, 
  Palette, 
  Download,
  Trash2,
  Check,
  X,
  Eye,
  EyeOff,
  Mail,
  Smartphone,
  Lock,
  AlertCircle,
  CheckCircle2,
  Info
} from "lucide-react";
import SystemPageHeader from "../components/layout/SystemPageHeader";

const DEFAULT_NOTIFICATION_SETTINGS = {
  emailNotifications: true,
  pushNotifications: false,
  budgetAlerts: true,
  billReminders: true,
  weeklyReports: true,
  transactionAlerts: true,
  goalUpdates: true,
  budgetEmailAlerts: true,
  transactionInactivityReminders: false,
  inactivityReminderInterval: "1day",
};

const INACTIVITY_REMINDER_INTERVAL_OPTIONS = [
  { value: "2hours", label: "2 Hours" },
  { value: "4hours", label: "4 Hours" },
  { value: "6hours", label: "6 Hours" },
  { value: "12hours", label: "12 Hours" },
  { value: "1day", label: "1 Day" },
  { value: "2days", label: "2 Days" },
];

const INACTIVITY_INTERVAL_OPTION_VALUES = new Set(
  INACTIVITY_REMINDER_INTERVAL_OPTIONS.map((option) => option.value)
);

function normalizeInactivityReminderInterval(value) {
  if (typeof value !== "string") {
    return DEFAULT_NOTIFICATION_SETTINGS.inactivityReminderInterval;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "24hours") {
    return "1day";
  }

  return INACTIVITY_INTERVAL_OPTION_VALUES.has(normalized)
    ? normalized
    : DEFAULT_NOTIFICATION_SETTINGS.inactivityReminderInterval;
}

function buildNotificationSettingsState(source) {
  const next = {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...(source || {}),
  };

  next.inactivityReminderInterval = normalizeInactivityReminderInterval(
    next.inactivityReminderInterval
  );

  return next;
}

export default function Settings({ auth }) {
  const toast = useToast();
  const { theme, setTheme } = useTheme();
  const { currentCurrency, changeCurrency } = useCurrency();
  const { updateUser } = useUser();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  
  // Use derived state instead of useState + useEffect
  const activeTabFromURL = tabParam || "profile";
  const [activeTab, setActiveTab] = useState(activeTabFromURL);
  
  // Update activeTab when tabParam changes
  const currentActiveTab = tabParam || activeTab;

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Debug: Log theme changes
  useEffect(() => {
    console.log('Current theme:', theme);
    console.log('HTML classList:', document.documentElement.classList.toString());
  }, [theme]);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [profileData, setProfileData] = useState({
    name: localStorage.getItem("userName") || "",
    email: localStorage.getItem("userEmail") || "",
    phone: "",
    bio: "",
    profilePicture: ""
  });
  const [countryCode, setCountryCode] = useState("+1");
  const [notificationSettings, setNotificationSettings] = useState({
    ...DEFAULT_NOTIFICATION_SETTINGS,
  });
  const [privacySettings, setPrivacySettings] = useState({
    sessionTimeout: "30",
    loginNotifications: true,
    dataSharing: false
  });
  const [savedMessage, setSavedMessage] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");

  const isGuestUser = auth?.isGuest;
  const { data: settingsProfile } = useSettingsProfile({ enabled: !isGuestUser });

  const updateProfileMutation = useUpdateProfileSettings();
  const updateNotificationSettingsMutation = useUpdateNotificationSettings();
  const updatePrivacySettingsMutation = useUpdatePrivacySettings();
  const updateCurrencyMutation = useUpdateCurrencySetting();
  const changePasswordMutation = useChangePasswordSetting();
  const exportUserDataMutation = useExportUserData();
  const deleteAccountMutation = useDeleteAccount();
  const deleteAccountLoading = deleteAccountMutation.isPending;

  // Hydrate local editable state from server profile data.
  useEffect(() => {
    if (!settingsProfile) {
      return;
    }

    queueMicrotask(() => {
      let formattedPhone = settingsProfile.phone || "";
      let detectedCountryCode = "+1";

      if (settingsProfile.phone) {
        const match = settingsProfile.phone.match(/^(\+\d{1,4})/);
        if (match) {
          detectedCountryCode = match[1];
          formattedPhone = settingsProfile.phone.replace(match[1], "").trim();
        }
      }

      setCountryCode(detectedCountryCode);
      setProfileData({
        name: settingsProfile.name || "",
        email: settingsProfile.email || "",
        phone: formattedPhone,
        bio: settingsProfile.bio || "",
        profilePicture: settingsProfile.profilePicture || "",
      });

      if (settingsProfile.notificationSettings) {
        setNotificationSettings(buildNotificationSettingsState(settingsProfile.notificationSettings));
      } else {
        const savedNotifications = localStorage.getItem("notificationSettings");
        if (savedNotifications) {
          setNotificationSettings(buildNotificationSettingsState(JSON.parse(savedNotifications)));
        }
      }

      if (settingsProfile.privacySettings) {
        setPrivacySettings(settingsProfile.privacySettings);
      } else {
        const savedPrivacy = localStorage.getItem("privacySettings");
        if (savedPrivacy) {
          setPrivacySettings(JSON.parse(savedPrivacy));
        }
      }
    });
  }, [settingsProfile]);

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "privacy", label: "Privacy & Security", icon: Shield },
    { id: "password", label: "Change Password", icon: Key },
    { id: "preferences", label: "Preferences", icon: Palette },
    { id: "data", label: "Data & Storage", icon: Download }
  ];

  const handleSaveProfile = async () => {
    try {
      // Combine country code with phone number
      const fullPhone = profileData.phone ? `${countryCode} ${profileData.phone}` : "";

      const data = await updateProfileMutation.mutateAsync({
        ...profileData,
        phone: fullPhone,
      });

      localStorage.setItem("userName", data.user.name);
      localStorage.setItem("userEmail", data.user.email);

      // Update UserContext to reflect changes immediately in topbar
      updateUser({
        name: data.user.name,
        email: data.user.email,
        phone: data.user.phone,
        bio: data.user.bio,
        profilePicture: data.user.profilePicture,
      });

      showSavedMessage("Profile updated successfully!");
    } catch (error) {
      toast.error(error?.message || "Error updating profile");
    }
  };

  const handleSaveNotifications = async () => {
    try {
      await updateNotificationSettingsMutation.mutateAsync(notificationSettings);
      localStorage.setItem("notificationSettings", JSON.stringify(notificationSettings));
      showSavedMessage("Notification preferences saved!");
    } catch (error) {
      toast.error(error?.message || "Error saving notification settings");
    }
  };

  // Auto-save notification settings when they change
  const handleNotificationToggle = async (key, value) => {
    const normalizedValue =
      key === "inactivityReminderInterval"
        ? normalizeInactivityReminderInterval(value)
        : value;

    const updatedSettings = { ...notificationSettings, [key]: normalizedValue };
    setNotificationSettings(updatedSettings);

    try {
      await updateNotificationSettingsMutation.mutateAsync(updatedSettings);
      localStorage.setItem("notificationSettings", JSON.stringify(updatedSettings));
      showSavedMessage("Settings saved automatically!");
    } catch (error) {
      toast.error(error?.message || "Failed to auto-save notification settings");
    }
  };

  // Auto-save privacy settings when they change
  const handlePrivacyToggle = async (key, value) => {
    const updatedSettings = { ...privacySettings, [key]: value };
    setPrivacySettings(updatedSettings);

    try {
      await updatePrivacySettingsMutation.mutateAsync(updatedSettings);
      localStorage.setItem("privacySettings", JSON.stringify(updatedSettings));
      window.dispatchEvent(new CustomEvent("privacy-settings-updated"));
      showSavedMessage("Security settings saved!");
    } catch (error) {
      toast.error(error?.message || "Error saving privacy settings");
    }
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    showSavedMessage(`Theme changed to ${newTheme.charAt(0).toUpperCase() + newTheme.slice(1)} mode!`);
  };

  const handleCurrencyChange = async (newCurrency) => {
    const previousCurrency = currentCurrency;

    try {
      // Update local state
      changeCurrency(newCurrency);

      // Persist in backend
      await updateCurrencyMutation.mutateAsync(newCurrency);

      showSavedMessage(`Currency changed to ${CURRENCIES[newCurrency].name}!`);
    } catch (error) {
      changeCurrency(previousCurrency);
      toast.error(error?.message || "Failed to update currency");
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.warning("New passwords don't match!");
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.warning("Password must be at least 8 characters!");
      return;
    }
    
    if (!/[a-zA-Z]/.test(passwordData.newPassword) || !/\d/.test(passwordData.newPassword)) {
      toast.warning("Password must contain both letters and numbers!");
      return;
    }

    try {
      await changePasswordMutation.mutateAsync({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      showSavedMessage("Password changed successfully!");
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      toast.error(error?.message || "Error changing password");
    }
  };

  const showSavedMessage = (message) => {
    setSavedMessage(message);
    setTimeout(() => setSavedMessage(""), 3000);
  };

  const handleChangeAvatar = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/gif';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          toast.warning('File size must be less than 5MB');
          return;
        }
        
        // Convert to base64 for storage
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Image = reader.result;

          // Update profile with new avatar immediately
          try {
            const response = await updateProfileMutation.mutateAsync({
              profilePicture: base64Image,
            });

            // Update UserContext to show avatar immediately in topbar
            updateUser({
              profilePicture: response?.user?.profilePicture || base64Image,
            });
            setProfileData((prev) => ({
              ...prev,
              profilePicture: response?.user?.profilePicture || base64Image,
            }));
            showSavedMessage('Avatar updated successfully!');
          } catch (error) {
            toast.error(error?.message || 'Error updating avatar');
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleSavePreferences = () => {
    // Theme and currency are already saved via their individual handlers
    showSavedMessage("Preferences saved successfully!");
  };

  const handleExportData = async () => {
    try {
      const payload = await exportUserDataMutation.mutateAsync();
      const dataStr = JSON.stringify(payload.data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = window.URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `financial-data-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      window.URL.revokeObjectURL(url);
      showSavedMessage("Data exported successfully!");
    } catch (error) {
      toast.error(error?.message || "Error exporting data");
    }
  };

  const handleDeleteAccount = () => {
    setDeletePassword("");
    setShowDeleteConfirm(true);
  };

  const confirmDeleteAccount = async () => {
    if (!deletePassword) {
      toast.warning("Please enter your password to continue");
      return;
    }

    try {
      await deleteAccountMutation.mutateAsync(deletePassword);
      toast.success("Account deleted successfully. Logging out...");
      clearAuthStorage();
      localStorage.removeItem("userName");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("rememberedEmail");
      window.location.href = "/login";
    } catch (error) {
      toast.error(error?.message || "Error deleting account");
    }
  };

  // Block guest users
  if (auth?.isGuest) {
    return <GuestRestricted featureName="Settings" />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <SystemPageHeader
        tagline="SYSTEM PREFERENCES"
        title="Settings"
        subtitle="Manage your account preferences and security."
        actions={null}
      />

      {/* Success Message */}
      {savedMessage && (
        <div className="fixed top-4 right-4 z-50 bg-success-500 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-slide-in-down">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-medium">{savedMessage}</span>
        </div>
      )}

      {/* Tabs and Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:col-span-1">
          <div className="bg-light-surface-secondary dark:bg-[rgba(13,17,23,0.86)] backdrop-blur-[8px] rounded-2xl p-4 shadow-premium dark:shadow-card-dark border border-light-border-default dark:border-white/5 sticky top-4">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      currentActiveTab === tab.id
                        ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md dark:shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                        : "text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-surface-hover dark:hover:bg-white/5"
                    }`}
                  >
                    <IconComponent className="w-5 h-5" />
                    <span className="font-medium text-sm">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <div className="bg-light-surface-secondary dark:bg-[rgba(13,17,23,0.86)] backdrop-blur-[8px] rounded-2xl p-8 shadow-premium dark:shadow-card-dark border border-light-border-default dark:border-white/5">
            {/* Profile Tab */}
            {currentActiveTab === "profile" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">Profile Information</h2>
                  <p className="text-light-text-secondary dark:text-dark-text-secondary">Update your personal details and contact information</p>
                </div>

                {/* Profile Picture */}
                <div className="flex items-center gap-6 pb-6 border-b border-light-border-default dark:border-white/5">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 p-0.5 shadow-lg dark:shadow-glow-blue">
                      <div className="w-full h-full rounded-full bg-white dark:bg-[#0D1117] flex items-center justify-center overflow-hidden">
                        {profileData.profilePicture ? (
                          <img src={profileData.profilePicture} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-3xl font-bold bg-gradient-to-br from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent">
                            {profileData.name?.charAt(0).toUpperCase() || "U"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <button 
                      onClick={handleChangeAvatar}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md"
                    >
                      Change Avatar
                    </button>
                    <p className="text-sm text-light-text-tertiary dark:text-dark-text-tertiary mt-2">JPG, PNG or GIF, max 5MB</p>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary mb-2">
                      Account Number
                    </label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-light-text-tertiary dark:text-dark-text-tertiary" />
                      <input
                        type="text"
                        value={settingsProfile?.accountNumber || "Generating..."}
                        readOnly
                        className="w-full pl-11 pr-20 py-3 border border-light-border-default dark:border-white/5 bg-light-surface-hover dark:bg-[#0d1117]/60 text-light-text-secondary dark:text-dark-text-secondary rounded-xl font-mono focus:outline-none cursor-default select-all"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(settingsProfile?.accountNumber || "");
                          toast.success("Account number copied to clipboard!");
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold px-2.5 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-light-text-tertiary dark:text-dark-text-tertiary" />
                      <input
                        type="text"
                        value={profileData.name}
                        onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                        className="w-full pl-11 pr-4 py-3 border border-light-border-default dark:border-white/5 bg-light-surface-primary dark:bg-dark-surface-secondary text-light-text-primary dark:text-dark-text-primary rounded-xl focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 placeholder:text-light-text-tertiary dark:placeholder:text-dark-text-tertiary transition-all"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-light-text-tertiary dark:text-dark-text-tertiary" />
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        className="w-full pl-11 pr-4 py-3 border border-light-border-default dark:border-white/5 bg-light-surface-primary dark:bg-dark-surface-secondary text-light-text-primary dark:text-dark-text-primary rounded-xl focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 placeholder:text-light-text-tertiary dark:placeholder:text-dark-text-tertiary transition-all"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary mb-2">
                      Phone Number
                    </label>
                    <div className="flex gap-2">
                      <div className="relative w-32">
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="w-full px-3 py-3 border border-light-border-default dark:border-white/5 bg-light-surface-primary dark:bg-dark-surface-secondary text-light-text-primary dark:text-dark-text-primary rounded-xl focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 placeholder:text-light-text-tertiary dark:placeholder:text-dark-text-tertiary transition-all appearance-none"
                        >
                          <option value="+1">🇺🇸 +1</option>
                          <option value="+44">🇬🇧 +44</option>
                          <option value="+91">🇮🇳 +91</option>
                          <option value="+94">🇱🇰 +94</option>
                          <option value="+61">🇦🇺 +61</option>
                          <option value="+81">🇯🇵 +81</option>
                          <option value="+86">🇨🇳 +86</option>
                          <option value="+65">🇸🇬 +65</option>
                          <option value="+33">🇫🇷 +33</option>
                          <option value="+49">🇩🇪 +49</option>
                          <option value="+39">🇮🇹 +39</option>
                          <option value="+34">🇪🇸 +34</option>
                          <option value="+7">🇷🇺 +7</option>
                          <option value="+55">🇧🇷 +55</option>
                          <option value="+27">🇿🇦 +27</option>
                        </select>
                      </div>
                      <div className="relative flex-1">
                        <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-light-text-tertiary dark:text-dark-text-tertiary" />
                        <input
                          type="tel"
                          value={profileData.phone}
                          onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                          className="w-full pl-11 pr-4 py-3 border border-light-border-default dark:border-white/5 bg-light-surface-primary dark:bg-dark-surface-secondary text-light-text-primary dark:text-dark-text-primary rounded-xl focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 placeholder:text-light-text-tertiary dark:placeholder:text-dark-text-tertiary transition-all"
                          placeholder="555 000-0000"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary mb-2">
                      Bio
                    </label>
                    <textarea
                      value={profileData.bio}
                      onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                      rows="4"
                      className="w-full px-4 py-3 border border-light-border-default dark:border-white/5 bg-light-surface-primary dark:bg-dark-surface-secondary text-light-text-primary dark:text-dark-text-primary rounded-xl focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 placeholder:text-light-text-tertiary dark:placeholder:text-dark-text-tertiary transition-all"
                      placeholder="Tell us about yourself..."
                    ></textarea>
                  </div>
                </div>

                <div className="flex justify-end pt-6 border-t border-light-border-default dark:border-white/5">
                  <button
                    onClick={handleSaveProfile}
                    className="px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {currentActiveTab === "notifications" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">Notification Preferences</h2>
                  <p className="text-light-text-secondary dark:text-dark-text-secondary">Choose how you want to be notified</p>
                </div>

                <div className="space-y-4">
                  {/* Email Notifications */}
                  <div className="flex items-center justify-between p-4 bg-light-surface-primary dark:bg-dark-surface-secondary rounded-xl">
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-light-text-primary dark:text-dark-text-primary">Email Notifications</h4>
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">Receive updates via email</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings.emailNotifications}
                        onChange={(e) => handleNotificationToggle('emailNotifications', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-light-border-strong dark:bg-dark-border-strong peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* Bill Reminders */}
                  <div className="flex items-center justify-between p-4 bg-light-surface-primary dark:bg-dark-surface-secondary rounded-xl">
                    <div className="flex items-start gap-3">
                      <Bell className="w-5 h-5 text-danger-600 mt-0.5" />
                      <div>
                       <h4 className="font-semibold text-light-text-primary dark:text-dark-text-primary">Bill Reminders</h4>
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">Reminders for upcoming bill payments</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings.billReminders}
                        onChange={(e) => handleNotificationToggle('billReminders', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-light-border-strong dark:bg-dark-border-strong peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* Weekly Reports */}
                  <div className="flex items-center justify-between p-4 bg-light-surface-primary dark:bg-dark-surface-secondary rounded-xl">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-secondary-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-light-text-primary dark:text-dark-text-primary">Weekly Reports</h4>
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">Receive weekly financial summaries</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings.weeklyReports}
                        onChange={(e) => handleNotificationToggle('weeklyReports', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-light-border-strong dark:bg-dark-border-strong peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* Transaction Alerts */}
                  <div className="flex items-center justify-between p-4 bg-light-surface-primary dark:bg-dark-surface-secondary rounded-xl">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-success-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-light-text-primary dark:text-dark-text-primary">Transaction Alerts</h4>
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">Alerts for new transactions</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings.transactionAlerts}
                        onChange={(e) => handleNotificationToggle('transactionAlerts', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-light-border-strong dark:bg-dark-border-strong peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* Advanced Budget Reminders */}
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-xl border-2 border-orange-200 dark:border-orange-700">
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-light-text-primary dark:text-dark-text-primary">Advanced Budget Reminders</h4>
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                          Get reminders for every budget category nearing its limit, plus a high-priority alert when your overall budget reaches the limit.
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings.budgetEmailAlerts}
                        onChange={(e) => handleNotificationToggle('budgetEmailAlerts', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-light-border-strong dark:bg-dark-border-strong peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                    </label>
                  </div>

                  {/* Transaction Inactivity Reminders */}
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl border-2 border-purple-200 dark:border-purple-700">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-start gap-3">
                        <Bell className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-light-text-primary dark:text-dark-text-primary">Transaction Inactivity Reminders</h4>
                          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">Remind me if I haven't recorded any transactions</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationSettings.transactionInactivityReminders}
                          onChange={(e) => handleNotificationToggle('transactionInactivityReminders', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-light-border-strong dark:bg-dark-border-strong peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>
                    
                    {notificationSettings.transactionInactivityReminders && (
                      <div className="mt-4 ml-8 space-y-2">
                        <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2">
                          Reminder Frequency:
                        </label>
                        <select
                          value={normalizeInactivityReminderInterval(notificationSettings.inactivityReminderInterval)}
                          onChange={(event) => handleNotificationToggle("inactivityReminderInterval", event.target.value)}
                          className="w-full max-w-xs rounded-lg border border-purple-200 bg-light-surface-primary px-3 py-2 text-sm text-light-text-primary dark:text-dark-text-primary shadow-sm focus:border-purple-500 focus:outline-none dark:border-purple-700 dark:bg-dark-surface-secondary"
                        >
                          {INACTIVITY_REMINDER_INTERVAL_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              Remind after {option.label} of inactivity
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-light-text-tertiary dark:text-dark-text-tertiary italic mt-2">
                          💡 You'll receive an email reminder to record transactions after the selected time period of inactivity
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-6 border-t border-light-border-default dark:border-white/5">
                  <button
                    onClick={handleSaveNotifications}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold shadow-md hover:shadow-lg dark:shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all"
                  >
                    Save Preferences
                  </button>
                </div>
              </div>
            )}

            {/* Privacy & Security Tab */}
            {currentActiveTab === "privacy" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">Privacy & Security</h2>
                  <p className="text-light-text-secondary dark:text-dark-text-secondary">Control your account security and privacy settings</p>
                </div>

                {/* Security Status */}
                <div className={`p-6 rounded-xl border transition-all duration-300 ${
                  privacySettings.loginNotifications
                    ? 'bg-gradient-to-br from-success-50 to-success-100 dark:from-success-900/20 dark:to-success-800/10 border-success-200 dark:border-success-700'
                    : 'bg-gradient-to-br from-warning-50 to-warning-100 dark:from-warning-900/20 dark:to-warning-800/10 border-warning-200 dark:border-warning-700'
                }`}>
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${
                      privacySettings.loginNotifications
                        ? 'bg-success-500 dark:bg-success-600'
                        : 'bg-warning-500 dark:bg-warning-600'
                    }`}>
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className={`font-bold mb-1 ${
                        privacySettings.loginNotifications
                          ? 'text-success-900 dark:text-success-300'
                          : 'text-warning-900 dark:text-warning-300'
                      }`}>
                        {privacySettings.loginNotifications
                          ? 'Your Account is Secure'
                          : 'Security Can Be Improved'}
                      </h3>
                      <p className={`text-sm ${
                        privacySettings.loginNotifications
                          ? 'text-success-700 dark:text-success-400'
                          : 'text-warning-700 dark:text-warning-400'
                      }`}>
                        {privacySettings.loginNotifications
                          ? 'Security notifications are enabled'
                          : 'Enable login notifications for better account visibility'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Login Notifications */}
                  <div className="flex items-center justify-between p-4 bg-light-surface-primary dark:bg-dark-surface-secondary rounded-xl border border-light-border-default dark:border-white/5 transition-all duration-200 hover:shadow-md">
                    <div className="flex items-start gap-3">
                      <Bell className="w-5 h-5 text-warning-600 dark:text-warning-400 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-light-text-primary dark:text-dark-text-primary">Login Notifications</h4>
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">Get notified of new login attempts</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={privacySettings.loginNotifications}
                        onChange={(e) => handlePrivacyToggle('loginNotifications', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-light-border-strong dark:bg-dark-border-strong peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500"></div>
                    </label>
                  </div>

                  {/* Session Timeout */}
                  <div className="p-4 bg-light-surface-primary dark:bg-dark-surface-secondary rounded-xl border border-light-border-default dark:border-white/5 transition-all duration-200 hover:shadow-md">
                    <div className="flex items-start gap-3 mb-3">
                      <Globe className="w-5 h-5 text-secondary-600 dark:text-secondary-400 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-light-text-primary dark:text-dark-text-primary">Session Timeout</h4>
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-3">Auto-logout after period of inactivity</p>
                        <select
                          value={privacySettings.sessionTimeout}
                          onChange={(e) => handlePrivacyToggle('sessionTimeout', e.target.value)}
                          className="w-full px-4 py-2 border border-light-border-default dark:border-white/5 bg-white dark:bg-[#0D1117] text-light-text-primary dark:text-dark-text-primary rounded-lg focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 placeholder:text-light-text-tertiary dark:placeholder:text-dark-text-tertiary transition-colors cursor-pointer"
                        >
                          <option className="bg-white dark:bg-[#0D1117] text-light-text-primary dark:text-dark-text-primary" value="15">15 minutes</option>
                          <option className="bg-white dark:bg-[#0D1117] text-light-text-primary dark:text-dark-text-primary" value="30">30 minutes</option>
                          <option className="bg-white dark:bg-[#0D1117] text-light-text-primary dark:text-dark-text-primary" value="60">1 hour</option>
                          <option className="bg-white dark:bg-[#0D1117] text-light-text-primary dark:text-dark-text-primary" value="120">2 hours</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Data Sharing */}
                  <div className="flex items-center justify-between p-4 bg-light-surface-primary dark:bg-dark-surface-secondary rounded-xl border border-light-border-default dark:border-white/5 transition-all duration-200 hover:shadow-md">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-info-600 dark:text-info-400 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-light-text-primary dark:text-dark-text-primary">Analytics & Data Sharing</h4>
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">Share anonymous usage data to improve the app</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={privacySettings.dataSharing}
                        onChange={(e) => handlePrivacyToggle('dataSharing', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-light-border-strong dark:bg-dark-border-strong peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500"></div>
                    </label>
                  </div>

                </div>

                {/* Remove the Save button since we're auto-saving */}
                <div className="pt-6 border-t border-light-border-default dark:border-white/5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                      <CheckCircle2 className="w-4 h-4 inline-block mr-1 text-success-500" />
                      Settings are saved automatically
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Change Password Tab */}
            {currentActiveTab === "password" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">Change Password</h2>
                  <p className="text-light-text-secondary dark:text-dark-text-secondary">Update your password to keep your account secure</p>
                </div>

                {/* Password Requirements */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
                    <Info className="w-5 h-5" />
                    Password Requirements
                  </h4>
                  <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1 ml-7">
                    <li>• At least 8 characters long</li>
                    <li>• Contain both letters and numbers</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  {/* Current Password */}
                  <div>
                    <label className="block text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary mb-2">
                      Current Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-light-text-tertiary dark:text-dark-text-tertiary" />
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        className="w-full pl-11 pr-12 py-3 border border-light-border-default dark:border-white/5 bg-light-surface-primary dark:bg-dark-surface-secondary text-light-text-primary dark:text-dark-text-primary rounded-xl focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 placeholder:text-light-text-tertiary dark:placeholder:text-dark-text-tertiary transition-all"
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-light-text-tertiary dark:text-dark-text-tertiary hover:text-gray-600"
                      >
                        {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-light-text-tertiary dark:text-dark-text-tertiary" />
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        className="w-full pl-11 pr-12 py-3 border border-light-border-default dark:border-white/5 bg-light-surface-primary dark:bg-dark-surface-secondary text-light-text-primary dark:text-dark-text-primary rounded-xl focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 placeholder:text-light-text-tertiary dark:placeholder:text-dark-text-tertiary transition-all"
                        placeholder="Enter new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-light-text-tertiary dark:text-dark-text-tertiary hover:text-gray-600"
                      >
                        {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-light-text-tertiary dark:text-dark-text-tertiary" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        className="w-full pl-11 pr-12 py-3 border border-light-border-default dark:border-white/5 bg-light-surface-primary dark:bg-dark-surface-secondary text-light-text-primary dark:text-dark-text-primary rounded-xl focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 placeholder:text-light-text-tertiary dark:placeholder:text-dark-text-tertiary transition-all"
                        placeholder="Confirm new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-light-text-tertiary dark:text-dark-text-tertiary hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-6 border-t border-light-border-default dark:border-white/5">
                  <button
                    onClick={handleChangePassword}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold shadow-md hover:shadow-lg dark:shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all"
                  >
                    Update Password
                  </button>
                </div>
              </div>
            )}

            {/* Preferences Tab */}
            {currentActiveTab === "preferences" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">App Preferences</h2>
                  <p className="text-light-text-secondary dark:text-dark-text-secondary">Customize your app experience</p>
                </div>

                <div className="p-6 bg-light-surface-primary dark:bg-dark-surface-secondary rounded-xl border border-light-border-default dark:border-white/5">
                  <div className="space-y-6">
                    {/* Language */}
                    <div>
                      <label className="block text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary mb-2">
                        Language
                      </label>
                      <select className="w-full px-4 py-3 border border-light-border-default dark:border-white/5 bg-white dark:bg-[#0D1117] text-light-text-primary dark:text-dark-text-primary rounded-xl focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 placeholder:text-light-text-tertiary dark:placeholder:text-dark-text-tertiary">
                        <option className="bg-white dark:bg-[#0D1117] text-light-text-primary dark:text-dark-text-primary">English</option>
                        <option className="bg-white dark:bg-[#0D1117] text-light-text-primary dark:text-dark-text-primary">Spanish</option>
                        <option className="bg-white dark:bg-[#0D1117] text-light-text-primary dark:text-dark-text-primary">French</option>
                        <option className="bg-white dark:bg-[#0D1117] text-light-text-primary dark:text-dark-text-primary">German</option>
                      </select>
                    </div>

                    {/* Theme */}
                    <div>
                      <label className="block text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary mb-2">
                        Theme
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        <button 
                          onClick={() => handleThemeChange('light')}
                          className={`p-4 border-2 ${
                            theme === 'light' 
                              ? 'border-blue-500 dark:border-dark-accent-blue shadow-lg dark:shadow-glow-blue' 
                              : 'border-transparent hover:border-gray-300 dark:hover:border-dark-border-strong'
                          } bg-white dark:bg-dark-surface-primary rounded-xl text-center transition-all group hover:shadow-md`}
                        >
                          <div className="w-full h-12 bg-gradient-to-br from-white to-gray-100 border border-gray-300 rounded-lg mb-2 group-hover:scale-105 transition-transform"></div>
                          <span className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary dark:text-dark-text-primary">Light</span>
                          {theme === 'light' && <div className="text-xs text-blue-600 dark:text-dark-accent-blue mt-1 font-semibold">✓ Active</div>}
                        </button>
                        <button 
                          onClick={() => handleThemeChange('dark')}
                          className={`p-4 border-2 ${
                            theme === 'dark' 
                              ? 'border-blue-500 dark:border-dark-accent-blue shadow-lg dark:shadow-glow-blue' 
                              : 'border-transparent hover:border-gray-300 dark:hover:border-dark-border-strong'
                          } bg-white dark:bg-dark-surface-primary rounded-xl text-center transition-all group hover:shadow-md`}
                        >
                          <div className="w-full h-12 bg-gradient-to-br from-dark-bg-primary to-dark-surface-elevated border border-dark-border-strong rounded-lg mb-2 group-hover:scale-105 transition-transform shadow-inner"></div>
                          <span className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary dark:text-dark-text-primary">Dark</span>
                          {theme === 'dark' && <div className="text-xs text-blue-600 dark:text-dark-accent-blue mt-1 font-semibold">✓ Active</div>}
                        </button>
                        <button 
                          onClick={() => handleThemeChange('auto')}
                          className={`p-4 border-2 ${
                            theme === 'auto' 
                              ? 'border-blue-500 dark:border-dark-accent-blue shadow-lg dark:shadow-glow-blue' 
                              : 'border-transparent hover:border-gray-300 dark:hover:border-dark-border-strong'
                          } bg-white dark:bg-dark-surface-primary rounded-xl text-center transition-all group hover:shadow-md`}
                        >
                          <div className="w-full h-12 bg-gradient-to-r from-white via-gray-500 to-dark-bg-primary rounded-lg mb-2 group-hover:scale-105 transition-transform border border-gray-300 dark:border-dark-border-strong"></div>
                          <span className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary dark:text-dark-text-primary">Auto</span>
                          {theme === 'auto' && <div className="text-xs text-blue-600 dark:text-dark-accent-blue mt-1 font-semibold">✓ Active</div>}
                        </button>
                      </div>
                    </div>

                    {/* Date Format */}
                    <div>
                      <label className="block text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary mb-2">
                        Date Format
                      </label>
                      <select className="w-full px-4 py-3 border border-light-border-default dark:border-white/5 bg-white dark:bg-[#0D1117] text-light-text-primary dark:text-dark-text-primary rounded-xl focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 placeholder:text-light-text-tertiary dark:placeholder:text-dark-text-tertiary">
                        <option className="bg-white dark:bg-[#0D1117] text-light-text-primary dark:text-dark-text-primary">MM/DD/YYYY</option>
                        <option className="bg-white dark:bg-[#0D1117] text-light-text-primary dark:text-dark-text-primary">DD/MM/YYYY</option>
                        <option className="bg-white dark:bg-[#0D1117] text-light-text-primary dark:text-dark-text-primary">YYYY-MM-DD</option>
                      </select>
                    </div>

                    {/* Currency */}
                    <div>
                      <label className="block text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary mb-2">
                        Currency
                      </label>
                      <select 
                        value={currentCurrency}
                        onChange={(e) => handleCurrencyChange(e.target.value)}
                        className="w-full px-4 py-3 border border-light-border-default dark:border-white/5 bg-white dark:bg-[#0D1117] text-light-text-primary dark:text-dark-text-primary rounded-xl focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 placeholder:text-light-text-tertiary dark:placeholder:text-dark-text-tertiary"
                      >
                        {Object.values(CURRENCIES).map((currency) => (
                          <option 
                            key={currency.code} 
                            value={currency.code}
                            className="bg-white dark:bg-[#0D1117] text-light-text-primary dark:text-dark-text-primary"
                          >
                            {currency.flag} {currency.name} ({currency.symbol})
                          </option>
                        ))}
                      </select>
                      <p className="mt-2 text-sm text-light-text-tertiary dark:text-dark-text-tertiary">
                        This will affect how amounts are displayed throughout the app, including the chatbot
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-6 border-t border-light-border-default dark:border-white/5">
                  <button 
                    onClick={handleSavePreferences}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold shadow-md hover:shadow-lg dark:shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all"
                  >
                    Save Preferences
                  </button>
                </div>
              </div>
            )}

            {/* Data & Storage Tab */}
            {currentActiveTab === "data" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">Data & Storage</h2>
                  <p className="text-light-text-secondary dark:text-dark-text-secondary">Manage your data and account</p>
                </div>

                {/* Export Data */}
                <div className="p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-500 rounded-xl">
                      <Download className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-blue-900 dark:text-blue-300 mb-1">Export Your Data</h3>
                      <p className="text-sm text-blue-700 dark:text-blue-400 mb-4">Download all your financial data in CSV format</p>
                      <button
                        onClick={handleExportData}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        Download Data
                      </button>
                    </div>
                  </div>
                </div>

                {/* Delete Account */}
                <div className="p-6 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800/50 rounded-xl">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-danger-500 rounded-xl">
                      <Trash2 className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-danger-900 mb-1">Delete Account</h3>
                      <p className="text-sm text-danger-700 mb-4">
                        Permanently delete your account and all associated data. This action cannot be undone.
                      </p>
                      <button
                        onClick={handleDeleteAccount}
                        className="px-4 py-2 bg-danger-600 text-white rounded-lg hover:bg-danger-700 transition-colors font-medium"
                      >
                        Delete My Account
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <InlineEditor
        isOpen={showDeleteConfirm}
        title="Delete Account"
        subtitle="This action is permanent and cannot be undone"
        onClose={() => {
          if (deleteAccountLoading) return;
          setShowDeleteConfirm(false);
          setDeletePassword("");
        }}
        className="max-w-xl"
      >
        <div className="space-y-4">
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
            Enter your account password to permanently delete your account and all associated data.
          </p>

          <div>
            <label className="block text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary mb-2">
              Account Password
            </label>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="w-full px-4 py-3 border border-light-border-default dark:border-white/5 bg-light-surface-primary dark:bg-dark-surface-secondary text-light-text-primary dark:text-dark-text-primary rounded-xl focus:ring-2 focus:ring-danger-500 focus:border-danger-500 transition-all"
              placeholder="Enter password"
              disabled={deleteAccountLoading}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                if (deleteAccountLoading) return;
                setShowDeleteConfirm(false);
                setDeletePassword("");
              }}
              className="flex-1 px-4 py-2.5 rounded-lg border border-light-border-default dark:border-dark-border-strong text-light-text-primary dark:text-dark-text-primary bg-light-surface-primary dark:bg-dark-surface-secondary font-semibold"
              disabled={deleteAccountLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDeleteAccount}
              className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-danger-500 to-danger-600 text-white font-semibold disabled:opacity-60"
              disabled={deleteAccountLoading}
            >
              {deleteAccountLoading ? "Deleting..." : "Delete Account"}
            </button>
          </div>
        </div>
      </InlineEditor>
    </div>
  );
}
