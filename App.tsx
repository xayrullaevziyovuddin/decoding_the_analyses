import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { analyzeMedicalImage } from './services/geminiService';
import { ImageFile, AnalysisHistoryItem, Biomarker, User } from './types';
import { 
    UploadIcon, SpinnerIcon, PlusIcon, SearchIcon, BackIcon, DotsVerticalIcon, TestTubeIcon,
    ArrowRightIcon, DownloadIcon, PdfIcon, StatusUpIcon, StatusDownIcon, ChevronDownIcon, LockIcon, CloseIcon, SignOutIcon, UserIcon
} from './components/icons';
import { Remarkable } from 'remarkable';

// --- SETUP ---
const md = new Remarkable();
declare const pdfjsLib: any;

// --- TRANSLATIONS ---
const translations = {
    ru: {
        appTitle: "Анализ теста ИИ",
        searchByName: "Поиск по названию",
        newAnalysis: "Новый анализ",
        analysis: "Анализ",
        originalFile: "Оригинальный файл",
        showOnlyDeviations: "Показать только результаты с отклонением от нормы",
        status: "Статус",
        result: "Результат",
        normalRange: "Нормальный диапазон",
        high: "Высокий",
        low: "Низкий",
        normal: "Нормальный",
        abnormal: "Отклонение",
        detected: "Обнаружено",
        notDetected: "Не обнаружено",
        discussWithDoctor: "Обсудить результаты с врачом",
        discussDescription: "Позвольте нам найти для вас подходящего специалиста на основе результатов вашего анализа.",
        sendRequest: "Отправить запрос",
        whatIs: "Что такое",
        possibleCauses: "Возможные причины",
        recommendations: "Рекомендации",
        unlock: "Разблокировать",
        uploadTitle: "Загрузить документ",
        uploadSubtitle: "Загрузите файл для анализа ИИ",
        uploadButton: "Нажмите для загрузки или перетащите",
        uploadHint: "PNG, JPG или PDF",
        language: "Язык",
        russian: "Русский",
        uzbek: "O'zbekcha",
        analyze: "Анализировать",
        analyzing: "Анализ...",
        error: "Ошибка",
        noHistory: "История анализов пуста.",
        startNewAnalysis: "Начните новый анализ, нажав на кнопку '+'",
        signInTitle: "Вход в аккаунт",
        signInSubtitle: "Войдите, чтобы сохранять и просматривать историю анализов.",
        signOut: "Выйти",
        loading: "Загрузка...",
        email: "Email",
        password: "Пароль",
        name: "Имя",
        signIn: "Войти",
        signUp: "Регистрация",
        dontHaveAccount: "Нет аккаунта?",
        alreadyHaveAccount: "Уже есть аккаунт?",
        authErrorInvalid: "Неверный email или пароль.",
        authErrorExists: "Пользователь с таким email уже существует.",
        authErrorShortPass: "Пароль должен быть не менее 6 символов.",
        authErrorRequired: "Все поля обязательны для заполнения.",
        pagesDetected: "Обнаружено страниц: {count}"
    },
    uz: {
        appTitle: "AI Test Tahlili",
        searchByName: "Nomi bo'yicha qidirish",
        newAnalysis: "Yangi tahlil",
        analysis: "Tahlil",
        originalFile: "Asl fayl",
        showOnlyDeviations: "Faqat normadan chetga chiqqan natijalarni ko'rsatish",
        status: "Holat",
        result: "Natija",
        normalRange: "Normal diapazon",
        high: "Yuqori",
        low: "Past",
        normal: "Normal",
        abnormal: "Chega chiqish",
        detected: "Aniqlangan",
        notDetected: "Aniqlanmadi",
        discussWithDoctor: "Natijalarni shifokor bilan muhokama qiling",
        discussDescription: "Tahlil natijalaringiz asosida sizga mos mutaxassisni topishimizga ruxsat bering.",
        sendRequest: "So'rov yuborish",
        whatIs: "Bu nima",
        possibleCauses: "Mumkin bo'lgan sabablar",
        recommendations: "Tavsiyalar",
        unlock: "Ochish",
        uploadTitle: "Hujjat yuklash",
        uploadSubtitle: "AI tahlili uchun faylni yuklang",
        uploadButton: "Yuklash uchun bosing yoki sudrab olib boring",
        uploadHint: "PNG, JPG yoki PDF",
        language: "Til",
        russian: "Русский",
        uzbek: "O'zbekcha",
        analyze: "Tahlil qilish",
        analyzing: "Tahlil qilinmoqda...",
        error: "Xatolik",
        noHistory: "Tahlillar tarixi bo'sh.",
        startNewAnalysis: "Yangi tahlilni boshlash uchun '+' tugmasini bosing.",
        signInTitle: "Hisobga kirish",
        signInSubtitle: "Tahlillar tarixini saqlash va ko'rish uchun tizimga kiring.",
        signOut: "Chiqish",
        loading: "Yuklanmoqda...",
        email: "Email",
        password: "Parol",
        name: "Ism",
        signIn: "Kirish",
        signUp: "Roʻyxatdan oʻtish",
        dontHaveAccount: "Hisobingiz yo'qmi?",
        alreadyHaveAccount: "Hisobingiz bormi?",
        authErrorInvalid: "Noto'g'ri email yoki parol.",
        authErrorExists: "Bunday emailga ega foydalanuvchi allaqachon mavjud.",
        authErrorShortPass: "Parol kamida 6 belgidan iborat bo'lishi kerak.",
        authErrorRequired: "Barcha maydonlarni to'ldirish majburiy.",
        pagesDetected: "Aniqlangan sahifalar: {count}"
    }
};

