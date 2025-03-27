import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';

// --- TypeScript Interfaces ---

interface User {
  id: string;
  username: string;
  email: string;
  profilePicUrl?: string;
  badges: string[];
  isVerified: boolean;
}

interface AdminUser extends User {
  isAdmin: true;
  permissions: string[];
  linkedUserId?: string;
  passwordChanged: boolean;
}

interface BlogPost {
  id: string;
  title: string;
  content: string;
  authorId: string;
  createdAt: Date;
  comments: Comment[];
}

interface Comment {
  id: string;
  postId: string;
  authorId: string;
  text: string;
  createdAt: Date;
}

interface UserPost {
  id: string;
  authorId: string;
  content: string;
  mediaUrl?: string; // For uploads (simulated)
  createdAt: Date;
}

interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

interface SiteStyles {
  primaryColor: string; // e.g., 'blue', 'green', 'purple', 'red', 'yellow'
  fontFamily: string; // e.g., 'sans', 'serif', 'mono'
  roundedCorners: string; // e.g., 'none', 'sm', 'md', 'lg', 'full'
}

// --- Permissions Constants ---
const PERMISSIONS = {
  MANAGE_CONTENT: 'manage_content',
  MANAGE_STYLES: 'manage_styles',
  MANAGE_BLOGS: 'manage_blogs',
  MANAGE_USERS: 'manage_users',
  MANAGE_ADMINS: 'manage_admins',
  MANAGE_BADGES: 'manage_badges',
  VIEW_SHOP: 'view_shop',
  CONFIGURE_SYSTEM: 'configure_system',
  MODERATE_POSTS: 'moderate_posts',
  COMMENT_AS_ADMIN: 'comment_as_admin',
};

// --- Utility Functions ---
const generateId = () => Math.random().toString(36).substring(2, 15);

