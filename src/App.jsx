import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getAIMentorResponse } from './services/geminiService';
import { convertToBase64, validateImageFile } from './utils/fileHelpers';
import { initDatabase, dbOperations, saveDatabase } from './database';
import Logo from './r.png';

const ADMIN_EMAIL = 'mamatovo354@gmail.com';
const ADMIN_PASS = '123@Ozod';
const DEFAULT_CATEGORIES = ["Fintech", "Edtech", "AI/ML", "E-commerce", "SaaS", "Blockchain", "Healthcare", "Cybersecurity", "GameDev", "Networking", "Productivity", "Other"];

// --- REUSABLE UI COMPONENTS ---
const Badge = ({ children, variant = 'default', size = 'sm', className = "" }) => {
  const styles = {
    default: "bg-gray-50 border-gray-200 text-gray-600",
    active: "bg-gray-900 border-gray-900 text-white",
    success: "bg-emerald-50 border-emerald-200 text-emerald-700",
    danger: "bg-rose-50 border-rose-200 text-rose-700",
  };
  const sizeStyles = size === 'sm' ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-[11px]";
  return (
    <span className={`rounded-[6px] border font-semibold uppercase tracking-wider inline-flex items-center ${styles[variant]} ${sizeStyles} ${className}`}>
      {children}
    </span>
  );
};

const Button = ({ children, onClick, variant = 'primary', className = "", disabled = false, loading = false, type = 'button', size = 'md', icon }) => {
  const variants = {
    primary: "bg-gray-900 text-white hover:bg-black border-transparent shadow-sm",
    secondary: "bg-white text-gray-900 border-gray-200 hover:border-gray-900 shadow-sm",
    danger: "bg-white text-rose-600 border-rose-100 hover:border-rose-600",
    ghost: "bg-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900 border-transparent",
  };
  const sizes = {
    sm: "h-8 px-3 text-[11px]",
    md: "h-10 px-5 text-[13px]",
    lg: "h-12 px-7 text-[14px]",
  };
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`rounded-lg font-semibold transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-40 border select-none ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading ? <i className="fa-solid fa-spinner animate-spin"></i> : (
        <>
          {icon && <i className={`fa-solid ${icon}`}></i>}
          {children}
        </>
      )}
    </button>
  );
};

const Input = ({ label, icon, error, helper, ...props }) => (
  <div className="space-y-1.5 w-full">
    {label && <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-widest ml-1">{label}</label>}
    <div className="relative group">
      {icon && <i className={`fa-solid ${icon} absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm group-focus-within:text-black transition-colors`}></i>}
      <input
        {...props}
        className={`w-full bg-white border ${error ? 'border-rose-300 focus:border-rose-500' : 'border-gray-200 focus:border-black'} rounded-lg ${icon ? 'pl-11' : 'px-4'} py-2.5 text-[14px] text-gray-900 outline-none transition-all placeholder:text-gray-400 shadow-sm`}
      />
    </div>
    {error && <p className="text-[11px] text-rose-600 font-medium ml-1">{error}</p>}
    {helper && !error && <p className="text-[11px] text-gray-500 ml-1">{helper}</p>}
  </div>
);

const TextArea = ({ label, ...props }) => (
  <div className="space-y-1.5 w-full">
    {label && <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-widest ml-1">{label}</label>}
    <textarea
      {...props}
      className="w-full bg-white border border-gray-200 focus:border-black rounded-lg px-4 py-3 text-[14px] text-gray-900 outline-none transition-all min-h-[120px] resize-y placeholder:text-gray-400 shadow-sm"
    />
  </div>
);

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white w-full ${sizes[size]} rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300 mx-auto`}>
        <div className="flex items-center justify-between p-5 md:p-6 border-b border-gray-100">
          <h3 className="text-lg md:text-xl font-bold tracking-tight">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-black transition-colors p-1"><i className="fa-solid fa-xmark text-lg"></i></button>
        </div>
        <div className="p-6 md:p-8 overflow-y-auto max-h-[80vh] custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

