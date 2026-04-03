import { useLocation, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from "@/components/i18n/index.jsx";


export default function PageNotFound({}) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const pageName = location.pathname.substring(1);

    const { data: authData, isFetched } = useQuery({
        queryKey: ['user'],
        queryFn: async () => {
            try {
                const user = await base44.auth.me();
                return { user, isAuthenticated: true };
            } catch (error) {
                return { user: null, isAuthenticated: false };
            }
        }
    });
    
    return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #0f0b08 0%, #1a1410 50%, #0f0b08 100%)' }}>
            <div className="max-w-md w-full">
                <div className="text-center space-y-6">
                    {/* Logo */}
                    <img
                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/6838e48a7_IMG_4833.jpeg"
                        alt="CollectionKeeper"
                        className="w-20 h-20 mx-auto object-contain"
                    />
                    {/* 404 Error Code */}
                    <div className="space-y-2">
                         <h1 className="text-7xl font-light" style={{ color: 'rgba(224,216,200,0.3)' }}>404</h1>
                         <div className="h-0.5 w-16 mx-auto" style={{ background: 'rgba(180,140,75,0.3)' }}></div>
                     </div>

                     {/* Main Message */}
                     <div className="space-y-3">
                         <h2 className="text-2xl font-medium overflow-wrap break-words" style={{ color: '#E0D8C8' }}>
                             {t("error.pageNotFound")}
                         </h2>
                         <p className="leading-relaxed overflow-wrap break-words" style={{ color: 'rgba(224,216,200,0.65)' }}>
                             {t("error.pageNotFoundDescription")} <span className="font-medium text-slate-700">"{pageName}"</span> {t("error.pageNotFoundSuffix")}
                         </p>
                     </div>
                    
                    {/* Admin Note */}
                    {isFetched && authData.isAuthenticated && authData.user?.role === 'admin' && (
                        <div className="mt-8 p-4 rounded-lg border" style={{ background: 'rgba(60,45,30,0.4)', borderColor: 'rgba(120,90,65,0.3)' }}>
                            <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center mt-0.5">
                                    <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                                </div>
                                <div className="text-left space-y-1">
                                    <p className="text-sm font-medium" style={{ color: 'rgba(224,216,200,0.9)' }}>{t("error.adminNote")}</p>
                                        <p className="text-sm leading-relaxed overflow-wrap break-words" style={{ color: 'rgba(224,216,200,0.65)' }}>
                                        {t("error.adminNoteDescription")}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Action Button */}
                    <div className="pt-6">
                        <button 
                            onClick={() => navigate('/')} 
                            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 whitespace-nowrap"
                            style={{ color: '#E0D8C8', background: 'rgba(60,45,30,0.6)', border: '1px solid rgba(120,90,65,0.4)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(80,60,40,0.7)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(60,45,30,0.6)'}
                        >
                            <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            {t("nav.goHome")}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}