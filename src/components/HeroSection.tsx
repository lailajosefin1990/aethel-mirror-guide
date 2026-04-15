import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { trackEvent, EVENTS } from "@/lib/analytics";
import { useTranslation } from "react-i18next";

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
  { text: "I was about to say yes to a collab that felt off. Guidance Journal helped me see why — and gave me the words to say no gracefully.", author: "Sam K.", domain: "Visibility" },
];

const HeroSection = ({ onStart }: HeroSectionProps) => {
  const { t } = useTranslation();
  const howRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [testimonialIndex, setTestimonialIndex] = useState(0);

  useEffect(() => {
    trackEvent(EVENTS.LANDING_VIEWED);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTestimonialIndex((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const scrollToHow = () => {
    howRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <p className="sr-only">
        Guidance Journal helps you make decisions using astrology, Human Design, numerology, Gene Keys, and Destiny Matrix. Get your Third Way — one specific action you can take in the next 48 hours.
      </p>
      <section className="flex-1 flex flex-col items-center justify-center px-5 py-16">
        <div className="w-full max-w-app flex flex-col items-center">
          {/* Logo */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="font-display text-[28px] tracking-[0.25em] text-foreground uppercase mb-14"
          >
            GUIDANCE JOURNAL
          </motion.p>

          {/* Sample reading card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="w-full border border-border p-6 mb-6"
          >
            <p className="font-body text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-4">
              Work & Money · Sample Reading
            </p>

            <p className="font-body text-[14px] leading-[1.8] text-foreground/85 mb-5">
              Mercury stationing direct clears the fog around your career
              decision this week. Your energy for earning is high — but it wants
              a focused channel, not a scatter. The timing isn't perfect, but
              it's ripe.
            </p>

            <p className="font-body text-[11px] uppercase tracking-[0.3em] text-foreground/40 mb-2">
              Your Third Way
            </p>

            <p className="font-display text-[20px] leading-[1.5] text-foreground italic mb-5">
              Send the counter-offer by Friday. Name your non-negotiable and one
              thing you'll let go of. That's the move.
            </p>

            <p className="font-body text-[12px] italic text-foreground/30">
              {t("reading_mirror_disclaimer")}
            </p>
          </motion.div>

          {/* Testimonials */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="w-full min-h-[80px] flex items-center justify-center mb-10"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={testimonialIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center text-center"
              >
                <p className="font-display text-[13px] leading-[1.6] text-foreground/50 mb-2">
                  "{TESTIMONIALS[testimonialIndex].text}"
                </p>
                <p className="font-body text-[12px] text-muted-foreground">
                  — {TESTIMONIALS[testimonialIndex].author} · <span className="text-foreground/40 text-[11px] font-body">{TESTIMONIALS[testimonialIndex].domain}</span>
                </p>
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.1 }}
            className="w-full flex flex-col items-center gap-4"
          >
            <button
              onClick={() => { trackEvent(EVENTS.CTA_GET_THIRD_WAY_CLICKED); onStart(); }}
              className="w-[200px] h-[48px] bg-foreground text-background font-body font-medium text-[13px] uppercase tracking-[0.15em] hover:opacity-85 transition-opacity duration-300"
            >
              BEGIN
            </button>

            <p className="font-body text-[12px] text-muted-foreground mt-2 text-center">
              {t("hero_free_tag")}
            </p>

            <a href="/evidence" onClick={() => trackEvent(EVENTS.EVIDENCE_LINK_HERO_CLICKED)} className="block font-body text-[13px] text-foreground/40 hover:text-foreground/60 underline underline-offset-2 mt-3 text-center transition-colors">
              {t("hero_see_outcomes")}
            </a>

            <button
              onClick={scrollToHow}
              className="font-body text-[13px] text-foreground/30 hover:text-foreground/50 transition-colors duration-300 bg-transparent border-none cursor-pointer mt-2"
            >
              {t("hero_how_it_works")}
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
                onClick={() => trackEvent(EVENTS.HOW_IT_WORKS_OPENED)}
                className="font-body text-[13px] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground hover:no-underline py-4">
                {t("hero_how_it_works")}
              </AccordionTrigger>
              <AccordionContent className="pb-6">
                <div className="flex flex-col gap-4">
                  {howItems.map((item, i) => (
                    <div
                      key={i}
                      className="flex gap-3 items-start"
                    >
                      <span className="font-body text-[12px] text-foreground/30 mt-0.5 shrink-0">
                        0{i + 1}
                      </span>
                      <p className="font-body text-[14px] leading-[1.8] text-foreground/85">
                        {item}
                      </p>
                    </div>
                  ))}

                  <button
                    onClick={() => { trackEvent(EVENTS.EVIDENCE_LINK_CLICKED); navigate("/evidence"); }}
                    className="flex gap-3 items-start group mt-2"
                  >
                    <span className="font-body text-[12px] text-foreground/30 mt-0.5 shrink-0">
                      04
                    </span>
                    <p className="font-body text-[14px] leading-[1.8] text-foreground/60 group-hover:text-foreground/80 transition-colors">
                      {t("hero_see_outcomes")}
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
