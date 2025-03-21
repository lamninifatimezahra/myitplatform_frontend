'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import Image from 'next/image';

import { AiOutlineMail, AiOutlineLock, AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';

export default function Login() {

   const [showPassword, setShowPassword] = useState(false);

   const [email, setEmail] = useState('');

   const [password, setPassword] = useState('');

   const [error, setError] = useState({ email: '', password: '' });

   const router = useRouter();

   const handleSubmit = (e) => {

     e.preventDefault();

     let errors = { email: '', password: '' };

     if (!email.trim()) {

       errors.email = "L'email est requis.";

     }

     if (!password.trim()) {

       errors.password = "Le mot de passe est requis.";

     }

     setError(errors);

     if (!errors.email && !errors.password) {

       console.log('Form submitted:', { email, password });

       setEmail('');

       setPassword('');

       setError({ email: '', password: '' });

       router.push('/departments'); // Redirection vers la page login après soumission

     }

   };

   return (
<div className="relative flex items-center justify-center h-screen overflow-hidden">

       {/* Background Image with Soft Blur & Fade-in Animation */}
<div 

         className="absolute inset-0 bg-cover bg-center backdrop-blur-md opacity-100 transition-opacity duration-700" 

         style={{ 

           backgroundImage: "url('/background-office.jpg')",

           backgroundSize: "cover",

           backgroundPosition: "center",

           backgroundRepeat: "no-repeat",

           opacity: 0.50 

         }}
></div>

       {/* Login Card with Soft Fade-in Effect */}
<div className="relative z-20 backdrop-blur-lg bg-white/50 p-10 rounded-3xl shadow-2xl max-w-md w-full opacity-100 transition-opacity duration-700">
<div className="flex justify-center mb-6">
<Image src="/logo-myit.png" alt="MyIT Logo" width={300} height={300} priority className="animate-fade-in" />
</div>
<form className="space-y-6 animate-fade-in" onSubmit={handleSubmit}>

           {/* Email Field */}
<div className="relative">
<span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#6f80ac] text-lg">
<AiOutlineMail size={20} />
</span>
<input 

               type="email" 

               className="w-full pl-12 p-3 rounded-lg bg-white/90 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#68bddd] text-gray-900 shadow-sm" 

               placeholder="Email" 

               value={email}

               onChange={(e) => setEmail(e.target.value)}

             />

             {error.email && <p className="text-red-500 text-sm mt-1">{error.email}</p>}
</div>

           {/* Password Field with Show/Hide Feature */}
<div className="relative">
<span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#6f80ac] text-lg">
<AiOutlineLock size={20} />
</span>
<input 

               type={showPassword ? "text" : "password"} 

               className="w-full pl-12 p-3 pr-10 rounded-lg bg-white/90 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#68bddd] text-gray-900 shadow-sm" 

               placeholder="Password" 

               value={password}

               onChange={(e) => setPassword(e.target.value)}

             />
<button 

               type="button" 

               className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#6f80ac] hover:text-[#68bddd] transition-colors duration-300"

               onClick={() => setShowPassword(!showPassword)}
>

               {showPassword ? <AiOutlineEye size={20} /> : <AiOutlineEyeInvisible size={20} />}
</button>

             {error.password && <p className="text-red-500 text-sm mt-1">{error.password}</p>}
</div>
<div className="flex items-center text-[#6f80ac] text-sm">
<input type="checkbox" className="mr-2 accent-[#68bddd]" />
<span>Keep me logged in</span>
</div>
<button 

             type="submit" 

             className="w-full bg-[#6f80ac] text-white p-4 rounded-xl hover:bg-[#68bddd] transition-all duration-300 shadow-lg font-semibold text-lg"
>

             Login
</button>
</form>
</div>
</div>

   );

}
 