// --- Main Component ---
const MinecraftWebsite: React.FC = () => {
  // --- State ---
  const [currentPage, setCurrentPage] = useState<string>('home');
  const [loggedInUser, setLoggedInUser] = useState<User | AdminUser | null>(null);
  const [users, setUsers] = useState<User[]>([
    // Add some dummy users if needed for testing
  ]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([
    {
      id: 'admin-001',
      username: 'Admin',
      email: 'admin@mmpcs.net',
      isAdmin: true,
      permissions: Object.values(PERMISSIONS), // Default admin has all permissions
      passwordChanged: false, // Needs to change password
      isVerified: true,
      badges: [],
    },
  ]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([
    { id: 'blog-1', title: 'Welcome to Our Server!', content: 'Get ready for adventure!', authorId: 'admin-001', createdAt: new Date(), comments: [] },
    { id: 'blog-2', title: 'New Update Deployed', content: 'Check out the latest features.', authorId: 'admin-001', createdAt: new Date(), comments: [] },
  ]);
  const [userPosts, setUserPosts] = useState<UserPost[]>([]);
  const [badges, setBadges] = useState<Badge[]>([
    { id: 'badge-1', name: 'Founder', emoji: '👑', description: 'Original server founder' },
    { id: 'badge-2', name: 'Veteran', emoji: '🛡️', description: 'Played for over a year' },
  ]);
  const [serverStatus, setServerStatus] = useState<'online' | 'offline' | 'maintenance'>('online');
  const [siteStyles, setSiteStyles] = useState<SiteStyles>({
    primaryColor: 'blue',
    fontFamily: 'sans',
    roundedCorners: 'lg',
  });
  const [smtpConfig, setSmtpConfig] = useState({ host: '', port: '', user: '', pass: '' }); // Simulated
  const [adminDashboardSection, setAdminDashboardSection] = useState<string>('overview');
  const [showPasswordChangePrompt, setShowPasswordChangePrompt] = useState<boolean>(false);

  // --- Form States ---
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [adminLoginEmail, setAdminLoginEmail] = useState('');
  const [adminLoginPassword, setAdminLoginPassword] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newProfileUsername, setNewProfileUsername] = useState('');
  const [newProfilePic, setNewProfilePic] = useState<File | null>(null); // Simulated upload
  const [newBlogTitle, setNewBlogTitle] = useState('');
  const [newBlogContent, setNewBlogContent] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [newBadgeName, setNewBadgeName] = useState('');
  const [newBadgeEmoji, setNewBadgeEmoji] = useState('');
  const [newBadgeDesc, setNewBadgeDesc] = useState('');
  const [editingBadge, setEditingBadge] = useState<Badge | null>(null);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [newCommentText, setNewCommentText] = useState<{ [key: string]: string }>({}); // postId -> text

  // --- Effects ---
  useEffect(() => {
    // Simulate routing based on hash
    const handleHashChange = () => {
      if (window.location.hash === '#adminlogin') {
        setCurrentPage('adminLogin');
      } else if (window.location.hash === '#login') {
          setCurrentPage('login');
      } else if (window.location.hash === '#register') {
          setCurrentPage('register');
      } else if (window.location.hash.startsWith('#blog/')) {
          const postId = window.location.hash.split('/')[1];
          // Find the post and set the page, or default to blog list
          if (blogPosts.find(p => p.id === postId)) {
              setCurrentPage(`blog/${postId}`);
          } else {
              setCurrentPage('blog');
              window.location.hash = '#blog'; // Correct hash if post not found
          }
      } else if (window.location.hash === '#blog') {
          setCurrentPage('blog');
      } else if (window.location.hash === '#profile') {
          setCurrentPage('profile');
      } else if (window.location.hash === '#status') {
          setCurrentPage('status');
      } else if (window.location.hash === '#posts') {
            setCurrentPage('posts');
      }
       else {
        // Default to home if hash is unknown or empty
        if (currentPage !== 'home' && !window.location.hash) {
            setCurrentPage('home');
        }
      }
    };

    handleHashChange(); // Initial check
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [blogPosts, currentPage]); // Re-run if blogPosts change (for dynamic blog routing)


  // --- Helper Functions ---
  const getPrimaryColorClasses = (type: 'bg' | 'text' | 'border', intensity: number = 500): string => {
    return `${type}-${siteStyles.primaryColor}-${intensity}`;
  };

  const getFontFamilyClass = (): string => {
    return `font-${siteStyles.fontFamily}`;
  };

   const getRoundedClass = (element?: 'button' | 'card' | 'input'): string => {
        if(element === 'button' || element === 'input') return `rounded-${siteStyles.roundedCorners === 'none' ? 'none' : (siteStyles.roundedCorners === 'full' ? 'full' : 'md')}`;
        return `rounded-${siteStyles.roundedCorners}`;
    };

  const findUserById = (id: string): User | AdminUser | undefined => {
    return users.find(u => u.id === id) || adminUsers.find(u => u.id === id);
  };

  const isAdmin = (user: User | AdminUser | null): user is AdminUser => {
    return user !== null && 'isAdmin' in user && user.isAdmin === true;
  };

  const hasPermission = (permission: string): boolean => {
    return isAdmin(loggedInUser) && loggedInUser.permissions.includes(permission);
  };

  // --- Event Handlers ---

  const handleNavigation = (page: string, hash?: string) => {
    setCurrentPage(page);
    window.location.hash = hash || page;
  };

   const handleUserLogin = (e: FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.email === loginEmail); // Simplified login check
    if (user /* && verifyPassword(loginPassword, user.passwordHash) */) {
      // In a real app, verify password hash
      if (!user.isVerified) {
        alert('Please verify your email address.');
        return;
      }
      setLoggedInUser(user);
      handleNavigation('home');
      setLoginEmail('');
      setLoginPassword('');
    } else {
      alert('Invalid email or password.');
    }
  };

    const handleAdminLogin = (e: FormEvent) => {
        e.preventDefault();
        const admin = adminUsers.find(u => u.email === adminLoginEmail); // Simplified login check
        if (admin /* && verifyPassword(adminLoginPassword, admin.passwordHash) */) {
            // In a real app, verify password hash
            setLoggedInUser(admin);
            if (!admin.passwordChanged && admin.email === 'admin@mmpcs.net') {
                setShowPasswordChangePrompt(true);
                setAdminDashboardSection('manageAdmins'); // Force to admin management
            } else {
                setShowPasswordChangePrompt(false);
                setAdminDashboardSection('overview');
            }
            setCurrentPage('adminDashboard');
             window.location.hash = ''; // Clear hash after successful admin login
            setAdminLoginEmail('');
            setAdminLoginPassword('');
        } else {
            alert('Invalid admin email or password.');
        }
    };

   const handleLogout = () => {
    setLoggedInUser(null);
    setShowPasswordChangePrompt(false);
    handleNavigation('home');
  };

  const handleRegister = (e: FormEvent) => {
      e.preventDefault();
      if (users.some(u => u.email === registerEmail) || adminUsers.some(u => u.email === registerEmail)) {
          alert('Email already exists.');
          return;
      }
      if (users.some(u => u.username === registerUsername) || adminUsers.some(u => u.username === registerUsername)) {
          alert('Username already taken.');
          return;
      }
      const newUser: User = {
          id: generateId(),
          username: registerUsername,
          email: registerEmail,
          isVerified: false, // Needs verification
          badges: [],
      };
      setUsers([...users, newUser]);
      // Simulate sending verification email
      alert(`Registration successful! Please check ${registerEmail} for a verification link (simulation).`);
      // In a real app, send email here using configured SMTP
      setRegisterUsername('');
      setRegisterEmail('');
      setRegisterPassword('');
      handleNavigation('login'); // Redirect to login page
  };

   // Simulate email verification
   const handleVerifyEmail = (userId: string) => {
       setUsers(prevUsers =>
            prevUsers.map(u => u.id === userId ? { ...u, isVerified: true } : u)
        );
        alert('Email verified successfully! You can now log in.');
        // Maybe auto-login or redirect to login
   };

  const handleUserPostSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!loggedInUser || newPostContent.trim() === '') return;
    const newPost: UserPost = {
      id: generateId(),
      authorId: loggedInUser.id,
      content: newPostContent,
      createdAt: new Date(),
      // mediaUrl would be handled by upload logic
    };
    setUserPosts([newPost, ...userPosts]);
    setNewPostContent('');
  };

  const handleProfileUpdate = (e: FormEvent) => {
      e.preventDefault();
      if (!loggedInUser) return;

      // Basic validation
      if(newProfileUsername.trim() !== '' && (users.some(u => u.username === newProfileUsername && u.id !== loggedInUser.id) || adminUsers.some(a => a.username === newProfileUsername && a.id !== loggedInUser.id))) {
          alert('Username already taken.');
          return;
      }

      const updateProfile = (user: User | AdminUser): User | AdminUser => {
          const updatedUser = { ...user };
          if (newProfileUsername.trim() !== '') {
              updatedUser.username = newProfileUsername.trim();
          }
          // Simulate profile pic upload - in reality, upload file and get URL
          if (newProfilePic) {
              updatedUser.profilePicUrl = URL.createObjectURL(newProfilePic); // Temporary local URL
          }
          return updatedUser;
      };

      if (isAdmin(loggedInUser)) {
            setAdminUsers(prevAdmins =>
                prevAdmins.map(u => u.id === loggedInUser.id ? updateProfile(u) as AdminUser : u)
            );
            setLoggedInUser(updateProfile(loggedInUser)); // Update loggedInUser state too
        } else {
            setUsers(prevUsers =>
                prevUsers.map(u => u.id === loggedInUser.id ? updateProfile(u) as User : u)
            );
             setLoggedInUser(updateProfile(loggedInUser)); // Update loggedInUser state too
        }


      setNewProfileUsername('');
      setNewProfilePic(null);
      alert('Profile updated!');
  };

   const handleProfilePicChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setNewProfilePic(e.target.files[0]);
        }
    };

  // --- Admin Dashboard Handlers ---

   const handleAddBlog = (e: FormEvent) => {
        e.preventDefault();
        if (!hasPermission(PERMISSIONS.MANAGE_BLOGS) || !loggedInUser) return;
        const newPost: BlogPost = {
            id: generateId(),
            title: newBlogTitle,
            content: newBlogContent,
            authorId: loggedInUser.id,
            createdAt: new Date(),
            comments: [],
        };
        setBlogPosts([newPost, ...blogPosts]);
        setNewBlogTitle('');
        setNewBlogContent('');
    };

    const handleDeleteBlog = (id: string) => {
        if (!hasPermission(PERMISSIONS.MANAGE_BLOGS)) return;
        if (window.confirm('Are you sure you want to delete this blog post?')) {
            setBlogPosts(blogPosts.filter(post => post.id !== id));
        }
    };

   const handleStyleChange = (e: ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
       if (!hasPermission(PERMISSIONS.MANAGE_STYLES)) return;
       const { name, value } = e.target;
       setSiteStyles(prev => ({ ...prev, [name]: value }));
   };

    const handleAddAdmin = (e: FormEvent) => {
        e.preventDefault();
        if (!hasPermission(PERMISSIONS.MANAGE_ADMINS)) return;
         if (users.some(u => u.email === newAdminEmail) || adminUsers.some(u => u.email === newAdminEmail)) {
            alert('Email already exists.');
            return;
        }
         if (users.some(u => u.username === newAdminUsername) || adminUsers.some(u => u.username === newAdminUsername)) {
            alert('Username already taken.');
            return;
        }

        const newAdmin: AdminUser = {
            id: generateId(),
            username: newAdminUsername || `Admin_${generateId().substring(0,4)}`,
            email: newAdminEmail,
            isAdmin: true,
            permissions: selectedPermissions,
            passwordChanged: true, // New admins don't need forced change initially (or set false if you want)
            isVerified: true, // Admins are auto-verified
            badges: [],
            // In real app, hash newAdminPassword
        };
        setAdminUsers([...adminUsers, newAdmin]);
        setNewAdminEmail('');
        setNewAdminPassword('');
        setNewAdminUsername('');
        setSelectedPermissions([]);
        alert('New admin account created.');
    };

     const handleEditAdmin = (admin: AdminUser) => {
        if (!hasPermission(PERMISSIONS.MANAGE_ADMINS)) return;
        setEditingAdmin(admin);
        setNewAdminUsername(admin.username);
        setNewAdminEmail(admin.email);
        setSelectedPermissions(admin.permissions);
        setNewAdminPassword(''); // Clear password field for editing
         setAdminDashboardSection('manageAdmins'); // Ensure the section is visible
    };

     const handleUpdateAdmin = (e: FormEvent) => {
        e.preventDefault();
         if (!hasPermission(PERMISSIONS.MANAGE_ADMINS) || !editingAdmin) return;

         // Check for email/username conflicts excluding the current admin being edited
          if (users.some(u => u.email === newAdminEmail) || adminUsers.some(u => u.email === newAdminEmail && u.id !== editingAdmin.id)) {
            alert('Email already exists.');
            return;
        }
         if (users.some(u => u.username === newAdminUsername) || adminUsers.some(a => a.username === newAdminUsername && a.id !== editingAdmin.id)) {
            alert('Username already taken.');
            return;
        }


        setAdminUsers(prevAdmins => prevAdmins.map(admin => {
            if (admin.id === editingAdmin.id) {
                const updatedAdmin: AdminUser = {
                    ...admin,
                    username: newAdminUsername || admin.username,
                    email: newAdminEmail || admin.email,
                    permissions: selectedPermissions,
                     // Only update password if a new one is entered
                    passwordChanged: newAdminPassword ? true : admin.passwordChanged,
                    // Add logic here to hash newAdminPassword if provided
                };
                 // Special handling for the default admin password change
                if(admin.email === 'admin@mmpcs.net' && !admin.passwordChanged && newAdminPassword) {
                    updatedAdmin.passwordChanged = true;
                }

                 // If the currently logged-in admin is editing themselves, update the loggedInUser state
                 if (loggedInUser?.id === admin.id) {
                     setLoggedInUser(updatedAdmin);
                 }
                  // Reset password prompt if the default admin password was changed
                 if(loggedInUser?.id === admin.id && admin.email === 'admin@mmpcs.net' && updatedAdmin.passwordChanged && showPasswordChangePrompt){
                    setShowPasswordChangePrompt(false);
                 }

                return updatedAdmin;
            }
            return admin;
        }));


        setEditingAdmin(null);
        setNewAdminEmail('');
        setNewAdminPassword('');
        setNewAdminUsername('');
        setSelectedPermissions([]);
        alert('Admin account updated.');
    };

     const handleDeleteAdmin = (id: string) => {
        if (!hasPermission(PERMISSIONS.MANAGE_ADMINS)) return;
        // Prevent deleting the last admin or the default admin if password not changed
        const adminToDelete = adminUsers.find(a => a.id === id);
        if(adminToDelete?.email === 'admin@mmpcs.net' && !adminToDelete.passwordChanged){
            alert('Cannot delete the default admin until the password is changed.');
            return;
        }
        if (adminUsers.length <= 1) {
            alert('Cannot delete the last admin account.');
            return;
        }
        if (loggedInUser?.id === id) {
            alert('Cannot delete your own account.');
            return;
        }
        if (window.confirm('Are you sure you want to delete this admin account?')) {
            setAdminUsers(adminUsers.filter(admin => admin.id !== id));
        }
    };

     const handleTogglePermission = (permission: string) => {
        setSelectedPermissions(prev =>
            prev.includes(permission)
                ? prev.filter(p => p !== permission)
                : [...prev, permission]
        );
    };

    const handleAddBadge = (e: FormEvent) => {
        e.preventDefault();
        if (!hasPermission(PERMISSIONS.MANAGE_BADGES)) return;
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
    };

    const handleEditBadge = (badge: Badge) => {
        if (!hasPermission(PERMISSIONS.MANAGE_BADGES)) return;
        setEditingBadge(badge);
        setNewBadgeName(badge.name);
        setNewBadgeEmoji(badge.emoji);
        setNewBadgeDesc(badge.description);
         setAdminDashboardSection('manageBadges'); // Ensure section is visible
    };

    const handleUpdateBadge = (e: FormEvent) => {
        e.preventDefault();
        if (!hasPermission(PERMISSIONS.MANAGE_BADGES) || !editingBadge) return;
        setBadges(prevBadges => prevBadges.map(b =>
            b.id === editingBadge.id
                ? { ...b, name: newBadgeName, emoji: newBadgeEmoji, description: newBadgeDesc }
                : b
        ));
        setEditingBadge(null);
        setNewBadgeName('');
        setNewBadgeEmoji('');
        setNewBadgeDesc('');
    };

    const handleDeleteBadge = (id: string) => {
        if (!hasPermission(PERMISSIONS.MANAGE_BADGES)) return;
        if (window.confirm('Are you sure you want to delete this badge? This will remove it from all users.')) {
             setBadges(badges.filter(badge => badge.id !== id));
             // Also remove the badge from users
            const updateUserBadges = (userList: (User|AdminUser)[]) => userList.map(u => ({
                ...u,
                badges: u.badges.filter(bId => bId !== id)
            }));
            setUsers(updateUserBadges(users) as User[]);
            setAdminUsers(updateUserBadges(adminUsers) as AdminUser[]);
             // Update loggedInUser if needed
            if(loggedInUser && loggedInUser.badges.includes(id)){
                setLoggedInUser({...loggedInUser, badges: loggedInUser.badges.filter(bId => bId !== id)});
            }
        }
    };

     const handleSmtpConfigChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (!hasPermission(PERMISSIONS.CONFIGURE_SYSTEM)) return;
        const { name, value } = e.target;
        setSmtpConfig(prev => ({ ...prev, [name]: value }));
    };

     const handleSaveSmtpConfig = (e: FormEvent) => {
        e.preventDefault();
         if (!hasPermission(PERMISSIONS.CONFIGURE_SYSTEM)) return;
         // In a real app, save this securely to backend config
         console.log("SMTP Config Saved (Simulated):", smtpConfig);
         alert('SMTP configuration saved (simulation).');
    };

     const handleAssignBadge = (userId: string, badgeId: string) => {
        if (!hasPermission(PERMISSIONS.MANAGE_USERS)) return;

        const assignToUser = (userList: (User|AdminUser)[]) => userList.map(u => {
            if (u.id === userId && !u.badges.includes(badgeId)) {
                return { ...u, badges: [...u.badges, badgeId] };
            }
            return u;
        });

        setUsers(assignToUser(users) as User[]);
        setAdminUsers(assignToUser(adminUsers) as AdminUser[]);
          // Update loggedInUser if needed
         if(loggedInUser?.id === userId && !loggedInUser.badges.includes(badgeId)){
             setLoggedInUser({...loggedInUser, badges: [...loggedInUser.badges, badgeId]});
         }
    };

    const handleRemoveBadge = (userId: string, badgeId: string) => {
        if (!hasPermission(PERMISSIONS.MANAGE_USERS)) return;

         const removeFromUser = (userList: (User|AdminUser)[]) => userList.map(u => {
            if (u.id === userId) {
                return { ...u, badges: u.badges.filter(b => b !== badgeId) };
            }
            return u;
        });

        setUsers(removeFromUser(users) as User[]);
        setAdminUsers(removeFromUser(adminUsers) as AdminUser[]);
         // Update loggedInUser if needed
         if(loggedInUser?.id === userId){
             setLoggedInUser({...loggedInUser, badges: loggedInUser.badges.filter(b => b !== badgeId)});
         }
    };

    const handleLinkAdminAccount = (adminId: string, targetUserId: string | '') => {
         if (!hasPermission(PERMISSIONS.MANAGE_USERS)) return;
         setAdminUsers(prevAdmins => prevAdmins.map(admin => {
             if (admin.id === adminId) {
                 return { ...admin, linkedUserId: targetUserId === '' ? undefined : targetUserId };
             }
             return admin;
         }));
          // Update loggedInUser if they are the admin being linked/unlinked
         if(loggedInUser?.id === adminId){
             setLoggedInUser({...loggedInUser, linkedUserId: targetUserId === '' ? undefined : targetUserId} as AdminUser)
         }
    };

     const handleAddComment = (postId: string) => {
        if (!loggedInUser || !newCommentText[postId]?.trim()) return;

        const newComment: Comment = {
            id: generateId(),
            postId: postId,
            authorId: loggedInUser.id,
            text: newCommentText[postId].trim(),
            createdAt: new Date(),
        };

        setBlogPosts(prevPosts => prevPosts.map(post => {
            if (post.id === postId) {
                return { ...post, comments: [...post.comments, newComment] };
            }
            return post;
        }));

        // Clear comment input for that post
        setNewCommentText(prev => ({ ...prev, [postId]: '' }));
    };

  // --- Rendering ---

  const renderNavbar = () => (
    <nav className={`p-4 shadow-md ${getPrimaryColorClasses('bg', 600)} text-white ${getFontFamilyClass()}`}>
      <div className="container mx-auto flex justify-between items-center">
        <div className={`text-2xl font-bold cursor-pointer`} onClick={() => handleNavigation('home')}>
          Minecraft Server
        </div>
        <div className="space-x-4 flex items-center">
          <a href="#home" onClick={(e) => { e.preventDefault(); handleNavigation('home'); }} className="hover:text-gray-200">Home</a>
          <a href="#blog" onClick={(e) => { e.preventDefault(); handleNavigation('blog'); }} className="hover:text-gray-200">Blog</a>
          <a href="#posts" onClick={(e) => { e.preventDefault(); handleNavigation('posts'); }} className="hover:text-gray-200">User Posts</a>
          <a href="#status" onClick={(e) => { e.preventDefault(); handleNavigation('status'); }} className="hover:text-gray-200">Server Status</a>
          {isAdmin(loggedInUser) && hasPermission(PERMISSIONS.VIEW_SHOP) && (
              <a href="#shop" onClick={(e) => { e.preventDefault(); handleNavigation('shop'); }} className="hover:text-gray-200">Shop (Admin View)</a>
          )}
          {loggedInUser ? (
            <>
              <div className="flex items-center space-x-2">
                  {loggedInUser.profilePicUrl ? (
                      <img src={loggedInUser.profilePicUrl} alt="Profile" className={`w-8 h-8 rounded-full ${getRoundedClass()}`} />
                  ) : (
                     <div className={`bg-gray-300 border-2 border-dashed ${getRoundedClass('button')} w-8 h-8 flex items-center justify-center text-sm text-gray-600`}>
                        {loggedInUser.username.substring(0,1)}
                    </div>
                  )}
                <a href="#profile" onClick={(e) => { e.preventDefault(); handleNavigation('profile'); }} className="hover:text-gray-200">{loggedInUser.username}</a>
                {isAdmin(loggedInUser) && <span className={`px-2 py-0.5 text-xs ${getPrimaryColorClasses('bg', 800)} rounded-full`}>Admin</span>}
                 {renderUserBadges(loggedInUser, 'inline-flex')}
              </div>
              <button
                onClick={handleLogout}
                className={`px-3 py-1 bg-red-500 hover:bg-red-600 text-white ${getRoundedClass('button')}`}
              >
                Logout
              </button>
              {isAdmin(loggedInUser) && (
                 <button
                    onClick={() => setCurrentPage('adminDashboard')}
                    className={`px-3 py-1 ${getPrimaryColorClasses('bg', 700)} hover:${getPrimaryColorClasses('bg', 800)} text-white ${getRoundedClass('button')}`}
                 >
                    Admin Dashboard
                 </button>
              )}
            </>
          ) : (
            <>
              <a href="#login" onClick={(e) => { e.preventDefault(); handleNavigation('login'); }} className={`px-3 py-1 ${getPrimaryColorClasses('bg', 500)} hover:${getPrimaryColorClasses('bg', 700)} text-white ${getRoundedClass('button')}`}>Login</a>
               <a href="#register" onClick={(e) => { e.preventDefault(); handleNavigation('register'); }} className={`px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white ${getRoundedClass('button')}`}>Register</a>
            </>
          )}
        </div>
      </div>
    </nav>
  );

  const renderUserBadges = (user: User | AdminUser, displayClass: string = 'flex') => {
    const admin = adminUsers.find(a => a.id === user.id);
    const linkedUser = admin?.linkedUserId ? users.find(u => u.id === admin.linkedUserId) : null;
    const isLinkedAdminOnUserView = !isAdmin(user) && adminUsers.some(a => a.linkedUserId === user.id);

    const allBadgeIds = new Set([...user.badges, ...(linkedUser?.badges ?? [])]);

    if (isLinkedAdminOnUserView){
         const adminBadge : Badge = {id: 'admin-link-badge', name: 'Admin', emoji: '🛡️', description: 'Linked Admin Account'};
         return (
             <span className={`${displayClass} items-center gap-1 ml-1`}>
                 <span title={adminBadge.description} className="cursor-default">{adminBadge.emoji}</span>
             </span>
         );
    }

    return (
      <span className={`${displayClass} items-center gap-1 ml-1`}>
        {Array.from(allBadgeIds).map(badgeId => {
          const badge = badges.find(b => b.id === badgeId);
          return badge ? (
            <span key={badge.id} title={badge.name + ': ' + badge.description} className="cursor-default">{badge.emoji}</span>
          ) : null;
        })}
      </span>
    );
  };

   const renderUserProfile = (user: User | AdminUser) => {
       const author = findUserById(user.id);
       if (!author) return <span className="italic text-gray-500">Unknown User</span>;

       return (
           <div className="flex items-center space-x-2">
                {author.profilePicUrl ? (
                    <img src={author.profilePicUrl} alt={author.username} className={`w-8 h-8 ${getRoundedClass('full')} object-cover`} />
                 ) : (
                    <div className={`bg-gray-300 border-2 border-dashed ${getRoundedClass('full')} w-8 h-8 flex items-center justify-center text-sm text-gray-600`}>
                        {author.username.substring(0,1)}
                    </div>
                 )}
                <span className="font-semibold">{author.username}</span>
                {renderUserBadges(author)}
            </div>
       );
   };

   const renderCommentAuthor = (comment: Comment) => {
        const author = findUserById(comment.authorId);
        if (!author) return <span className="italic text-gray-500">Unknown User</span>;

        // Check if author is an admin with comment permission
        const authorIsAdmin = isAdmin(author);
        const canCommentAsAdmin = authorIsAdmin && author.permissions.includes(PERMISSIONS.COMMENT_AS_ADMIN);

        if (canCommentAsAdmin) {
             return (
                 <div className="flex items-center space-x-2">
                    <span className={`font-semibold px-2 py-0.5 text-sm ${getPrimaryColorClasses('bg', 600)} text-white rounded-md`}>Admin</span>
                </div>
            );
        }

       // Render normal user profile
       return renderUserProfile(author);
   };


  const renderHomePage = () => (
    <div className={`container mx-auto p-6 ${getFontFamilyClass()}`}>
      <h1 className="text-4xl font-bold mb-4">Welcome to Our Minecraft Server!</h1>
      <p className="text-lg text-gray-700 mb-6">
        Join our community and start your adventure today. Explore vast lands, build amazing creations, and make new friends!
        This content can be changed from the admin dashboard.
      </p>
      <div className={`p-6 bg-white border ${getRoundedClass('card')} shadow-md`}>
         <h2 className="text-2xl font-semibold mb-3">Server Features</h2>
         <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>Survival Mode with Land Claiming</li>
            <li>Creative World for Builders</li>
            <li>Minigames and Events</li>
            <li>Friendly Community and Staff</li>
            <li>Regular Updates</li>
         </ul>
      </div>
    </div>
  );

  const renderBlogPage = () => {
      const parts = currentPage.split('/');
      const postId = parts.length > 1 ? parts[1] : null;

      if(postId){
          const post = blogPosts.find(p => p.id === postId);
          if(!post) return <div className="container mx-auto p-6 text-red-500">Blog post not found. <a href="#blog" onClick={(e) => {e.preventDefault(); handleNavigation('blog')}} className="underline">Return to Blog List</a></div>;

          const author = findUserById(post.authorId);

          return (
              <div className={`container mx-auto p-6 ${getFontFamilyClass()}`}>
                  <a href="#blog" onClick={(e) => {e.preventDefault(); handleNavigation('blog')}} className={`text-${siteStyles.primaryColor}-600 hover:underline mb-4 inline-block`}>&larr; Back to Blog</a>
                  <article className={`p-6 bg-white border ${getRoundedClass('card')} shadow-md`}>
                      <h1 className="text-3xl font-bold mb-2">{post.title}</h1>
                      <div className="text-sm text-gray-500 mb-4">
                          Posted by {author ? renderUserProfile(author) : 'Unknown'} on {post.createdAt.toLocaleDateString()}
                      </div>
                      <div className="prose max-w-none text-gray-800">
                         {/* In a real app, sanitize this content or use Markdown */}
                         <p>{post.content}</p>
                      </div>

                      {/* Comments Section */}
                       <div className="mt-8 border-t pt-6">
                            <h3 className="text-xl font-semibold mb-4">Comments ({post.comments.length})</h3>
                             {post.comments.length === 0 ? (
                                <p className="text-gray-500 italic">No comments yet.</p>
                            ) : (
                                <div className="space-y-4">
                                    {post.comments.slice().sort((a,b) => a.createdAt.getTime() - b.createdAt.getTime()).map(comment => (
                                        <div key={comment.id} className={`p-3 bg-gray-50 border ${getRoundedClass('md')}`}>
                                           <div className="flex justify-between items-center mb-1">
                                                {renderCommentAuthor(comment)}
                                                <span className="text-xs text-gray-400">{comment.createdAt.toLocaleString()}</span>
                                           </div>
                                            <p className="text-gray-700">{comment.text}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Add Comment Form */}
                            {loggedInUser && (
                                <form onSubmit={(e) => { e.preventDefault(); handleAddComment(post.id); }} className="mt-6">
                                    <h4 className="text-lg font-medium mb-2">Leave a Comment</h4>
                                    <textarea
                                        value={newCommentText[post.id] || ''}
                                        onChange={(e) => setNewCommentText(prev => ({...prev, [post.id]: e.target.value}))}
                                        placeholder="Write your comment..."
                                        rows={3}
                                        className={`w-full p-2 border ${getRoundedClass('input')} focus:ring-${siteStyles.primaryColor}-500 focus:border-${siteStyles.primaryColor}-500`}
                                        required
                                    ></textarea>
                                    <button
                                        type="submit"
                                        className={`mt-2 px-4 py-2 ${getPrimaryColorClasses('bg')} text-white ${getRoundedClass('button')} hover:${getPrimaryColorClasses('bg', 600)}`}
                                    >
                                        Post Comment
                                    </button>
                                </form>
                            )}
                             {!loggedInUser && (
                                <p className="mt-6 text-gray-600">
                                    <a href="#login" onClick={(e) => { e.preventDefault(); handleNavigation('login'); }} className={`text-${siteStyles.primaryColor}-600 hover:underline font-medium`}>Log in</a> to leave a comment.
                                </p>
                            )}
                       </div>
                  </article>
              </div>
          );
      }

      // Blog List View
      return (
        <div className={`container mx-auto p-6 ${getFontFamilyClass()}`}>
          <h1 className="text-3xl font-bold mb-6">Blog</h1>
          <div className="space-y-6">
            {blogPosts.length > 0 ? blogPosts.slice().sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime()).map(post => {
                 const author = findUserById(post.authorId);
                return (
                    <div key={post.id} className={`p-6 bg-white border ${getRoundedClass('card')} shadow-md hover:shadow-lg transition-shadow`}>
                        <h2 className="text-2xl font-semibold mb-2">
                         <a href={`#blog/${post.id}`} onClick={(e) => {e.preventDefault(); handleNavigation(`blog/${post.id}`)}} className={`hover:text-${siteStyles.primaryColor}-700`}>
                            {post.title}
                         </a>
                        </h2>
                        <div className="text-sm text-gray-500 mb-3">
                             Posted by {author ? renderUserProfile(author) : 'Unknown'} on {post.createdAt.toLocaleDateString()}
                        </div>
                        <p className="text-gray-700 mb-4 truncate">{post.content}</p>
                         <a href={`#blog/${post.id}`} onClick={(e) => {e.preventDefault(); handleNavigation(`blog/${post.id}`)}} className={`text-${siteStyles.primaryColor}-600 hover:underline font-medium`}>
                            Read More &rarr;
                        </a>
                    </div>
                );
            }) : <p>No blog posts yet.</p>}
          </div>
        </div>
      );
  };

  const renderUserPostsPage = () => (
    <div className={`container mx-auto p-6 ${getFontFamilyClass()}`}>
      <h1 className="text-3xl font-bold mb-6">User Posts</h1>

      {loggedInUser && (
        <form onSubmit={handleUserPostSubmit} className={`mb-8 p-4 bg-white border ${getRoundedClass('card')} shadow`}>
          <h2 className="text-xl font-semibold mb-3">Create a Post</h2>
          <textarea
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            placeholder="What's on your mind?"
            rows={3}
            className={`w-full p-2 border ${getRoundedClass('input')} focus:ring-${siteStyles.primaryColor}-500 focus:border-${siteStyles.primaryColor}-500 mb-2`}
            required
          ></textarea>
           {/* Basic file input simulation */}
          <label className="block mb-2 text-sm font-medium text-gray-700">Upload Image/Media (Optional):
             <input type="file" accept="image/*,video/*" className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 mt-1"/>
           </label>
          <button
            type="submit"
            className={`px-4 py-2 ${getPrimaryColorClasses('bg')} text-white ${getRoundedClass('button')} hover:${getPrimaryColorClasses('bg', 600)}`}
          >
            Post
          </button>
        </form>
      )}
       {!loggedInUser && (
           <p className="mb-8 text-gray-600">
                <a href="#login" onClick={(e) => { e.preventDefault(); handleNavigation('login'); }} className={`text-${siteStyles.primaryColor}-600 hover:underline font-medium`}>Log in</a> to create posts.
            </p>
       )}

      <div className="space-y-6">
        {userPosts.length > 0 ? userPosts.slice().sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime()).map(post => {
          const author = findUserById(post.authorId);
          return (
            <div key={post.id} className={`p-4 bg-white border ${getRoundedClass('card')} shadow`}>
              <div className="flex justify-between items-start mb-2">
                 {author ? renderUserProfile(author) : <span className="italic text-gray-500">Unknown User</span>}
                <span className="text-xs text-gray-400">{post.createdAt.toLocaleString()}</span>
              </div>
              <p className="text-gray-800 mb-2">{post.content}</p>
              {post.mediaUrl && ( // Placeholder for uploaded media
                 <div className="mt-2">
                     {/* Basic image display simulation */}
                     <img src={post.mediaUrl} alt="User upload" className={`max-w-sm max-h-60 ${getRoundedClass('md')} border`} />
                 </div>
              )}
               {/* Add moderation tools for admins if needed */}
               {hasPermission(PERMISSIONS.MODERATE_POSTS) && (
                   <div className="mt-2 border-t pt-2">
                      <button className="text-xs text-red-500 hover:text-red-700">Delete Post</button>
                   </div>
               )}
            </div>
          );
        }) : <p className="text-gray-500 italic">No user posts yet.</p>}
      </div>
    </div>
  );

  const renderStatusPage = () => (
    <div className={`container mx-auto p-6 ${getFontFamilyClass()}`}>
      <h1 className="text-3xl font-bold mb-6">Server Status</h1>
      <div className={`p-6 bg-white border ${getRoundedClass('card')} shadow-md flex items-center space-x-4`}>
        <span className={`h-4 w-4 rounded-full ${
          serverStatus === 'online' ? 'bg-green-500' : serverStatus === 'offline' ? 'bg-red-500' : 'bg-yellow-500'
        }`}></span>
        <div>
          <p className="text-xl font-semibold">
            Server is currently: <span className={`font-bold ${
              serverStatus === 'online' ? 'text-green-600' : serverStatus === 'offline' ? 'text-red-600' : 'text-yellow-600'
            }`}>{serverStatus.toUpperCase()}</span>
          </p>
          {serverStatus === 'online' && <p className="text-gray-600">Players Online: 15/100 (Simulated)</p>}
           {serverStatus === 'maintenance' && <p className="text-gray-600">Expected downtime: ~1 hour</p>}
        </div>
      </div>
       {/* Admin control to change status */}
      {isAdmin(loggedInUser) && hasPermission(PERMISSIONS.CONFIGURE_SYSTEM) && (
          <div className="mt-6">
             <h3 className="text-lg font-semibold mb-2">Admin: Set Server Status</h3>
             <select
                value={serverStatus}
                onChange={(e) => setServerStatus(e.target.value as 'online' | 'offline' | 'maintenance')}
                className={`p-2 border ${getRoundedClass('input')} focus:ring-${siteStyles.primaryColor}-500 focus:border-${siteStyles.primaryColor}-500`}
             >
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="maintenance">Maintenance</option>
            </select>
          </div>
      )}
    </div>
  );

   const renderLoginPage = () => (
    <div className={`min-h-screen flex items-center justify-center bg-gray-100 ${getFontFamilyClass()}`}>
      <div className={`p-8 bg-white ${getRoundedClass('card')} shadow-md w-full max-w-md`}>
        <h2 className="text-2xl font-bold text-center mb-6">Login</h2>
        <form onSubmit={handleUserLogin}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="login-email">Email</label>
            <input
              type="email"
              id="login-email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              className={`w-full p-2 border ${getRoundedClass('input')} focus:ring-${siteStyles.primaryColor}-500 focus:border-${siteStyles.primaryColor}-500`}
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 mb-2" htmlFor="login-password">Password</label>
            <input
              type="password"
              id="login-password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className={`w-full p-2 border ${getRoundedClass('input')} focus:ring-${siteStyles.primaryColor}-500 focus:border-${siteStyles.primaryColor}-500`}
              required
            />
          </div>
          <button
            type="submit"
            className={`w-full py-2 px-4 ${getPrimaryColorClasses('bg')} text-white ${getRoundedClass('button')} hover:${getPrimaryColorClasses('bg', 600)} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${siteStyles.primaryColor}-500`}
          >
            Login
          </button>
        </form>
        <p className="text-center mt-4 text-gray-600">
            Don't have an account? <a href="#register" onClick={(e) => { e.preventDefault(); handleNavigation('register'); }} className={`text-${siteStyles.primaryColor}-600 hover:underline`}>Register here</a>
        </p>
        {/* Simulated verification link area */}
         <div className="mt-6 border-t pt-4 text-sm text-gray-500">
            <p className="font-semibold mb-1">Email Verification Simulation:</p>
            {users.filter(u => !u.isVerified).map(u => (
                 <button key={u.id} onClick={() => handleVerifyEmail(u.id)} className="text-blue-500 hover:underline mr-2 mb-1">Verify {u.email}</button>
            ))}
            {users.every(u => u.isVerified) && <p className="italic">No pending verifications.</p>}
        </div>
      </div>
    </div>
  );

   const renderRegisterPage = () => (
     <div className={`min-h-screen flex items-center justify-center bg-gray-100 ${getFontFamilyClass()}`}>
      <div className={`p-8 bg-white ${getRoundedClass('card')} shadow-md w-full max-w-md`}>
        <h2 className="text-2xl font-bold text-center mb-6">Register</h2>
        <form onSubmit={handleRegister}>
           <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="register-username">Username</label>
            <input
              type="text"
              id="register-username"
              value={registerUsername}
              onChange={(e) => setRegisterUsername(e.target.value)}
              className={`w-full p-2 border ${getRoundedClass('input')} focus:ring-${siteStyles.primaryColor}-500 focus:border-${siteStyles.primaryColor}-500`}
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="register-email">Email</label>
            <input
              type="email"
              id="register-email"
              value={registerEmail}
              onChange={(e) => setRegisterEmail(e.target.value)}
              className={`w-full p-2 border ${getRoundedClass('input')} focus:ring-${siteStyles.primaryColor}-500 focus:border-${siteStyles.primaryColor}-500`}
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 mb-2" htmlFor="register-password">Password</label>
            <input
              type="password"
              id="register-password"
              value={registerPassword}
              onChange={(e) => setRegisterPassword(e.target.value)}
              className={`w-full p-2 border ${getRoundedClass('input')} focus:ring-${siteStyles.primaryColor}-500 focus:border-${siteStyles.primaryColor}-500`}
              required
            />
          </div>
          <button
            type="submit"
            className={`w-full py-2 px-4 ${getPrimaryColorClasses('bg')} text-white ${getRoundedClass('button')} hover:${getPrimaryColorClasses('bg', 600)} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${siteStyles.primaryColor}-500`}
          >
            Register
          </button>
        </form>
         <p className="text-center mt-4 text-gray-600">
            Already have an account? <a href="#login" onClick={(e) => { e.preventDefault(); handleNavigation('login'); }} className={`text-${siteStyles.primaryColor}-600 hover:underline`}>Login here</a>
        </p>
      </div>
    </div>
   );

  const renderAdminLoginPage = () => (
    <div className={`min-h-screen flex items-center justify-center bg-gray-900 text-white ${getFontFamilyClass()}`}>
      <div className={`p-8 bg-gray-800 ${getRoundedClass('card')} shadow-lg w-full max-w-md border border-gray-700`}>
        <h2 className="text-2xl font-bold text-center mb-6">Admin Login</h2>
        <form onSubmit={handleAdminLogin}>
          <div className="mb-4">
            <label className="block text-gray-300 mb-2" htmlFor="admin-login-email">Admin Email</label>
            <input
              type="email"
              id="admin-login-email"
              value={adminLoginEmail}
              onChange={(e) => setAdminLoginEmail(e.target.value)}
               className={`w-full p-2 border bg-gray-700 border-gray-600 ${getRoundedClass('input')} focus:ring-${siteStyles.primaryColor}-500 focus:border-${siteStyles.primaryColor}-500 text-white`}
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-300 mb-2" htmlFor="admin-login-password">Admin Password</label>
            <input
              type="password"
              id="admin-login-password"
              value={adminLoginPassword}
              onChange={(e) => setAdminLoginPassword(e.target.value)}
              className={`w-full p-2 border bg-gray-700 border-gray-600 ${getRoundedClass('input')} focus:ring-${siteStyles.primaryColor}-500 focus:border-${siteStyles.primaryColor}-500 text-white`}
              required
            />
          </div>
          <button
            type="submit"
            className={`w-full py-2 px-4 ${getPrimaryColorClasses('bg', 600)} text-white ${getRoundedClass('button')} hover:${getPrimaryColorClasses('bg', 700)} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-${siteStyles.primaryColor}-500`}
          >
            Admin Login
          </button>
        </form>
         <p className="text-center mt-4 text-sm text-gray-400">
            Access restricted to authorized personnel.
        </p>
      </div>
    </div>
  );

  const renderProfilePage = () => {
     if (!loggedInUser) {
         // Redirect to login if not logged in
         useEffect(() => { handleNavigation('login'); }, []);
         return null; // Or a loading indicator
     }

    return (
      <div className={`container mx-auto p-6 ${getFontFamilyClass()}`}>
        <h1 className="text-3xl font-bold mb-6">Your Profile</h1>
        <div className={`p-6 bg-white border ${getRoundedClass('card')} shadow-md`}>
           <div className="flex items-center space-x-4 mb-6">
                {loggedInUser.profilePicUrl ? (
                     <img src={loggedInUser.profilePicUrl} alt="Profile" className={`w-24 h-24 ${getRoundedClass('full')} object-cover border-2`} />
                ) : (
                    <div className={`bg-gray-200 border-2 border-dashed ${getRoundedClass('full')} w-24 h-24 flex items-center justify-center text-3xl text-gray-500`}>
                         {loggedInUser.username.substring(0,1)}
                    </div>
                )}
                <div>
                     <h2 className="text-2xl font-semibold">{loggedInUser.username}</h2>
                     <p className="text-gray-600">{loggedInUser.email}</p>
                     {isAdmin(loggedInUser) && <span className={`mt-1 inline-block px-2 py-0.5 text-xs ${getPrimaryColorClasses('bg', 600)} text-white rounded-full`}>Admin</span>}
                     <div className="mt-2">
                         {renderUserBadges(loggedInUser)}
                     </div>
                 </div>
           </div>

           <form onSubmit={handleProfileUpdate}>
                <h3 className="text-xl font-semibold mb-4 border-t pt-4">Update Profile</h3>
                 <div className="mb-4">
                    <label className="block text-gray-700 mb-2" htmlFor="profile-username">Change Username</label>
                    <input
                        type="text"
                        id="profile-username"
                        value={newProfileUsername}
                        onChange={(e) => setNewProfileUsername(e.target.value)}
                        placeholder={loggedInUser.username}
                        className={`w-full md:w-1/2 p-2 border ${getRoundedClass('input')} focus:ring-${siteStyles.primaryColor}-500 focus:border-${siteStyles.primaryColor}-500`}
                    />
                </div>
                 <div className="mb-4">
                    <label className="block text-gray-700 mb-2" htmlFor="profile-pic">Change Profile Picture</label>
                     <input
                        type="file"
                        id="profile-pic"
                        accept="image/*"
                        onChange={handleProfilePicChange}
                        className={`block w-full md:w-1/2 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-sm file:font-semibold file:bg-${siteStyles.primaryColor}-50 file:text-${siteStyles.primaryColor}-700 hover:file:bg-${siteStyles.primaryColor}-100 ${getRoundedClass('button')}`} />
                     {newProfilePic && <p className="text-sm text-gray-500 mt-1">Selected: {newProfilePic.name}</p>}
                 </div>
                 {/* Add password change section here if desired */}
                 <button
                    type="submit"
                    className={`px-4 py-2 ${getPrimaryColorClasses('bg')} text-white ${getRoundedClass('button')} hover:${getPrimaryColorClasses('bg', 600)}`}
                >
                    Save Changes
                </button>
           </form>
        </div>
      </div>
    );
  };

   const renderShopPage = () => {
     // Basic check, could add permission check too
     if (!isAdmin(loggedInUser)) {
        useEffect(() => { handleNavigation('home'); }, []);
        return null;
     }

     return (
      <div className={`container mx-auto p-6 ${getFontFamilyClass()}`}>
        <h1 className="text-3xl font-bold mb-6">Shop (Admin Preview - Unpublished)</h1>
        <div className={`p-6 bg-yellow-100 border border-yellow-300 text-yellow-800 ${getRoundedClass('card')} shadow-md mb-6`}>
            <p><span className="font-bold">Note:</span> This page is currently unpublished and only visible to administrators.</p>
        </div>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Placeholder Shop Items */}
            {[1, 2, 3].map(i => (
                <div key={i} className={`p-4 bg-white border ${getRoundedClass('card')} shadow`}>
                     <div className={`bg-gray-200 border-2 border-dashed ${getRoundedClass('lg')} w-full h-32 mb-4 flex items-center justify-center text-gray-400`}>Item Image {i}</div>
                     <h3 className="text-lg font-semibold mb-1">Shop Item {i}</h3>
                     <p className="text-gray-600 mb-2">Description for item {i}.</p>
                     <div className="flex justify-between items-center">
                        <span className="font-bold text-lg text-green-600">$9.99</span>
                         <button className={`px-3 py-1 bg-gray-700 text-white ${getRoundedClass('button')} text-sm hover:bg-gray-800`}>
                            Configure (Admin)
                         </button>
                    </div>
                </div>
            ))}
         </div>
      </div>
    );
   };

  // --- Admin Dashboard Rendering ---
  const renderAdminDashboard = () => {
    if (!isAdmin(loggedInUser)) {
       // Should not happen if routing is correct, but as a safeguard
       useEffect(() => { handleNavigation('home'); }, []);
       return null;
    }

    return (
      <div className={`min-h-screen bg-gray-100 ${getFontFamilyClass()}`}>
        {renderNavbar()} {/* Show navbar even in admin */}
        <div className="flex">
          {/* Admin Sidebar */}
          <aside className="w-64 bg-gray-800 text-gray-100 p-4 space-y-2 h-screen sticky top-0">
             <h2 className="text-xl font-semibold mb-4">Admin Menu</h2>
            <button onClick={() => setAdminDashboardSection('overview')} className={`block w-full text-left px-3 py-2 ${getRoundedClass('button')} hover:bg-gray-700 ${adminDashboardSection === 'overview' ? 'bg-gray-900' : ''}`}>Overview</button>
            {hasPermission(PERMISSIONS.MANAGE_CONTENT) && <button onClick={() => setAdminDashboardSection('content')} className={`block w-full text-left px-3 py-2 ${getRoundedClass('button')} hover:bg-gray-700 ${adminDashboardSection === 'content' ? 'bg-gray-900' : ''}`}>Manage Content</button>}
            {hasPermission(PERMISSIONS.MANAGE_STYLES) && <button onClick={() => setAdminDashboardSection('styles')} className={`block w-full text-left px-3 py-2 ${getRoundedClass('button')} hover:bg-gray-700 ${adminDashboardSection === 'styles' ? 'bg-gray-900' : ''}`}>Customize Styles</button>}
            {hasPermission(PERMISSIONS.MANAGE_BLOGS) && <button onClick={() => setAdminDashboardSection('manageBlogs')} className={`block w-full text-left px-3 py-2 ${getRoundedClass('button')} hover:bg-gray-700 ${adminDashboardSection === 'manageBlogs' ? 'bg-gray-900' : ''}`}>Manage Blog</button>}
            {hasPermission(PERMISSIONS.MANAGE_USERS) && <button onClick={() => setAdminDashboardSection('manageUsers')} className={`block w-full text-left px-3 py-2 ${getRoundedClass('button')} hover:bg-gray-700 ${adminDashboardSection === 'manageUsers' ? 'bg-gray-900' : ''}`}>Manage Users</button>}
             {hasPermission(PERMISSIONS.MANAGE_ADMINS) && <button onClick={() => setAdminDashboardSection('manageAdmins')} className={`block w-full text-left px-3 py-2 ${getRoundedClass('button')} hover:bg-gray-700 ${adminDashboardSection === 'manageAdmins' ? 'bg-gray-900' : ''}`}>Manage Admins</button>}
            {hasPermission(PERMISSIONS.MANAGE_BADGES) && <button onClick={() => setAdminDashboardSection('manageBadges')} className={`block w-full text-left px-3 py-2 ${getRoundedClass('button')} hover:bg-gray-700 ${adminDashboardSection === 'manageBadges' ? 'bg-gray-900' : ''}`}>Manage Badges</button>}
            {hasPermission(PERMISSIONS.CONFIGURE_SYSTEM) && <button onClick={() => setAdminDashboardSection('configureSmtp')} className={`block w-full text-left px-3 py-2 ${getRoundedClass('button')} hover:bg-gray-700 ${adminDashboardSection === 'configureSmtp' ? 'bg-gray-900' : ''}`}>System Config</button>}
             {hasPermission(PERMISSIONS.MODERATE_POSTS) && <button onClick={() => setAdminDashboardSection('moderatePosts')} className={`block w-full text-left px-3 py-2 ${getRoundedClass('button')} hover:bg-gray-700 ${adminDashboardSection === 'moderatePosts' ? 'bg-gray-900' : ''}`}>Moderate Posts</button>}
          </aside>

          {/* Admin Content Area */}
          <main className="flex-1 p-6">
             {showPasswordChangePrompt && (
                <div className={`p-4 mb-6 bg-red-100 border border-red-400 text-red-700 ${getRoundedClass('card')}`}>
                    <p><span className="font-bold">Action Required:</span> You are logged in with the default administrator password. Please change it immediately or create a new administrator account and delete the default one.</p>
                </div>
             )}

            {adminDashboardSection === 'overview' && renderAdminOverview()}
            {adminDashboardSection === 'content' && hasPermission(PERMISSIONS.MANAGE_CONTENT) && renderAdminManageContent()}
            {adminDashboardSection === 'styles' && hasPermission(PERMISSIONS.MANAGE_STYLES) && renderAdminCustomizeStyles()}
            {adminDashboardSection === 'manageBlogs' && hasPermission(PERMISSIONS.MANAGE_BLOGS) && renderAdminManageBlog()}
            {adminDashboardSection === 'manageUsers' && hasPermission(PERMISSIONS.MANAGE_USERS) && renderAdminManageUsers()}
             {adminDashboardSection === 'manageAdmins' && hasPermission(PERMISSIONS.MANAGE_ADMINS) && renderAdminManageAdmins()}
            {adminDashboardSection === 'manageBadges' && hasPermission(PERMISSIONS.MANAGE_BADGES) && renderAdminManageBadges()}
             {adminDashboardSection === 'configureSmtp' && hasPermission(PERMISSIONS.CONFIGURE_SYSTEM) && renderAdminConfigureSmtp()}
             {adminDashboardSection === 'moderatePosts' && hasPermission(PERMISSIONS.MODERATE_POSTS) && renderAdminModeratePosts()}
          </main>
        </div>
      </div>
    );
  };

  const renderAdminOverview = () => (
    <div>
        <h1 className="text-2xl font-bold mb-4">Admin Overview</h1>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             <div className={`p-4 bg-white border ${getRoundedClass('card')} shadow`}>
                 <h3 className="font-semibold text-lg mb-2">Total Users</h3>
                 <p className="text-3xl font-bold">{users.length}</p>
             </div>
              <div className={`p-4 bg-white border ${getRoundedClass('card')} shadow`}>
                 <h3 className="font-semibold text-lg mb-2">Total Admins</h3>
                 <p className="text-3xl font-bold">{adminUsers.length}</p>
             </div>
              <div className={`p-4 bg-white border ${getRoundedClass('card')} shadow`}>
                 <h3 className="font-semibold text-lg mb-2">Blog Posts</h3>
                 <p className="text-3xl font-bold">{blogPosts.length}</p>
             </div>
              <div className={`p-4 bg-white border ${getRoundedClass('card')} shadow`}>
                 <h3 className="font-semibold text-lg mb-2">User Posts</h3>
                 <p className="text-3xl font-bold">{userPosts.length}</p>
             </div>
              <div className={`p-4 bg-white border ${getRoundedClass('card')} shadow`}>
                 <h3 className="font-semibold text-lg mb-2">Server Status</h3>
                 <p className={`text-3xl font-bold ${serverStatus === 'online' ? 'text-green-600' : serverStatus === 'offline' ? 'text-red-600' : 'text-yellow-600'}`}>{serverStatus.toUpperCase()}</p>
             </div>
         </div>
    </div>
);

const renderAdminManageContent = () => (
    <div>
        <h1 className="text-2xl font-bold mb-4">Manage Website Content</h1>
        <div className={`p-4 bg-white border ${getRoundedClass('card')} shadow`}>
             <h3 className="font-semibold text-lg mb-2">Home Page Content (Example)</h3>
             <textarea
                defaultValue="This is the editable home page content area. Add instructions or more fields as needed."
                rows={5}
                className={`w-full p-2 border ${getRoundedClass('input')} focus:ring-${siteStyles.primaryColor}-500 focus:border-${siteStyles.primaryColor}-500 mb-2`}
            />
            <button className={`px-4 py-2 ${getPrimaryColorClasses('bg')} text-white ${getRoundedClass('button')} hover:${getPrimaryColorClasses('bg', 600)}`}>Save Home Content</button>
        </div>
        {/* Add more content sections here */}
    </div>
);

const renderAdminCustomizeStyles = () => (
    <div>
        <h1 className="text-2xl font-bold mb-4">Customize Website Styles</h1>
         <div className={`p-4 bg-white border ${getRoundedClass('card')} shadow space-y-4`}>
            <div>
                <label className="block text-gray-700 mb-1 font-medium">Primary Color</label>
                <select
                    name="primaryColor"
                    value={siteStyles.primaryColor}
                    onChange={handleStyleChange}
                    className={`p-2 border ${getRoundedClass('input')} focus:ring-${siteStyles.primaryColor}-500 focus:border-${siteStyles.primaryColor}-500`}
                >
                    <option value="blue">Blue</option>
                    <option value="green">Green</option>
                    <option value="purple">Purple</option>
                    <option value="red">Red</option>
                    <option value="yellow">Yellow</option>
                    <option value="indigo">Indigo</option>
                     <option value="pink">Pink</option>
                     <option value="gray">Gray</option>
                </select>
            </div>
            <div>
                <label className="block text-gray-700 mb-1 font-medium">Font Family</label>
                <select
                    name="fontFamily"
                    value={siteStyles.fontFamily}
                    onChange={handleStyleChange}
                    className={`p-2 border ${getRoundedClass('input')} focus:ring-${siteStyles.primaryColor}-500 focus:border-${siteStyles.primaryColor}-500`}
                >
                    <option value="sans">Sans-Serif (Default)</option>
                    <option value="serif">Serif</option>
                    <option value="mono">Monospace</option>
                </select>
            </div>
             <div>
                <label className="block text-gray-700 mb-1 font-medium">Rounded Corners</label>
                <select
                    name="roundedCorners"
                    value={siteStyles.roundedCorners}
                    onChange={handleStyleChange}
                    className={`p-2 border ${getRoundedClass('input')} focus:ring-${siteStyles.primaryColor}-500 focus:border-${siteStyles.primaryColor}-500`}
                >
                    <option value="none">None</option>
                    <option value="sm">Small</option>
                    <option value="md">Medium</option>
                    <option value="lg">Large</option>
                    <option value="xl">Extra Large</option>
                     <option value="2xl">2XL</option>
                     <option value="3xl">3XL</option>
                    <option value="full">Full</option>
                </select>
            </div>
             <p className="text-sm text-gray-500 italic">Changes are applied live (in this simulation).</p>
         </div>
    </div>
);

 const renderAdminManageBlog = () => (
    <div>
        <h1 className="text-2xl font-bold mb-4">Manage Blog Posts</h1>

        {/* Add New Blog Post Form */}
        <form onSubmit={handleAddBlog} className={`mb-6 p-4 bg-white border ${getRoundedClass('card')} shadow`}>
             <h3 className="font-semibold text-lg mb-3">Add New Blog Post</h3>
            <div className="mb-3">
                <label className="block text-gray-700 mb-1" htmlFor="new-blog-title">Title</label>
                <input
                    type="text"
                    id="new-blog-title"
                    value={newBlogTitle}
                    onChange={(e) => setNewBlogTitle(e.target.value)}
                    className={`w-full p-2 border ${getRoundedClass('input')} focus:ring-${siteStyles.primaryColor}-500 focus:border-${siteStyles.primaryColor}-500`}
                    required
                />
            </div>
             <div className="mb-3">
                <label className="block text-gray-700 mb-1" htmlFor="new-blog-content">Content</label>
                <textarea
                    id="new-blog-content"
                    value={newBlogContent}
                    onChange={(e) => setNewBlogContent(e.target.value)}
                    rows={5}
                    className={`w-full p-2 border ${getRoundedClass('input')} focus:ring-${siteStyles.primaryColor}-500 focus:border-${siteStyles.primaryColor}-500`}
                    required
                ></textarea>
            </div>
             <button
                type="submit"
                className={`px-4 py-2 ${getPrimaryColorClasses('bg')} text-white ${getRoundedClass('button')} hover:${getPrimaryColorClasses('bg', 600)}`}
            >
                Add Post
            </button>
        </form>

         {/* List Existing Blog Posts */}
         <div className={`p-4 bg-white border ${getRoundedClass('card')} shadow`}>
            <h3 className="font-semibold text-lg mb-3">Existing Blog Posts</h3>
             <ul className="space-y-2">
                 {blogPosts.slice().sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime()).map(post => (
                     <li key={post.id} className="flex justify-between items-center p-2 border-b last:border-b-0">
                         <span>
                             <a href={`#blog/${post.id}`} target="_blank" rel="noopener noreferrer" className={`hover:text-${siteStyles.primaryColor}-600 hover:underline`}>{post.title}</a>
                             <span className="text-xs text-gray-500 ml-2">({post.createdAt.toLocaleDateString()})</span>
                         </span>
                         <button
                            onClick={() => handleDeleteBlog(post.id)}
                             className={`px-2 py-1 bg-red-500 text-white text-xs ${getRoundedClass('button')} hover:bg-red-600`}
                         >
                             Delete
                         </button>
                     </li>
                 ))}
                 {blogPosts.length === 0 && <p className="italic text-gray-500">No blog posts yet.</p>}
            </ul>
        </div>
    </div>
 );

