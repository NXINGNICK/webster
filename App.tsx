import React, { useState, useEffect, ChangeEvent, FormEvent, useRef } from 'react';

// --- Type Definitions ---

interface User {
  id: string;
  email: string;
  password?: string; // Only stored temporarily during registration/login, not persisted in this simulation
  username: string;
  profilePic: string | null;
  isVerified: boolean;
  isAdmin?: boolean; // Flag if linked to an admin account
  badges: string[]; // Array of badge IDs
}

type AdminPermission = 'manageContent' | 'manageStyles' | 'manageBlogs' | 'manageUsers' | 'manageAdmins' | 'manageSettings' | 'manageShop' | 'manageBadges' | 'moderateComments';

interface Admin {
  id: string;
  email: string;
  password?: string; // As above
  permissions: AdminPermission[];
  requiresPasswordChange: boolean;
}

interface BlogPost {
  id: string;
  title: string;
  content: string;
  authorId: string; // User ID
  createdAt: Date;
  comments: Comment[];
}

interface Comment {
  id: string;
  postId: string;
  authorId: string; // User ID or 'admin'
  content: string;
  createdAt: Date;
}

interface UserPost {
  id: string;
  authorId: string;
  content: string;
  imageUrl?: string; // Simulate uploaded image URL
  createdAt: Date;
}

interface Badge {
    id: string;
    name: string;
    emoji: string;
    description: string;
}

interface SiteSettings {
    primaryColor: string;
    secondaryColor: string;
    // Add more theme options as needed
}

interface SftpConfig {
    host: string;
    port: string;
    user: string;
    pass: string;
}

// --- Main Component ---

