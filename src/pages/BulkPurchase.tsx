import { ArrowLeft, ShoppingCart } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { FloatingCoins } from "@/components/FloatingCoins";
import { useConfig } from "@/contexts/ConfigContext";

export default function BulkPurchase() {
    const { config } = useConfig();

    return (
        <div className="relative min-h-screen flex flex-col font-body overflow-hidden">
            {/* Aurora backdrop */}
            <div className="absolute inset-0 bg-hero-aurora">
                <div className="absolute inset-0 hero-grain opacity-50 pointer-events-none" />
                <div className="absolute -top-32 -left-24 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl" />
                <div className="absolute top-1/3 -right-24 w-96 h-96 rounded-full bg-yellow-400/10 blur-3xl" />
            </div>
            <FloatingCoins />

            <div className="relative flex flex-col flex-1">
                {config.header.enabled && <Header />}

                <main className="flex-1 pb-16">
                    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12 sm:py-20">
                        <button
                            onClick={() => window.history.back()}
                            className="mb-8 inline-flex items-center gap-2 text-white/60 hover:text-amber-300 transition-colors text-sm font-medium group"
                        >
                            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                            Back
                        </button>

                        <div className="bg-blackcard card-edge rounded-3xl md:rounded-[2.5rem] p-6 md:p-8 lg:p-12">
                            <div className="flex items-center gap-4 mb-6 md:mb-8">
                                <div className="relative">
                                    <span className="absolute -inset-[3px] rounded-2xl bg-gold-gradient blur-[2px] opacity-80" />
                                    <div className="relative p-2.5 md:p-3 rounded-2xl bg-blackcard">
                                        <ShoppingCart className="w-8 h-8 text-amber-300" />
                                    </div>
                                </div>
                                <h1 className="text-3xl md:text-4xl font-display font-extrabold">
                                    <span className="text-gold-gradient">Bulk Purchase & Corporate Gifting</span>
                                </h1>
                            </div>

                            <div className="max-w-none space-y-8">
                                <section>
                                    <p className="text-white/70 leading-relaxed">
                                        Whether you're looking to reward your employees or surprise your clients, SabbPe offers a robust platform for bulk gift voucher purchases with exclusive benefits.
                                    </p>
                                </section>

                                <section className="space-y-4">
                                    <h2 className="text-2xl font-bold text-white">1. Benefits of Bulk Orders</h2>
                                    <ul className="list-disc pl-6 space-y-2 text-white/70 marker:text-amber-300">
                                        <li>Special corporate discounts on top brands.</li>
                                        <li>Dedicated account manager for seamless coordination.</li>
                                        <li>Customized branding options for your delivery messages.</li>
                                        <li>Bulk delivery via Excel/CSV uploads.</li>
                                    </ul>
                                </section>

                                <section className="space-y-4">
                                    <h2 className="text-2xl font-bold text-white">2. How to place a bulk order?</h2>
                                    <p className="text-white/70">
                                        Currently, we handle bulk orders through our corporate sales team. You can initiate a request by clicking the <strong className="text-amber-300">"Drop a Query"</strong> button on the FAQ page and selecting "Bulk Purchase" as the topic.
                                    </p>
                                </section>

                                <section className="space-y-4">
                                    <h2 className="text-2xl font-bold text-white">3. Delivery Timelines</h2>
                                    <p className="text-white/70">
                                        While individual orders are instant, bulk orders may take <strong className="text-amber-300">2-4 business hours</strong> for processing and security checks before deployment.
                                    </p>
                                </section>

                                <div className="pt-8 border-t border-white/10 text-center">
                                    <h3 className="text-xl font-bold mb-4 text-white">Ready to power your rewards?</h3>
                                    <button className="bg-gold-gradient text-amber-950 font-bold rounded-2xl px-8 h-12 shadow-lg shadow-amber-500/30 hover:brightness-110 active:scale-95 transition-all">
                                        Contact Sales Team
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                {config.footer.enabled && <Footer />}
            </div>
        </div>
    );
}
