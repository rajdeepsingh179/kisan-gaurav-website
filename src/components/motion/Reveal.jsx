import { m } from "framer-motion";

import { motion } from "../../design-system";
import { cn } from "../../utils/cn";

export default function Reveal({
  children,
  className,
  delay = 0,
  distance = 20,
}) {
  return (
    <m.div
      className={cn(className)}
      initial={{ opacity: 0, y: distance }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{
        duration: motion.revealDuration,
        delay,
        ease: motion.easing,
      }}
    >
      {children}
    </m.div>
  );
}
