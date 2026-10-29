import { Link, useRoute } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { FAQ_TOPICS, fillFacts, type ScFacts } from "@/data/faqTopics";
import { fetchScFacts } from "@/api/supportFactsApi";

/** Linkable single-answer FAQ page: /faq/:id  (Shebby's replies point here). */
export default function FAQTopicPage() {
  const [, params] = useRoute<{ id: string }>("/faq/:id");
  const [facts, setFacts] = useState<ScFacts | null>(null);
  useEffect(() => { fetchScFacts().then(setFacts); }, []);
  const topicId = params ? params.id : "";
  const topic = FAQ_TOPICS.find((t) => t.id === topicId);
  const related = FAQ_TOPICS.filter((t) => t.id !== topic?.id && t.category === topic?.category);

  const linkify = (text: string) =>
    text.split(/(https?:\/\/\S+)/g).map((part, i) =>
      /^https?:\/\//.test(part) ? (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all">{part}</a>
      ) : (
        <span key={i}>{part}</span>
      )
    );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl pb-24">
        <Link href="/faq" className="text-sm text-muted-foreground hover:underline">← All FAQs</Link>
        {topic ? (
          <>
            <h1 className="mt-3 text-2xl font-bold">{topic.title}</h1>
            <p className="mt-4 whitespace-pre-line leading-relaxed text-muted-foreground">{linkify(fillFacts(topic.answer, facts))}</p>
            <div className="mt-8 rounded-xl border bg-card p-4 flex items-center justify-between gap-3">
              <p className="text-sm">Still stuck? Your chatbot friend <b>Shebby</b> is here to help.</p>
              <Button size="sm" onClick={() => window.dispatchEvent(new CustomEvent("gift360:open-support-chat"))}>Chat with Shebby</Button>
            </div>
            {related.length > 0 && (
              <div className="mt-8">
                <h2 className="text-sm font-semibold mb-2">Related</h2>
                <ul className="space-y-1">
                  {related.map((r) => (
                    <li key={r.id}><Link href={`/faq/${r.id}`} className="text-blue-600 hover:underline text-sm">{r.title}</Link></li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <div className="mt-6">
            <h1 className="text-xl font-bold">We couldn't find that FAQ</h1>
            <Link href="/faq" className="text-blue-600 underline text-sm">Browse all FAQs</Link>
          </div>
        )}
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
