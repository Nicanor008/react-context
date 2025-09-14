// App.js
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useContext,
} from 'react';

/**
 * Simple Auth demo focusing on useContext, useCallback, useMemo.
 * - No styling, no backend (data stored in localStorage/sessionStorage)
 * - Remember-me persists to localStorage; otherwise uses sessionStorage
 */

/* ---------------------------
   Context + Provider
   --------------------------- */
const AuthContext = React.createContext();

const LOCAL_USERS_KEY = 'demo_users_v1';
const AUTH_USER_KEY = 'demo_auth_user_v1';
const AUTH_TOKEN_KEY = 'demo_auth_token_v1';

export function AuthProvider({ children }) {
  // users list persisted in localStorage
  const [users, setUsers] = useState(() => {
    try {
      const raw = localStorage.getItem(LOCAL_USERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Try localStorage first (remember), fallback to sessionStorage
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(AUTH_USER_KEY) || sessionStorage.getItem(AUTH_USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem(AUTH_TOKEN_KEY) || sessionStorage.getItem(AUTH_TOKEN_KEY) || null;
    } catch {
      return null;
    }
  });

  // ensure users persisted if changed
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
    } catch (err) {
      console.error('Could not save users', err);
    }
  }, [users]);

  // helper to persist auth either to localStorage (remember) or sessionStorage
  const persistAuth = useCallback((userObj, tokenStr, remember) => {
    try {
      if (remember) {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(userObj));
        localStorage.setItem(AUTH_TOKEN_KEY, tokenStr);
        sessionStorage.removeItem(AUTH_USER_KEY);
        sessionStorage.removeItem(AUTH_TOKEN_KEY);
      } else {
        sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(userObj));
        sessionStorage.setItem(AUTH_TOKEN_KEY, tokenStr);
        localStorage.removeItem(AUTH_USER_KEY);
        localStorage.removeItem(AUTH_TOKEN_KEY);
      }
    } catch (err) {
      console.error('persistAuth error', err);
    }
  }, []);

  // register - memoized with useCallback so function identity stays stable
  const register = useCallback(({ username, password, name }, remember = false) => {
    if (!username || !password) return { success: false, message: 'Provide username and password' };
    if (users.some(u => u.username === username)) return { success: false, message: 'User already exists' };

    const newUser = { username, password, name };
    const newUsers = [...users, newUser];
    setUsers(newUsers);

    // auto-login after register
    const fakeToken = 't_' + Math.random().toString(36).slice(2);
    const publicUser = { username: newUser.username, name: newUser.name };
    setUser(publicUser);
    setToken(fakeToken);
    persistAuth(publicUser, fakeToken, remember);

    return { success: true };
  }, [users, persistAuth]);

  // login - memoized
  const login = useCallback(({ username, password }, remember = false) => {
    const found = users.find(u => u.username === username && u.password === password);
    if (!found) return { success: false, message: 'Invalid credentials' };

    const fakeToken = 't_' + Math.random().toString(36).slice(2);
    const publicUser = { username: found.username, name: found.name };
    setUser(publicUser);
    setToken(fakeToken);
    persistAuth(publicUser, fakeToken, remember);

    return { success: true };
  }, [users, persistAuth]);

  // logout - memoized
  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    sessionStorage.removeItem(AUTH_USER_KEY);
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }, []);

  // derived value - memoized
  const isAuthenticated = useMemo(() => !!token, [token]);

  // memoize the context value to avoid needless re-renders
  const ctxValue = useMemo(() => ({
    user,
    token,
    isAuthenticated,
    users,
    register,
    login,
    logout,
  }), [user, token, isAuthenticated, users, register, login, logout]);

  return (
    <AuthContext.Provider value={ctxValue}>
      {children}
    </AuthContext.Provider>
  );
}

/* helper hook */
export function useAuth() {
  return useContext(AuthContext);
}

/* ---------------------------
   RegisterForm
   --------------------------- */