type View = 'history' | 'new' | 'analysis' | 'biomarker';

// --- MAIN APP COMPONENT ---
export default function App() {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [view, setView] = useState<View>('history');
    const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
    const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisHistoryItem | null>(null);
    const [selectedBiomarker, setSelectedBiomarker] = useState<Biomarker | null>(null);
    const [language, setLanguage] = useState<'ru' | 'uz'>('ru');
    const t = useMemo(() => translations[language], [language]);

    const historyKey = useMemo(() => user ? `analysisHistory_${user.id}` : null, [user]);

    // Initial load: check for saved session and language
    useEffect(() => {
        try {
            const savedUser = localStorage.getItem('userSession');
            if (savedUser) {
                setUser(JSON.parse(savedUser));
            }
            const savedLang = localStorage.getItem('analysisLanguage');
            if (savedLang === 'ru' || savedLang === 'uz') {
                setLanguage(savedLang);
            }
        } catch (error) {
            console.error("Failed to load from localStorage", error);
            localStorage.clear(); // Clear corrupted storage
        } finally {
            setIsAuthReady(true);
        }
    }, []);

    // Load user-specific history when user logs in
    useEffect(() => {
        if (historyKey) {
            try {
                const savedHistory = localStorage.getItem(historyKey);
                if (savedHistory) {
                    setHistory(JSON.parse(savedHistory));
                } else {
                    setHistory([]); // Reset history for new user
                }
            } catch (error) {
                console.error("Failed to load history from localStorage", error);
                setHistory([]);
            }
        }
    }, [historyKey]);
    
    const handleAuthSuccess = (authenticatedUser: User) => {
        setUser(authenticatedUser);
        localStorage.setItem('userSession', JSON.stringify(authenticatedUser));
    };

    const handleLogout = () => {
        setUser(null);
        setHistory([]);
        localStorage.removeItem('userSession');
        setView('history'); // Reset view to default
    };

    const updateHistory = (newHistory: AnalysisHistoryItem[]) => {
        if (!historyKey) return;
        try {
            setHistory(newHistory);
            localStorage.setItem(historyKey, JSON.stringify(newHistory));
        } catch (error) {
            console.error("Failed to save to localStorage", error);
        }
    };
    
    const handleLanguageChange = (lang: 'ru' | 'uz') => {
        setLanguage(lang);
        localStorage.setItem('analysisLanguage', lang);
    }

    const addAnalysisToHistory = (item: AnalysisHistoryItem) => {
        updateHistory([item, ...history]);
    };

    const navigate = (newView: View, data?: any) => {
        if (newView === 'analysis' && data) setSelectedAnalysis(data);
        if (newView === 'biomarker' && data) setSelectedBiomarker(data);
        if (newView === 'history') {
            setSelectedAnalysis(null);
            setSelectedBiomarker(null);
        }
        setView(newView);
    };

    const renderContent = () => {
        if (!isAuthReady) {
            return <div className="flex items-center justify-center h-full"><SpinnerIcon className="w-8 h-8 animate-spin" /> <span className="ml-2">{t.loading}</span></div>;
        }
        if (!user) {
            return <AuthView onAuthSuccess={handleAuthSuccess} t={t} />;
        }
        switch (view) {
            case 'new':
                return <NewAnalysisView navigate={navigate} addAnalysisToHistory={addAnalysisToHistory} t={t} language={language} setLanguage={handleLanguageChange} />;
            case 'analysis':
                return selectedAnalysis ? <AnalysisDetailView analysisItem={selectedAnalysis} navigate={navigate} t={t} /> : null;
            case 'biomarker':
                return selectedBiomarker ? <BiomarkerDetailView biomarker={selectedBiomarker} navigate={navigate} t={t} /> : null;
            case 'history':
            default:
                return <HistoryView history={history} user={user} onLogout={handleLogout} navigate={navigate} t={t} />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
            <div className="container mx-auto max-w-lg h-screen bg-white dark:bg-black overflow-y-auto shadow-2xl relative">
                {renderContent()}
            </div>
        </div>
    );
}

// --- AUTH VIEW ---
// NOTE: This is a simulated auth system using localStorage.
// Do NOT use this implementation in a production environment.
function AuthView({ onAuthSuccess, t }: { onAuthSuccess: (user: User) => void; t: any }) {
    const [isLoginView, setIsLoginView] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');

    const USERS_DB_KEY = 'app_users_db';

    const getSimulatedUsers = () => {
        try {
            const users = localStorage.getItem(USERS_DB_KEY);
            return users ? JSON.parse(users) : {};
        } catch {
            return {};
        }
    };

    const saveSimulatedUsers = (users: any) => {
        localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!email || !password || (!isLoginView && !name)) {
            setError(t.authErrorRequired);
            return;
        }
        if (password.length < 6) {
            setError(t.authErrorShortPass);
            return;
        }

        const users = getSimulatedUsers();

        if (isLoginView) {
            // Handle Login
            const user = users[email];
            if (user && user.password === password) {
                const loggedInUser: User = { id: user.email, name: user.name, email: user.email };
                onAuthSuccess(loggedInUser);
            } else {
                setError(t.authErrorInvalid);
            }
        } else {
            // Handle Registration
            if (users[email]) {
                setError(t.authErrorExists);
            } else {
                const newUser = { name, email, password };
                users[email] = newUser;
                saveSimulatedUsers(users);
                const registeredUser: User = { id: newUser.email, name: newUser.name, email: newUser.email };
                onAuthSuccess(registeredUser);
            }
        }
    };
    
    return (
        <div className="flex flex-col items-center justify-center h-full p-8">
            <TestTubeIcon className="w-12 h-12 text-blue-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">{isLoginView ? t.signInTitle : t.signUp}</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">{t.signInSubtitle}</p>
            
            <form onSubmit={handleSubmit} className="w-full max-w-sm">
                {!isLoginView && (
                    <div className="mb-4">
                        <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="name">{t.name}</label>
                        <input id="name" type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-800 border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500" />
                    </div>
                )}
                <div className="mb-4">
                    <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="email">{t.email}</label>
                    <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-800 border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="mb-6">
                    <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="password">{t.password}</label>
                    <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-800 border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500" />
                </div>
                
                {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}

                <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700">
                    {isLoginView ? t.signIn : t.signUp}
                </button>
            </form>

            <p className="mt-8 text-sm">
                {isLoginView ? t.dontHaveAccount : t.alreadyHaveAccount}{' '}
                <button onClick={() => { setIsLoginView(!isLoginView); setError(''); }} className="font-bold text-blue-500 hover:text-blue-600">
                    {isLoginView ? t.signUp : t.signIn}
                </button>
            </p>
        </div>
    );
}

