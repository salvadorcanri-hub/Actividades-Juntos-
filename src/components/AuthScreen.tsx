import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FolderKanban,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Users,
  Calendar,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
} from 'lucide-react';
import {
  GradeOption,
  SectionOption,
  GRADE_OPTIONS,
  SECTION_OPTIONS,
  BLUEPRINT_LIMITS,
  formatGradeAndSection,
} from '../utils/authLogic';
import { GroupCoverBanner, getGroupCoverUrl } from './visualAssets';
import { AmbientBackground } from './AmbientBackground';

interface AuthScreenProps {
  onGoogleSignIn: () => Promise<{ error?: string }>;
  onEmailSignIn: (payload: {
    email: string;
    password: string;
  }) => Promise<{ error?: string }>;
  onEmailRegister: (payload: {
    displayName: string;
    email: string;
    gradeLevel: GradeOption;
    sectionLetter: SectionOption;
    password: string;
  }) => Promise<{ error?: string }>;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onGoogleSignIn,
  onEmailSignIn,
  onEmailRegister,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regGrade, setRegGrade] = useState<GradeOption>('5');
  const [regSection, setRegSection] = useState<SectionOption>('A');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  const isBusy = isGoogleLoading || isEmailLoading;

  const switchMode = (nextMode: 'login' | 'register') => {
    setMode(nextMode);
    setErrorMessage(null);
  };

  const handleGoogleClick = async () => {
    setErrorMessage(null);
    setIsGoogleLoading(true);
    try {
      const result = await onGoogleSignIn();
      if (result.error) {
        setErrorMessage(result.error);
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = loginEmail.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMessage('Ingresa un correo electrónico válido.');
      return;
    }
    if (!loginPassword) {
      setErrorMessage('Ingresa tu contraseña.');
      return;
    }

    setIsEmailLoading(true);
    try {
      const result = await onEmailSignIn({
        email: cleanEmail,
        password: loginPassword,
      });
      if (result.error) {
        setErrorMessage(result.error);
      }
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanName = regName.trim();
    const cleanEmail = regEmail.trim().toLowerCase();

    if (!cleanName) {
      setErrorMessage('Ingresa tu nombre y apellido.');
      return;
    }
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMessage('Ingresa un correo electrónico válido.');
      return;
    }
    if (regPassword.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }

    setIsEmailLoading(true);
    try {
      const result = await onEmailRegister({
        displayName: cleanName,
        email: cleanEmail,
        gradeLevel: regGrade,
        sectionLetter: regSection,
        password: regPassword,
      });
      if (result.error) {
        setErrorMessage(result.error);
      }
    } finally {
      setIsEmailLoading(false);
    }
  };

  const coverBannerUrl = getGroupCoverUrl('grp-ept-01', 'Proyecto EPT');
  const previewGrade = formatGradeAndSection(regGrade, regSection);

  return (
    <div
      data-testid="auth-screen"
      className="min-h-screen w-full bg-[#0B0F17] text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-10 relative isolate overflow-x-hidden"
    >
      <AmbientBackground />

      <motion.main
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 rounded-2xl bg-[#111827]/85 backdrop-blur-xl border border-slate-800/90 shadow-2xl overflow-hidden"
      >
        {/* Columna Izquierda: Presentación Visual */}
        <section
          aria-label="Presentación de Actividades Juntos"
          className="lg:col-span-5 bg-[#0D1320]/90 border-b lg:border-b-0 lg:border-r border-slate-800/80 p-6 sm:p-7 flex flex-col justify-between gap-6"
        >
          <div className="space-y-5">
            {/* Marca */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400/20 to-indigo-500/20 border border-sky-400/35 flex items-center justify-center text-sky-400 shrink-0 shadow-sm">
                <FolderKanban className="w-5 h-5" />
              </div>
              <div>
                <span className="font-display text-base font-bold tracking-tight text-white block">
                  Actividades Juntos
                </span>
                <span className="text-xs text-slate-400 block">
                  Proyectos escolares colaborativos sin chats
                </span>
              </div>
            </div>

            {/* Imagen de Portada */}
            <div className="relative h-32 sm:h-36 rounded-xl overflow-hidden border border-slate-800">
              <GroupCoverBanner
                src={coverBannerUrl}
                alt="Espacio de estudio colaborativo"
                className="w-full h-full"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0D1320] via-[#0D1320]/30 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-100 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>Sincronizado en tiempo real con tu equipo</span>
                </span>
              </div>
            </div>

            {/* Beneficios Clave */}
            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex items-start gap-2.5">
                <Users className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white font-semibold">
                    Grupos reales con código:
                  </strong>{' '}
                  Crea un proyecto o únete al de tus compañeros desde el celular o la computadora.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white font-semibold">
                    Control del creador y Anti-Paseos:
                  </strong>{' '}
                  Nadie marca una tarea como terminada sin evidencia, y el creador coordina y aprueba cada avance.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white font-semibold">
                    Cronología, Desempeño y Calendario:
                  </strong>{' '}
                  Registra fechas exactas de avance, notas del profesor y recordatorios en calendario.
                </span>
              </li>
            </ul>
          </div>

          <div className="pt-4 border-t border-slate-800/80 flex items-center gap-2 text-[11px] text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Tus grupos, entregas y enlaces quedan respaldados en la nube.</span>
          </div>
        </section>

        {/* Columna Derecha: Iniciar Sesión / Crear Cuenta + Google */}
        <section
          aria-label="Acceso estudiantil"
          className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-center gap-5"
        >
          {/* Selector de Pestaña: Iniciar Sesión / Crear Cuenta */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#0B0F17] border border-slate-800">
            <button
              type="button"
              data-testid="auth-tab-login"
              onClick={() => switchMode('login')}
              className={`min-h-[42px] px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-sky-400 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Iniciar sesión</span>
            </button>
            <button
              type="button"
              data-testid="auth-tab-register"
              onClick={() => switchMode('register')}
              className={`min-h-[42px] px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-sky-400 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Crear cuenta</span>
            </button>
          </div>

          <div className="space-y-1">
            <h1 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight">
              {mode === 'login'
                ? 'Entra a tus grupos de trabajo'
                : 'Crea tu cuenta estudiantil'}
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              {mode === 'login'
                ? 'Usa el correo y contraseña que registraste, o entra directamente con Google.'
                : 'Regístrate con tu correo y elige tu grado y sección para colaborar con tu equipo.'}
            </p>
          </div>

          {/* Alerta de Error */}
          <AnimatePresence mode="wait">
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                role="alert"
                className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/35 flex items-start gap-2.5 text-xs text-rose-200"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Formulario de Correo y Contraseña */}
          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div className="space-y-1.5">
                <label
                  htmlFor="login-email-input"
                  className="block text-xs font-medium text-slate-300"
                >
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-email-input"
                    data-testid="login-email-input"
                    type="email"
                    autoComplete="email"
                    maxLength={BLUEPRINT_LIMITS.EMAIL_MAX}
                    value={loginEmail}
                    onChange={(e) => {
                      setLoginEmail(e.target.value);
                      setErrorMessage(null);
                    }}
                    placeholder="ejemplo@correo.com"
                    className="w-full min-h-[44px] pl-9 pr-3 py-2 text-xs bg-[#0B0F17] border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="login-password-input"
                  className="block text-xs font-medium text-slate-300"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-password-input"
                    data-testid="login-password-input"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    maxLength={128}
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      setErrorMessage(null);
                    }}
                    placeholder="Tu contraseña"
                    className="w-full min-h-[44px] pl-9 pr-10 py-2 text-xs bg-[#0B0F17] border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={
                      showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                    }
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                data-testid="email-login-submit-btn"
                disabled={isBusy}
                className="w-full min-h-[46px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-semibold text-sm transition-all cursor-pointer shadow-lg active:scale-[0.99] disabled:opacity-60"
              >
                <LogIn className="w-4 h-4" />
                <span>
                  {isEmailLoading ? 'Ingresando...' : 'Iniciar sesión'}
                </span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label
                    htmlFor="reg-name-input"
                    className="block text-xs font-medium text-slate-300"
                  >
                    Nombre y Apellido *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="reg-name-input"
                      data-testid="reg-name-input"
                      type="text"
                      autoComplete="name"
                      maxLength={BLUEPRINT_LIMITS.DISPLAY_NAME_MAX}
                      value={regName}
                      onChange={(e) => {
                        setRegName(e.target.value);
                        setErrorMessage(null);
                      }}
                      placeholder="Ej. Sofía Mendoza"
                      className="w-full min-h-[42px] pl-9 pr-3 py-2 text-xs bg-[#0B0F17] border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="reg-email-input"
                    className="block text-xs font-medium text-slate-300"
                  >
                    Correo electrónico *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="reg-email-input"
                      data-testid="reg-email-input"
                      type="email"
                      autoComplete="email"
                      maxLength={BLUEPRINT_LIMITS.EMAIL_MAX}
                      value={regEmail}
                      onChange={(e) => {
                        setRegEmail(e.target.value);
                        setErrorMessage(null);
                      }}
                      placeholder="ejemplo@correo.com"
                      className="w-full min-h-[42px] pl-9 pr-3 py-2 text-xs bg-[#0B0F17] border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>

              {/* Selector de Grado y Sección */}
              <div className="p-3 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-slate-300">
                    Grado y Sección
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-sky-300">
                    {previewGrade}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="grid grid-cols-5 gap-1">
                    {GRADE_OPTIONS.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setRegGrade(g)}
                        className={`min-h-[36px] rounded-lg font-mono text-xs font-semibold transition-all cursor-pointer ${
                          regGrade === g
                            ? 'bg-sky-400 text-slate-950'
                            : 'bg-[#131C2E] text-slate-300 hover:text-white border border-slate-800'
                        }`}
                      >
                        {g}°
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {SECTION_OPTIONS.map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setRegSection(sec)}
                        className={`min-h-[36px] rounded-lg font-mono text-xs font-semibold transition-all cursor-pointer ${
                          regSection === sec
                            ? 'bg-sky-400 text-slate-950'
                            : 'bg-[#131C2E] text-slate-300 hover:text-white border border-slate-800'
                        }`}
                      >
                        {sec}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label
                    htmlFor="reg-password-input"
                    className="block text-xs font-medium text-slate-300"
                  >
                    Contraseña * (mín. 6)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="reg-password-input"
                      data-testid="reg-password-input"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      maxLength={128}
                      value={regPassword}
                      onChange={(e) => {
                        setRegPassword(e.target.value);
                        setErrorMessage(null);
                      }}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full min-h-[42px] pl-9 pr-9 py-2 text-xs bg-[#0B0F17] border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={
                        showPassword
                          ? 'Ocultar contraseña'
                          : 'Mostrar contraseña'
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="reg-confirm-password-input"
                    className="block text-xs font-medium text-slate-300"
                  >
                    Confirmar contraseña *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="reg-confirm-password-input"
                      data-testid="reg-confirm-password-input"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      maxLength={128}
                      value={regConfirmPassword}
                      onChange={(e) => {
                        setRegConfirmPassword(e.target.value);
                        setErrorMessage(null);
                      }}
                      placeholder="Repite tu contraseña"
                      className="w-full min-h-[42px] pl-9 pr-3 py-2 text-xs bg-[#0B0F17] border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                data-testid="email-register-submit-btn"
                disabled={isBusy}
                className="w-full min-h-[46px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-semibold text-sm transition-all cursor-pointer shadow-lg active:scale-[0.99] disabled:opacity-60"
              >
                <UserPlus className="w-4 h-4" />
                <span>
                  {isEmailLoading ? 'Creando cuenta...' : 'Crear cuenta y entrar'}
                </span>
              </button>
            </form>
          )}

          {/* Separador */}
          <div className="relative flex items-center py-0.5">
            <div className="flex-grow border-t border-slate-800" />
            <span className="shrink-0 mx-3 text-[11px] font-medium text-slate-500">
              o continúa con
            </span>
            <div className="flex-grow border-t border-slate-800" />
          </div>

          {/* Botón Opcional de Google Auth */}
          <div className="space-y-2.5">
            <button
              type="button"
              data-testid="google-signin-btn"
              onClick={handleGoogleClick}
              disabled={isBusy}
              className="w-full min-h-[46px] flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-[#0B0F17] hover:bg-slate-800/80 border border-slate-700 hover:border-sky-500/50 text-slate-100 font-semibold text-sm transition-all cursor-pointer active:scale-[0.99] disabled:opacity-60"
            >
              <svg
                className="w-4 h-4 shrink-0"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fill="#4285F4"
                  d="M21.35 11.1h-9.17v2.73h6.51c-.33 1.81-1.5 3.34-3.2 4.37v3.62h5.18c3.03-2.79 4.78-6.9 4.78-11.72 0-.8-.08-1.57-.22-2.3z"
                />
                <path
                  fill="#34A853"
                  d="M12.18 22c4.32 0 7.95-1.43 10.6-3.88l-5.18-3.62c-1.43.96-3.26 1.53-5.42 1.53-4.17 0-7.7-2.81-8.96-6.6H-2.1v3.73C.54 18.4 5.93 22 12.18 22z"
                />
                <path
                  fill="#FBBC05"
                  d="M3.22 13.73a6.9 6.9 0 0 1 0-4.46V5.54H-2.1a11.98 11.98 0 0 0 0 10.92l5.32-2.73z"
                />
                <path
                  fill="#EA4335"
                  d="M12.18 5.25c2.35 0 4.46.81 6.12 2.4l4.59-4.59C20.12.48 16.5-.8 12.18-.8 5.93-.8.54 2.8-2.1 7.81l5.32 3.73c1.26-3.79 4.79-6.29 8.96-6.29z"
                />
              </svg>
              <span>
                {isGoogleLoading
                  ? 'Conectando con Google...'
                  : 'Continuar con Google'}
              </span>
            </button>
          </div>
        </section>
      </motion.main>
    </div>
  );
};