function RegisterForm() {
  const { register } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [remember, setRemember] = useState(false);
  const [msg, setMsg] = useState(null);

  // memoize handler so it's stable across renders
  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    const res = register({ username: username.trim(), password, name: name.trim() }, remember);
    if (!res.success) setMsg(res.message);
    else {
      setMsg('Registered & logged in');
      setUsername(''); setPassword(''); setName('');
    }
  }, [register, username, password, name, remember]);

  return (
    <form onSubmit={handleSubmit}>
      <h3>Register</h3>
      <div>
        <input placeholder="username" value={username}
               onChange={e => setUsername(e.target.value)} />
      </div>
      <div>
        <input placeholder="name (optional)" value={name}
               onChange={e => setName(e.target.value)} />
      </div>
      <div>
        <input placeholder="password" type="password" value={password}
               onChange={e => setPassword(e.target.value)} />
      </div>
      <div>
        <label>
          <input type="checkbox" checked={remember}
                 onChange={e => setRemember(e.target.checked)} /> Remember me
        </label>
      </div>
      <button type="submit">Register</button>
      {msg && <div>{msg}</div>}
    </form>
  );
}

/* ---------------------------
   LoginForm
   --------------------------- */
function LoginForm() {
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    const res = login({ username: username.trim(), password }, remember);
    if (!res.success) setMsg(res.message);
    else {
      setMsg('Logged in');
      setUsername(''); setPassword('');
    }
  }, [login, username, password, remember]);

  return (
    <form onSubmit={handleSubmit}>
      <h3>Login</h3>
      <div>
        <input placeholder="username" value={username}
               onChange={e => setUsername(e.target.value)} />
      </div>
      <div>
        <input placeholder="password" type="password" value={password}
               onChange={e => setPassword(e.target.value)} />
      </div>
      <div>
        <label>
          <input type="checkbox" checked={remember}
                 onChange={e => setRemember(e.target.checked)} /> Remember me
        </label>
      </div>
      <button type="submit">Login</button>
      {msg && <div>{msg}</div>}
    </form>
  );
}

/* ---------------------------
   UserProfile (shows logged-in user, logout)
   --------------------------- */
function UserProfile() {
  const { user, logout } = useAuth();

  // stable onclick
  const onLogout = useCallback(() => logout(), [logout]);

  // derived greeting (memoized)
  const greeting = useMemo(() => {
    if (!user) return 'No user';
    return `Hello, ${user.name || user.username}`;
  }, [user]);

  return (
    <div>
      <h3>{greeting}</h3>
      <div>Username: {user?.username}</div>
      <button onClick={onLogout}>Logout</button>
    </div>
  );
}

/* ---------------------------
   UsersList (shows registered users) - demonstrates useMemo
   --------------------------- */
function UsersList() {
  const { users } = useAuth();

  // memoize simple computation (list of names)
  const userNames = useMemo(() => users.map(u => u.username), [users]);

  return (
    <div>
      <h4>Registered users ({userNames.length})</h4>
      <ul>
        {userNames.map(u => <li key={u}>{u}</li>)}
      </ul>
    </div>
  );
}

/* ---------------------------
   Main demo
   --------------------------- */
function AuthDemo() {
  const { isAuthenticated } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' or 'register'

  if (isAuthenticated) {
    return (
      <div>
        <UserProfile />
        <UsersList />
      </div>
    );
  }

  return (
    <div>
      <div>
        <button onClick={() => setMode('login')}>Login</button>
        <button onClick={() => setMode('register')}>Register</button>
      </div>

      {mode === 'login' ? <LoginForm /> : <RegisterForm />}
    </div>
  );
}

/* ---------------------------
   App (wrap with provider)
   --------------------------- */
export default function App() {
  return (
    <AuthProvider>
      <div style={{ padding: 20 }}>
        <h2>Auth hooks practice (useContext / useCallback / useMemo)</h2>
        <AuthDemo />
      </div>
    </AuthProvider>
  );
}