// --- VIEWS ---

function HistoryView({ history, user, onLogout, navigate, t }: { history: AnalysisHistoryItem[], user: User, onLogout: () => void, navigate: Function, t: any }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const filteredHistory = history.filter(item => item.result.title.toLowerCase().includes(searchTerm.toLowerCase()));

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="flex flex-col h-full">
            <header className="p-4 border-b dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white dark:bg-black z-10">
                <div className="flex items-center">
                    <TestTubeIcon className="w-6 h-6 text-blue-500 mr-3" />
                    <h1 className="text-xl font-bold">{t.appTitle}</h1>
                </div>
                <div className="relative" ref={menuRef}>
                     <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="w-9 h-9 rounded-full cursor-pointer flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                    >
                       <UserIcon className="w-6 h-6" />
                    </button>
                    {menuOpen && (
                         <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-gray-800 rounded-lg shadow-xl z-20 border dark:border-gray-700">
                            <div className="p-3 border-b dark:border-gray-700">
                                <p className="font-semibold truncate">{user.name}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                            </div>
                            <button onClick={onLogout} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg">
                               <SignOutIcon className="w-5 h-5" /> {t.signOut}
                            </button>
                        </div>
                    )}
                </div>
            </header>
            <main className="p-4 flex-grow">
                <div className="relative mb-4">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder={t.searchByName}
                        className="w-full bg-gray-100 dark:bg-gray-800 border-none rounded-full pl-10 pr-4 py-2 focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                {filteredHistory.length > 0 ? (
                    <ul className="space-y-3">
                        {filteredHistory.map(item => (
                            <li key={item.id} onClick={() => navigate('analysis', item)} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                                <TestTubeIcon className="w-8 h-8 text-green-500 mr-4" />
                                <div className="flex-grow">
                                    <p className="font-semibold">{item.result.title}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(item.date).toLocaleString()}</p>
                                </div>
                                <button className="p-2 text-gray-500"><DotsVerticalIcon className="w-5 h-5" /></button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-center text-gray-500 mt-16">
                        <p>{t.noHistory}</p>
                        <p>{t.startNewAnalysis}</p>
                    </div>
                )}
            </main>
            <button onClick={() => navigate('new')} className="absolute bottom-6 right-6 bg-green-500 text-white rounded-full p-4 shadow-lg hover:bg-green-600">
                <PlusIcon className="w-7 h-7" />
            </button>
        </div>
    );
}

