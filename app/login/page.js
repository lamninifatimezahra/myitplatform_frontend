'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { AiOutlineMail, AiOutlineLock, AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState({ email: '', password: '', general: '' });
  const [isFirstLogin, setIsFirstLogin] = useState(false);

  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();

    let errors = { email: '', password: '', general: '' };

    if (!email.trim()) errors.email = "L'email est requis.";
    if (!password.trim()) errors.password = "Le mot de passe est requis.";

    setError(errors);

    if (!errors.email && !errors.password) {
      try {
        // 1. Login
        const loginRes = await fetch('http://localhost:8000/api/login/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        if (!loginRes.ok) throw new Error('Identifiants invalides');

        const tokens = await loginRes.json();
        localStorage.setItem('access_token', tokens.access);

        // 2. Appeler /me
        const userRes = await fetch('http://localhost:8000/api/me/', {
          headers: { Authorization: `Bearer ${tokens.access}` },
        });

        const user = await userRes.json();
        localStorage.setItem('user_role', user.role);

        // 3. Vérifie si c’est un premier login
        if (user.first_login) {
          setIsFirstLogin(true);
        } else {
          if (user.role === 'admin') router.push('/admin');
          else router.push('/departments');
        }
      } catch (err) {
        console.error(err);
        setError({ ...error, general: 'Erreur de connexion. Vérifiez vos identifiants.' });
      }
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      return setError({ ...error, general: 'Veuillez saisir et confirmer le nouveau mot de passe.' });
    }

    if (newPassword !== confirmPassword) {
      return setError({ ...error, general: 'Les mots de passe ne correspondent pas.' });
    }

    try {
      const res = await fetch('http://localhost:8000/api/change-password/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({ new_password: newPassword, confirm_password: confirmPassword }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Erreur inconnue');
      }

      // Redirection après mot de passe changé
      const role = localStorage.getItem('user_role');
      if (role === 'admin') router.push('/admin');
      else router.push('/departments');
    } catch (err) {
      console.error(err);
      setError({ ...error, general: err.message });
    }
  };

  return (
    <div className="relative flex items-center justify-center h-screen overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center backdrop-blur-md opacity-100 transition-opacity duration-700"
        style={{
          backgroundImage: "url('/background-office.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          opacity: 0.50
        }}
      ></div>

      <div className="relative z-20 backdrop-blur-lg bg-white/50 p-10 rounded-3xl shadow-2xl max-w-md w-full opacity-100 transition-opacity duration-700">
        <div className="flex justify-center mb-6">
          <Image src="/logo-myit.png" alt="MyIT Logo" width={300} height={300} priority className="animate-fade-in" />
        </div>

        {isFirstLogin ? (
          <form onSubmit={handleChangePassword} className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-semibold text-center text-gray-700">Changer le mot de passe</h2>

            <input
              type={showNewPassword ? 'text' : 'password'}
              className="w-full p-3 rounded-lg border bg-white/90"
              placeholder="Nouveau mot de passe"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />

            <input
              type={showNewPassword ? 'text' : 'password'}
              className="w-full p-3 rounded-lg border bg-white/90"
              placeholder="Confirmer le mot de passe"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <button type="submit" className="w-full bg-[#6f80ac] text-white p-4 rounded-xl hover:bg-[#68bddd] transition-all font-semibold text-lg">
              Changer le mot de passe
            </button>

            {error.general && <p className="text-red-500 text-sm mt-2">{error.general}</p>}
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
            {/* Email */}
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#6f80ac]">
                <AiOutlineMail size={20} />
              </span>
              <input
                type="email"
                className="w-full pl-12 p-3 rounded-lg bg-white/90 border"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {error.email && <p className="text-red-500 text-sm mt-1">{error.email}</p>}
            </div>

            {/* Password */}
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#6f80ac]">
                <AiOutlineLock size={20} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full pl-12 p-3 pr-10 rounded-lg bg-white/90 border"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#6f80ac]"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <AiOutlineEye /> : <AiOutlineEyeInvisible />}
              </button>
              {error.password && <p className="text-red-500 text-sm mt-1">{error.password}</p>}
            </div>

            <button type="submit" className="w-full bg-[#6f80ac] text-white p-4 rounded-xl hover:bg-[#68bddd] transition-all font-semibold text-lg">
              Login
            </button>
            {error.general && <p className="text-red-500 text-sm mt-2">{error.general}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