const FileUpload = ({ label, onChange, preview, icon = "fa-cloud-arrow-up" }) => {
  const inputRef = useRef(null);
  return (
    <div className="space-y-2">
      <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-widest ml-1">{label}</label>
      <div 
        onClick={() => inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center p-6 md:p-8 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 cursor-pointer hover:border-black hover:bg-gray-50 transition-all group overflow-hidden`}
      >
        <input type="file" ref={inputRef} onChange={onChange} className="hidden" accept="image/*" />
        {preview ? (
          <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
            <img src={preview} className="w-full h-full object-cover" alt="Preview" />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-white text-[10px] font-bold">O'zgartirish</div>
          </div>
        ) : (
          <>
            <i className={`fa-solid ${icon} text-2xl md:text-3xl text-gray-300 group-hover:text-black mb-2 transition-all`}></i>
            <p className="text-[12px] font-medium text-gray-500 group-hover:text-black">Rasm yuklash</p>
          </>
        )}
      </div>
    </div>
  );
};

const EmptyState = ({ icon, title, subtitle, action }) => (
  <div className="flex flex-col items-center justify-center py-12 md:py-20 px-6 text-center animate-in fade-in">
    <div className="w-14 h-14 md:w-20 md:h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
      <i className={`fa-solid ${icon} text-xl md:text-3xl text-gray-300`}></i>
    </div>
    <h3 className="text-base md:text-lg font-bold text-gray-900 tracking-tight mb-2">{title}</h3>
    {subtitle && <p className="text-[13px] md:text-[14px] text-gray-500 max-w-sm mb-6 md:mb-8">{subtitle}</p>}
    {action}
  </div>
);

// --- MAIN APPLICATION ---

const App = () => {
  // --- CORE STATE ---
  const [allUsers, setAllUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [startups, setStartups] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- UI STATE ---
  const [activeTab, setActiveTab] = useState('explore');
  const [selectedStartupId, setSelectedStartupId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [showAIMentor, setShowAIMentor] = useState(false);
  const [aiChat, setAiChat] = useState([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState('vazifalar');
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [adminTab, setAdminTab] = useState('moderation');
  const [adminStats, setAdminStats] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  
  // Modals & Edit States
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [editedUser, setEditedUser] = useState({});
  const [tempFileBase64, setTempFileBase64] = useState(null);

  const chatEndRef = useRef(null);

  // --- INITIAL DATA LOAD ---
  useEffect(() => {
    loadInitialData();
  }, []);

  const openAuth = (mode = 'login') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Initialize database
      await initDatabase();
      
      // Load data from SQLite
      const [usersData, startupsData, requestsData] = await Promise.all([
        dbOperations.getUsers(),
        dbOperations.getStartups(),
        dbOperations.getJoinRequests()
      ]);

      try {
        const cats = await dbOperations.getCategories();
        if (Array.isArray(cats) && cats.length > 0) {
          setCategories(cats.map(c => c.name));
        }
      } catch (e) {
        setCategories(DEFAULT_CATEGORIES);
      }
      
      setAllUsers(usersData);
      setStartups(startupsData);
      setJoinRequests(requestsData);
      
      // Load current user from localStorage
      const savedUserId = localStorage.getItem('currentUserId');
      if (savedUserId) {
        const user = await dbOperations.getUserById(savedUserId);
        if (user) {
          setCurrentUser(user);
          const userNotifs = await dbOperations.getNotifications(user.id);
          setNotifications(userNotifs);
        }
      }
      if (!savedUserId) {
        const alreadyPrompted = sessionStorage.getItem('authPromptShown');
        if (!alreadyPrompted) {
          openAuth('login');
          sessionStorage.setItem('authPromptShown', '1');
        }
      }
    } catch (error) {
      console.error('Ma\'lumotlarni yuklashda xatolik:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiChat]);

  useEffect(() => {
    if (activeTab === 'admin' && currentUser?.role === 'admin') {
      refreshAdminData();
    }
  }, [activeTab, currentUser, adminTab]);

  // --- HANDLERS ---

  const addNotification = async (userId, title, text, type = 'info') => {
    const n = { 
      id: `n_${Date.now()}`, 
      user_id: userId, 
      title, 
      text, 
      type, 
      is_read: false, 
      created_at: new Date().toISOString() 
    };
    
    await dbOperations.createNotification(n);
    
    if (currentUser && (userId === currentUser.id || userId === 'admin')) {
      setNotifications(prev => [n, ...prev]);
    }
  };

  const refreshAdminData = async () => {
    try {
      const [stats, logs, cats] = await Promise.all([
        dbOperations.getStats(),
        dbOperations.getAuditLogs(80),
        dbOperations.getCategories()
      ]);
      setAdminStats(stats);
      setAuditLogs(logs || []);
      if (Array.isArray(cats) && cats.length > 0) {
        setCategories(cats.map(c => c.name));
      }
    } catch (e) {
      console.error('Admin ma\'lumotlarini yuklashda xatolik:', e);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = fd.get('email');
    const pass = fd.get('password');

    if (authMode === 'login') {
      if (email === ADMIN_EMAIL && pass === ADMIN_PASS) {
        const admin = { 
          id: 'admin', 
          email, 
          name: 'Ozodbek Mamatov', 
          phone: '+998932303410', 
          role: 'admin', 
          created_at: new Date().toISOString(), 
          skills: [], 
          languages: [], 
          tools: [],
          avatar: `https://ui-avatars.com/api/?name=Ozodbek+Mamatov&background=111&color=fff`
        };
        setCurrentUser(admin);
        localStorage.setItem('currentUserId', 'admin');
        navigateTo('admin');
      } else {
        const user = await dbOperations.getUserByEmail(email);
        if (user && user.banned) {
          alert('Sizning profilingiz vaqtincha bloklangan.');
          return;
        }
        if (user && user.password === pass) { 
          setCurrentUser(user);
          localStorage.setItem('currentUserId', user.id);
          const userNotifs = await dbOperations.getNotifications(user.id);
          setNotifications(userNotifs);
          navigateTo('explore'); 
        } else {
          alert('Xato email yoki parol');
        }
      }
    } else {
      // Register
      const existingUser = await dbOperations.getUserByEmail(email);
      if (existingUser) {
        alert('Bu email allaqachon ro\'yxatdan o\'tgan');
        return;
      }

      const u = { 
        id: `u_${Date.now()}`, 
        email, 
        password: pass,
        name: fd.get('name'), 
        phone: fd.get('phone') || '', 
        role: 'user', 
        created_at: new Date().toISOString(), 
        skills: [], 
        languages: [], 
        tools: [],
        avatar: tempFileBase64 || `https://ui-avatars.com/api/?name=${encodeURIComponent(fd.get('name'))}&background=111&color=fff`
      };
      
      await dbOperations.createUser(u);
      setAllUsers(prev => [...prev, u]);
      setCurrentUser(u);
      localStorage.setItem('currentUserId', u.id);
      navigateTo('profile');
    }
    setShowAuthModal(false);
    setTempFileBase64(null);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validateImageFile(file);
      if (!validation.valid) return alert(validation.error);
      const base64 = await convertToBase64(file);
      setTempFileBase64(base64);
      if (isEditProfileModalOpen) setEditedUser(prev => ({ ...prev, avatar: base64 }));
    }
  };

  const navigateTo = (tab, id = null) => {
    setActiveTab(tab);
    if (id) {
      setSelectedStartupId(id);
      setActiveDetailTab('vazifalar');
    }
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleJoinRequest = async (s) => {
    if (!currentUser) return openAuth('login');
    if (s.egasi_id === currentUser.id) return alert('O\'z loyihangizga qo\'shila olmaysiz.');
    if (s.a_zolar.some(m => m.user_id === currentUser.id)) return alert('Siz allaqachon jamoa a\'zosisiz.');
    
    const specialty = prompt('Mutaxassisligingiz (Masalan: Designer, Backend Developer):');
    if (!specialty) return;

    const req = {
      id: `req_${Date.now()}`,
      startup_id: s.id,
      startup_name: s.nomi,
      user_id: currentUser.id,
      user_name: currentUser.name,
      user_phone: currentUser.phone,
      specialty,
      comment: 'Hamkorlik qilish istagi.',
      status: 'pending',
      created_at: new Date().toISOString()
    };

    await dbOperations.createJoinRequest(req);
    setJoinRequests(prev => [req, ...prev]);
    
    await addNotification(s.egasi_id, 'Yangi ariza', `"${currentUser.name}" jamoangizga qo'shilmoqchi.`, 'info');
    alert('So\'rovingiz muvaffaqiyatli yuborildi!');
  };

  const handleRequestAction = async (id, action) => {
    const r = joinRequests.find(x => x.id === id);
    if (!r) return;
    
    if (action === 'accept') {
      const startup = startups.find(s => s.id === r.startup_id);
      if (!startup) return;

      const newMember = { 
        user_id: r.user_id, 
        name: r.user_name, 
        role: r.specialty, 
        joined_at: new Date().toISOString() 
      };
      
      const updatedAZolar = [...startup.a_zolar, newMember];
      
      await dbOperations.updateStartup(r.startup_id, { a_zolar: updatedAZolar });
      
      setStartups(prev => prev.map(s => 
        s.id === r.startup_id ? { ...s, a_zolar: updatedAZolar } : s
      ));
      
      await addNotification(r.user_id, 'Tabriklaymiz!', `Siz "${r.startup_name}" jamoasiga qabul qilindingiz.`, 'success');
    }
    
    await dbOperations.deleteRequest(id);
    setJoinRequests(prev => prev.filter(x => x.id !== id));
  };

  const handleAdminModeration = async (id, action) => {
    const reason = action === 'rejected' ? prompt('Rad etish sababi:') : undefined;
    if (action === 'rejected' && !reason) return;

    await dbOperations.updateStartup(id, { 
      status: action, 
      rejection_reason: reason 
    });
    
    setStartups(prev => prev.map(s => 
      s.id === id ? { ...s, status: action, rejection_reason: reason } : s
    ));
    
    const s = startups.find(x => x.id === id);
    if (s) {
      await addNotification(
        s.egasi_id, 
        action === 'approved' ? 'Loyiha tasdiqlandi' : 'Loyiha rad etildi', 
        action === 'approved' 
          ? `"${s.nomi}" loyihasi tasdiqlandi va platformada ko'rinadi.` 
          : `"${s.nomi}" loyihasi rad etildi. Sabab: ${reason}`, 
        action === 'approved' ? 'success' : 'danger'
      );
    }
  };

  const handleAdminUserRole = async (userId, role) => {
    try {
      const updated = await dbOperations.updateUserRole(userId, role, currentUser?.id);
      setAllUsers(prev => prev.map(u => u.id === userId ? updated : u));
      await refreshAdminData();
    } catch (e) {
      alert('Rolni o\'zgartirishda xatolik');
    }
  };

  const handleAdminUserBan = async (userId, banned) => {
    try {
      const updated = await dbOperations.setUserBanned(userId, banned, currentUser?.id);
      setAllUsers(prev => prev.map(u => u.id === userId ? updated : u));
      await refreshAdminData();
    } catch (e) {
      alert('Bloklashda xatolik');
    }
  };

  const handleAdminUserDelete = async (userId) => {
    if (!confirm('Foydalanuvchini o\'chirmoqchimisiz?')) return;
    try {
      await dbOperations.deleteUser(userId, currentUser?.id);
      setAllUsers(prev => prev.filter(u => u.id !== userId));
      await refreshAdminData();
    } catch (e) {
      alert('O\'chirishda xatolik');
    }
  };

  const handleAdminStartupStatus = async (startupId, status) => {
    const reason = status === 'rejected' ? prompt('Rad etish sababi:') : null;
    if (status === 'rejected' && !reason) return;
    try {
      const updated = await dbOperations.updateStartupStatus(startupId, status, reason, currentUser?.id);
      setStartups(prev => prev.map(s => s.id === startupId ? updated : s));
      if (status === 'approved' || status === 'rejected') {
        const s = startups.find(x => x.id === startupId);
        if (s) {
          await addNotification(
            s.egasi_id,
            status === 'approved' ? 'Loyiha tasdiqlandi' : 'Loyiha rad etildi',
            status === 'approved'
              ? `"${s.nomi}" loyihasi tasdiqlandi va platformada ko'rinadi.`
              : `"${s.nomi}" loyihasi rad etildi. Sabab: ${reason}`,
            status === 'approved' ? 'success' : 'danger'
          );
        }
      }
      await refreshAdminData();
    } catch (e) {
      alert('Statusni o\'zgartirishda xatolik');
    }
  };

  const handleAdminStartupDelete = async (startupId) => {
    if (!confirm('Loyihani o\'chirmoqchimisiz?')) return;
    try {
      await dbOperations.deleteStartup(startupId, currentUser?.id);
      setStartups(prev => prev.filter(s => s.id !== startupId));
      await refreshAdminData();
    } catch (e) {
      alert('Loyihani o\'chirishda xatolik');
    }
  };

  const handleAddCategory = async () => {
    const name = prompt('Yangi kategoriya nomi:');
    if (!name) return;
    try {
      await dbOperations.createCategory(name, currentUser?.id);
      const cats = await dbOperations.getCategories();
      setCategories(cats.map(c => c.name));
      await refreshAdminData();
    } catch (e) {
      alert('Kategoriya qo\'shishda xatolik');
    }
  };

  const handleDeleteCategory = async (categoryName) => {
    if (!confirm(`"${categoryName}" kategoriyasini o'chirmoqchimisiz?`)) return;
    try {
      const cats = await dbOperations.getCategories();
      const cat = cats.find(c => c.name === categoryName);
      if (!cat) return;
      await dbOperations.deleteCategory(cat.id, currentUser?.id);
      const next = await dbOperations.getCategories();
      setCategories(next.map(c => c.name));
      await refreshAdminData();
    } catch (e) {
      alert('Kategoriya o\'chirishda xatolik');
    }
  };

  const handleCreateStartup = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    const fd = new FormData(e.currentTarget);
    const s = {
      id: `s_${Date.now()}`,
      nomi: fd.get('nomi'),
      tavsif: fd.get('tavsif'),
      category: fd.get('category'),
      kerakli_mutaxassislar: fd.get('specialists').split(',').map(m => m.trim()),
      logo: tempFileBase64 || 'https://via.placeholder.com/150/111/fff?text=Loyiha',
      egasi_id: currentUser.id,
      egasi_name: currentUser.name,
      status: 'pending_admin',
      yaratilgan_vaqt: new Date().toISOString(),
      a_zolar: [{ user_id: currentUser.id, name: currentUser.name, role: 'Asoschi', joined_at: new Date().toISOString() }],
      tasks: [],
      views: 0,
      github_url: fd.get('github_url') || '',
      website_url: fd.get('website_url') || ''
    };
    
    await dbOperations.createStartup(s);
    setStartups(prev => [s, ...prev]);
    
    navigateTo('my-projects');
    await addNotification('admin', 'Yangi ariza', `"${s.nomi}" loyihasi moderatsiya uchun yuborildi.`, 'info');
    setTempFileBase64(null);
    alert('Loyiha muvaffaqiyatli yaratildi! Moderatsiyadan o\'tishini kuting.');
  };

  const handleUpdateProfile = async () => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, ...editedUser };
    
    await dbOperations.updateUser(currentUser.id, updatedUser);
    
    setAllUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
    setCurrentUser(updatedUser);
    
    setIsEditProfileModalOpen(false);
    setEditedUser({});
    setTempFileBase64(null);
    alert('Profil muvaffaqiyatli yangilandi!');
  };

  const handleAddTask = async (startupId) => {
    const title = prompt('Vazifa nomi:');
    if (!title) return;
    const desc = prompt('Batafsil tavsif:');
    const deadline = prompt('Deadline (YYYY-MM-DD):');
    
    const newTask = {
      id: `t_${Date.now()}`,
      startup_id: startupId,
      title,
      description: desc || '',
      assigned_to_id: currentUser?.id || '',
      assigned_to_name: currentUser?.name || 'Belgilanmagan',
      deadline: deadline || '',
      status: 'todo'
    };
    
    await dbOperations.createTask(newTask);
    
    const startup = startups.find(s => s.id === startupId);
    const updatedTasks = [...(startup?.tasks || []), newTask];
    
    await dbOperations.updateStartup(startupId, { tasks: updatedTasks });
    
    setStartups(prev => prev.map(s => 
      s.id === startupId ? { ...s, tasks: updatedTasks } : s
    ));
    
    alert('Vazifa muvaffaqiyatli qo\'shildi!');
  };

  const handleMoveTask = async (startupId, taskId, newStatus) => {
    await dbOperations.updateTaskStatus(taskId, newStatus);
    
    setStartups(prev => prev.map(s => s.id === startupId ? {
      ...s,
      tasks: s.tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
    } : s));
    
    const startup = startups.find(s => s.id === startupId);
    if (startup) {
      const updatedTasks = startup.tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
      await dbOperations.updateStartup(startupId, { tasks: updatedTasks });
    }
  };

  const handleDeleteTask = async (startupId, taskId) => {
    if (!confirm('Vazifani o\'chirmoqchimisiz?')) return;
    
    await dbOperations.deleteTask(taskId);
    
    const startup = startups.find(s => s.id === startupId);
    if (startup) {
      const updatedTasks = startup.tasks.filter(t => t.id !== taskId);
      await dbOperations.updateStartup(startupId, { tasks: updatedTasks });
      
      setStartups(prev => prev.map(s => 
        s.id === startupId ? { ...s, tasks: updatedTasks } : s
      ));
    }
    
    alert('Vazifa o\'chirildi!');
  };

  const handleDeleteStartup = async (startupId) => {
    if (!confirm('Loyihani butunlay o\'chirmoqchimisiz? Bu harakatni qaytarib bo\'lmaydi!')) return;
    
    await dbOperations.deleteStartup(startupId);
    setStartups(prev => prev.filter(s => s.id !== startupId));
    navigateTo('my-projects');
    alert('Loyiha o\'chirildi!');
  };

  const handleSendAIMessage = async () => {
    if (!aiInput.trim() || aiLoading) return;
    const userMsg = { 
      id: `m_${Date.now()}`, 
      text: aiInput, 
      sender: 'user', 
      timestamp: new Date().toISOString() 
    };
    setAiChat(prev => [...prev, userMsg]);
    const promptText = aiInput;
    setAiInput('');
    setAiLoading(true);
    try {
      const history = aiChat.map(m => ({ 
        text: m.text, 
        role: m.sender === 'user' ? 'user' : 'model'
      }));
      const responseText = await getAIMentorResponse(history, promptText);
      const aiMsg = { 
        id: `ai_${Date.now()}`, 
        text: responseText, 
        sender: 'ai', 
        timestamp: new Date().toISOString() 
      };
      setAiChat(prev => [...prev, aiMsg]);
    } catch (e) {
      const errMsg = { 
        id: 'err', 
        text: "Hozirda AI bilan bog'lana olmayapman. Gemini API kalitini tekshiring.", 
        sender: 'ai', 
        timestamp: new Date().toISOString() 
      };
      setAiChat(prev => [...prev, errMsg]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUserId');
    navigateTo('explore');
    alert('Tizimdan muvaffaqiyatli chiqdingiz!');
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUser) return;
    
    await dbOperations.markAllNotificationsAsRead(currentUser.id);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleMarkAsRead = async (notifId) => {
    await dbOperations.markNotificationAsRead(notifId);
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
  };

  // --- FILTERS ---
  const filtered = useMemo(() => {
    return startups.filter(s => 
      s.status === 'approved' && 
      (selectedCategory === 'All' || s.category === selectedCategory) &&
      (s.nomi.toLowerCase().includes(searchTerm.toLowerCase()) || s.tavsif.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [startups, selectedCategory, searchTerm]);

  const myStartups = useMemo(() => 
    currentUser ? startups.filter(s => s.egasi_id === currentUser.id || s.a_zolar.some(m => m.user_id === currentUser.id)) : [], 
    [startups, currentUser]
  );
  
  const incomingRequests = useMemo(() => 
    currentUser ? joinRequests.filter(r => startups.find(s => s.id === r.startup_id && s.egasi_id === currentUser.id)) : [], 
    [joinRequests, startups, currentUser]
  );
  
  const userNotifications = useMemo(() => 
    notifications.filter(n => n.user_id === currentUser?.id || (currentUser?.role === 'admin' && n.user_id === 'admin')), 
    [notifications, currentUser]
  );
  
  const unreadNotifCount = userNotifications.filter(n => !n.is_read).length;

  const selectedStartup = startups.find(s => s.id === selectedStartupId);

  // --- RENDERERS ---

  const renderSidebar = () => (
    <>
      <div className={`fixed inset-0 bg-gray-900/40 z-[80] lg:hidden backdrop-blur-sm transition-all duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsMobileMenuOpen(false)} />
      <aside className={`fixed lg:relative z-[90] w-[260px] md:w-[240px] h-full bg-white border-r border-gray-100 flex flex-col p-6 md:p-8 transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigateTo('explore')}>
            <div className="w-10 h-10 flex items-center justify-center transition-transform"><img src={Logo} alt="Logo" /></div>
            <span className="text-[18px] font-extrabold tracking-tighter text-gray-900">GarajHub</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden text-gray-400 p-2"><i className="fa-solid fa-xmark text-lg"></i></button>
        </div>

        <nav className="flex-grow space-y-1 overflow-y-auto custom-scrollbar pr-2">
          <NavItem active={activeTab === 'explore'} onClick={() => navigateTo('explore')} label="Kashfiyot" icon="fa-compass" />
          {currentUser && <NavItem active={activeTab === 'my-projects'} onClick={() => navigateTo('my-projects')} label="Loyihalarim" icon="fa-rocket" />}
          {currentUser && <NavItem active={activeTab === 'requests'} onClick={() => navigateTo('requests')} label="So'rovlar" icon="fa-user-group" badge={incomingRequests.length} />}
          {currentUser && <NavItem active={activeTab === 'profile'} onClick={() => navigateTo('profile')} label="Profil" icon="fa-user" />}
          {currentUser?.role === 'admin' && (
            <div className="pt-8">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest px-4 mb-3">Moderatsiya</p>
              <NavItem active={activeTab === 'admin'} onClick={() => navigateTo('admin')} label="Arizalar" icon="fa-shield-check" badge={startups.filter(s => s.status === 'pending_admin').length} />
            </div>
          )}
        </nav>

        <div className="mt-auto pt-8 border-t border-gray-100">
          {currentUser ? (
            <div className="flex items-center gap-3 group">
              <img src={currentUser.avatar} className="w-10 h-10 rounded-full border border-gray-100 object-cover" alt="Avatar" />
              <div className="flex-grow min-w-0">
                <p className="text-[13px] font-bold text-gray-900 truncate">{currentUser.name}</p>
                <p className="text-[11px] text-gray-400 truncate">{currentUser.email}</p>
              </div>
              <button onClick={handleLogout} className="text-gray-300 hover:text-rose-600 transition-colors shrink-0 p-1">
                <i className="fa-solid fa-power-off text-sm"></i>
              </button>
            </div>
          ) : (
            <Button onClick={() => openAuth('register')} className="w-full">Tizimga kirish</Button>
          )}
        </div>
      </aside>
    </>
  );

  const NavItem = ({ active, onClick, label, icon, badge }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center h-10 px-4 rounded-lg transition-all relative ${active ? 'bg-black text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}
    >
      <i className={`fa-solid ${icon} w-5 text-[14px] ${active ? 'text-white' : 'text-gray-400'} mr-3`}></i>
      <span className="text-[13px] font-semibold">{label}</span>
      {badge > 0 && (
        <span className={`absolute right-4 h-5 min-w-[20px] flex items-center justify-center text-[10px] font-black rounded-full px-1.5 ${active ? 'bg-white text-black' : 'bg-black text-white'}`}>
          {badge}
        </span>
      )}
    </button>
  );

  const renderExplore = () => (
    <div className="space-y-8 md:space-y-12 animate-in fade-in">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight italic">Innovatsiyalarni kashf eting</h1>
          <p className="text-gray-500 text-[14px] md:text-[15px]">O'zbekistondagi eng yaxshi startuplar va jamoalar.</p>
        </div>
        {currentUser && <Button onClick={() => navigateTo('create')} icon="fa-plus" className="w-full md:w-auto h-12 md:h-10">Loyiha Yaratish</Button>}
      </header>

      <div className="flex flex-col gap-6">
        <div className="relative group w-full md:max-w-lg">
          <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors"></i>
          <input 
            type="text" placeholder="Startup yoki ko'nikma..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full h-12 md:h-11 bg-white border border-gray-200 rounded-lg pl-11 pr-4 text-[14px] focus:border-black outline-none transition-all shadow-sm"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-2 md:mx-0 md:px-0">
          {['All', ...categories].map(c => (
            <button 
              key={c} onClick={() => setSelectedCategory(c)} 
              className={`h-8 px-4 rounded-full text-[12px] font-semibold border transition-all whitespace-nowrap ${selectedCategory === c ? 'bg-black border-black text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-black'}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map(s => (
          <div key={s.id} onClick={() => navigateTo('details', s.id)} className="bg-white border border-gray-100 rounded-xl p-5 md:p-6 flex flex-col hover:border-black hover:shadow-lg transition-all group relative overflow-hidden cursor-pointer">
            <div className="flex items-start justify-between mb-4 md:mb-6">
              <img src={s.logo} className="w-12 h-12 md:w-14 md:h-14 bg-gray-50 object-cover rounded-lg border border-gray-100 shadow-sm" alt="Logo" />
              <Badge>{s.category}</Badge>
            </div>
            <div className="flex-grow space-y-2 md:space-y-3 mb-6 md:mb-8">
              <h3 className="text-base md:text-[18px] font-extrabold text-gray-900 tracking-tight leading-tight group-hover:pl-1 transition-all">{s.nomi}</h3>
              <p className="text-gray-500 text-[13px] md:text-[14px] leading-relaxed line-clamp-2">"{s.tavsif}"</p>
            </div>
            <div className="flex items-center justify-between pt-4 md:pt-6 border-t border-gray-50">
              <div className="flex -space-x-2">
                {s.a_zolar.slice(0, 3).map((m, i) => (
                  <div key={i} className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[9px] md:text-[10px] font-bold text-gray-700 uppercase" title={m.name}>
                    {m.name[0]}
                  </div>
                ))}
                {s.a_zolar.length > 3 && (
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-black text-white border-2 border-white flex items-center justify-center text-[8px] md:text-[9px] font-bold">
                    +{s.a_zolar.length - 3}
                  </div>
                )}
              </div>
              <Button onClick={(e) => { e.stopPropagation(); handleJoinRequest(s); }} variant="secondary" size="sm">Qo'shilish</Button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-16 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center opacity-50">
            <i className="fa-solid fa-rocket-launch text-3xl md:text-4xl text-gray-200 mb-4"></i>
            <p className="text-[12px] md:text-[13px] font-bold uppercase tracking-widest text-center px-4">Hech qanday startup topilmadi</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderCreateStartup = () => {
    if (!currentUser) {
      return <EmptyState icon="fa-lock" title="Kirish talab qilinadi" subtitle="Startup yaratish uchun tizimga kiring" action={<Button onClick={() => openAuth('login')}>Kirish</Button>} />;
    }

    return (
      <div className="max-w-[600px] mx-auto animate-in slide-up">
        <div className="flex items-center gap-4 mb-8 md:mb-10">
          <button onClick={() => navigateTo('explore')} className="text-gray-400 hover:text-black transition-colors p-2"><i className="fa-solid fa-arrow-left text-lg"></i></button>
          <h1 className="text-xl md:text-2xl font-extrabold italic tracking-tight">Yangi startup yaratish</h1>
        </div>

        <form onSubmit={handleCreateStartup} className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 space-y-6 md:space-y-8 shadow-md">
          <FileUpload label="Startup Logosi" onChange={handleFileChange} preview={tempFileBase64 || undefined} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
            <Input required name="nomi" label="Startup Nomi" placeholder="Rocket.io" icon="fa-rocket" />
            <div className="space-y-1.5 w-full">
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-widest ml-1">Kategoriya</label>
              <select name="category" className="w-full h-[44px] bg-white border border-gray-200 rounded-lg px-4 text-[14px] outline-none focus:border-black shadow-sm">
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <TextArea required name="tavsif" label="Tavsif" placeholder="Startupingizning asosiy maqsadi..." />
          
          <Input required name="specialists" label="Kerakli Mutaxassislar" helper="Vergul bilan ajrating" placeholder="Frontend, UI/UX Designer" icon="fa-users" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
            <Input name="github_url" label="GitHub" placeholder="https://github.com/..." icon="fa-github" />
            <Input name="website_url" label="Website" placeholder="https://..." icon="fa-globe" />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 pt-6 border-t border-gray-50">
            <Button onClick={() => navigateTo('explore')} variant="secondary" className="w-full">Bekor qilish</Button>
            <Button type="submit" className="w-full">Arizani Yuborish</Button>
          </div>
        </form>
      </div>
    );
  };

  const renderMyProjects = () => {
    if (!currentUser) {
      return <EmptyState icon="fa-lock" title="Kirish talab qilinadi" action={<Button onClick={() => openAuth('login')}>Kirish</Button>} />;
    }

    return (
      <div className="space-y-8 md:space-y-12 animate-in fade-in">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight italic">Loyihalarim</h1>
            <Badge variant="active" size="md">{myStartups.length}</Badge>
          </div>
          <Button onClick={() => navigateTo('create')} icon="fa-plus" className="w-full md:w-auto h-12 md:h-10">Yangi Loyiha</Button>
        </header>

        {myStartups.length > 0 ? (
          <div className="space-y-4">
            {myStartups.map(s => (
              <div key={s.id} className="bg-white border border-gray-100 rounded-xl p-5 md:p-6 flex flex-col md:flex-row items-center gap-5 md:gap-6 hover:shadow-md transition-all">
                <img src={s.logo} className="w-16 h-16 rounded-lg object-cover border border-gray-100" alt="Logo" />
                <div className="flex-grow min-w-0 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
                    <h3 className="text-base md:text-lg font-bold truncate">{s.nomi}</h3>
                    <Badge variant={s.status === 'approved' ? 'success' : s.status === 'pending_admin' ? 'default' : 'danger'}>
                      {s.status === 'pending_admin' ? 'Moderatsiyada' : s.status === 'approved' ? 'Faol' : 'Rad etilgan'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap justify-center md:justify-start gap-3 md:gap-4 text-[10px] md:text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    <span>{s.category}</span>
                    <span><i className="fa-solid fa-users mr-1"></i> {s.a_zolar.length} builder</span>
                    <span><i className="fa-solid fa-tasks mr-1"></i> {s.tasks?.length || 0} vazifa</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 w-full md:w-auto">
                  <Button variant="secondary" size="md" onClick={() => navigateTo('details', s.id)} className="flex-grow md:flex-none h-12 md:h-10">Boshqarish</Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState 
            icon="fa-rocket-launch" 
            title="Hali loyihalar yo'q" 
            subtitle="G'oyangiz bormi? Uni hozir platformada e'lon qiling." 
            action={<Button onClick={() => navigateTo('create')}>Loyiha Yaratish</Button>}
          />
        )}
      </div>
    );
  };

  const renderDetails = () => {
    if (!selectedStartup) return <EmptyState icon="fa-ban" title="Loyiha topilmadi" action={<Button onClick={() => navigateTo('explore')}>Ortga qaytish</Button>} />;

    const isOwner = currentUser && selectedStartup.egasi_id === currentUser.id;
    const isMember = currentUser && selectedStartup.a_zolar.some(m => m.user_id === currentUser.id);

    return (
      <div className="space-y-8 md:space-y-12 animate-in fade-in">
        <header className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8 border-b border-gray-100 pb-8 md:pb-10">
          <img src={selectedStartup.logo} className="w-20 h-20 md:w-24 md:h-24 rounded-2xl border border-gray-100 shadow-sm object-cover shrink-0" alt="Logo" />
          <div className="flex-grow space-y-3 md:space-y-4 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tighter italic leading-none">{selectedStartup.nomi}</h1>
              <Badge variant="active" size="md">{selectedStartup.category}</Badge>
              <Badge variant={selectedStartup.status === 'approved' ? 'success' : 'default'} size="md">{selectedStartup.status === 'approved' ? 'Faol' : 'Moderatsiyada'}</Badge>
            </div>
            <p className="text-gray-500 text-[14px] md:text-[16px] max-w-2xl leading-relaxed italic">"{selectedStartup.tavsif}"</p>
            <div className="flex gap-4 flex-wrap">
              <span className="text-[10px] md:text-[11px] font-bold text-gray-400 uppercase tracking-widest">Egasi: <span className="text-black">{selectedStartup.egasi_name}</span></span>
              <span className="text-[10px] md:text-[11px] font-bold text-gray-400 uppercase tracking-widest">Sana: <span className="text-black">{new Date(selectedStartup.yaratilgan_vaqt).toLocaleDateString()}</span></span>
            </div>
          </div>
          <div className="flex gap-2 md:gap-3 w-full md:w-auto shrink-0">
            {selectedStartup.github_url && <Button variant="secondary" icon="fa-github" onClick={() => window.open(selectedStartup.github_url, '_blank')} className="flex-1 md:flex-none" />}
            {selectedStartup.website_url && <Button variant="secondary" icon="fa-globe" onClick={() => window.open(selectedStartup.website_url, '_blank')} className="flex-1 md:flex-none" />}
            <Button onClick={() => navigateTo('my-projects')} variant="ghost" icon="fa-arrow-left" className="flex-1 md:flex-none" />
          </div>
        </header>

        <nav className="flex items-center border-b border-gray-100 gap-6 md:gap-8 h-10 overflow-x-auto no-scrollbar scroll-smooth">
          {['Vazifalar', 'Jamoa', 'Sozlamalar'].map((tab) => (
            <button 
              key={tab} 
              onClick={() => setActiveDetailTab(tab.toLowerCase())}
              className={`h-full uppercase text-[11px] md:text-[12px] font-extrabold tracking-widest transition-all px-2 border-b-2 whitespace-nowrap ${activeDetailTab === tab.toLowerCase() ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-black'}`}
            >
              {tab}
            </button>
          ))}
        </nav>

        <div className="min-h-[400px]">
          {activeDetailTab === 'vazifalar' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              {['todo', 'in-progress', 'done'].map((status) => (
                <div key={status} className="flex flex-col gap-4">
                  <div className="flex items-center justify-between px-2">
                    <h4 className="text-[10px] md:text-[11px] font-extrabold uppercase tracking-widest text-gray-400 italic">
                      {status === 'todo' ? 'Kutilmoqda' : status === 'in-progress' ? 'Jarayonda' : 'Bajarildi'}
                    </h4>
                    <Badge variant="default">{selectedStartup.tasks?.filter(t => t.status === status).length || 0}</Badge>
                  </div>
                  <div className="space-y-3 min-h-[120px] md:min-h-[400px] p-4 bg-gray-50/30 rounded-2xl border border-gray-100">
                    {selectedStartup.tasks?.filter(t => t.status === status).map(t => (
                      <div key={t.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm group hover:border-black transition-all">
                        <div className="flex items-start justify-between mb-3">
                          <h5 className="text-[14px] font-bold leading-tight flex-grow">{t.title}</h5>
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => {
                              if (status === 'todo') handleMoveTask(selectedStartup.id, t.id, 'in-progress');
                              else if (status === 'in-progress') handleMoveTask(selectedStartup.id, t.id, 'done');
                              else handleMoveTask(selectedStartup.id, t.id, 'todo');
                            }} className="text-gray-300 hover:text-black transition-colors p-2 shrink-0" title="Keyingi bosqichga o'tkazish">
                              <i className="fa-solid fa-arrow-right-long text-[10px]"></i>
                            </button>
                            {isOwner && (
                              <button onClick={() => handleDeleteTask(selectedStartup.id, t.id)} className="text-gray-300 hover:text-rose-600 transition-colors p-2 shrink-0" title="O'chirish">
                                <i className="fa-solid fa-trash text-[10px]"></i>
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-[12px] text-gray-500 mb-4 line-clamp-2">{t.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-5 h-5 bg-gray-100 rounded-full border border-gray-200 flex items-center justify-center text-[8px] font-bold uppercase shrink-0">{t.assigned_to_name[0]}</div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">{t.assigned_to_name}</span>
                          </div>
                          {t.deadline && <span className="text-[9px] font-bold text-rose-400 uppercase tracking-widest ml-2 shrink-0">{t.deadline}</span>}
                        </div>
                      </div>
                    ))}
                    {status === 'todo' && (isOwner || isMember) && (
                      <button onClick={() => handleAddTask(selectedStartup.id)} className="w-full py-8 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-300 hover:text-black hover:border-black transition-all group">
                        <i className="fa-solid fa-plus text-sm mb-1"></i>
                        <span className="text-[10px] font-bold uppercase tracking-widest">Yangi vazifa</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeDetailTab === 'jamoa' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {selectedStartup.a_zolar.map((m, i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-xl p-5 md:p-6 flex items-center gap-4 md:gap-5 hover:border-black transition-all relative group min-w-0">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center text-[14px] md:text-[16px] font-black uppercase italic shadow-inner shrink-0">
                    {m.name[0]}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[14px] md:text-[15px] font-bold tracking-tight truncate">{m.name}</h4>
                    <Badge variant="active" size="sm" className="mt-1 truncate max-w-full">{m.role}</Badge>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">{new Date(m.joined_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeDetailTab === 'sozlamalar' && isOwner && (
            <div className="max-w-xl mx-auto md:mx-0 space-y-10 md:space-y-12">
              <section className="space-y-6 pt-10 md:pt-12 border-t border-gray-100">
                <h3 className="text-[11px] md:text-[12px] font-bold uppercase tracking-widest text-rose-500/50 border-b border-rose-100 pb-2">Xavfli hudud</h3>
                <div className="p-5 md:p-6 bg-rose-50 border border-rose-100 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="text-center sm:text-left">
                    <p className="text-[14px] font-bold text-rose-900 mb-1">Loyihani o'chirish</p>
                    <p className="text-[12px] text-rose-600/80">Loyiha o'chirilgach, uni qayta tiklab bo'lmaydi.</p>
                  </div>
                  <Button onClick={() => handleDeleteStartup(selectedStartup.id)} variant="danger" className="shrink-0 w-full sm:w-auto h-12 md:h-10">O'chirish</Button>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderProfile = () => {
    if (!currentUser) {
      return <EmptyState icon="fa-lock" title="Kirish talab qilinadi" action={<Button onClick={() => openAuth('login')}>Kirish</Button>} />;
    }

    return (
      <div className="max-w-[800px] mx-auto space-y-10 md:space-y-12 animate-in fade-in">
        <div className="bg-white border border-gray-100 rounded-2xl p-6 md:p-10 relative overflow-hidden shadow-sm group">
          <div className="absolute top-0 left-0 w-full h-24 md:h-24 bg-gray-50 border-b border-gray-100"></div>
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="relative group/avatar mb-4 md:mb-6">
              <img src={currentUser.avatar} className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white shadow-xl grayscale hover:grayscale-0 transition-all object-cover" alt="Profile" />
              <button onClick={() => { setEditedUser(currentUser); setIsEditProfileModalOpen(true); }} className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white opacity-0 group-hover/avatar:opacity-100 transition-all"><i className="fa-solid fa-camera"></i></button>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight italic mb-2 px-2">{currentUser.name}</h2>
            <div className="flex gap-2 mb-4 justify-center flex-wrap px-4">
              <Badge variant="active" className="truncate max-w-[200px]">{currentUser.email}</Badge>
              {currentUser.phone && currentUser.phone !== '000' && <Badge>{currentUser.phone}</Badge>}
            </div>
            <p className="text-[13px] md:text-[14px] text-gray-500 max-w-md italic mb-6 md:mb-8 px-6">
              {currentUser.bio || "O'zingiz haqingizda bir necha so'z yozing."}
            </p>
            <div className="flex gap-3 md:gap-4 flex-wrap justify-center w-full max-w-[400px]">
              <Button onClick={() => { setEditedUser(currentUser); setIsEditProfileModalOpen(true); }} variant="secondary" size="md" className="flex-1 h-12 md:h-10">Tahrirlash</Button>
              {currentUser.portfolio_url && <Button variant="ghost" icon="fa-link" onClick={() => window.open(currentUser.portfolio_url, '_blank')} className="flex-1 h-12 md:h-10 border border-gray-100" />}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {[
            { val: myStartups.length, label: 'Loyihalar' },
            { val: incomingRequests.length, label: 'So\'rovlar' },
            { val: userNotifications.length, label: 'Notiflar' },
            { val: myStartups.reduce((acc, s) => acc + (s.tasks?.length || 0), 0), label: 'Vazifalar' }
          ].map((s, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-xl p-4 md:p-6 text-center shadow-sm hover:border-black transition-all">
              <p className="text-xl md:text-3xl font-extrabold italic mb-1">{s.val}</p>
              <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="space-y-4 md:space-y-6 px-2">
          <h3 className="text-[11px] md:text-[12px] font-bold uppercase tracking-widest text-black/30 border-b border-gray-100 pb-2">Ko'nikmalar</h3>
          <div className="flex flex-wrap gap-2">
            {currentUser.skills && currentUser.skills.length > 0 ? currentUser.skills.map((s, i) => <Badge key={i} variant="default" size="md" className="!text-[11px] md:!text-[12px]"># {s}</Badge>) : (
              <p className="text-[12px] md:text-[13px] text-gray-400 italic">Hali ko'nikmalar kiritilmagan.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderAdmin = () => {
    if (!currentUser || currentUser.role !== 'admin') {
      return <EmptyState icon="fa-lock" title="Ruxsat yo'q" action={<Button onClick={() => navigateTo('explore')}>Ortga</Button>} />;
    }

    const stats = adminStats || {
      users: allUsers.length,
      startups: startups.length,
      pending_startups: startups.filter(s => s.status === 'pending_admin').length,
      join_requests: joinRequests.length,
      notifications: notifications.length
    };

    const adminTabs = [
      { key: 'moderation', label: 'Moderatsiya' },
      { key: 'users', label: 'Foydalanuvchilar' },
      { key: 'startups', label: 'Startuplar' },
      { key: 'categories', label: 'Kategoriya' },
      { key: 'stats', label: 'Statistika' },
      { key: 'audit', label: 'Audit' }
    ];

    return (
      <div className="space-y-8 md:space-y-12 animate-in fade-in">
        <header className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight italic">Admin Panel</h1>
            <Badge variant="danger" size="md">{stats.pending_startups}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {adminTabs.map(t => (
              <button
                key={t.key}
                onClick={() => setAdminTab(t.key)}
                className={`h-9 px-4 rounded-full text-[12px] font-semibold border transition-all ${adminTab === t.key ? 'bg-black border-black text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-black'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </header>

        {adminTab === 'moderation' && (
          <div className="space-y-4">
            {startups.filter(s => s.status === 'pending_admin').map(s => (
              <div key={s.id} className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 flex flex-col xl:flex-row items-start gap-6 md:gap-8 hover:shadow-lg transition-all">
                <img src={s.logo} className="w-16 h-16 md:w-20 md:h-20 rounded-xl grayscale shadow-sm border border-gray-100 object-cover shrink-0" alt="Logo" />
                <div className="flex-grow space-y-3 md:space-y-4 min-w-0">
                  <div>
                    <h3 className="text-xl md:text-2xl font-extrabold tracking-tight italic truncate">{s.nomi}</h3>
                    <Badge variant="active" className="mt-2">{s.category}</Badge>
                  </div>
                  <p className="text-gray-500 text-[13px] md:text-[14px] italic leading-relaxed">"{s.tavsif}"</p>
                  <div className="flex flex-wrap gap-4 text-[10px] md:text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    <span>Egasi: <span className="text-black">{s.egasi_name}</span></span>
                    <span>Sana: <span className="text-black">{new Date(s.yaratilgan_vaqt).toLocaleDateString()}</span></span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 shrink-0 w-full xl:w-auto">
                  <Button onClick={() => handleAdminStartupStatus(s.id, 'approved')} className="flex-1 xl:flex-none h-12 px-10">Tasdiqlash</Button>
                  <Button onClick={() => handleAdminStartupStatus(s.id, 'rejected')} variant="danger" className="flex-1 xl:flex-none h-12 px-10">Rad etish</Button>
                </div>
              </div>
            ))}
            {startups.filter(s => s.status === 'pending_admin').length === 0 && (
              <EmptyState icon="fa-check-circle" title="Moderatsiya kutayotgan arizalar yo'q" />
            )}
          </div>
        )}

        {adminTab === 'users' && (
          <div className="space-y-3">
            {allUsers.map(u => (
              <div key={u.id} className="bg-white border border-gray-200 rounded-xl p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center gap-4">
                <img src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}`} className="w-12 h-12 rounded-full border border-gray-100 object-cover" alt="Avatar" />
                <div className="flex-grow min-w-0">
                  <p className="text-[14px] font-bold truncate">{u.name}</p>
                  <p className="text-[12px] text-gray-500 truncate">{u.email}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant={u.role === 'admin' ? 'active' : 'default'}>{u.role}</Badge>
                    {u.banned && <Badge variant="danger">Banned</Badge>}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                  <select
                    value={u.role}
                    onChange={(e) => handleAdminUserRole(u.id, e.target.value)}
                    className="h-10 px-3 text-[12px] border border-gray-200 rounded-lg bg-white"
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                  <Button
                    variant={u.banned ? 'secondary' : 'danger'}
                    className="h-10 px-5"
                    onClick={() => handleAdminUserBan(u.id, !u.banned)}
                  >
                    {u.banned ? 'Unban' : 'Ban'}
                  </Button>
                  <Button variant="ghost" className="h-10 px-5 border border-gray-100" onClick={() => handleAdminUserDelete(u.id)}>Delete</Button>
                </div>
              </div>
            ))}
            {allUsers.length === 0 && <EmptyState icon="fa-user-slash" title="Foydalanuvchilar yo'q" />}
          </div>
        )}

        {adminTab === 'startups' && (
          <div className="space-y-3">
            {startups.map(s => (
              <div key={s.id} className="bg-white border border-gray-200 rounded-xl p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center gap-4">
                <img src={s.logo} className="w-12 h-12 rounded-lg border border-gray-100 object-cover" alt="Logo" />
                <div className="flex-grow min-w-0">
                  <p className="text-[14px] font-bold truncate">{s.nomi}</p>
                  <p className="text-[12px] text-gray-500 truncate">{s.egasi_name}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant={s.status === 'approved' ? 'success' : s.status === 'rejected' ? 'danger' : 'default'}>{s.status}</Badge>
                    <Badge>{s.category}</Badge>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                  <Button className="h-10 px-5" onClick={() => handleAdminStartupStatus(s.id, 'approved')}>Approve</Button>
                  <Button variant="danger" className="h-10 px-5" onClick={() => handleAdminStartupStatus(s.id, 'rejected')}>Reject</Button>
                  <Button variant="ghost" className="h-10 px-5 border border-gray-100" onClick={() => handleAdminStartupDelete(s.id)}>Delete</Button>
                </div>
              </div>
            ))}
            {startups.length === 0 && <EmptyState icon="fa-rocket" title="Loyihalar yo'q" />}
          </div>
        )}

        {adminTab === 'categories' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {categories.map((c, i) => (
                <div key={`${c}-${i}`} className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2 text-[12px]">
                  <span className="font-semibold">{c}</span>
                  <button onClick={() => handleDeleteCategory(c)} className="text-gray-400 hover:text-rose-600"><i className="fa-solid fa-xmark"></i></button>
                </div>
              ))}
              {categories.length === 0 && <p className="text-[12px] text-gray-400 italic">Kategoriya yo'q</p>}
            </div>
            <Button onClick={handleAddCategory} className="h-10 px-6">Kategoriya qo'shish</Button>
          </div>
        )}

        {adminTab === 'stats' && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6">
            {[
              { val: stats.users, label: 'Users' },
              { val: stats.startups, label: 'Startups' },
              { val: stats.pending_startups, label: 'Pending' },
              { val: stats.join_requests, label: 'Requests' },
              { val: stats.notifications, label: 'Notifications' }
            ].map((s, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-xl p-4 md:p-6 text-center shadow-sm hover:border-black transition-all">
                <p className="text-xl md:text-3xl font-extrabold italic mb-1">{s.val}</p>
                <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {adminTab === 'audit' && (
          <div className="space-y-3">
            {auditLogs.map(log => (
              <div key={log.id} className="bg-white border border-gray-200 rounded-xl p-4 md:p-5">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-bold uppercase tracking-widest text-gray-400">{log.action}</p>
                  <p className="text-[10px] text-gray-400">{new Date(log.created_at).toLocaleString()}</p>
                </div>
                <p className="text-[12px] text-gray-600 mt-2">
                  Entity: <span className="font-semibold">{log.entity_type}</span> / {log.entity_id}
                </p>
                <p className="text-[12px] text-gray-600">Actor: {log.actor_id}</p>
              </div>
            ))}
            {auditLogs.length === 0 && <EmptyState icon="fa-list" title="Audit log bo'sh" />}
          </div>
        )}
      </div>
    );
  };

  const renderRequests = () => {
    if (!currentUser) {
      return <EmptyState icon="fa-lock" title="Kirish talab qilinadi" action={<Button onClick={() => openAuth('login')}>Kirish</Button>} />;
    }

    return (
      <div className="max-w-[800px] mx-auto space-y-8 md:space-y-12 animate-in fade-in">
        <header className="flex items-center gap-4">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight italic">So'rovlar</h1>
          <Badge variant="active" size="md">{incomingRequests.length}</Badge>
        </header>

        <div className="space-y-4">
          {incomingRequests.map(r => (
            <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 md:gap-8 hover:shadow-md transition-all">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-gray-50 rounded-full flex items-center justify-center font-black text-lg md:text-xl italic border border-gray-100 shadow-inner shrink-0">{r.user_name[0]}</div>
              <div className="flex-grow text-center md:text-left space-y-2 min-w-0">
                <h3 className="text-lg md:text-xl font-bold tracking-tight truncate">{r.user_name}</h3>
                <div className="flex gap-2 justify-center md:justify-start flex-wrap">
                  <Badge variant="active">{r.specialty}</Badge>
                  <Badge className="truncate max-w-[150px]">Loyiha: {r.startup_name}</Badge>
                </div>
                <p className="text-gray-500 text-[12px] md:text-[13px] italic">"{r.comment}"</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{new Date(r.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-3 w-full md:w-auto shrink-0">
                <Button onClick={() => handleRequestAction(r.id, 'accept')} className="flex-1 md:flex-none px-6 md:px-8 h-12">Qabul</Button>
                <Button onClick={() => handleRequestAction(r.id, 'decline')} variant="danger" className="flex-1 md:flex-none px-6 md:px-8 h-12">Rad</Button>
              </div>
            </div>
          ))}
          {incomingRequests.length === 0 && (
            <EmptyState icon="fa-user-clock" title="Yangi so'rovlar yo'q" />
          )}
        </div>
      </div>
    );
  };

  const renderInbox = () => {
    if (!currentUser) {
      return <EmptyState icon="fa-lock" title="Kirish talab qilinadi" action={<Button onClick={() => openAuth('login')}>Kirish</Button>} />;
    }

    return (
      <div className="max-w-[600px] mx-auto space-y-6 md:space-y-8 animate-in fade-in">
        <header className="flex items-center justify-between border-b border-gray-100 pb-4 md:pb-6 px-2">
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-extrabold italic tracking-tight">Bildirishnomalar</h1>
            {unreadNotifCount > 0 && <Badge variant="danger" size="md">{unreadNotifCount}</Badge>}
          </div>
          {unreadNotifCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead} className="text-[10px] md:text-[12px]">Barchasi o'qildi</Button>
          )}
        </header>

        <div className="space-y-3 px-2">
          {userNotifications.map(n => (
            <div 
              key={n.id} 
              onClick={() => handleMarkAsRead(n.id)}
              className={`p-4 md:p-5 rounded-xl border flex items-start gap-3 md:gap-4 transition-all cursor-pointer ${n.is_read ? 'bg-white border-gray-100 opacity-60' : 'bg-gray-50 border-black shadow-sm'}`}
            >
              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center shrink-0 ${n.type === 'success' ? 'bg-emerald-100 text-emerald-700' : n.type === 'danger' ? 'bg-rose-100 text-rose-700' : 'bg-black text-white'}`}>
                <i className={`fa-solid ${n.type === 'success' ? 'fa-check' : n.type === 'danger' ? 'fa-triangle-exclamation' : 'fa-info'} text-[12px] md:text-sm`}></i>
              </div>
              <div className="flex-grow min-w-0">
                <h5 className="text-[13px] md:text-[14px] font-bold italic mb-1 truncate">{n.title}</h5>
                <p className="text-[12px] md:text-[13px] text-gray-500 leading-relaxed mb-2 line-clamp-3">{n.text}</p>
                <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest">{new Date(n.created_at).toLocaleString()}</p>
              </div>
            </div>
          ))}
          {userNotifications.length === 0 && (
            <EmptyState icon="fa-bell-slash" title="Bildirishnomalar yo'q" />
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center space-y-4">
          <i className="fa-solid fa-spinner animate-spin text-4xl text-gray-900"></i>
          <p className="text-[14px] font-bold text-gray-400 uppercase tracking-widest">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white text-gray-900 selection:bg-black selection:text-white font-sans overflow-hidden">
      {renderSidebar()}

      <main className="flex-grow flex flex-col overflow-hidden relative">
        <header className="h-16 border-b border-gray-100 bg-white/80 backdrop-blur-md flex items-center justify-between px-4 md:px-8 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden text-gray-900 p-2 -ml-2"><i className="fa-solid fa-bars-staggered"></i></button>
            <p className="text-[9px] md:text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] md:tracking-[0.4em] italic select-none truncate">GarajHub / <span className="text-black font-extrabold">{activeTab}</span></p>
          </div>
          
          <div className="hidden lg:flex flex-grow max-w-lg mx-8">
            <div className="relative w-full group">
              <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-black transition-colors"></i>
              <input 
                type="text" 
                placeholder="Global qidiruv..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 bg-gray-50/50 border border-gray-100 rounded-lg pl-11 pr-4 text-[13px] focus:bg-white focus:border-black transition-all outline-none shadow-inner" 
              />
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-6">
            <button onClick={() => navigateTo('inbox')} className="relative p-2 text-gray-400 hover:text-black transition-colors">
              <i className="fa-solid fa-bell text-[18px]"></i>
              {unreadNotifCount > 0 && <span className="absolute top-1 right-1 h-4 w-4 bg-black text-white text-[9px] font-black flex items-center justify-center rounded-full ring-2 ring-white">{unreadNotifCount}</span>}
            </button>
            {currentUser && <button onClick={() => navigateTo('create')} className="w-9 h-9 md:w-10 md:h-10 bg-black text-white flex items-center justify-center rounded-lg shadow-lg hover:scale-105 active:scale-95 transition-all"><i className="fa-solid fa-plus text-sm"></i></button>}
          </div>
        </header>

        <section className="flex-grow overflow-y-auto p-4 md:p-12 lg:p-16 custom-scrollbar scroll-smooth">
          <div className="max-w-[1400px] mx-auto pb-20">
            {activeTab === 'explore' && renderExplore()}
            {activeTab === 'create' && renderCreateStartup()}
            {activeTab === 'my-projects' && renderMyProjects()}
            {activeTab === 'details' && renderDetails()}
            {activeTab === 'requests' && renderRequests()}
            {activeTab === 'profile' && renderProfile()}
            {activeTab === 'admin' && renderAdmin()}
            {activeTab === 'inbox' && renderInbox()}
          </div>
        </section>

        {/* AI MENTOR FAB */}
        <button 
           onClick={() => setShowAIMentor(!showAIMentor)}
           className={`fixed bottom-6 right-6 md:bottom-8 md:right-8 w-12 h-12 md:w-14 md:h-14 bg-black text-white flex items-center justify-center text-xl rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all z-[110] border-4 border-white ${showAIMentor ? 'rotate-[135deg] bg-rose-600' : ''}`}
        >
           <i className={`fa-solid ${showAIMentor ? 'fa-plus' : 'fa-sparkles'} text-sm md:text-lg`}></i>
        </button>

        {showAIMentor && (
          <div className="fixed bottom-20 right-4 left-4 md:left-auto md:bottom-28 md:right-8 md:w-[400px] h-[500px] md:h-[600px] bg-white border border-gray-100 shadow-2xl rounded-2xl flex flex-col z-[100] animate-in slide-in-from-bottom-8 duration-300 overflow-hidden">
             <div className="p-4 md:p-5 bg-black flex items-center justify-between text-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-sm"><i className="fa-solid fa-microchip"></i></div>
                  <h4 className="text-[11px] md:text-[13px] font-extrabold uppercase tracking-widest italic">AI Mentor</h4>
                </div>
                <button onClick={() => setShowAIMentor(false)} className="text-white/40 hover:text-white transition-colors p-2 -mr-2"><i className="fa-solid fa-xmark text-lg"></i></button>
             </div>
             <div className="flex-grow p-4 md:p-6 space-y-4 overflow-y-auto custom-scrollbar bg-white">
                <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl text-[12px] md:text-[13px] text-gray-600 italic leading-relaxed">
                  Assalomu alaykum! Men sizning startup bo'yicha maslahatchi AI mentorigizman. Savollaringizni bering!
                </div>
                {aiChat.map(m => (
                   <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] p-3 md:p-4 text-[12px] md:text-[13px] font-medium leading-relaxed rounded-2xl shadow-sm ${m.sender === 'user' ? 'bg-black text-white' : 'bg-gray-100 text-gray-900 border border-gray-200 italic'}`}>
                        {m.text}
                      </div>
                   </div>
                ))}
                {aiLoading && <div className="text-[10px] md:text-[11px] font-black text-gray-300 animate-pulse italic uppercase tracking-widest pl-2">Mentor o'ylamoqda...</div>}
                <div ref={chatEndRef} />
             </div>
             <div className="p-4 border-t border-gray-100 bg-white flex gap-2 shrink-0">
                <input 
                  type="text" value={aiInput} onChange={e => setAiInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendAIMessage()}
                  placeholder="Savolingizni yozing..."
                  className="flex-grow bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[14px] md:text-[13px] outline-none focus:border-black transition-all"
                />
                <button onClick={handleSendAIMessage} disabled={aiLoading} className="w-10 h-10 md:w-12 md:h-12 bg-black text-white flex items-center justify-center rounded-xl hover:scale-105 active:scale-95 transition-all shrink-0 disabled:opacity-50"><i className="fa-solid fa-paper-plane text-xs"></i></button>
             </div>
          </div>
        )}
      </main>

      {/* AUTH MODAL */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={() => setShowAuthModal(false)} />
          <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 md:p-10 animate-in slide-in-from-bottom-12 duration-500 overflow-y-auto max-h-[95vh] custom-scrollbar">
            <div className="text-center space-y-4 md:space-y-6 mb-8">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-black text-white flex items-center justify-center text-3xl md:text-4xl font-black mx-auto rounded-2xl shadow-xl">G</div>
              <div>
                <h3 className="text-2xl md:text-3xl font-extrabold italic tracking-tighter text-gray-900 uppercase">{authMode === 'login' ? 'Kirish' : 'Ro\'yxat'}</h3>
                <p className="text-gray-400 text-[12px] md:text-[13px] mt-2 px-2">Startup ekotizimiga hush kelibsiz.</p>
              </div>
            </div>
            
            <form onSubmit={handleAuth} className="space-y-4">
              {authMode === 'register' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <Input required name="name" label="To'liq ism" icon="fa-signature" placeholder="Ism Sharif" />
                  <Input name="phone" label="Telefon" icon="fa-phone" placeholder="+998" />
                  <FileUpload label="Profil rasmi" onChange={handleFileChange} preview={tempFileBase64 || undefined} />
                </div>
              )}
              <div className="space-y-4">
                <Input required name="email" type="email" label="Email" icon="fa-at" placeholder="example@mail.com" />
                <Input required name="password" type="password" label="Parol" icon="fa-lock" placeholder="••••••••" />
              </div>
              <Button type="submit" className="w-full h-12 md:h-12 mt-4 font-bold uppercase tracking-widest italic shadow-lg">Davom etish</Button>
            </form>
            
            <div className="text-center space-y-4 pt-6 border-t border-gray-50 mt-8">
              <button 
                type="button"
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} 
                className="text-[10px] md:text-[11px] font-bold text-gray-400 uppercase tracking-widest hover:text-black transition-colors italic w-full text-center"
              >
                {authMode === 'login' ? "Hisobingiz yo'qmi? Ro'yxatdan o'tish" : "Hisobingiz bormi? Kirishga o'tish"}
              </button>
              <button 
                type="button"
                onClick={() => setShowAuthModal(false)} 
                className="block mx-auto text-[10px] font-bold text-rose-300 uppercase tracking-widest hover:text-rose-600 transition-colors italic p-2"
              >
                Bekor qilish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      <Modal isOpen={isEditProfileModalOpen} onClose={() => { setIsEditProfileModalOpen(false); setEditedUser({}); setTempFileBase64(null); }} title="Profilni tahrirlash">
        <div className="space-y-6 md:space-y-8">
          <FileUpload label="Profil rasmi" onChange={handleFileChange} preview={editedUser.avatar || currentUser?.avatar} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <Input label="Ism" value={editedUser.name || currentUser?.name || ''} onChange={(e) => setEditedUser(prev => ({ ...prev, name: e.target.value }))} icon="fa-signature" />
            <Input label="Telefon" value={editedUser.phone || currentUser?.phone || ''} onChange={(e) => setEditedUser(prev => ({ ...prev, phone: e.target.value }))} icon="fa-phone" />
          </div>
          <TextArea label="Qisqacha bio" value={editedUser.bio || currentUser?.bio || ''} onChange={(e) => setEditedUser(prev => ({ ...prev, bio: e.target.value }))} placeholder="Sizning startup tajribangiz..." />
          <Input label="Ko'nikmalar" value={editedUser.skills?.join(', ') || currentUser?.skills?.join(', ') || ''} onChange={(e) => setEditedUser(prev => ({ ...prev, skills: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }))} helper="Vergul bilan ajrating" icon="fa-bolt" placeholder="React, Node.js, UI/UX" />
          <Input label="Portfolio" value={editedUser.portfolio_url || currentUser?.portfolio_url || ''} onChange={(e) => setEditedUser(prev => ({ ...prev, portfolio_url: e.target.value }))} placeholder="https://..." icon="fa-link" />
          
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 pt-4">
             <Button variant="secondary" className="w-full h-12 md:h-10" onClick={() => { setIsEditProfileModalOpen(false); setEditedUser({}); setTempFileBase64(null); }}>Bekor qilish</Button>
             <Button className="w-full h-12 md:h-10" onClick={handleUpdateProfile}>Saqlash</Button>
          </div>
        </div>
      </Modal>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 10px; }
        
        .fade-in { animation: fadeIn 200ms ease-out; }
        .slide-up { animation: slideUp 300ms ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { 
          from { transform: translateY(10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        input, select, textarea { border-radius: 8px; font-size: 14px; }
        @media (max-width: 640px) {
          input, select, textarea { font-size: 16px; }
        }
        
        .animate-in {
          animation-duration: 300ms;
          animation-fill-mode: both;
        }
        
        .slide-in-from-bottom-8 {
          animation: slideInFromBottom 300ms ease-out;
        }
        
        .slide-in-from-bottom-12 {
          animation: slideInFromBottom12 500ms ease-out;
        }
        
        @keyframes slideInFromBottom {
          from {
            transform: translateY(2rem);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes slideInFromBottom12 {
          from {
            transform: translateY(3rem);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