function NewAnalysisView({ navigate, addAnalysisToHistory, t, language, setLanguage }: { navigate: Function, addAnalysisToHistory: Function, t:any, language: 'ru'|'uz', setLanguage: Function }) {
    const [imageFiles, setImageFiles] = useState<ImageFile[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessingPdf, setIsProcessingPdf] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (file: File) => {
        setError(null);
        setImageFiles(null);
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageFiles([{ name: file.name, dataUrl: reader.result as string, type: file.type }]);
            };
            reader.readAsDataURL(file);
        } else if (file.type === 'application/pdf') {
            setIsProcessingPdf(true);
            try {
                const arrayBuffer = await file.arrayBuffer();
                const typedarray = new Uint8Array(arrayBuffer);
                const pdf = await pdfjsLib.getDocument(typedarray).promise;
                const numPages = pdf.numPages;
                const pageImages: ImageFile[] = [];

                for (let i = 1; i <= numPages; i++) {
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 2.0 });
                    const canvas = document.createElement('canvas');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    const context = canvas.getContext('2d');
                    if (!context) throw new Error("Canvas context not available");
                    await page.render({ canvasContext: context, viewport }).promise;
                    const dataUrl = canvas.toDataURL('image/jpeg');
                    pageImages.push({
                        name: file.name,
                        dataUrl,
                        type: 'image/jpeg',
                    });
                }
                setImageFiles(pageImages);
            } catch (err: any) {
                setError(`PDF processing failed: ${err.message}`);
            } finally {
                setIsProcessingPdf(false);
            }
        } else {
            setError("Unsupported file type.");
        }
    };
    
    const handleAnalyze = async () => {
        if (!imageFiles || imageFiles.length === 0) return;
        setIsLoading(true);
        setError(null);
        try {
            const base64DataArray = imageFiles.map(file => file.dataUrl.split(',')[1]);
            const result = await analyzeMedicalImage(base64DataArray, language);
            const now = new Date();
            const newItem: AnalysisHistoryItem = {
                id: now.toISOString(),
                date: now.toISOString(),
                result,
                originalFile: imageFiles[0], // Store the first page as the representative file for history
            };
            addAnalysisToHistory(newItem);
            navigate('analysis', newItem);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-4">
            <header className="flex items-center mb-6">
                <button onClick={() => navigate('history')} className="p-2 -ml-2 mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><BackIcon className="w-6 h-6" /></button>
                <h1 className="text-xl font-bold">{t.newAnalysis}</h1>
            </header>
            
            <div onClick={() => fileInputRef.current?.click()} className="w-full min-h-[250px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 relative">
                <input type="file" accept="image/*,application/pdf" ref={fileInputRef} onChange={e => e.target.files && handleFileChange(e.target.files[0])} className="hidden" />
                {isProcessingPdf || isLoading ? <SpinnerIcon className="w-10 h-10 animate-spin text-blue-500" /> : 
                imageFiles && imageFiles.length > 0 ? 
                    <div className="relative p-2 flex flex-col items-center text-center">
                        <img src={imageFiles[0].dataUrl} alt="preview" className="max-h-60 object-contain" />
                        {imageFiles.length > 1 && (
                            <span className="mt-2 bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded dark:bg-blue-200 dark:text-blue-800">
                                {t.pagesDetected.replace('{count}', imageFiles.length)}
                            </span>
                        )}
                    </div> :
                (
                    <div className="text-center text-gray-500">
                        <UploadIcon className="w-12 h-12 mx-auto mb-2" />
                        <p className="font-semibold">{t.uploadButton}</p>
                        <p className="text-sm">{t.uploadHint}</p>
                    </div>
                )}
            </div>

             <div className="my-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.language}</label>
                <div className="flex rounded-md shadow-sm border dark:border-gray-600">
                    <button onClick={() => setLanguage('ru')} className={`px-4 py-2 text-sm font-medium rounded-l-md w-1/2 ${language === 'ru' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'}`}>Русский</button>
                    <button onClick={() => setLanguage('uz')} className={`px-4 py-2 text-sm font-medium rounded-r-md w-1/2 ${language === 'uz' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'}`}>O'zbekcha</button>
                </div>
            </div>

            <button onClick={handleAnalyze} disabled={!imageFiles || isLoading || isProcessingPdf} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-gray-600 flex items-center justify-center">
                {isLoading ? <><SpinnerIcon className="w-5 h-5 mr-2 animate-spin"/>{t.analyzing}</> : t.analyze}
            </button>
            {error && <p className="text-red-500 mt-2 text-sm text-center">{t.error}: {error}</p>}
        </div>
    );
}

