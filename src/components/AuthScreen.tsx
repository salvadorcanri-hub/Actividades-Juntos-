import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FolderKanban,
  LogIn,
  UserPlus,
  Mail,
  Lock,
  User,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import {
  StudentAccount,
  GradeOption,
  SectionOption,
  GRADE_OPTIONS,
  SECTION_OPTIONS,
  BLUEPRINT_LIMITS,
  formatGradeAndSection,
} from '../utils/authLogic';
import {
  StudentAvatar,
  GroupCoverBanner,
  getGroupCoverUrl,
} from './visualAssets';
import { AmbientBackground } from './AmbientBackground';

interface AuthScreenProps {
  demoAccounts: StudentAccount[];
  onLoginSubmit: (payload: {
    email: string;
    password: string;
  }) => { error?: string };
  onRegisterSubmit: (payload: {
    displayName: string;
    email: string;
    gradeLevel: GradeOption;
    sectionLetter: SectionOption;
    gradeCourse: string;
    password: string;
  }) => { error?: string };
  onGoogleSignIn: () => Promise<{ error?: string }>;
  onSelectDemoStudent: (account: StudentAccount) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  demoAccounts,
  onLoginSubmit,
  onRegisterSubmit,
  onGoogleSignIn,
  onSelectDemoStudent,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [gradeLevel, setGradeLevel] = useState<GradeOption>('5');
  const [sectionLetter, setSectionLetter] = useState<SectionOption>('A');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showFirebaseHelp, setShowFirebaseHelp] = useState(false);

  const computedGradeCourse = formatGradeAndSection(gradeLevel, sectionLetter);

  const handleSwitchMode = (nextMode: 'login' | 'register') => {
    setMode(nextMode);
    setErrorMessage(null);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (mode === 'login') {
      const result = onLoginSubmit({ email, password });
      if (result.error) {
        setErrorMessage(result.error);
      }
    } else {
      const result = onRegisterSubmit({
        displayName,
        email,
        gradeLevel,
        sectionLetter,
        gradeCourse: computedGradeCourse,
        password,
      });
      if (result.error) {
        setErrorMessage(result.error);
      }
    }
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

  const coverBannerUrl = getGroupCoverUrl('grp-ept-01', 'Proyecto EPT');

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
        {/* Columna Izquierda: Presentación Visual y Cuentas Rápidas */}
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
                  Gestión de proyectos escolares sin chats
                </span>
              </div>
            </div>

            {/* Imagen de Portada con Detalle */}
            <div className="relative h-32 rounded-xl overflow-hidden border border-slate-800">
              <GroupCoverBanner
                src={coverBannerUrl}
                alt="Espacio de estudio colaborativo"
                className="w-full h-full"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0D1320] via-[#0D1320]/30 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-100 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>Todo tu avance listo al entrar</span>
                </span>
              </div>
            </div>

            {/* Beneficios Clave para el Estudiante */}
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white font-semibold">
                    Información por estudiante:
                  </strong>{' '}
                  Tus grupos, entregas y enlaces fijos quedan guardados en tu cuenta.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white font-semibold">
                    Regla Anti-Paseos y Revisión:
                  </strong>{' '}
                  Nadie pasa una tarea a Terminado sin adjuntar y validar su evidencia.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white font-semibold">
                    Calendario y Código de Grupo:
                  </strong>{' '}
                  Únete con código y controla las próximas fechas de entrega.
                </span>
              </li>
            </ul>
          </div>

          {/* Cuentas de Prueba de Acceso Rápido */}
          <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Ingreso rápido de prueba
              </span>
              <span className="text-[11px] text-slate-400">1 clic</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {demoAccounts.slice(0, 2).map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => onSelectDemoStudent(acc)}
                  className="w-full flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-[#141E30]/90 hover:bg-[#1A2740] border border-slate-800 hover:border-sky-500/40 text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <StudentAvatar name={acc.displayName} size="sm" />
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-slate-100 block truncate group-hover:text-sky-300 transition-colors">
                        Entrar como {acc.displayName}
                      </span>
                      <span className="text-[11px] text-slate-400 block truncate">
                        {acc.gradeCourse}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Columna Derecha: Formulario de Iniciar Sesión / Crear Cuenta */}
        <section
          aria-label="Formulario de acceso estudiantil"
          className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between gap-6"
        >
          <div className="space-y-5">
            {/* Selector de Modo: Iniciar Sesión vs Crear Cuenta */}
            <div
              role="tablist"
              aria-label="Opciones de cuenta"
              className="grid grid-cols-2 p-1 rounded-xl bg-[#0B0F17] border border-slate-800/90"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'login'}
                onClick={() => handleSwitchMode('login')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  mode === 'login'
                    ? 'bg-sky-500 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Iniciar Sesión</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'register'}
                onClick={() => handleSwitchMode('register')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  mode === 'register'
                    ? 'bg-sky-500 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Crear Cuenta</span>
              </button>
            </div>

            {/* Encabezado Contextual */}
            <div>
              <h1 className="font-display text-xl font-bold text-white tracking-tight">
                {mode === 'login'
                  ? 'Bienvenido de vuelta a tus proyectos'
                  : 'Crea tu cuenta estudiantil'}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                {mode === 'login'
                  ? 'Ingresa con tu correo o cuenta de Google para recuperar tus grupos, tareas y enlaces fijos.'
                  : 'Elige tu grado (1 a 5) y sección (A a C) para personalizar tu perfil y guardar tus proyectos.'}
              </p>
            </div>

            {/* Botón de Google Auth (Firebase signInWithPopup) */}
            <div>
              <button
                type="button"
                onClick={handleGoogleClick}
                disabled={isGoogleLoading}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-[#162033] hover:bg-[#1C2840] border border-slate-700/80 text-xs font-semibold text-slate-100 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-60"
              >
                <svg
                  className="w-4 h-4 shrink-0"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fill="#38BDF8"
                    d="M21.35 11.1h-9.17v2.73h6.51c-.33 1.81-1.5 3.34-3.2 4.37v3.62h5.18c3.03-2.79 4.78-6.9 4.78-11.72 0-.8-.08-1.57-.22-2.3z"
                  />
                  <path
                    fill="#34D399"
                    d="M12.18 22c4.32 0 7.95-1.43 10.6-3.88l-5.18-3.62c-1.43.96-3.26 1.53-5.42 1.53-4.17 0-7.7-2.81-8.96-6.6H-2.1v3.73C.54 18.4 5.93 22 12.18 22z"
                  />
                </svg>
                <span>
                  {isGoogleLoading
                    ? 'Conectando con Google...'
                    : 'Continuar con Google (Sincronización Cloud)'}
                </span>
              </button>
            </div>

            <div className="relative flex items-center py-0.5">
              <div className="flex-grow border-t border-slate-800" />
              <span className="shrink-0 mx-3 text-[11px] text-slate-400">
                o usa tu correo estudiantil
              </span>
              <div className="flex-grow border-t border-slate-800" />
            </div>

            {/* Alerta de Validación */}
            <AnimatePresence mode="wait">
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  role="alert"
                  className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/35 flex items-start gap-2.5 text-xs text-rose-200"
                >
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Formulario Principal */}
            <form onSubmit={handleFormSubmit} noValidate className="space-y-3.5">
              {mode === 'register' && (
                <div className="space-y-3.5">
                  <div>
                    <label
                      htmlFor="student-fullname"
                      className="block text-xs font-medium text-slate-300 mb-1.5"
                    >
                      Nombre y Apellido
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="student-fullname"
                        type="text"
                        maxLength={BLUEPRINT_LIMITS.DISPLAY_NAME_MAX}
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Ej. Sofía Mendoza"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#0B0F17] border border-slate-800 focus:border-sky-400 focus:outline-none text-xs text-white placeholder:text-slate-500"
                      />
                    </div>
                  </div>

                  {/* Selectores de Opciones: Grado (1 a 5) y Sección (A al C) */}
                  <div className="p-3 rounded-xl bg-[#0B0F17] border border-slate-800/90 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-sky-400" />
                        <span>Grado y Sección</span>
                      </span>
                      <span
                        data-testid="selected-grade-section-preview"
                        className="font-mono text-[11px] font-semibold text-sky-300"
                      >
                        {computedGradeCourse}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      {/* Selector de Grado: 1 a 5 */}
                      <div className="sm:col-span-7 space-y-1">
                        <span className="block text-[11px] text-slate-400">
                          Grado (1° a 5°)
                        </span>
                        <div
                          role="group"
                          aria-label="Seleccionar grado del 1 al 5"
                          className="grid grid-cols-5 gap-1.5"
                        >
                          {GRADE_OPTIONS.map((g) => {
                            const active = gradeLevel === g;
                            return (
                              <button
                                key={g}
                                type="button"
                                aria-pressed={active}
                                onClick={() => setGradeLevel(g)}
                                className={`py-1.5 rounded-lg font-mono text-xs font-semibold transition-all cursor-pointer ${
                                  active
                                    ? 'bg-sky-500 text-slate-950 shadow-xs'
                                    : 'bg-[#131C2E] text-slate-300 hover:text-white border border-slate-800'
                                }`}
                              >
                                {g}°
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Selector de Sección: A al C */}
                      <div className="sm:col-span-5 space-y-1">
                        <span className="block text-[11px] text-slate-400">
                          Sección (A a C)
                        </span>
                        <div
                          role="group"
                          aria-label="Seleccionar sección de la A a la C"
                          className="grid grid-cols-3 gap-1.5"
                        >
                          {SECTION_OPTIONS.map((sec) => {
                            const active = sectionLetter === sec;
                            return (
                              <button
                                key={sec}
                                type="button"
                                aria-pressed={active}
                                onClick={() => setSectionLetter(sec)}
                                className={`py-1.5 rounded-lg font-mono text-xs font-semibold transition-all cursor-pointer ${
                                  active
                                    ? 'bg-sky-500 text-slate-950 shadow-xs'
                                    : 'bg-[#131C2E] text-slate-300 hover:text-white border border-slate-800'
                                }`}
                              >
                                {sec}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label
                  htmlFor="student-email"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Correo electrónico estudiantil
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="student-email"
                    type="email"
                    maxLength={BLUEPRINT_LIMITS.EMAIL_MAX}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nombre.apellido@colegio.edu.pe"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#0B0F17] border border-slate-800 focus:border-sky-400 focus:outline-none text-xs text-white placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="student-password"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Contraseña {mode === 'register' && '(mínimo 6 caracteres)'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="student-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#0B0F17] border border-slate-800 focus:border-sky-400 focus:outline-none text-xs text-white placeholder:text-slate-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-[0.99]"
              >
                {mode === 'login' ? (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Ingresar a mi espacio</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Crear mi cuenta estudiantil</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Pie de Ayuda y Cambio Rápido de Modo */}
          <div className="pt-3 border-t border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
              <span>
                {mode === 'login'
                  ? '¿Es tu primera vez en Actividades Juntos?'
                  : '¿Ya tienes una cuenta creada?'}
              </span>
              <button
                type="button"
                onClick={() =>
                  handleSwitchMode(mode === 'login' ? 'register' : 'login')
                }
                className="text-sky-400 hover:text-sky-300 font-semibold cursor-pointer"
              >
                {mode === 'login' ? 'Crear una cuenta' : 'Iniciar sesión'}
              </button>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setShowFirebaseHelp((prev) => !prev)}
                className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-300 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
                <span>¿Cómo habilitar Email/Password en Firebase Console?</span>
              </button>
              {showFirebaseHelp && (
                <div className="mt-2 p-2.5 rounded-lg bg-[#0B0F17] border border-slate-800 text-[11px] text-slate-300 leading-relaxed">
                  El acceso con Google y el guardado de cuentas estudiantiles funcionan de inmediato. Si deseas activar también el proveedor nativo Email/Password en la nube de Firebase, abre{' '}
                  <strong className="text-white">
                    Firebase Console → Authentication → Sign-in method
                  </strong>{' '}
                  y habilita <strong className="text-white">Email/Password</strong>.
                </div>
              )}
            </div>
          </div>
        </section>
      </motion.main>
    </div>
  );
};
