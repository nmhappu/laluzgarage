import { useId, useMemo, type ElementType } from 'react';
import { motion, AnimatePresence, useReducedMotion, type Transition } from 'motion/react';
import { cn } from '../../lib/utils';

export interface MorphTextProps {
  children: string;
  className?: string;
  as?: ElementType;
  transition?: Transition;
}

interface MorphChar {
  char: string;
  key: string;
}

/**
 * Splits text into unique character items with occurrence counts
 * to allow Motion's layoutId to track identical glyphs across string transitions.
 */
function generateKeys(text: string): MorphChar[] {
  const charCounts: Record<string, number> = {};
  return Array.from(text).map((char) => {
    const count = (charCounts[char] ?? 0) + 1;
    charCounts[char] = count;
    return {
      char,
      key: `${char === ' ' ? 'space' : char}-${count}`,
    };
  });
}

const DEFAULT_TRANSITION: Transition = {
  type: 'spring',
  stiffness: 280,
  damping: 22,
  mass: 0.3,
};

/**
 * MorphText
 * Inspired by shadcn.io and motion-primitives TextMorph.
 * Smoothly morphs individual characters between text updates via layoutId and AnimatePresence.
 */
export function MorphText({
  children,
  className,
  as: Component = 'span',
  transition = DEFAULT_TRANSITION,
}: MorphTextProps) {
  const instanceId = useId();
  const shouldReduceMotion = useReducedMotion();
  const characters = useMemo(() => generateKeys(children), [children]);

  return (
    <Component className={cn('relative inline-flex items-center select-none', className)}>
      {/* Screen reader accessible label */}
      <span className="sr-only">{children}</span>

      {/* Visual character-level morph animation */}
      <span aria-hidden="true" className="inline-flex items-center whitespace-pre">
        <AnimatePresence mode="popLayout" initial={false}>
          {characters.map(({ char, key }) => (
            <motion.span
              key={`${instanceId}-${key}`}
              layoutId={shouldReduceMotion ? undefined : `${instanceId}-${key}`}
              layout="position"
              initial={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.75, filter: 'blur(4px)' }
              }
              animate={
                shouldReduceMotion
                  ? { opacity: 1 }
                  : { opacity: 1, scale: 1, filter: 'blur(0px)' }
              }
              exit={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.75, filter: 'blur(4px)' }
              }
              transition={transition}
              className="inline-block whitespace-pre"
            >
              {char === ' ' ? '\u00A0' : char}
            </motion.span>
          ))}
        </AnimatePresence>
      </span>
    </Component>
  );
}
