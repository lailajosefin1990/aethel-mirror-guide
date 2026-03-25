import { motion } from "framer-motion";
import { Sparkles, Compass, Flame } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

interface HeroSectionProps {
  onStart: () => void;
}

const valueProps = [
  { icon: Sparkles, text: "One place for all your guidance" },
  { icon: Compass, text: "Clear, concrete actions (no vague "trust the universe")" },
  { icon: Flame, text: "Designed for soul-led founders and creators" },
];

const HeroSection = ({ onStart }: HeroSectionProps) => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={heroBg}
          alt=""
          width={1920}
          height={1080}
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-2xl mx-auto px-6 text-center">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-sm font-body tracking-[0.3em] uppercase text-primary mb-6"
        >
          ✦ Spiritual clarity, distilled ✦
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="text-6xl sm:text-7xl lg:text-8xl font-display font-light tracking-tight text-gold-gradient mb-6"
        >
          Aethel Mirror
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="text-xl sm:text-2xl font-display font-light italic text-foreground/80 mb-8"
        >
          One spiritual mirror for every big decision.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="text-base font-body font-light text-muted-foreground leading-relaxed max-w-lg mx-auto mb-12"
        >
          You've done the readings, pulled the cards, run the charts—yet when it's time to decide, you're still stuck.
          <br className="hidden sm:block" /><br className="hidden sm:block" />
          Aethel Mirror turns your astrology, Human Design, numerology, Gene Keys, Destiny Matrix, and faith into{" "}
          <span className="text-primary font-medium">one clear next move</span>.
        </motion.p>

        {/* Value props */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.3 }}
          className="flex flex-col gap-4 mb-12 max-w-sm mx-auto"
        >
          {valueProps.map((prop, i) => (
            <div key={i} className="flex items-center gap-3 text-left">
              <prop.icon className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-body text-foreground/70">{prop.text}</span>
            </div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.6 }}
          className="flex flex-col items-center gap-3"
        >
          <button
            onClick={onStart}
            className="px-10 py-4 bg-primary text-primary-foreground font-body font-medium text-base tracking-wide rounded-lg glow-gold hover:brightness-110 transition-all duration-300 hover:scale-[1.02]"
          >
            Start my mirror
          </button>
          <p className="text-xs text-muted-foreground font-body">
            Takes 60 seconds. No fluff, just your coordinates.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