const renderAdminManageUsers = () => (
    <div>
        <h1 className="text-2xl font-bold mb-4">Manage Users</h1>
         <div className={`p-4 bg-white border ${getRoundedClass('card')} shadow overflow-x-auto`}>
            <h3 className="font-semibold text-lg mb-3">All Users ({users.length + adminUsers.length})</h3>
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                         <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Badges</th>
                         <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Link Admin</th>
                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                 <tbody className="bg-white divide-y divide-gray-200">
                     {[...adminUsers, ...users].map(user => {
                         const userIsAdmin = isAdmin(user);
                         const linkedAdmin = userIsAdmin ? user as AdminUser : null;
                         const userBadges = badges.filter(b => user.badges.includes(b.id));

                        return (
                            <tr key={user.id}>
                                <td className="px-4 py-2 whitespace-nowrap">
                                    <div className="flex items-center">
                                         {user.profilePicUrl ? (
                                            <img src={user.profilePicUrl} alt={user.username} className={`w-6 h-6 ${getRoundedClass('full')} mr-2 object-cover`} />
                                         ) : (
                                             <div className={`bg-gray-300 border-dashed border ${getRoundedClass('full')} w-6 h-6 flex items-center justify-center text-xs text-gray-600 mr-2`}>
                                                {user.username.substring(0,1)}
                                            </div>
                                         )}
                                        {user.username}
                                    </div>
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${userIsAdmin ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                                        {userIsAdmin ? 'Admin' : 'User'}
                                    </span>
                                     {!user.isVerified && !userIsAdmin && <span className="ml-1 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Unverified</span>}
                                </td>
                                 <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                     <div className="flex items-center space-x-1">
                                         {userBadges.map(b => (
                                             <span key={b.id} title={b.name} className="relative group">
                                                 {b.emoji}
                                                 <button onClick={() => handleRemoveBadge(user.id, b.id)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-3 h-3 flex items-center justify-center text-xxs opacity-0 group-hover:opacity-100">&times;</button>
                                             </span>
                                         ))}
                                         {userBadges.length === 0 && <span className="text-gray-400 italic">None</span>}
                                         {/* Dropdown to add badge */}
                                          <select onChange={(e) => e.target.value && handleAssignBadge(user.id, e.target.value)} value="" className="ml-1 text-xs border-none focus:ring-0 p-0">
                                             <option value="" disabled>+ Add</option>
                                             {badges.filter(b => !user.badges.includes(b.id)).map(b => (
                                                <option key={b.id} value={b.id}>{b.emoji} {b.name}</option>
                                             ))}
                                          </select>
                                     </div>
                                </td>
                                 <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                     {userIsAdmin ? (
                                         <select
                                             value={linkedAdmin?.linkedUserId || ''}
                                             onChange={(e) => handleLinkAdminAccount(user.id, e.target.value)}
                                             className={`text-xs p-1 border ${getRoundedClass('input')} ${linkedAdmin?.linkedUserId ? 'border-green-500' : 'border-gray-300'}`}
                                         >
                                             <option value="">None</option>
                                             {users.map(u => (
                                                 <option key={u.id} value={u.id}>{u.username}</option>
                                             ))}
                                         </select>
                                     ) : (
                                        // Show which admin is linked, if any
                                        adminUsers.find(a => a.linkedUserId === user.id)?.username || <span className="text-gray-400 italic">-</span>
                                     )}
                                 </td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium space-x-2">
                                     {/* Add actions like Ban, Mute, Edit Roles (if applicable) */}
                                     <button className="text-red-600 hover:text-red-900 text-xs">Ban</button>
                                      {!userIsAdmin && !user.isVerified && <button onClick={() => handleVerifyEmail(user.id)} className="text-green-600 hover:text-green-900 text-xs">Verify</button>}
                                </td>
                            </tr>
                         )
                    })}
                </tbody>
            </table>
        </div>
    </div>
);

 const renderAdminManageAdmins = () => {
     const isEditing = !!editingAdmin;
     const formTitle = isEditing ? `Editing Admin: ${editingAdmin.username}` : 'Add New Admin';
     const submitText = isEditing ? 'Update Admin' : 'Add Admin';
     const submitHandler = isEditing ? handleUpdateAdmin : handleAddAdmin;

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">Manage Administrators</h1>

              {/* Add/Edit Admin Form */}
            <form onSubmit={submitHandler} className={`mb-6 p-4 bg-white border ${getRoundedClass('card')} shadow`}>
                 <h3 className="font-semibold text-lg mb-3">{formTitle}</h3>
                  {isEditing && <p className="text-sm text-gray-500 mb-3">Editing user ID: {editingAdmin.id}</p>}
                 {showPasswordChangePrompt && editingAdmin?.email === 'admin@mmpcs.net' && (
                     <p className="text-sm text-red-600 mb-3 font-medium">Please set a new password for the default admin account.</p>
                 )}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                     <div>
                        <label className="block text-gray-700 mb-1" htmlFor="new-admin-username">Username</label>
                        <input
                            type="text"
                            id="new-admin-username"
                            value={newAdminUsername}
                            onChange={(e) => setNewAdminUsername(e.target.value)}
                             placeholder={isEditing ? editingAdmin.username : 'Optional'}
                             className={`w-full p-2 border ${getRoundedClass('input')} focus:ring-${siteStyles.primaryColor}-500 focus:border-${siteStyles.primaryColor}-500`}
                             required={!isEditing} // Required for new admins
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 mb-1" htmlFor="new-admin-email">Email</label>
                        <input
                            type="email"
                            id="new-admin-email"
                            value={newAdminEmail}
                            onChange={(e) => setNewAdminEmail(e.target.value)}
                             placeholder={isEditing ? editingAdmin.email : ''}
                            className={`w-full p-2 border ${getRoundedClass('input')} focus:ring-${siteStyles.primaryColor}-500 focus:border-${siteStyles.primaryColor}-500`}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 mb-1" htmlFor="new-admin-password">
                             {isEditing ? 'New Password (leave blank to keep current)' : 'Password'}
                        </label>
                        <input
                            type="password"
                            id="new-admin-password"
                            value={newAdminPassword}
                            onChange={(e) => setNewAdminPassword(e.target.value)}
                            className={`w-full p-2 border ${getRoundedClass('input')} focus:ring-${siteStyles.primaryColor}-500 focus:border-${siteStyles.primaryColor}-500`}
                             required={!isEditing || (showPasswordChangePrompt && editingAdmin?.email === 'admin@mmpcs.net')} // Required for new or default admin password change
                        />
                    </div>
                </div>

                 <div className="mb-4">
                    <label className="block text-gray-700 mb-2 font-medium">Permissions</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {Object.entries(PERMISSIONS).map(([key, value]) => (
                             <label key={value} className="flex items-center space-x-2 cursor-pointer">
                                 <input
                                     type="checkbox"
                                     checked={selectedPermissions.includes(value)}
                                     onChange={() => handleTogglePermission(value)}
                                      className={`rounded border-gray-300 text-${siteStyles.primaryColor}-600 shadow-sm focus:border-${siteStyles.primaryColor}-300 focus:ring focus:ring-offset-0 focus:ring-${siteStyles.primaryColor}-200 focus:ring-opacity-50`}
                                 />
                                 <span className="text-sm text-gray-700">{key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}</span>
                             </label>
                         ))}
                    </div>
                </div>

                 <div className="flex items-center space-x-3">
                     <button
                        type="submit"
                        className={`px-4 py-2 ${getPrimaryColorClasses('bg')} text-white ${getRoundedClass('button')} hover:${getPrimaryColorClasses('bg', 600)}`}
                    >
                        {submitText}
                    </button>
                     {isEditing && (
                        <button
                            type="button"
                            onClick={() => { setEditingAdmin(null); setNewAdminUsername(''); setNewAdminEmail(''); setNewAdminPassword(''); setSelectedPermissions([]);}}
                            className={`px-4 py-2 bg-gray-300 text-gray-700 ${getRoundedClass('button')} hover:bg-gray-400`}
                        >
                            Cancel Edit
                        </button>
                     )}
                 </div>
            </form>


             {/* List Existing Admins */}
            <div className={`p-4 bg-white border ${getRoundedClass('card')} shadow overflow-x-auto`}>
                <h3 className="font-semibold text-lg mb-3">Current Administrators</h3>
                <table className="min-w-full divide-y divide-gray-200">
                     <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin</th>
                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permissions</th>
                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                     </thead>
                     <tbody className="bg-white divide-y divide-gray-200">
                         {adminUsers.map(admin => (
                             <tr key={admin.id}>
                                 <td className="px-4 py-2 whitespace-nowrap">{admin.username}</td>
                                 <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{admin.email}</td>
                                <td className="px-4 py-2 text-sm text-gray-500 max-w-xs">
                                     {admin.permissions.length === Object.keys(PERMISSIONS).length
                                         ? <span className="font-medium">All</span>
                                         : admin.permissions.map(p => p.split('_')[1]).join(', ') || <span className="italic">None</span>
                                     }
                                 </td>
                                 <td className="px-4 py-2 whitespace-nowrap text-sm">
                                      {!admin.passwordChanged && admin.email === 'admin@mmpcs.net' && <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Default Pass</span>}
                                      {admin.linkedUserId && <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">Linked</span>}
                                 </td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium space-x-2">
                                     <button onClick={() => handleEditAdmin(admin)} className={`text-${siteStyles.primaryColor}-600 hover:text-${siteStyles.primaryColor}-900 text-xs`}>Edit</button>
                                     <button
                                         onClick={() => handleDeleteAdmin(admin.id)}
                                         disabled={adminUsers.length <= 1 || loggedInUser?.id === admin.id || (admin.email === 'admin@mmpcs.net' && !admin.passwordChanged) }
                                         className={`text-red-600 hover:text-red-900 text-xs disabled:text-gray-400 disabled:cursor-not-allowed`}
                                    >
                                         Delete
                                     </button>
                                 </td>
                            </tr>
                         ))}
                     </tbody>
                </table>
             </div>
        </div>
     );
 };

 const renderAdminManageBadges = () => {
     const isEditing = !!editingBadge;
     const formTitle = isEditing ? `Editing Badge: ${editingBadge.name}` : 'Add New Badge';
     const submitText = isEditing ? 'Update Badge' : 'Add Badge';
     const submitHandler = isEditing ? handleUpdateBadge : handleAddBadge;

     return (
        <div>
            <h1 className="text-2xl font-bold mb-4">Manage Badges & Titles</h1>

            {/* Add/Edit Badge Form */}
            <form onSubmit={submitHandler} className={`mb-6 p-4 bg-white border ${getRoundedClass('card')} shadow`}>
                 <h3 className="font-semibold text-lg mb-3">{formTitle}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                    <div>
                        <label className="block text-gray-700 mb-1" htmlFor="new-badge-name">Name</label>
                        <input
                            type="text"
                            id="new-badge-name"
                            value={newBadgeName}
                            onChange={(e) => setNewBadgeName(e.target.value)}
                            className={`w-full p-2 border ${getRoundedClass('input')} focus:ring-${siteStyles.primaryColor}-500 focus:border-${siteStyles.primaryColor}-500`}
                            required
                        />
                    </div>
                     <div>
                        <label className="block text-gray-700 mb-1" htmlFor="new-badge-emoji">Emoji</label>
                        <input
                            type="text"
                            id="new-badge-emoji"
                            value={newBadgeEmoji}
                            maxLength={2} // Allow for emoji sequences but keep it short
                            onChange={(e) => setNewBadgeEmoji(e.target.value)}
                            className={`w-full p-2 border ${getRoundedClass('input')} focus:ring-${siteStyles.primaryColor}-500 focus:border-${siteStyles.primaryColor}-500`}
                            required
                        />
                    </div>
                    <div className="md:col-span-3">
                        <label className="block text-gray-700 mb-1" htmlFor="new-badge-desc">Description (Tooltip)</label>
                        <input
                            type="text"
                            id="new-badge-desc"
                            value={newBadgeDesc}
                            onChange={(e) => setNewBadgeDesc(e.target.value)}
                            className={`w-full p-2 border ${getRoundedClass('input')} focus:ring-${siteStyles.primaryColor}-500 focus:border-${siteStyles.primaryColor}-500`}
                        />
                    </div>
                 </div>
                <div className="flex items-center space-x-3">
                     <button
                        type="submit"
                        className={`px-4 py-2 ${getPrimaryColorClasses('bg')} text-white ${getRoundedClass('button')} hover:${getPrimaryColorClasses('bg', 600)}`}
                    >
                        {submitText}
                    </button>
                     {isEditing && (
                        <button
                            type="button"
                            onClick={() => { setEditingBadge(null); setNewBadgeName(''); setNewBadgeEmoji(''); setNewBadgeDesc(''); }}
                             className={`px-4 py-2 bg-gray-300 text-gray-700 ${getRoundedClass('button')} hover:bg-gray-400`}
                        >
                            Cancel Edit
                        </button>
                     )}
                 </div>
            </form>

            {/* List Existing Badges */}
            <div className={`p-4 bg-white border ${getRoundedClass('card')} shadow`}>
                <h3 className="font-semibold text-lg mb-3">Existing Badges</h3>
                 <ul className="space-y-2">
                     {badges.map(badge => (
                         <li key={badge.id} className="flex justify-between items-center p-2 border-b last:border-b-0">
                             <div className="flex items-center space-x-3">
                                <span className="text-xl">{badge.emoji}</span>
                                <div>
                                    <span className="font-medium">{badge.name}</span>
                                    <p className="text-sm text-gray-500">{badge.description}</p>
                                </div>
                            </div>
                             <div className="space-x-2">
                                 <button onClick={() => handleEditBadge(badge)} className={`text-${siteStyles.primaryColor}-600 hover:text-${siteStyles.primaryColor}-900 text-xs`}>Edit</button>
                                 <button onClick={() => handleDeleteBadge(badge.id)} className="text-red-600 hover:text-red-900 text-xs">Delete</button>
                            </div>
                         </li>
                     ))}
                     {badges.length === 0 && <p className="italic text-gray-500">No badges created yet.</p>}
                </ul>
            </div>
        </div>
    );
 };

const renderAdminConfigureSmtp = () => (
    <div>
        <h1 className="text-2xl font-bold mb-4">System Configuration</h1>

        {/* SMTP Configuration Form */}
         <form onSubmit={handleSaveSmtpConfig} className={`p-4 bg-white border ${getRoundedClass('card')} shadow`}>
            <h3 className="font-semibold text-lg mb-3">SMTP Settings (for Email Verification)</h3>
             <p className="text-sm text-gray-500 mb-4 italic">These settings are simulated and won't actually send emails in this demo.</p>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                 <div>
                    <label className="block text-gray-700 mb-1" htmlFor="smtp-host">SMTP Host</label>
                    <input type="text" id="smtp-host" name="host" value={smtpConfig.host} onChange={handleSmtpConfigChange} className={`w-full p-2 border ${getRoundedClass('input')} focus:ring-${siteStyles.primaryColor}-500 focus:border-${siteStyles.primaryColor}-500`} />
                </div>
                <div>
                    <label className="block text-gray-700 mb-1" htmlFor="smtp-port">SMTP Port</label>
                    <input type="number" id="smtp-port" name="port" value={smtpConfig.port} onChange={handleSmtpConfigChange} className={`w-full p-2 border ${getRoundedClass('input')} focus:ring-${siteStyles.primaryColor}-500 focus:border-${siteStyles.primaryColor}-500`} />
                </div>
                 <div>
                    <label className="block text-gray-700 mb-1" htmlFor="smtp-user">SMTP Username</label>
                    <input type="text" id="smtp-user" name="user" value={smtpConfig.user} onChange={handleSmtpConfigChange} className={`w-full p-2 border ${getRoundedClass('input')} focus:ring-${siteStyles.primaryColor}-500 focus:border-${siteStyles.primaryColor}-500`} />
                </div>
                <div>
                    <label className="block text-gray-700 mb-1" htmlFor="smtp-pass">SMTP Password</label>
                    <input type="password" id="smtp-pass" name="pass" value={smtpConfig.pass} onChange={handleSmtpConfigChange} className={`w-full p-2 border ${getRoundedClass('input')} focus:ring-${siteStyles.primaryColor}-500 focus:border-${siteStyles.primaryColor}-500`} />
                </div>
            </div>
             <button
                type="submit"
                 className={`px-4 py-2 ${getPrimaryColorClasses('bg')} text-white ${getRoundedClass('button')} hover:${getPrimaryColorClasses('bg', 600)}`}
             >
                 Save SMTP Config
             </button>
        </form>
         {/* Server Status Control Moved to Status Page for combined view */}
    </div>
);

const renderAdminModeratePosts = () => (
     <div>
        <h1 className="text-2xl font-bold mb-4">Moderate User Posts</h1>
         <div className={`p-4 bg-white border ${getRoundedClass('card')} shadow`}>
             <h3 className="font-semibold text-lg mb-3">Recent User Posts ({userPosts.length})</h3>
             <div className="space-y-4">
                {userPosts.length > 0 ? userPosts.slice().sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime()).map(post => {
                 const author = findUserById(post.authorId);
                 return (
                    <div key={post.id} className={`p-3 border ${getRoundedClass('md')} bg-gray-50`}>
                        <div className="flex justify-between items-start mb-2">
                           <div>
                                {author ? renderUserProfile(author) : <span className="italic text-gray-500">Unknown User</span>}
                                 <span className="text-xs text-gray-400 ml-2">{post.createdAt.toLocaleString()}</span>
                           </div>
                            <button
                                // onClick={() => handleDeleteUserPost(post.id)} // Add this handler
                                className={`px-2 py-1 bg-red-500 text-white text-xs ${getRoundedClass('button')} hover:bg-red-600`}
                             >
                                Delete Post
                            </button>
                        </div>
                        <p className="text-gray-800 mb-2">{post.content}</p>
                         {post.mediaUrl && (
                            <div className="mt-2">
                                <img src={post.mediaUrl} alt="User upload" className={`max-w-xs max-h-40 ${getRoundedClass('md')} border`} />
                             </div>
                         )}
                    </div>
                    );
                }) : <p className="italic text-gray-500">No user posts to moderate.</p>}
             </div>
         </div>
     </div>
);


  // --- Page Router ---
  const renderCurrentPage = () => {
    if (currentPage === 'adminLogin') return renderAdminLoginPage();
    if (currentPage === 'adminDashboard' && isAdmin(loggedInUser)) return renderAdminDashboard();
    if (currentPage === 'login') return renderLoginPage();
    if (currentPage === 'register') return renderRegisterPage();

     // Render standard layout for other pages
     return (
        <div className={`min-h-screen bg-gray-50 ${getFontFamilyClass()}`}>
            {renderNavbar()}
            <div className="main-content">
                {currentPage === 'home' && renderHomePage()}
                {(currentPage === 'blog' || currentPage.startsWith('blog/')) && renderBlogPage()}
                {currentPage === 'posts' && renderUserPostsPage()}
                {currentPage === 'status' && renderStatusPage()}
                {currentPage === 'profile' && renderProfilePage()}
                {currentPage === 'shop' && renderShopPage()}
                {/* Add other page renderings here */}
            </div>
             {/* Optional Footer */}
            <footer className="p-4 bg-gray-200 text-center text-gray-600 text-sm mt-8">
                © {new Date().getFullYear()} Minecraft Server Name. All rights reserved.
            </footer>
        </div>
     );
  };

  return renderCurrentPage();
};

export default MinecraftWebsite;