import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { track } from "@/lib/posthog";

interface HeroSectionProps {
  onStart: () => void;
}

const howItems = [
  "We anchor your mirror in your birth moment.",
  "We read six systems together, not in pieces.",
  "We give you one Third Way — a clear next move, today.",
];

const TESTIMONIALS = [
  { text: "I was stuck between two job offers for weeks. The Third Way gave me a frame I hadn't considered — I negotiated a hybrid role instead.", author: "Maia R.", domain: "Work & Money" },
  { text: "Every reading has been eerily specific. I use it before any big conversation with my partner now.", author: "Jordan T.", domain: "Love & People" },
  { text: "I was about to say yes to a collab that felt off. Aethel helped me see why — and gave me the words to say no gracefully.", author: "Sam K.", domain: "Visibility" },
];

const HeroSection = ({ onStart }: HeroSectionProps) => {
  const howRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    track("landing_viewed");
  }, []);

  const scrollToHow = () => {
    howRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hidden SEO content */}
      <p className="sr-only">
        Aethel Mirror helps you make decisions using astrology, Human Design, numerology, Gene Keys, and Destiny Matrix. Get your Third Way — one specific action you can take in the next 48 hours.
      </p>
      {/* Main content */}
      <section className="flex-1 flex flex-col items-center justify-center px-5 py-16">
        <div className="w-full max-w-app flex flex-col items-center">
          {/* Logo */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="font-display text-[14px] tracking-[0.45em] text-primary mb-14"
          >
            A E T H E L &nbsp; M I R R O R
          </motion.p>

          {/* Sample reading card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="w-full rounded-md border border-border bg-card p-6 mb-6"
          >
            <p className="font-body text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-4">
              Work &amp; Money · Sample Reading
            </p>

            <p className="font-display text-[16px] leading-[1.6] text-card-foreground mb-5">
              Mercury stationing direct clears the fog around your career
              decision this week. Your energy for earning is high — but it wants
              a focused channel, not a scatter. The timing isn't perfect, but
              it's ripe.
            </p>

            <p className="font-display text-[13px] uppercase tracking-[0.15em] text-primary font-semibold mb-2">
              Your Third Way
            </p>

            <p className="font-display text-[18px] leading-[1.5] font-semibold text-card-foreground mb-5">
              Send the counter-offer by Friday. Name your non-negotiable and one
              thing you'll let go of. That's the move.
            </p>

            <p className="font-body text-[12px] italic text-card-foreground/50">
              I'm a mirror, not a master.
            </p>
          </motion.div>

          {/* Testimonial */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="font-body text-[13px] text-foreground/70 text-center mb-10"
          >
            "I'd been stuck for 3 months. I had clarity in 20 minutes." — S.K.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.1 }}
            className="w-full flex flex-col items-center gap-4"
          >
            <button
              onClick={() => { track("cta_get_third_way_clicked"); onStart(); }}
              className="w-full h-[52px] rounded-sm bg-primary text-primary-foreground font-body font-medium text-sm tracking-wide hover:brightness-110 transition-all duration-300"
            >
              Get my Third Way →
            </button>

            <button
              onClick={scrollToHow}
              className="font-body text-[13px] text-foreground/50 hover:text-foreground/70 transition-colors duration-300 bg-transparent border-none cursor-pointer"
            >
              How it works ↓
            </button>
          </motion.div>
        </div>
      </section>

      {/* How it works accordion */}
      <section ref={howRef} className="px-5 pb-20">
        <div className="w-full max-w-app mx-auto">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="how" className="border-border">
              <AccordionTrigger
                onClick={() => track("how_it_works_opened")}
                className="font-body text-[13px] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground hover:no-underline py-4">
                How it works
              </AccordionTrigger>
              <AccordionContent className="pb-6">
                <div className="flex flex-col gap-4">
                  {howItems.map((item, i) => (
                    <div
                      key={i}
                      className="flex gap-3 items-start"
                    >
                      <span className="font-body text-[12px] text-primary/60 mt-0.5 shrink-0">
                        0{i + 1}
                      </span>
                      <p className="font-display text-[15px] leading-[1.6] text-foreground">
                        {item}
                      </p>
                    </div>
                  ))}

                  <button
                    onClick={() => { track("evidence_link_clicked"); navigate("/evidence"); }}
                    className="flex gap-3 items-start group mt-2"
                  >
                    <span className="font-body text-[12px] text-primary/60 mt-0.5 shrink-0">
                      04
                    </span>
                    <p className="font-display text-[15px] leading-[1.6] text-primary group-hover:text-primary/80 transition-colors">
                      See real outcomes →
                    </p>
                  </button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>
    </div>
  );
};

export default HeroSection;
