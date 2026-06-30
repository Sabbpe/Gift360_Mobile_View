// pages/CorporateLandingPage.tsx
// Standalone corporate landing page for employee rewards registration
import { useState } from 'react';
import { useLocation } from 'wouter';
import StepCircle from '@/components/StepCircle';
import CorporateContactModal from '@/components/CorporateContactModal';
import CorporateImage from '@/assets/coorp.png';
import { Award, Gift, Shield, UserPlus, Upload, CheckSquare, CreditCard, ShoppingCart, Mail, Home, ArrowLeft } from "lucide-react";


export default function CorporateLandingPage() {
    const [, setLocation] = useLocation();
    const [showContactModal, setShowContactModal] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    // Highlight chips data for corporate rewards
    const highlights = [
        { icon: Award, text: "Employee Recognition", iconBg: "bg-[#EEF2FF]" },
        { icon: Gift, text: "Bulk Allocation", iconBg: "bg-[#FFECEC]" },
        { icon: Shield, text: "Secure & Compliant", iconBg: "bg-[#E9FBF1]" }
    ];

    // Corporate workflow steps - 6-step refined process with status tracking
    const [steps, setSteps] = useState([
        {
            id: 1,
            title: "Get Registered with SabbPe",
            description: "Register your organization to begin corporate rewards onboarding. Click \"Proceed\" to submit your details, followed by a handshake call and KYC verification.",
            icon: <UserPlus className="h-5 w-5 text-purple-600" />,
            status: 'completed' as const,
            onClick: () => setShowContactModal(true),
            actionText: "Click here to proceed"
        },
        {
            id: 2,
            title: "Upload Voucher Requirements (Excel)",
            description: "Upload an Excel sheet with your voucher requirements, including brands, denominations, and quantities.",
            icon: <Upload className="h-5 w-5 text-indigo-600" />,
            status: 'pending' as const
        },
        {
            id: 3,
            title: "Confirm Denominations & Allocation",
            description: "Review and confirm the denomination distribution and employee allocation details.",
            icon: <CheckSquare className="h-5 w-5 text-blue-600" />,
            status: 'pending' as const
        },
        {
            id: 4,
            title: "Complete Payment",
            description: "Process secure payment to confirm your corporate voucher order.",
            icon: <CreditCard className="h-5 w-5 text-green-600" />,
            status: 'pending' as const
        },
        {
            id: 5,
            title: "Voucher Procurement by SabbPe",
            description: "SabbPe procures your requested vouchers from partner brands and prepares allocation.",
            icon: <ShoppingCart className="h-5 w-5 text-orange-600" />,
            status: 'pending' as const
        },
        {
            id: 6,
            title: "Voucher Delivery to Corporate Email/Dashboard",
            description: "Receive vouchers directly to your corporate dashboard and designated email addresses.",
            icon: <Mail className="h-5 w-5 text-purple-600" />,
            status: 'pending' as const
        }
    ]);

    return (
        <div className="min-h-screen bg-gray-50 relative overflow-hidden">
            {/* Mobile-First Navigation Bar */}
            <nav className="relative z-20 px-4 py-3 bg-white border-b border-gray-200">
                <div className="max-w-sm mx-auto flex items-center justify-between">
                    <button
                        onClick={() => setLocation('/')}
                        className="p-2 -ml-2 text-gray-700 hover:text-gray-900"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="relative">
                        <button 
                            onClick={() => setShowMenu(!showMenu)}
                            className="p-2 -mr-2 text-gray-700 hover:text-gray-900"
                        >
                            <span className="text-lg">⋮</span>
                        </button>
                        
                        {/* Dropdown Menu */}
                        {showMenu && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-30">
                                <button
                                    onClick={() => {
                                        setLocation('/distributor');
                                        setShowMenu(false);
                                    }}
                                    className="w-full text-left px-4 py-3 text-gray-700 hover:bg-purple-50 rounded-t-lg font-medium"
                                >
                                    Distributor
                                </button>
                                <button
                                    onClick={() => {
                                        setLocation('/reseller');
                                        setShowMenu(false);
                                    }}
                                    className="w-full text-left px-4 py-3 text-gray-700 hover:bg-indigo-50 border-t border-gray-100 font-medium"
                                >
                                    Reseller
                                </button>
                                <button
                                    onClick={() => {
                                        setLocation('/corporate');
                                        setShowMenu(false);
                                    }}
                                    className="w-full text-left px-4 py-3 text-gray-700 hover:bg-blue-50 border-t border-gray-100 rounded-b-lg font-medium"
                                >
                                    Corporate
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </nav>
            
            <main className="relative w-full z-10">
                {/* Container for mobile-like appearance */}
                <div className="max-w-sm mx-auto">
                    {/* MOBILE-OPTIMIZED CORPORATE HERO SECTION */}
                    <section className="w-full h-[360px] rounded-b-[30px] bg-[linear-gradient(181.26deg,_#FFFFFF_3.71%,_rgba(151,71,255,0.2)_98.92%)] px-5 py-4 flex flex-col relative overflow-hidden">
                        {/* Corporate Mode Badge */}
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-xs font-medium w-fit">
                            <Award className="h-3 w-3" />
                            <span style={{ fontFamily: 'Poppins, sans-serif' }}>Corporate Mode</span>
                        </div>

                        {/* Hero Content Container */}
                        <div className="flex justify-between items-start gap-3 mt-3 relative">
                            {/* Left side - Text Content */}
                            <div className="flex flex-col w-[60%]">
                                {/* Heading */}
                                <div className="w-[212px] h-[90px] mb-2">
                                    <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent leading-[121%]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                                        Reward employees with SabbPe Corporate
                                    </h2>
                                </div>

                                {/* Description */}
                                <p className="max-w-[260px] text-sm text-gray-600 leading-[1.4] text-left mt-6" style={{ fontFamily: 'Poppins, sans-serif' }}>
                                    Bulk voucher procurement, secure onboarding, and seamless employee distribution
                                </p>
                            </div>

                            {/* Right side - Illustration */}
                            <div className="flex-shrink-0 w-32 h-32">
                                <img
                                    src={CorporateImage}
                                    alt="Corporate Partnership"
                                    className="w-full h-auto object-contain"
                                />
                            </div>
                        </div>

                        {/* CTA Button */}
                        <button
                            onClick={() => setShowContactModal(true)}
                            className="w-[180px] h-[40px] mx-auto bg-gradient-to-r from-purple-500 to-blue-500 hover:shadow-xl active:scale-95 transition-all text-white font-semibold rounded-[40px] shadow-lg flex items-center justify-center mt-5"
                        >
                            <span style={{ fontFamily: 'Poppins, sans-serif' }}>Get Started</span>
                        </button>
                    </section>

                    {/* Features Section */}
                    <div className="px-4 mt-6 mb-8">
                        <h3 className="text-sm font-semibold text-gray-800 mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>Features</h3>
                        <div className="flex justify-center gap-4">
                            {highlights.map((highlight, index) => {
                                const Icon = highlight.icon;
                                return (
                                    <div
                                        key={index}
                                        className="w-[100px] h-[100px] rounded-[10px] bg-white shadow-[0px_4px_12px_rgba(0,0,0,0.08)] transition-shadow flex flex-col items-center justify-center text-center p-3 gap-2"
                                    >
                                        <div className={`w-[36px] h-[36px] rounded-[8px] ${highlight.iconBg} flex items-center justify-center`}>
                                            <Icon className="w-5 h-5 text-[#7C3AED]" />
                                        </div>
                                        <span className="text-[12px] font-semibold text-gray-700 text-center leading-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>{highlight.text}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* How It Works Section */}
                    <section className="px-4 pb-8">
                        <h2 className="text-sm font-semibold text-gray-800 mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
                            How it Works
                        </h2>
                        <StepCircle steps={steps} />
                    </section>
                </div>
            </main>
            
            {/* Corporate Contact Modal */}
            <CorporateContactModal 
                isOpen={showContactModal}
                onClose={() => setShowContactModal(false)}
            />
        </div>
    );
}