const MinecraftWebsite: React.FC = () => {
  // --- State Variables ---
  const [currentPage, setCurrentPage] = useState<string>('home');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentAdmin, setCurrentAdmin] = useState<Admin | null>(null);

  // Data Stores (Simulated Database)
  const [users, setUsers] = useState<User[]>([
     { id: 'user1', email: 'test@example.com', username: 'TestUser', profilePic: null, isVerified: true, badges: ['badge1'] },
     { id: 'adminlink', email: 'admin@mmpcs.net', username: 'AdminLinkedUser', profilePic: null, isVerified: true, isAdmin: true, badges: ['badge_admin', 'badge1'] },
  ]);
  const [admins, setAdmins] = useState<Admin[]>([
    { id: 'admin1', email: 'admin@mmpcs.net', password: 'adminpassword', permissions: ['manageContent', 'manageStyles', 'manageBlogs', 'manageUsers', 'manageAdmins', 'manageSettings', 'manageShop', 'manageBadges', 'moderateComments'], requiresPasswordChange: true }
  ]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([
    { id: 'blog1', title: 'Welcome to the Server!', content: 'This is the first blog post. Enjoy your stay!', authorId: 'adminlink', createdAt: new Date(), comments: [] },
    { id: 'blog2', title: 'New Update v1.1', content: 'We have updated the server with new features.', authorId: 'adminlink', createdAt: new Date(), comments: [
        { id: 'c1', postId: 'blog2', authorId: 'user1', content: 'Great update!', createdAt: new Date() },
        { id: 'c2', postId: 'blog2', authorId: 'admin', content: 'Glad you like it!', createdAt: new Date() }, // Admin comment
    ] },
  ]);
  const [userPosts, setUserPosts] = useState<UserPost[]>([
      { id: 'upost1', authorId: 'user1', content: 'Having fun mining!', createdAt: new Date() }
  ]);
  const [badges, setBadges] = useState<Badge[]>([
      { id: 'badge1', name: 'Early Bird', emoji: '🐦', description: 'Joined during the first week.' },
      { id: 'badge_admin', name: 'Server Admin', emoji: '👑', description: 'Official Server Administrator.' }
  ]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    primaryColor: 'blue-600',
    secondaryColor: 'green-500',
  });
   const [sftpConfig, setSftpConfig] = useState<SftpConfig>({ host: '', port: '22', user: '', pass: '' });
  const [serverStatusData, setServerStatusData] = useState<{ online: boolean; players: number }>({ online: true, players: 42 });
  const [showShop, setShowShop] = useState<boolean>(false); // Controlled by admin

  // UI/Form State
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [registerEmail, setRegisterEmail] = useState<string>('');
  const [registerPassword, setRegisterPassword] = useState<string>('');
  const [registerUsername, setRegisterUsername] = useState<string>('');
  const [adminLoginEmail, setAdminLoginEmail] = useState<string>('');
  const [adminLoginPassword, setAdminLoginPassword] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [newPostContent, setNewPostContent] = useState<string>('');
  const [newPostImage, setNewPostImage] = useState<File | null>(null);
  const [newComment, setNewComment] = useState<{ [key: string]: string }>({}); // postId -> comment text
  const [profileUsername, setProfileUsername] = useState<string>('');
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);

  // Admin Dashboard State
  const [adminSection, setAdminSection] = useState<string>('dashboard'); // e.g., 'dashboard', 'content', 'styles', 'blogs', 'users', 'admins', 'settings', 'shop', 'badges'
  const [newBlogTitle, setNewBlogTitle] = useState<string>('');
  const [newBlogContent, setNewBlogContent] = useState<string>('');
  const [editingContent, setEditingContent] = useState<string>('Some default editable content for the home page.'); // Example for direct content editing
  const [tempPrimaryColor, setTempPrimaryColor] = useState<string>(siteSettings.primaryColor);
  const [tempSecondaryColor, setTempSecondaryColor] = useState<string>(siteSettings.secondaryColor);
  const [newAdminEmail, setNewAdminEmail] = useState<string>('');
  const [newAdminPassword, setNewAdminPassword] = useState<string>('');
  const [newAdminPermissions, setNewAdminPermissions] = useState<AdminPermission[]>([]);
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);
  const [newBadgeName, setNewBadgeName] = useState<string>('');
  const [newBadgeEmoji, setNewBadgeEmoji] = useState<string>('');
  const [newBadgeDesc, setNewBadgeDesc] = useState<string>('');
  const [editingBadgeId, setEditingBadgeId] = useState<string | null>(null);
  const [tempSftpConfig, setTempSftpConfig] = useState<SftpConfig>(sftpConfig);
  const [newAdminPasswordConfirm, setNewAdminPasswordConfirm] = useState<string>(''); // For password change


  const fileInputRef = useRef<HTMLInputElement>(null);
  const profilePicInputRef = useRef<HTMLInputElement>(null);

  // --- Effects ---

  // Handle initial routing based on hash
  useEffect(() => {
    const hash = window.location.hash;
    if (hash === '#adminlogin') {
      setCurrentPage('adminLogin');
    } else {
      // Clear hash if not admin login
      if (hash) {
         window.location.hash = '';
      }
      setCurrentPage('home'); // Default page
    }
    // Simulate fetching server status
    const interval = setInterval(() => {
        setServerStatusData(prev => ({
            online: Math.random() > 0.1, // 90% chance online
            players: prev.online ? Math.floor(Math.random() * 100) : 0
        }));
    }, 15000); // Update every 15 seconds
    return () => clearInterval(interval);
  }, []);

  // Clear messages on page change
  useEffect(() => {
    setErrorMessage('');
    setSuccessMessage('');
  }, [currentPage, adminSection]);

  // Update profile form when currentUser changes
  useEffect(() => {
    if (currentUser) {
      setProfileUsername(currentUser.username);
    }
  }, [currentUser]);

  // --- Helper Functions ---

  const generateId = (): string => `id_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const getUserById = (id: string): User | undefined => users.find(u => u.id === id);
  const getAdminById = (id: string): Admin | undefined => admins.find(a => a.id === id);
  const getBadgeById = (id: string): Badge | undefined => badges.find(b => b.id === id);

  const displayMessage = (msg: string, type: 'error' | 'success') => {
    if (type === 'error') {
      setErrorMessage(msg);
      setSuccessMessage('');
    } else {
      setSuccessMessage(msg);
      setErrorMessage('');
    }
    setTimeout(() => {
      setErrorMessage('');
      setSuccessMessage('');
    }, 5000);
  };

  const hasPermission = (permission: AdminPermission): boolean => {
      return !!currentAdmin && currentAdmin.permissions.includes(permission);
  }

  // --- Event Handlers ---

  const handleNavigate = (page: string) => {
    // Prevent navigating away from admin login via UI elements
    if (currentPage === 'adminLogin' && page !== 'adminLogin') return;
    setCurrentPage(page);
    window.location.hash = ''; // Clear hash on normal navigation
  };

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.email === loginEmail);
    // In a real app, you'd compare a hashed password
    if (user && user.password === loginPassword) { // Simulate password check
        if (!user.isVerified) {
             displayMessage('Please verify your email before logging in.', 'error');
             return;
        }
        setIsLoggedIn(true);
        setCurrentUser(user);
        setIsAdminLoggedIn(false); // Ensure admin is logged out
        setCurrentAdmin(null);
        displayMessage('Login successful!', 'success');
        handleNavigate('home');
        setLoginEmail('');
        setLoginPassword('');
    } else {
      displayMessage('Invalid email or password.', 'error');
    }
  };

   const handleRegister = (e: FormEvent) => {
        e.preventDefault();
        if (users.some(u => u.email === registerEmail)) {
            displayMessage('Email already exists.', 'error');
            return;
        }
        if (users.some(u => u.username === registerUsername)) {
            displayMessage('Username already taken.', 'error');
            return;
        }
        const newUser: User = {
            id: generateId(),
            email: registerEmail,
            password: registerPassword, // Store temporarily for login simulation
            username: registerUsername,
            profilePic: null,
            isVerified: false, // Requires verification
            badges: [],
        };
        setUsers([...users, newUser]);
        displayMessage('Registration successful! Please "verify" your email (click button below).', 'success');
        setRegisterEmail('');
        setRegisterPassword('');
        setRegisterUsername('');
        // In a real app, send verification email here. We'll simulate with a button.
        handleNavigate('login'); // Go to login page after registration
    };

    // Simulate email verification
    const handleVerifyEmail = (email: string) => {
        setUsers(prevUsers => prevUsers.map(u => u.email === email ? { ...u, isVerified: true, password: undefined /* Clear simulated password */ } : u));
        // Update current user if they just verified
        if (currentUser?.email === email) {
            setCurrentUser(prev => prev ? { ...prev, isVerified: true } : null);
        }
        displayMessage(`Email ${email} verified successfully! You can now log in.`, 'success');
    };


  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    handleNavigate('home');
  };

  const handleAdminLogin = (e: FormEvent) => {
    e.preventDefault();
    const admin = admins.find(a => a.email === adminLoginEmail);
    // Simulate password check
    if (admin && admin.password === adminLoginPassword) {
        setIsAdminLoggedIn(true);
        setCurrentAdmin(admin);
        setIsLoggedIn(false); // Ensure user is logged out
        setCurrentUser(null);
        displayMessage('Admin login successful!', 'success');
        setAdminLoginEmail('');
        setAdminLoginPassword('');
        if (admin.requiresPasswordChange) {
            setAdminSection('admins'); // Force admin to change password
            displayMessage('Security requirement: Please change your password or create a new admin account.', 'error');
        } else {
            setAdminSection('dashboard'); // Go to dashboard
        }
        setCurrentPage('adminDashboard'); // Navigate to admin dashboard page
    } else {
      displayMessage('Invalid admin email or password.', 'error');
    }
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    setCurrentAdmin(null);
    handleNavigate('home'); // Redirect to home page after admin logout
  };

  const handleCreateUserPost = (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newPostContent.trim()) return;

    const newPost: UserPost = {
        id: generateId(),
        authorId: currentUser.id,
        content: newPostContent,
        // In a real app, upload image and get URL
        imageUrl: newPostImage ? URL.createObjectURL(newPostImage) : undefined,
        createdAt: new Date(),
    };
    setUserPosts([newPost, ...userPosts]); // Add to top
    setNewPostContent('');
    setNewPostImage(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset file input
    }
    displayMessage('Post created!', 'success');
  };

   const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setNewPostImage(e.target.files[0]);
        }
    };

    const handleProfilePicChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setProfilePicFile(e.target.files[0]);
        }
    };

   const handleUpdateProfile = (e: FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;

        // Check if username is changing and if it's already taken
        if (profileUsername !== currentUser.username && users.some(u => u.username === profileUsername && u.id !== currentUser.id)) {
             displayMessage('Username already taken.', 'error');
             return;
        }

        let picUrl = currentUser.profilePic;
        if (profilePicFile) {
            // Simulate upload and get URL
            picUrl = URL.createObjectURL(profilePicFile);
        }

        const updatedUser: User = {
            ...currentUser,
            username: profileUsername,
            profilePic: picUrl,
        };

        setCurrentUser(updatedUser);
        setUsers(prevUsers => prevUsers.map(u => u.id === currentUser.id ? updatedUser : u));
        setProfilePicFile(null); // Reset file input state
        if (profilePicInputRef.current) {
            profilePicInputRef.current.value = '';
        }
        displayMessage('Profile updated successfully!', 'success');
    };

    const handleAddComment = (postId: string) => {
        if (!currentUser && !currentAdmin) {
            displayMessage('You must be logged in to comment.', 'error');
            return;
        }
        const commentContent = newComment[postId]?.trim();
        if (!commentContent) return;

        const authorIdentifier = currentAdmin ? 'admin' : (currentUser ? currentUser.id : 'unknown');
        // Check blog comment permission if admin is commenting
        if (currentAdmin && !hasPermission('moderateComments')) {
             displayMessage('You do not have permission to comment on blogs.', 'error');
             return;
        }

        const comment: Comment = {
            id: generateId(),
            postId: postId,
            authorId: authorIdentifier,
            content: commentContent,
            createdAt: new Date(),
        };

        setBlogPosts(prevPosts => prevPosts.map(post =>
            post.id === postId
                ? { ...post, comments: [...post.comments, comment] }
                : post
        ));
        setNewComment(prev => ({ ...prev, [postId]: '' })); // Clear input for this post
        displayMessage('Comment added.', 'success');
    };


  // --- Admin Handlers ---

  const handleAdminCreateBlog = (e: FormEvent) => {
       e.preventDefault();
       if (!hasPermission('manageBlogs')) return displayMessage('Permission denied.', 'error');
       if (!newBlogTitle.trim() || !newBlogContent.trim()) return displayMessage('Title and content are required.', 'error');

       const newPost: BlogPost = {
           id: generateId(),
           title: newBlogTitle,
           content: newBlogContent,
           authorId: currentUser?.id ?? 'adminlink', // Link to admin-linked user or default
           createdAt: new Date(),
           comments: [],
       };
       setBlogPosts([newPost, ...blogPosts]);
       setNewBlogTitle('');
       setNewBlogContent('');
       setAdminSection('blogs'); // Go back to blog list
       displayMessage('Blog post created.', 'success');
   };

  const handleAdminDeleteBlog = (id: string) => {
       if (!hasPermission('manageBlogs')) return displayMessage('Permission denied.', 'error');
       if (window.confirm('Are you sure you want to delete this blog post?')) {
           setBlogPosts(prev => prev.filter(post => post.id !== id));
           displayMessage('Blog post deleted.', 'success');
       }
   };

   const handleAdminSaveChanges = () => {
       if (adminSection === 'content' && hasPermission('manageContent')) {
           // In a real app, save 'editingContent' somewhere specific
           console.log("Simulating saving content:", editingContent);
           displayMessage('Content changes saved (simulated).', 'success');
       }
       if (adminSection === 'styles' && hasPermission('manageStyles')) {
           setSiteSettings({ primaryColor: tempPrimaryColor, secondaryColor: tempSecondaryColor });
           displayMessage('Styles updated.', 'success');
       }
       if (adminSection === 'settings' && hasPermission('manageSettings')) {
           setSftpConfig(tempSftpConfig);
           // In a real app, validate and maybe test the connection
           displayMessage('SFTP settings saved.', 'success');
       }
   };

   const handleAdminToggleShop = () => {
        if (!hasPermission('manageShop')) return displayMessage('Permission denied.', 'error');
        setShowShop(prev => !prev);
        displayMessage(`Shop page ${!showShop ? 'enabled' : 'disabled'}.`, 'success');
    }

   const handleAdminCreateAdmin = (e: FormEvent) => {
        e.preventDefault();
        if (!hasPermission('manageAdmins')) return displayMessage('Permission denied.', 'error');
        if (!newAdminEmail || !newAdminPassword) return displayMessage('Email and password are required.', 'error');
        if (admins.some(a => a.email === newAdminEmail)) return displayMessage('Admin email already exists.', 'error');

        const newAdmin: Admin = {
            id: generateId(),
            email: newAdminEmail,
            password: newAdminPassword, // Simulate storing password
            permissions: newAdminPermissions,
            requiresPasswordChange: false, // New admins don't require immediate change
        };
        setAdmins([...admins, newAdmin]);

        // Link to existing user account if email matches
        setUsers(prevUsers => prevUsers.map(u => u.email === newAdminEmail ? { ...u, isAdmin: true, badges: [...new Set([...u.badges, 'badge_admin'])] } : u));

        setNewAdminEmail('');
        setNewAdminPassword('');
        setNewAdminPermissions([]);
        displayMessage('New admin account created.', 'success');

        // If the current admin was the default and just created a new one, clear the password change requirement
        if (currentAdmin?.email === 'admin@mmpcs.net' && currentAdmin.requiresPasswordChange) {
             setAdmins(prevAdmins => prevAdmins.map(a => a.id === currentAdmin.id ? { ...a, requiresPasswordChange: false, password: undefined /* Clear default password */ } : a));
             setCurrentAdmin(prev => prev ? { ...prev, requiresPasswordChange: false } : null);
        }
    };

   const handleAdminEditAdmin = (admin: Admin) => {
        setEditingAdminId(admin.id);
        setNewAdminEmail(admin.email);
        setNewAdminPermissions([...admin.permissions]);
        // Do not preload password for editing
        setNewAdminPassword('');
        setNewAdminPasswordConfirm(''); // Clear confirm field too
        setAdminSection('admins_edit'); // Go to a dedicated edit view
   };

   const handleAdminUpdateAdmin = (e: FormEvent) => {
        e.preventDefault();
        if (!editingAdminId || !hasPermission('manageAdmins')) return displayMessage('Permission denied.', 'error');
        const adminToUpdate = admins.find(a => a.id === editingAdminId);
        if (!adminToUpdate) return displayMessage('Admin not found.', 'error');

        // Prevent changing the email of the default admin for safety in this simulation
        if (adminToUpdate.email === 'admin@mmpcs.net' && newAdminEmail !== 'admin@mmpcs.net') {
            return displayMessage('Cannot change the email of the default admin account.', 'error');
        }
        // Check if new email is already taken by another admin
        if (newAdminEmail !== adminToUpdate.email && admins.some(a => a.email === newAdminEmail && a.id !== editingAdminId)) {
             return displayMessage('Admin email already exists.', 'error');
        }

        let updatedPassword = adminToUpdate.password; // Keep old if not changed
        let requiresPwdChange = adminToUpdate.requiresPasswordChange;

        if (newAdminPassword) {
            if (newAdminPassword !== newAdminPasswordConfirm) {
                return displayMessage('New passwords do not match.', 'error');
            }
            updatedPassword = newAdminPassword; // Update simulated password
            // If the admin being edited is the current logged-in admin changing their own password
            if (currentAdmin?.id === editingAdminId && adminToUpdate.requiresPasswordChange) {
                requiresPwdChange = false; // Clear the flag after successful change
            }
        }

        const updatedAdmin: Admin = {
            ...adminToUpdate,
            email: newAdminEmail,
            password: updatedPassword,
            permissions: newAdminPermissions,
            requiresPasswordChange: requiresPwdChange,
        };

        setAdmins(prevAdmins => prevAdmins.map(a => a.id === editingAdminId ? updatedAdmin : a));

        // Update admin link status on associated user accounts
        setUsers(prevUsers => prevUsers.map(u => {
            if (u.email === adminToUpdate.email && u.email !== newAdminEmail) { // Email changed, remove admin status
                return { ...u, isAdmin: false, badges: u.badges.filter(bId => bId !== 'badge_admin') };
            }
            if (u.email === newAdminEmail) { // New email matches a user, add admin status
                 return { ...u, isAdmin: true, badges: [...new Set([...u.badges, 'badge_admin'])] };
            }
            return u;
        }));

        // If the current admin updated their own info
        if (currentAdmin?.id === editingAdminId) {
            setCurrentAdmin(updatedAdmin);
        }

        displayMessage('Admin account updated.', 'success');
        setEditingAdminId(null);
        setNewAdminEmail('');
        setNewAdminPassword('');
        setNewAdminPasswordConfirm('');
        setNewAdminPermissions([]);
        setAdminSection('admins'); // Go back to list
   };


   const handleAdminDeleteAdmin = (id: string) => {
       if (!hasPermission('manageAdmins')) return displayMessage('Permission denied.', 'error');
       const adminToDelete = admins.find(a => a.id === id);
       if (!adminToDelete) return;
       // Prevent deleting the last admin or the default admin in this simulation
       if (admins.length <= 1) {
            return displayMessage('Cannot delete the last admin account.', 'error');
       }
       if (adminToDelete.email === 'admin@mmpcs.net') {
            return displayMessage('Cannot delete the default admin account.', 'error');
       }
       if (window.confirm(`Are you sure you want to delete admin ${adminToDelete.email}?`)) {
           setAdmins(prev => prev.filter(admin => admin.id !== id));
           // Remove admin status from linked user
            setUsers(prevUsers => prevUsers.map(u => u.email === adminToDelete.email ? { ...u, isAdmin: false, badges: u.badges.filter(bId => bId !== 'badge_admin') } : u));
           displayMessage('Admin account deleted.', 'success');
       }
   };

   const handlePermissionChange = (permission: AdminPermission, checked: boolean) => {
       setNewAdminPermissions(prev =>
           checked
               ? [...prev, permission]
               : prev.filter(p => p !== permission)
       );
   };

    const handleAdminCreateBadge = (e: FormEvent) => {
        e.preventDefault();
        if (!hasPermission('manageBadges')) return displayMessage('Permission denied.', 'error');
        if (!newBadgeName.trim() || !newBadgeEmoji) return displayMessage('Badge name and emoji are required.', 'error');

        const newBadge: Badge = {
            id: generateId(),
            name: newBadgeName,
            emoji: newBadgeEmoji,
            description: newBadgeDesc,
        };
        setBadges([...badges, newBadge]);
        setNewBadgeName('');
        setNewBadgeEmoji('');
        setNewBadgeDesc('');
        displayMessage('Badge created.', 'success');
    };

    const handleAdminEditBadge = (badge: Badge) => {
        setEditingBadgeId(badge.id);
        setNewBadgeName(badge.name);
        setNewBadgeEmoji(badge.emoji);
        setNewBadgeDesc(badge.description);
        setAdminSection('badges_edit');
    };

    const handleAdminUpdateBadge = (e: FormEvent) => {
        e.preventDefault();
        if (!editingBadgeId || !hasPermission('manageBadges')) return displayMessage('Permission denied.', 'error');
        if (!newBadgeName.trim() || !newBadgeEmoji) return displayMessage('Badge name and emoji are required.', 'error');

        const updatedBadge: Badge = {
            id: editingBadgeId,
            name: newBadgeName,
            emoji: newBadgeEmoji,
            description: newBadgeDesc,
        };

        setBadges(prev => prev.map(b => b.id === editingBadgeId ? updatedBadge : b));
        displayMessage('Badge updated.', 'success');
        setEditingBadgeId(null);
        setNewBadgeName('');
        setNewBadgeEmoji('');
        setNewBadgeDesc('');
        setAdminSection('badges');
    };

    const handleAdminDeleteBadge = (id: string) => {
        if (!hasPermission('manageBadges')) return displayMessage('Permission denied.', 'error');
         if (id === 'badge_admin') return displayMessage('Cannot delete the default Admin badge.', 'error'); // Protect default admin badge
        if (window.confirm('Are you sure you want to delete this badge? This will remove it from all users.')) {
            setBadges(prev => prev.filter(b => b.id !== id));
            // Remove badge from all users
            setUsers(prevUsers => prevUsers.map(u => ({
                ...u,
                badges: u.badges.filter(bId => bId !== id)
            })));
            displayMessage('Badge deleted.', 'success');
            // If currently editing this badge, go back
            if (editingBadgeId === id) {
                setEditingBadgeId(null);
                setNewBadgeName('');
                setNewBadgeEmoji('');
                setNewBadgeDesc('');
                setAdminSection('badges');
            }
        }
    };

     const handleAdminAssignBadge = (userId: string, badgeId: string) => {
        if (!hasPermission('manageUsers')) return displayMessage('Permission denied.', 'error');
         setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, badges: [...new Set([...u.badges, badgeId])] } : u));
         displayMessage('Badge assigned.', 'success');
     }

     const handleAdminRemoveBadge = (userId: string, badgeId: string) => {
         if (!hasPermission('manageUsers')) return displayMessage('Permission denied.', 'error');
         if (badgeId === 'badge_admin' && users.find(u=>u.id === userId)?.isAdmin) return displayMessage('Remove admin status via Admin Management to remove this badge.', 'error');
          setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, badges: u.badges.filter(b => b !== badgeId) } : u));
         displayMessage('Badge removed.', 'success');
     }


  // --- Render Functions ---

  const renderNavbar = () => (
    <nav className={`bg-${siteSettings.primaryColor} p-4 text-white flex justify-between items-center shadow-md`}>
      <div className="flex items-center space-x-4">
        <button onClick={() => handleNavigate('home')} className="text-xl font-bold hover:text-gray-200">Minecraft Server</button>
        <button onClick={() => handleNavigate('blog')} className="hover:text-gray-200">Blog</button>
        <button onClick={() => handleNavigate('serverStatus')} className="hover:text-gray-200">Server Status</button>
         {isLoggedIn && (
             <button onClick={() => handleNavigate('userPosts')} className="hover:text-gray-200">Community</button>
         )}
      </div>
      <div className="flex items-center space-x-4">
        {isLoggedIn && currentUser ? (
          <>
            <button onClick={() => handleNavigate('profile')} className="flex items-center space-x-2 hover:text-gray-200">
                {currentUser.profilePic ? (
                     <img src={currentUser.profilePic} alt={currentUser.username} className="w-8 h-8 rounded-full object-cover border-2 border-white"/>
                ) : (
                    <div className="bg-gray-400 border-2 border-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold">
                        {currentUser.username.charAt(0).toUpperCase()}
                    </div>
                )}
              <span>{currentUser.username}</span>
               {currentUser.isAdmin && <span title="Linked Admin Account" className="text-yellow-300 text-xs">(Admin)</span>}
            </button>
            <button onClick={handleLogout} className={`bg-${siteSettings.secondaryColor} hover:bg-opacity-80 text-white px-3 py-1 rounded`}>Logout</button>
          </>
        ) : isAdminLoggedIn ? (
            <span className="text-yellow-300 font-semibold">Admin Mode</span>
            // No user login button when admin is logged in
        ) : (
          <>
            <button onClick={() => handleNavigate('login')} className="hover:text-gray-200">Login</button>
            <button onClick={() => handleNavigate('register')} className={`bg-${siteSettings.secondaryColor} hover:bg-opacity-80 text-white px-3 py-1 rounded`}>Register</button>
          </>
        )}
      </div>
    </nav>
  );

  const renderFooter = () => (
    <footer className="bg-gray-800 text-gray-400 p-4 mt-12 text-center text-sm">
      © {new Date().getFullYear()} Minecraft Server. All rights reserved.
      {/* Admin login link is not rendered, must be typed manually */}
    </footer>
  );

    const renderMessages = () => (
        <>
            {errorMessage && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                    {errorMessage}
                </div>
            )}
            {successMessage && (
                <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                    {successMessage}
                </div>
            )}
        </>
    );

  const renderHomePage = () => (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold">Welcome to Our Minecraft Server!</h1>
       {/* Example of using admin-editable content */}
      <p className="text-lg text-gray-700">{editingContent}</p>
      <div className="grid md:grid-cols-2 gap-6">
        <div className={`bg-white p-6 rounded-lg shadow-md border-l-4 border-${siteSettings.primaryColor}`}>
            <h2 className="text-2xl font-semibold mb-3">Join Us!</h2>
            <p className="mb-4">Server IP: <span className="font-mono bg-gray-200 px-2 py-1 rounded">play.yourserver.com</span></p>
            <p>Connect with Minecraft Java Edition version X.Y.Z.</p>
        </div>
         <div className={`bg-white p-6 rounded-lg shadow-md border-l-4 border-${siteSettings.secondaryColor}`}>
             <h2 className="text-2xl font-semibold mb-3">Latest News</h2>
             {blogPosts.length > 0 ? (
                <div className="space-y-2">
                    <p className="font-medium">{blogPosts[0].title}</p>
                    <p className="text-sm text-gray-600 truncate">{blogPosts[0].content}</p>
                    <button onClick={() => handleNavigate('blog')} className={`text-${siteSettings.primaryColor} hover:underline text-sm`}>Read More</button>
                </div>
             ) : (
                <p>No news yet.</p>
             )}
         </div>
      </div>
       {/* Placeholder for more content */}
       <div className="bg-gray-100 p-6 rounded-lg shadow-inner">
            <h3 className="text-xl font-semibold mb-2">Community Spotlight</h3>
            {userPosts.length > 0 ? (
                 <div className="flex items-center space-x-3">
                     {getUserById(userPosts[0].authorId)?.profilePic ? (
                         <img src={getUserById(userPosts[0].authorId)?.profilePic!} alt="" className="w-10 h-10 rounded-full object-cover"/>
                     ) : (
                          <div className="bg-gray-300 rounded-full w-10 h-10 flex items-center justify-center text-gray-600">?</div>
                     )}
                    <p>"{userPosts[0].content}" - <span className="font-medium">{getUserById(userPosts[0].authorId)?.username ?? 'Unknown User'}</span></p>
                 </div>
            ) : (
                <p>No community posts yet.</p>
            )}
       </div>
    </div>
  );

    const renderBlogPage = () => (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold border-b pb-2">Server Blog</h1>
            {blogPosts.length === 0 ? <p>No blog posts yet.</p> : null}
            {blogPosts.map(post => {
                const author = getUserById(post.authorId);
                return (
                    <article key={post.id} className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-2xl font-semibold mb-2">{post.title}</h2>
                        <p className="text-sm text-gray-500 mb-3">
                            By {author?.username ?? 'Admin'} on {post.createdAt.toLocaleDateString()}
                        </p>
                        <p className="text-gray-700 mb-6 whitespace-pre-wrap">{post.content}</p>

                        <h3 className="text-lg font-semibold mb-3 border-t pt-4">Comments ({post.comments.length})</h3>
                         <div className="space-y-4 mb-6 max-h-96 overflow-y-auto pr-2">
                            {post.comments.map(comment => {
                                const commentAuthor = comment.authorId === 'admin' ? { username: 'Admin', isAdmin: true, profilePic: null } : getUserById(comment.authorId);
                                const isAdminComment = comment.authorId === 'admin' || admins.some(a => a.email === commentAuthor?.email && hasPermission('moderateComments'));
                                return (
                                    <div key={comment.id} className={`flex space-x-3 ${isAdminComment ? 'bg-blue-50 p-3 rounded-md' : ''}`}>
                                          {commentAuthor?.profilePic ? (
                                              <img src={commentAuthor.profilePic} alt={commentAuthor.username} className="w-10 h-10 rounded-full object-cover mt-1"/>
                                          ) : (
                                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold mt-1 ${isAdminComment ? 'bg-blue-500' : `bg-${siteSettings.primaryColor}`}`}>
                                                  {isAdminComment ? 'A' : commentAuthor?.username?.charAt(0).toUpperCase() ?? '?'}
                                              </div>
                                          )}
                                        <div>
                                             <p className="font-semibold">
                                                  {isAdminComment ? 'Admin' : commentAuthor?.username ?? 'Unknown User'}
                                                  {commentAuthor?.isAdmin && !isAdminComment && <span title="Linked Admin Account" className="text-blue-600 text-xs ml-1">(Admin Link)</span>}
                                                  {commentAuthor?.badges?.map(badgeId => {
                                                      const badge = getBadgeById(badgeId);
                                                      return badge ? <span key={badgeId} title={badge.description} className="ml-1 text-xs">{badge.emoji}</span> : null;
                                                  })}
                                             </p>
                                            <p className="text-sm text-gray-700">{comment.content}</p>
                                            <p className="text-xs text-gray-500 mt-1">{comment.createdAt.toLocaleString()}</p>
                                        </div>
                                    </div>
                                );
                            })}
                            {post.comments.length === 0 && <p className="text-sm text-gray-500">No comments yet.</p>}
                        </div>

                        {(isLoggedIn || (isAdminLoggedIn && hasPermission('moderateComments'))) && (
                            <form onSubmit={(e) => { e.preventDefault(); handleAddComment(post.id); }} className="mt-4 flex space-x-2">
                                <input
                                    type="text"
                                    placeholder="Add a comment..."
                                    value={newComment[post.id] || ''}
                                    onChange={(e) => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
                                    className="flex-grow border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                <button type="submit" className={`bg-${siteSettings.primaryColor} text-white px-4 py-2 rounded hover:bg-opacity-90`}>
                                    Post
                                </button>
                            </form>
                        )}
                         {!isLoggedIn && !isAdminLoggedIn && (
                              <p className="text-sm text-gray-600 mt-4">Please <button onClick={() => handleNavigate('login')} className="text-blue-600 hover:underline">login</button> to comment.</p>
                         )}
                    </article>
                );
            })}
        </div>
    );


  const renderLoginPage = () => (
    <div className="max-w-md mx-auto mt-10">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-lg shadow-md space-y-4">
        <h2 className="text-2xl font-bold text-center mb-6">User Login</h2>
        {renderMessages()}
         {/* Simulation verification buttons */}
         <div className="mb-4 space-y-2 text-sm bg-yellow-100 p-3 rounded border border-yellow-300">
            <p className="font-semibold">Simulation Only:</p>
            <p>If you registered but cannot log in, click verify:</p>
             {users.filter(u => !u.isVerified).map(u => (
                 <button key={u.id} onClick={() => handleVerifyEmail(u.email)} className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 mr-1">
                     Verify {u.email}
                 </button>
            ))}
            {users.every(u => u.isVerified) && <p className="text-xs text-gray-600">All users are verified.</p>}
         </div>
        <div>
          <label className="block text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-gray-700 mb-1">Password</label>
          <input
            type="password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <button type="submit" className={`w-full bg-${siteSettings.primaryColor} text-white py-2 rounded hover:bg-opacity-90`}>
          Login
        </button>
         <p className="text-center text-sm text-gray-600">
            Don't have an account? <button onClick={() => handleNavigate('register')} className="text-blue-600 hover:underline">Register here</button>
        </p>
      </form>
    </div>
  );

   const renderRegisterPage = () => (
    <div className="max-w-md mx-auto mt-10">
      <form onSubmit={handleRegister} className="bg-white p-8 rounded-lg shadow-md space-y-4">
        <h2 className="text-2xl font-bold text-center mb-6">Register</h2>
        {renderMessages()}
        <div>
          <label className="block text-gray-700 mb-1">Username</label>
          <input
            type="text"
            value={registerUsername}
            onChange={(e) => setRegisterUsername(e.target.value)}
            required
            minLength={3}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={registerEmail}
            onChange={(e) => setRegisterEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-gray-700 mb-1">Password</label>
          <input
            type="password"
            value={registerPassword}
            onChange={(e) => setRegisterPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <button type="submit" className={`w-full bg-${siteSettings.secondaryColor} text-white py-2 rounded hover:bg-opacity-90`}>
          Register
        </button>
         <p className="text-center text-sm text-gray-600">
            Already have an account? <button onClick={() => handleNavigate('login')} className="text-blue-600 hover:underline">Login here</button>
        </p>
      </form>
    </div>
  );

  const renderAdminLoginPage = () => (
     <div className="max-w-md mx-auto mt-20">
        <form onSubmit={handleAdminLogin} className="bg-gray-800 p-8 rounded-lg shadow-md space-y-4">
            <h2 className="text-2xl font-bold text-center mb-6 text-white">Admin Login</h2>
             {renderMessages()}
            <div>
            <label className="block text-gray-300 mb-1">Admin Email</label>
            <input
                type="email"
                value={adminLoginEmail}
                onChange={(e) => setAdminLoginEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded bg-gray-700 text-white border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            </div>
            <div>
            <label className="block text-gray-300 mb-1">Password</label>
            <input
                type="password"
                value={adminLoginPassword}
                onChange={(e) => setAdminLoginPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded bg-gray-700 text-white border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            </div>
            <button type="submit" className={`w-full bg-${siteSettings.primaryColor} text-white py-2 rounded hover:bg-opacity-90`}>
                Login
            </button>
             <p className="text-xs text-center text-gray-400 pt-4">Access restricted. Authorized personnel only.</p>
        </form>
    </div>
  );

    const renderProfilePage = () => {
        if (!currentUser) return <p>Please log in to view your profile.</p>;

        return (
            <div className="max-w-2xl mx-auto mt-10">
                <h1 className="text-3xl font-bold mb-6">Your Profile</h1>
                {renderMessages()}
                <form onSubmit={handleUpdateProfile} className="bg-white p-8 rounded-lg shadow-md space-y-6">
                     <div className="flex items-center space-x-4">
                         {/* Profile Picture Display and Upload */}
                         <div className="flex-shrink-0">
                             {currentUser.profilePic ? (
                                 <img src={currentUser.profilePic} alt={currentUser.username} className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"/>
                             ) : (
                                 <div className="bg-gray-400 border-4 border-gray-200 rounded-full w-24 h-24 flex items-center justify-center text-4xl font-semibold text-white">
                                     {currentUser.username.charAt(0).toUpperCase()}
                                 </div>
                             )}
                         </div>
                         <div className="flex-grow">
                              <label className="block text-gray-700 mb-1">Change Profile Picture</label>
                              <input
                                    type="file"
                                    accept="image/*"
                                    ref={profilePicInputRef}
                                    onChange={handleProfilePicChange}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                              />
                              {profilePicFile && <p className="text-xs text-gray-600 mt-1">Selected: {profilePicFile.name}</p>}
                         </div>
                     </div>

                    <div>
                        <label className="block text-gray-700 mb-1">Username</label>
                        <input
                            type="text"
                            value={profileUsername}
                            onChange={(e) => setProfileUsername(e.target.value)}
                            required
                            minLength={3}
                            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 mb-1">Email</label>
                        <input
                            type="email"
                            value={currentUser.email}
                            disabled // Don't allow email change from profile page in this example
                            className="w-full px-3 py-2 border rounded bg-gray-100 text-gray-500 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-500 mt-1">Email cannot be changed here.</p>
                    </div>

                    {/* Display Badges */}
                     <div>
                          <h3 className="text-lg font-semibold mb-2">Your Badges</h3>
                          {currentUser.badges.length > 0 ? (
                               <div className="flex flex-wrap gap-2">
                                   {currentUser.badges.map(badgeId => {
                                       const badge = getBadgeById(badgeId);
                                       return badge ? (
                                           <span key={badgeId} title={badge.description} className="bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-sm flex items-center space-x-1">
                                               <span>{badge.emoji}</span>
                                               <span>{badge.name}</span>
                                           </span>
                                       ) : null;
                                   })}
                               </div>
                          ) : (
                              <p className="text-sm text-gray-500">You haven't earned any badges yet.</p>
                          )}
                     </div>


                    <button type="submit" className={`w-full bg-${siteSettings.primaryColor} text-white py-2 rounded hover:bg-opacity-90`}>
                        Update Profile
                    </button>
                </form>
            </div>
        );
    };

    const renderUserPostsPage = () => {
        if (!isLoggedIn) return <p>Please log in to view and create community posts.</p>;

        return (
             <div className="max-w-2xl mx-auto mt-10 space-y-8">
                  <h1 className="text-3xl font-bold border-b pb-2">Community Posts</h1>
                 {/* Post Creation Form */}
                  <form onSubmit={handleCreateUserPost} className="bg-white p-6 rounded-lg shadow-md space-y-4">
                        <h2 className="text-xl font-semibold">Create a New Post</h2>
                        {renderMessages()}
                        <div>
                             <textarea
                                 placeholder={`What's on your mind, ${currentUser?.username}?`}
                                 value={newPostContent}
                                 onChange={(e) => setNewPostContent(e.target.value)}
                                 required
                                 rows={3}
                                 className="w-full p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                             />
                        </div>
                         <div>
                              <label className="block text-gray-700 mb-1 text-sm">Upload Image (Optional)</label>
                              <input
                                    type="file"
                                    accept="image/*"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                               />
                                {newPostImage && <p className="text-xs text-gray-600 mt-1">Selected: {newPostImage.name}</p>}
                         </div>
                         <button type="submit" className={`bg-${siteSettings.secondaryColor} text-white px-4 py-2 rounded hover:bg-opacity-90`}>
                              Post
                         </button>
                  </form>

                 {/* Display User Posts */}
                 <div className="space-y-6">
                    {userPosts.length === 0 && <p className="text-center text-gray-500">No community posts yet. Be the first!</p>}
                     {userPosts.map(post => {
                        const author = getUserById(post.authorId);
                        return (
                            <div key={post.id} className="bg-white p-4 rounded-lg shadow flex space-x-4">
                                <div className="flex-shrink-0">
                                     {author?.profilePic ? (
                                         <img src={author.profilePic} alt={author.username} className="w-12 h-12 rounded-full object-cover"/>
                                     ) : (
                                         <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold bg-${siteSettings.primaryColor}`}>
                                             {author?.username?.charAt(0).toUpperCase() ?? '?'}
                                         </div>
                                     )}
                                </div>
                                <div className="flex-grow">
                                    <p className="font-semibold">
                                         {author?.username ?? 'Unknown User'}
                                          {author?.isAdmin && <span title="Linked Admin Account" className="text-blue-600 text-xs ml-1">(Admin Link)</span>}
                                            {author?.badges?.map(badgeId => {
                                                const badge = getBadgeById(badgeId);
                                                return badge ? <span key={badgeId} title={badge.description} className="ml-1 text-xs">{badge.emoji}</span> : null;
                                            })}
                                    </p>
                                    <p className="text-sm text-gray-500 mb-2">{post.createdAt.toLocaleString()}</p>
                                    <p className="text-gray-800 mb-3">{post.content}</p>
                                    {post.imageUrl && (
                                        <img src={post.imageUrl} alt="User upload" className="max-h-60 w-auto rounded mt-2 mb-2 border"/>
                                    )}
                                    {/* Add comment/like placeholders if needed */}
                                </div>
                            </div>
                        );
                     })}
                 </div>
             </div>
        );
    };


  const renderServerStatusPage = () => (
    <div className="max-w-lg mx-auto mt-10 text-center">
        <h1 className="text-3xl font-bold mb-6">Server Status</h1>
         <div className={`p-8 rounded-lg shadow-md ${serverStatusData.online ? 'bg-green-100 border-green-500' : 'bg-red-100 border-red-500'} border-l-4`}>
             <p className="text-xl font-semibold mb-4">
                Status: <span className={`font-bold ${serverStatusData.online ? 'text-green-700' : 'text-red-700'}`}>
                    {serverStatusData.online ? 'Online' : 'Offline'}
                </span>
             </p>
             {serverStatusData.online && (
                <p className="text-lg text-gray-700">
                    Players Online: <span className="font-bold">{serverStatusData.players}</span>
                </p>
             )}
             {!serverStatusData.online && (
                 <p className="text-gray-600">The server is currently offline. Please check back later or contact support.</p>
             )}
              <p className="text-sm text-gray-500 mt-6">Server IP: <span className="font-mono bg-gray-200 px-1 py-0.5 rounded">play.yourserver.com</span></p>
         </div>
    </div>
  );

    const renderShopPage = () => (
        <div className="max-w-4xl mx-auto mt-10">
             <h1 className="text-3xl font-bold mb-6">Shop (Coming Soon)</h1>
             {!showShop && !isAdminLoggedIn && (
                <div className="bg-yellow-100 p-6 rounded-lg shadow-md text-center">
                    <p className="text-xl font-semibold text-yellow-800">The shop is currently under construction and will be available soon!</p>
                    <p className="text-gray-600 mt-2">Check back later for awesome items and ranks.</p>
                 </div>
             )}
              {(showShop || isAdminLoggedIn) && (
                 <div className="bg-white p-6 rounded-lg shadow-md">
                      {isAdminLoggedIn && (
                          <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded text-blue-700 text-sm">
                              <p><span className="font-semibold">Admin View:</span> This page is {showShop ? 'currently visible' : 'hidden from'} regular users.</p>
                              <button
                                  onClick={handleAdminToggleShop}
                                  className="mt-2 text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                              >
                                  {showShop ? 'Hide Shop from Users' : 'Make Shop Visible'}
                              </button>
                          </div>
                      )}
                     <p className="text-center text-gray-500">Shop content goes here... categories, items, etc.</p>
                     {/* Placeholder items */}
                     <div className="grid md:grid-cols-3 gap-6 mt-6">
                        <div className="border rounded-lg p-4 text-center">
                            <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16 mx-auto mb-3" />
                            <h3 className="font-semibold">Awesome Rank</h3>
                            <p className="text-sm text-gray-600 mb-2">$9.99</p>
                             <button className={`w-full bg-gray-300 text-gray-500 py-1 rounded cursor-not-allowed`}>Coming Soon</button>
                        </div>
                        <div className="border rounded-lg p-4 text-center">
                            <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16 mx-auto mb-3" />
                            <h3 className="font-semibold">Special Key</h3>
                            <p className="text-sm text-gray-600 mb-2">$4.99</p>
                            <button className={`w-full bg-gray-300 text-gray-500 py-1 rounded cursor-not-allowed`}>Coming Soon</button>
                        </div>
                        <div className="border rounded-lg p-4 text-center">
                             <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16 mx-auto mb-3" />
                            <h3 className="font-semibold">Cosmetic Pack</h3>
                            <p className="text-sm text-gray-600 mb-2">$14.99</p>
                           <button className={`w-full bg-gray-300 text-gray-500 py-1 rounded cursor-not-allowed`}>Coming Soon</button>
                        </div>
                     </div>
                 </div>
             )}
        </div>
    );

  // --- Admin Dashboard Render ---

  const renderAdminDashboard = () => {
    if (!isAdminLoggedIn || !currentAdmin) return <p>Access Denied.</p>;

    const sidebarWidth = "w-64";
    const mainContentMargin = "ml-64";

    const availablePermissions: AdminPermission[] = ['manageContent', 'manageStyles', 'manageBlogs', 'manageUsers', 'manageAdmins', 'manageSettings', 'manageShop', 'manageBadges', 'moderateComments'];

    return (
      <div className="flex min-h-screen bg-gray-100">
        {/* Sidebar */}
        <aside className={`fixed top-0 left-0 h-full bg-gray-800 text-gray-300 ${sidebarWidth} p-4 space-y-2 flex flex-col shadow-lg`}>
          <h2 className="text-xl font-semibold text-white mb-4 pb-2 border-b border-gray-700">Admin Panel</h2>
          <button onClick={() => setAdminSection('dashboard')} className={`w-full text-left px-3 py-2 rounded hover:bg-gray-700 hover:text-white ${adminSection === 'dashboard' ? 'bg-gray-700 text-white' : ''}`}>Dashboard</button>
          {hasPermission('manageContent') && <button onClick={() => setAdminSection('content')} className={`w-full text-left px-3 py-2 rounded hover:bg-gray-700 hover:text-white ${adminSection === 'content' ? 'bg-gray-700 text-white' : ''}`}>Edit Content</button>}
          {hasPermission('manageStyles') && <button onClick={() => setAdminSection('styles')} className={`w-full text-left px-3 py-2 rounded hover:bg-gray-700 hover:text-white ${adminSection === 'styles' ? 'bg-gray-700 text-white' : ''}`}>Change Styles</button>}
          {hasPermission('manageBlogs') && <button onClick={() => setAdminSection('blogs')} className={`w-full text-left px-3 py-2 rounded hover:bg-gray-700 hover:text-white ${adminSection.startsWith('blogs') ? 'bg-gray-700 text-white' : ''}`}>Manage Blogs</button>}
          {hasPermission('manageUsers') && <button onClick={() => setAdminSection('users')} className={`w-full text-left px-3 py-2 rounded hover:bg-gray-700 hover:text-white ${adminSection === 'users' ? 'bg-gray-700 text-white' : ''}`}>Manage Users</button>}
          {hasPermission('manageAdmins') && <button onClick={() => setAdminSection('admins')} className={`w-full text-left px-3 py-2 rounded hover:bg-gray-700 hover:text-white ${adminSection.startsWith('admins') ? 'bg-gray-700 text-white' : ''}`}>Manage Admins</button>}
          {hasPermission('manageBadges') && <button onClick={() => setAdminSection('badges')} className={`w-full text-left px-3 py-2 rounded hover:bg-gray-700 hover:text-white ${adminSection.startsWith('badges') ? 'bg-gray-700 text-white' : ''}`}>Manage Badges</button>}
          {hasPermission('manageShop') && <button onClick={() => setAdminSection('shop')} className={`w-full text-left px-3 py-2 rounded hover:bg-gray-700 hover:text-white ${adminSection === 'shop' ? 'bg-gray-700 text-white' : ''}`}>Manage Shop</button>}
          {hasPermission('manageSettings') && <button onClick={() => setAdminSection('settings')} className={`w-full text-left px-3 py-2 rounded hover:bg-gray-700 hover:text-white ${adminSection === 'settings' ? 'bg-gray-700 text-white' : ''}`}>Settings</button>}

           <div className="flex-grow"></div> {/* Pushes logout to bottom */}

             <button onClick={() => handleNavigate('home')} className="w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-700 hover:text-white">View Site</button>
             <button onClick={handleAdminLogout} className="w-full text-left px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700">Logout Admin</button>
             <p className="text-xs text-gray-500 pt-2">Logged in as: {currentAdmin.email}</p>

        </aside>

        {/* Main Content Area */}
        <main className={`p-8 ${mainContentMargin} w-full`}>
          {renderMessages()}
          {currentAdmin.requiresPasswordChange && adminSection !== 'admins_edit' && adminSection !== 'admins_new' && (
                <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                    <p className="font-bold">Security Requirement:</p>
                    <p>You must change your default password or create a new administrator account before accessing other features.</p>
                    <button onClick={() => setAdminSection('admins')} className="mt-2 text-sm text-blue-600 hover:underline">Go to Admin Management</button>
                </div>
            )}

          {/* --- Dashboard Home --- */}
          {adminSection === 'dashboard' && (
             <div className="space-y-6">
                 <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="bg-white p-4 rounded-lg shadow">
                         <h3 className="font-semibold text-lg mb-2">Users</h3>
                         <p className="text-3xl font-bold">{users.length}</p>
                         <p className="text-sm text-gray-500">Registered Users</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow">
                         <h3 className="font-semibold text-lg mb-2">Blog Posts</h3>
                         <p className="text-3xl font-bold">{blogPosts.length}</p>
                           <button onClick={() => setAdminSection('blogs')} className={`text-${siteSettings.primaryColor} hover:underline text-sm`}>Manage</button>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow">
                         <h3 className="font-semibold text-lg mb-2">Server Status</h3>
                         <p className={`text-xl font-bold ${serverStatusData.online ? 'text-green-600' : 'text-red-600'}`}>{serverStatusData.online ? 'Online' : 'Offline'}</p>
                         {serverStatusData.online && <p className="text-sm text-gray-500">{serverStatusData.players} players</p>}
                         <button onClick={() => handleNavigate('serverStatus')} className={`text-${siteSettings.primaryColor} hover:underline text-sm mt-1`}>View Status Page</button>
                      </div>
                  </div>
             </div>
          )}

          {/* --- Content Editing --- */}
          {adminSection === 'content' && hasPermission('manageContent') && (
             <div className="space-y-6">
                 <h1 className="text-3xl font-bold">Edit Site Content</h1>
                  <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-3">Home Page Welcome Text</h2>
                         <textarea
                             value={editingContent}
                             onChange={(e) => setEditingContent(e.target.value)}
                             rows={5}
                             className="w-full p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 mb-3"
                         />
                          <button onClick={handleAdminSaveChanges} className={`bg-${siteSettings.primaryColor} text-white px-4 py-2 rounded hover:bg-opacity-90`}>
                             Save Content Changes
                         </button>
                  </div>
                  {/* Add more editable sections here */}
             </div>
          )}

            {/* --- Style Editing --- */}
            {adminSection === 'styles' && hasPermission('manageStyles') && (
                <div className="space-y-6">
                    <h1 className="text-3xl font-bold">Change Site Styles</h1>
                    <div className="bg-white p-6 rounded-lg shadow space-y-4">
                         <h2 className="text-xl font-semibold mb-3">Theme Colors (Tailwind Classes)</h2>
                         <div>
                             <label className="block text-gray-700 mb-1">Primary Color (e.g., blue-600, indigo-700)</label>
                             <input
                                 type="text"
                                 value={tempPrimaryColor}
                                 onChange={(e) => setTempPrimaryColor(e.target.value)}
                                 className="w-full md:w-1/2 px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                             />
                              <div className={`mt-2 w-16 h-8 rounded bg-${tempPrimaryColor}`}></div> {/* Preview */}
                         </div>
                         <div>
                             <label className="block text-gray-700 mb-1">Secondary Color (e.g., green-500, yellow-400)</label>
                             <input
                                 type="text"
                                 value={tempSecondaryColor}
                                 onChange={(e) => setTempSecondaryColor(e.target.value)}
                                 className="w-full md:w-1/2 px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                             />
                              <div className={`mt-2 w-16 h-8 rounded bg-${tempSecondaryColor}`}></div> {/* Preview */}
                         </div>
                          <button onClick={handleAdminSaveChanges} className={`bg-${siteSettings.primaryColor} text-white px-4 py-2 rounded hover:bg-opacity-90`}>
                             Apply Style Changes
                         </button>
                    </div>
                     {/* Add options for custom CSS snippets if desired */}
                </div>
            )}

             {/* --- Blog Management --- */}
             {adminSection === 'blogs' && hasPermission('manageBlogs') && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-bold">Manage Blogs</h1>
                        <button onClick={() => setAdminSection('blogs_new')} className={`bg-${siteSettings.secondaryColor} text-white px-4 py-2 rounded hover:bg-opacity-90`}>
                            + New Post
                        </button>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow overflow-x-auto">
                        <table className="w-full min-w-[600px]">
                             <thead>
                                <tr className="border-b text-left text-gray-600">
                                    <th className="py-2 px-3">Title</th>
                                    <th className="py-2 px-3">Author</th>
                                    <th className="py-2 px-3">Date</th>
                                    <th className="py-2 px-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {blogPosts.map(post => {
                                    const author = getUserById(post.authorId);
                                    return (
                                        <tr key={post.id} className="border-b hover:bg-gray-50">
                                            <td className="py-2 px-3">{post.title}</td>
                                            <td className="py-2 px-3">{author?.username ?? 'Admin'}</td>
                                            <td className="py-2 px-3 text-sm">{post.createdAt.toLocaleDateString()}</td>
                                            <td className="py-2 px-3 space-x-2">
                                                 <button onClick={() => {/* Implement edit functionality */ alert('Edit not implemented')}} className="text-blue-600 hover:underline text-sm">Edit</button>
                                                 <button onClick={() => handleAdminDeleteBlog(post.id)} className="text-red-600 hover:underline text-sm">Delete</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {blogPosts.length === 0 && <p className="text-center py-4 text-gray-500">No blog posts found.</p>}
                    </div>
                </div>
             )}
             {adminSection === 'blogs_new' && hasPermission('manageBlogs') && (
                 <div className="space-y-6 max-w-3xl">
                     <button onClick={() => setAdminSection('blogs')} className="text-blue-600 hover:underline mb-4">&larr; Back to Blog List</button>
                     <h1 className="text-3xl font-bold">Create New Blog Post</h1>
                     <form onSubmit={handleAdminCreateBlog} className="bg-white p-6 rounded-lg shadow space-y-4">
                         <div>
                             <label className="block text-gray-700 mb-1">Title</label>
                             <input
                                 type="text"
                                 value={newBlogTitle}
                                 onChange={(e) => setNewBlogTitle(e.target.value)}
                                 required
                                 className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                             />
                         </div>
                          <div>
                             <label className="block text-gray-700 mb-1">Content</label>
                             <textarea
                                 value={newBlogContent}
                                 onChange={(e) => setNewBlogContent(e.target.value)}
                                 required
                                 rows={10}
                                 className="w-full p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                             />
                         </div>
                          <button type="submit" className={`bg-${siteSettings.primaryColor} text-white px-4 py-2 rounded hover:bg-opacity-90`}>
                             Publish Post
                         </button>
                     </form>
                 </div>
             )}

             {/* --- User Management --- */}
            {adminSection === 'users' && hasPermission('manageUsers') && (
                <div className="space-y-6">
                    <h1 className="text-3xl font-bold">Manage Users</h1>
                     <div className="bg-white p-6 rounded-lg shadow overflow-x-auto">
                         <table className="w-full min-w-[800px]">
                              <thead>
                                <tr className="border-b text-left text-gray-600">
                                    <th className="py-2 px-3">User</th>
                                    <th className="py-2 px-3">Email</th>
                                    <th className="py-2 px-3">Verified</th>
                                    <th className="py-2 px-3">Badges</th>
                                    <th className="py-2 px-3">Actions</th>
                                </tr>
                            </thead>
                             <tbody>
                                {users.map(user => (
                                    <tr key={user.id} className="border-b hover:bg-gray-50">
                                         <td className="py-2 px-3 flex items-center space-x-2">
                                             {user.profilePic ? (
                                                 <img src={user.profilePic} alt={user.username} className="w-8 h-8 rounded-full object-cover"/>
                                             ) : (
                                                 <div className="bg-gray-300 rounded-full w-8 h-8 flex items-center justify-center text-xs font-semibold">
                                                     {user.username.charAt(0).toUpperCase()}
                                                 </div>
                                             )}
                                             <span>{user.username}</span>
                                             {user.isAdmin && <span title="Linked Admin Account" className="text-blue-600 text-xs">(Admin)</span>}
                                         </td>
                                        <td className="py-2 px-3">{user.email}</td>
                                        <td className="py-2 px-3">{user.isVerified ? <span className="text-green-600">Yes</span> : <span className="text-red-600">No</span>}</td>
                                        <td className="py-2 px-3 text-xl">
                                            {user.badges.map(badgeId => {
                                                const badge = getBadgeById(badgeId);
                                                return badge ? <span key={badgeId} title={`${badge.name}: ${badge.description}`} className="mr-1 cursor-help">{badge.emoji}</span> : null;
                                            })}
                                        </td>
                                         <td className="py-2 px-3 space-x-1">
                                            {/* Add/Remove Badge Dropdown */}
                                             <select
                                                 onChange={(e) => e.target.value && handleAdminAssignBadge(user.id, e.target.value)}
                                                 value=""
                                                  className="text-xs border rounded p-1 mr-1"
                                                  title="Assign Badge"
                                              >
                                                 <option value="" disabled>+ Assign Badge</option>
                                                 {badges.filter(b => !user.badges.includes(b.id)).map(badge => (
                                                     <option key={badge.id} value={badge.id}>{badge.emoji} {badge.name}</option>
                                                 ))}
                                             </select>
                                             <select
                                                  onChange={(e) => e.target.value && handleAdminRemoveBadge(user.id, e.target.value)}
                                                  value=""
                                                  className="text-xs border rounded p-1"
                                                  title="Remove Badge"
                                              >
                                                  <option value="" disabled>- Remove Badge</option>
                                                  {user.badges.map(badgeId => getBadgeById(badgeId)).filter(Boolean).map(badge => (
                                                       <option key={badge!.id} value={badge!.id}>{badge!.emoji} {badge!.name}</option>
                                                  ))}
                                              </select>
                                            {/* <button onClick={() => {/* Ban user * /}} className="text-red-600 hover:underline text-sm">Ban</button> */}
                                         </td>
                                    </tr>
                                ))}
                            </tbody>
                         </table>
                     </div>
                </div>
            )}

             {/* --- Admin Management --- */}
             {(adminSection === 'admins' || adminSection === 'admins_new' || adminSection === 'admins_edit') && hasPermission('manageAdmins') && (
                <div className="space-y-6">
                     {adminSection === 'admins' && (
                         <>
                             <div className="flex justify-between items-center">
                                 <h1 className="text-3xl font-bold">Manage Admins</h1>
                                 <button onClick={() => { setEditingAdminId(null); setNewAdminEmail(''); setNewAdminPassword(''); setNewAdminPasswordConfirm(''); setNewAdminPermissions([]); setAdminSection('admins_new'); }} className={`bg-${siteSettings.secondaryColor} text-white px-4 py-2 rounded hover:bg-opacity-90`}>
                                     + New Admin
                                 </button>
                             </div>
                             {currentAdmin.requiresPasswordChange && (
                                <div className="p-4 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded">
                                     <p><span className="font-bold">Action Required:</span> Either edit your current account (<span className="font-mono">{currentAdmin.email}</span>) to set a new password, or create a new admin account and log in with that.</p>
                                 </div>
                              )}
                             <div className="bg-white p-6 rounded-lg shadow overflow-x-auto">
                                 <table className="w-full min-w-[600px]">
                                      <thead>
                                         <tr className="border-b text-left text-gray-600">
                                             <th className="py-2 px-3">Email</th>
                                             <th className="py-2 px-3">Permissions</th>
                                             <th className="py-2 px-3">Actions</th>
                                         </tr>
                                     </thead>
                                     <tbody>
                                         {admins.map(admin => (
                                             <tr key={admin.id} className={`border-b hover:bg-gray-50 ${admin.requiresPasswordChange ? 'bg-yellow-50' : ''}`}>
                                                 <td className="py-2 px-3">
                                                      {admin.email}
                                                      {admin.requiresPasswordChange && <span className="text-xs text-red-600 ml-2">(Requires Password Change)</span>}
                                                      {currentAdmin.id === admin.id && <span className="text-xs text-blue-600 ml-2">(You)</span>}
                                                 </td>
                                                 <td className="py-2 px-3 text-xs text-gray-600">{admin.permissions.join(', ') || 'None'}</td>
                                                 <td className="py-2 px-3 space-x-2">
                                                      <button onClick={() => handleAdminEditAdmin(admin)} className="text-blue-600 hover:underline text-sm">Edit</button>
                                                       {/* Prevent deletion of self or the default admin */}
                                                      {admin.id !== currentAdmin.id && admin.email !== 'admin@mmpcs.net' && admins.length > 1 && (
                                                         <button onClick={() => handleAdminDeleteAdmin(admin.id)} className="text-red-600 hover:underline text-sm">Delete</button>
                                                     )}
                                                 </td>
                                             </tr>
                                         ))}
                                     </tbody>
                                 </table>
                             </div>
                         </>
                     )}

                     {(adminSection === 'admins_new' || adminSection === 'admins_edit') && (
                         <>
                              <button onClick={() => setAdminSection('admins')} className="text-blue-600 hover:underline mb-4">&larr; Back to Admin List</button>
                             <h1 className="text-3xl font-bold">{editingAdminId ? 'Edit Admin' : 'Create New Admin'}</h1>
                             <form onSubmit={editingAdminId ? handleAdminUpdateAdmin : handleAdminCreateAdmin} className="bg-white p-6 rounded-lg shadow space-y-4 max-w-2xl">
                                  <div>
                                     <label className="block text-gray-700 mb-1">Email</label>
                                     <input
                                         type="email"
                                         value={newAdminEmail}
                                         onChange={(e) => setNewAdminEmail(e.target.value)}
                                         required
                                         className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${editingAdminId && currentAdmin?.email === 'admin@mmpcs.net' && editingAdminId === currentAdmin.id ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                         disabled={editingAdminId && currentAdmin?.email === 'admin@mmpcs.net' && editingAdminId === currentAdmin.id} // Prevent changing default admin email via edit form
                                      />
                                       {editingAdminId && currentAdmin?.email === 'admin@mmpcs.net' && editingAdminId === currentAdmin.id && <p className="text-xs text-gray-500 mt-1">Cannot change the email of the default admin account.</p>}
                                  </div>
                                   <div>
                                     <label className="block text-gray-700 mb-1">Password {editingAdminId ? '(Leave blank to keep current)' : ''}</label>
                                     <input
                                         type="password"
                                         value={newAdminPassword}
                                         onChange={(e) => setNewAdminPassword(e.target.value)}
                                         required={!editingAdminId} // Required only for new admins
                                         minLength={editingAdminId && newAdminPassword ? 6 : (editingAdminId ? undefined : 6)} // Min length only if setting a new one
                                         className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                     />
                                 </div>
                                 {/* Require password confirmation only if a new password is being entered */}
                                 {(newAdminPassword || (editingAdminId && currentAdmin?.id === editingAdminId && currentAdmin.requiresPasswordChange) ) && (
                                      <div>
                                         <label className="block text-gray-700 mb-1">Confirm Password</label>
                                         <input
                                             type="password"
                                             value={newAdminPasswordConfirm}
                                             onChange={(e) => setNewAdminPasswordConfirm(e.target.value)}
                                             required
                                             className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                         />
                                     </div>
                                 )}
                                  <div>
                                     <label className="block text-gray-700 mb-2">Permissions</label>
                                     <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                        {availablePermissions.map(perm => (
                                            <label key={perm} className="flex items-center space-x-2 text-sm">
                                                <input
                                                    type="checkbox"
                                                    checked={newAdminPermissions.includes(perm)}
                                                    onChange={(e) => handlePermissionChange(perm, e.target.checked)}
                                                    className="rounded focus:ring-blue-500"
                                                />
                                                <span>{perm.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span> {/* Nicer formatting */}
                                            </label>
                                        ))}
                                    </div>
                                  </div>
                                  <button type="submit" className={`bg-${siteSettings.primaryColor} text-white px-4 py-2 rounded hover:bg-opacity-90`}>
                                     {editingAdminId ? 'Update Admin' : 'Create Admin'}
                                 </button>
                             </form>
                         </>
                     )}
                </div>
             )}


              {/* --- Badge Management --- */}
              {(adminSection === 'badges' || adminSection === 'badges_new' || adminSection === 'badges_edit') && hasPermission('manageBadges') && (
                <div className="space-y-6">
                    {adminSection === 'badges' && (
                        <>
                             <div className="flex justify-between items-center">
                                 <h1 className="text-3xl font-bold">Manage Badges</h1>
                                 <button onClick={() => { setEditingBadgeId(null); setNewBadgeName(''); setNewBadgeEmoji(''); setNewBadgeDesc(''); setAdminSection('badges_new'); }} className={`bg-${siteSettings.secondaryColor} text-white px-4 py-2 rounded hover:bg-opacity-90`}>
                                     + New Badge
                                 </button>
                             </div>
                            <div className="bg-white p-6 rounded-lg shadow overflow-x-auto">
                                <table className="w-full min-w-[600px]">
                                    <thead>
                                        <tr className="border-b text-left text-gray-600">
                                            <th className="py-2 px-3 w-12">Emoji</th>
                                            <th className="py-2 px-3">Name</th>
                                            <th className="py-2 px-3">Description</th>
                                            <th className="py-2 px-3">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {badges.map(badge => (
                                            <tr key={badge.id} className="border-b hover:bg-gray-50">
                                                <td className="py-2 px-3 text-2xl">{badge.emoji}</td>
                                                <td className="py-2 px-3 font-medium">{badge.name}</td>
                                                <td className="py-2 px-3 text-sm text-gray-700">{badge.description}</td>
                                                <td className="py-2 px-3 space-x-2">
                                                    <button onClick={() => handleAdminEditBadge(badge)} className="text-blue-600 hover:underline text-sm">Edit</button>
                                                    {badge.id !== 'badge_admin' && ( // Protect default admin badge
                                                        <button onClick={() => handleAdminDeleteBadge(badge.id)} className="text-red-600 hover:underline text-sm">Delete</button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {badges.length === 0 && <p className="text-center py-4 text-gray-500">No custom badges created yet.</p>}
                            </div>
                        </>
                    )}

                    {(adminSection === 'badges_new' || adminSection === 'badges_edit') && (
                         <>
                             <button onClick={() => setAdminSection('badges')} className="text-blue-600 hover:underline mb-4">&larr; Back to Badge List</button>
                             <h1 className="text-3xl font-bold">{editingBadgeId ? 'Edit Badge' : 'Create New Badge'}</h1>
                              <form onSubmit={editingBadgeId ? handleAdminUpdateBadge : handleAdminCreateBadge} className="bg-white p-6 rounded-lg shadow space-y-4 max-w-lg">
                                   <div>
                                      <label className="block text-gray-700 mb-1">Badge Name</label>
                                      <input
                                          type="text"
                                          value={newBadgeName}
                                          onChange={(e) => setNewBadgeName(e.target.value)}
                                          required
                                          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-gray-700 mb-1">Emoji (Single character)</label>
                                      <input
                                          type="text"
                                          value={newBadgeEmoji}
                                          onChange={(e) => setNewBadgeEmoji(e.target.value)}
                                          required
                                          maxLength={2} // Allow for emoji sequences
                                          className="w-20 px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-center text-xl"
                                      />
                                  </div>
                                   <div>
                                      <label className="block text-gray-700 mb-1">Description (Optional)</label>
                                      <input
                                          type="text"
                                          value={newBadgeDesc}
                                          onChange={(e) => setNewBadgeDesc(e.target.value)}
                                          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                      />
                                  </div>
                                   <button type="submit" className={`bg-${siteSettings.primaryColor} text-white px-4 py-2 rounded hover:bg-opacity-90`}>
                                      {editingBadgeId ? 'Update Badge' : 'Create Badge'}
                                  </button>
                              </form>
                         </>
                     )}
                </div>
              )}


             {/* --- Shop Management --- */}
             {adminSection === 'shop' && hasPermission('manageShop') && (
                <div className="space-y-6">
                    <h1 className="text-3xl font-bold">Manage Shop</h1>
                     <div className="bg-white p-6 rounded-lg shadow space-y-4">
                         <h2 className="text-xl font-semibold">Shop Status</h2>
                         <p>The shop page is currently: <span className={`font-semibold ${showShop ? 'text-green-600' : 'text-red-600'}`}>{showShop ? 'Visible' : 'Hidden'}</span> to users.</p>
                          <button
                             onClick={handleAdminToggleShop}
                             className={`px-4 py-2 rounded text-white ${showShop ? 'bg-red-500 hover:bg-red-600' : `bg-${siteSettings.secondaryColor} hover:bg-opacity-90`}`}
                          >
                             {showShop ? 'Hide Shop Page' : 'Make Shop Visible'}
                         </button>
                           <button onClick={() => handleNavigate('shop')} className="ml-4 text-blue-600 hover:underline">Preview Shop Page &rarr;</button>

                         <h2 className="text-xl font-semibold pt-6 border-t mt-6">Shop Content (Placeholder)</h2>
                         <p className="text-gray-600">Functionality to add/edit shop items would go here.</p>
                         {/* Placeholder for item management UI */}
                     </div>
                </div>
             )}

              {/* --- Settings --- */}
              {adminSection === 'settings' && hasPermission('manageSettings') && (
                <div className="space-y-6">
                    <h1 className="text-3xl font-bold">Site Settings</h1>
                     <div className="bg-white p-6 rounded-lg shadow space-y-4 max-w-xl">
                         <h2 className="text-xl font-semibold">Email Verification (SFTP Simulation)</h2>
                         <p className="text-sm text-gray-600 mb-3">Configure SFTP details for simulated email actions (e.g., verification file drop). No actual email is sent in this demo.</p>
                         <div>
                             <label className="block text-gray-700 mb-1">SFTP Host</label>
                             <input
                                 type="text"
                                 value={tempSftpConfig.host}
                                 onChange={(e) => setTempSftpConfig(p => ({...p, host: e.target.value}))}
                                 placeholder="sftp.example.com"
                                 className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                             />
                         </div>
                         <div className="flex space-x-4">
                              <div className="flex-1">
                                  <label className="block text-gray-700 mb-1">Port</label>
                                  <input
                                      type="text"
                                      value={tempSftpConfig.port}
                                      onChange={(e) => setTempSftpConfig(p => ({...p, port: e.target.value}))}
                                      placeholder="22"
                                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                              </div>
                             <div className="flex-1">
                                 <label className="block text-gray-700 mb-1">Username</label>
                                 <input
                                     type="text"
                                     value={tempSftpConfig.user}
                                     onChange={(e) => setTempSftpConfig(p => ({...p, user: e.target.value}))}
                                      placeholder="sftp_user"
                                     className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                 />
                             </div>
                         </div>
                           <div>
                             <label className="block text-gray-700 mb-1">Password</label>
                             <input
                                 type="password"
                                 value={tempSftpConfig.pass}
                                 onChange={(e) => setTempSftpConfig(p => ({...p, pass: e.target.value}))}
                                 placeholder="Keep secure!"
                                 className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                             />
                         </div>
                          <button onClick={handleAdminSaveChanges} className={`bg-${siteSettings.primaryColor} text-white px-4 py-2 rounded hover:bg-opacity-90`}>
                             Save SFTP Settings
                         </button>
                    </div>
                     {/* Add other settings like site name, registration toggle, etc. */}
                </div>
            )}

             {/* Fallback for unknown section or insufficient permissions */}
             {adminSection !== 'dashboard' &&
                adminSection !== 'content' &&
                adminSection !== 'styles' &&
                !adminSection.startsWith('blogs') &&
                adminSection !== 'users' &&
                !adminSection.startsWith('admins') &&
                !adminSection.startsWith('badges') &&
                adminSection !== 'shop' &&
                adminSection !== 'settings' &&
                (
                 <p className="text-red-500">Section not found or permission denied.</p>
            )}


        </main>
      </div>
    );
  };

  // --- Main Render Logic ---

  // Conditionally render Admin Dashboard or the rest of the site
  if (isAdminLoggedIn && currentPage === 'adminDashboard') {
     return renderAdminDashboard();
  }

  // Render public-facing site
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
        {/* Don't render standard navbar on admin login page */}
        {currentPage !== 'adminLogin' && renderNavbar()}
        <main className="flex-grow container mx-auto px-4 py-8">
            {currentPage === 'home' && renderHomePage()}
            {currentPage === 'blog' && renderBlogPage()}
            {currentPage === 'login' && renderLoginPage()}
            {currentPage === 'register' && renderRegisterPage()}
            {currentPage === 'adminLogin' && renderAdminLoginPage()}
            {currentPage === 'profile' && renderProfilePage()}
            {currentPage === 'userPosts' && renderUserPostsPage()}
            {currentPage === 'serverStatus' && renderServerStatusPage()}
            {currentPage === 'shop' && renderShopPage()}

            {/* Fallback for unknown pages */}
             {currentPage !== 'home' &&
              currentPage !== 'blog' &&
              currentPage !== 'login' &&
              currentPage !== 'register' &&
              currentPage !== 'adminLogin' &&
              currentPage !== 'profile' &&
              currentPage !== 'userPosts' &&
              currentPage !== 'serverStatus' &&
              currentPage !== 'shop' &&
              currentPage !== 'adminDashboard' /* Handled above */ &&
              (
                 <div className="text-center py-10">
                     <h1 className="text-3xl font-bold text-red-600">404 - Page Not Found</h1>
                     <p className="mt-4 text-gray-600">The page you requested could not be found.</p>
                     <button onClick={() => handleNavigate('home')} className={`mt-6 bg-${siteSettings.primaryColor} text-white px-4 py-2 rounded hover:bg-opacity-90`}>
                        Go to Home
                     </button>
                 </div>
             )}
        </main>
         {/* Don't render standard footer on admin login page */}
        {currentPage !== 'adminLogin' && renderFooter()}
    </div>
  );
};

export default MinecraftWebsite;