function AnalysisDetailView({ analysisItem, navigate, t }: { analysisItem: AnalysisHistoryItem, navigate: Function, t: any }) {
    const [activeTab, setActiveTab] = useState('analysis');
    const [searchTerm, setSearchTerm] = useState('');
    const [showDeviationsOnly, setShowDeviationsOnly] = useState(false);
    
    const statusMap: { [key: string]: { text: string, color: string, icon?: React.ReactNode } } = {
        'High': { text: t.high, color: 'text-red-500 bg-red-100 dark:bg-red-900/50', icon: <StatusUpIcon className="w-3 h-3 mr-1" /> },
        'Low': { text: t.low, color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/50', icon: <StatusDownIcon className="w-3 h-3 mr-1" /> },
        'Normal': { text: t.normal, color: 'text-green-600 bg-green-100 dark:bg-green-900/50' },
        'Abnormal': { text: t.abnormal, color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/50' },
        'Detected': { text: t.detected, color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/50' },
        'Not Detected': { text: t.notDetected, color: 'text-green-600 bg-green-100 dark:bg-green-900/50' },
    };

    const filteredBiomarkers = analysisItem.result.biomarkers.filter(b => {
        const nameMatch = b.name.toLowerCase().includes(searchTerm.toLowerCase());
        const deviationMatch = !showDeviationsOnly || (b.status !== 'Normal' && b.status !== 'Not Detected');
        return nameMatch && deviationMatch;
    });

    return (
        <div className="flex flex-col h-full">
            <header className="p-4 border-b dark:border-gray-800 sticky top-0 bg-white dark:bg-black z-10">
                <div className="flex items-center mb-2">
                    <button onClick={() => navigate('history')} className="p-2 -ml-2 mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><BackIcon className="w-6 h-6" /></button>
                    <div className="flex-grow">
                        <h1 className="text-xl font-bold">{analysisItem.result.title}</h1>
                        <p className="text-sm text-gray-500">{new Date(analysisItem.date).toLocaleString()}</p>
                    </div>
                </div>
                <div className="flex border-b-2 dark:border-b-gray-700">
                    <button onClick={() => setActiveTab('analysis')} className={`py-2 px-4 w-1/2 font-semibold ${activeTab === 'analysis' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}>{t.analysis}</button>
                    <button onClick={() => setActiveTab('file')} className={`py-2 px-4 w-1/2 font-semibold ${activeTab === 'file' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}>{t.originalFile}</button>
                </div>
            </header>
            
            <main className="flex-grow overflow-y-auto">
                {activeTab === 'analysis' && (
                    <div className="p-4">
                        <div className="flex items-center justify-between my-2 text-sm">
                            <label htmlFor="deviations" className="text-gray-700 dark:text-gray-300">{t.showOnlyDeviations}</label>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="deviations" className="sr-only peer" checked={showDeviationsOnly} onChange={e => setShowDeviationsOnly(e.target.checked)} />
                                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        <div className="relative my-4">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input type="text" placeholder={t.searchByName} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-800 border-none rounded-full pl-10 pr-4 py-2 focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <ul className="space-y-3">
                            {filteredBiomarkers.map(b => (
                                <li key={b.name} onClick={() => navigate('biomarker', b)} className="p-4 border dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="font-bold text-lg">{b.name}</h3>
                                        <ArrowRightIcon className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <div className="text-sm space-y-2">
                                        <div className="flex justify-between"><span className="text-gray-500">{t.status}</span> <span className={`font-semibold inline-flex items-center px-2 py-0.5 rounded-full text-xs ${statusMap[b.status]?.color || ''}`}>{statusMap[b.status]?.icon}{statusMap[b.status]?.text || b.status}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-500">{t.result}</span> <span className="font-semibold">{b.value} {b.unit}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-500">{t.normalRange}</span> <span className="font-semibold">{b.normalRange}</span></div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {activeTab === 'file' && (
                    <div className="p-4">
                        <a href={analysisItem.originalFile.dataUrl} download={analysisItem.originalFile.name} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center hover:bg-gray-100 dark:hover:bg-gray-700">
                            <PdfIcon className="w-8 h-8 text-red-500 mr-4" />
                            <div className="flex-grow">
                                <p className="font-semibold truncate">{analysisItem.originalFile.name}</p>
                                <p className="text-sm text-gray-500">{(analysisItem.originalFile.dataUrl.length / 1.37 / 1024).toFixed(2)} KB</p>
                            </div>
                            <DownloadIcon className="w-6 h-6 text-blue-500" />
                        </a>
                    </div>
                )}
            </main>
        </div>
    );
}

function BiomarkerDetailView({ biomarker, navigate, t }: { biomarker: Biomarker, navigate: Function, t: any }) {
    const [openAccordion, setOpenAccordion] = useState<string | null>(biomarker.description ? 'what' : null);

    const toggleAccordion = (id: string) => {
        setOpenAccordion(openAccordion === id ? null : id);
    };

    const statusMap: { [key: string]: { icon?: React.ReactNode } } = {
        'High': { icon: <StatusUpIcon className="w-4 h-4 text-red-500" /> },
        'Low': { icon: <StatusDownIcon className="w-4 h-4 text-blue-500" /> },
    };

    return (
        <div className="flex flex-col h-full">
            <header className="p-4 border-b dark:border-gray-800 sticky top-0 bg-white dark:bg-black z-10">
                <div className="flex items-center">
                    <button onClick={() => navigate('analysis')} className="p-2 -ml-2 mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><BackIcon className="w-6 h-6" /></button>
                    <div>
                        <h1 className="text-xl font-bold">{biomarker.name}</h1>
                        <p className="text-sm text-gray-500 font-semibold flex items-center gap-1">
                            {statusMap[biomarker.status]?.icon} {biomarker.value} {biomarker.unit}
                        </p>
                    </div>
                </div>
            </header>
            <main className="flex-grow p-4 space-y-4 overflow-y-auto">
                <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-xl text-center">
                    <h2 className="font-bold text-green-800 dark:text-green-200">{t.discussWithDoctor}</h2>
                    <p className="text-sm text-green-700 dark:text-green-300 my-2">{t.discussDescription}</p>
                    <button className="bg-green-500 text-white font-bold py-2 px-6 rounded-full hover:bg-green-600">{t.sendRequest}</button>
                </div>

                {biomarker.description && <AccordionItem title={`${t.whatIs} ${biomarker.name.toLowerCase()}?`} content={biomarker.description} isOpen={openAccordion === 'what'} onToggle={() => toggleAccordion('what')} />}
                {biomarker.possibleCauses && <AccordionItem title={t.possibleCauses} content={biomarker.possibleCauses} isOpen={openAccordion === 'causes'} onToggle={() => toggleAccordion('causes')} />}
                
                <div className="flex justify-between items-center p-4 border dark:border-gray-700 rounded-xl">
                    <span className="font-bold">{t.recommendations}</span>
                    <button className="flex items-center gap-2 bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-300 font-semibold py-1 px-3 rounded-full text-sm">
                        <LockIcon className="w-4 h-4" /> {t.unlock}
                    </button>
                </div>
            </main>
        </div>
    );
}

// --- REUSABLE COMPONENTS ---

const AccordionItem = ({ title, content, isOpen, onToggle }: { title: string, content: string, isOpen: boolean, onToggle: () => void }) => (
    <div className="border dark:border-gray-700 rounded-xl overflow-hidden">
        <button onClick={onToggle} className="w-full flex justify-between items-center p-4 text-left font-bold">
            {title}
            <ChevronDownIcon className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
            <div className="p-4 pt-0 prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-300" dangerouslySetInnerHTML={{ __html: md.render(content) }} />
        )}
    </div>
);