import { useEffect, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';

/**
 * Custom hook for running an interval with optional animation controls
 * @param {function} callback - Function to execute at each interval
 * @param {number|null} delay - Delay between executions in milliseconds (null pauses)
 * @param {object} animationConfig - Optional animation configuration
 * @returns {object} Animation controls that can be used with motion components
 */
export function useInterval(callback, delay, animationConfig = null) {
  const savedCallback = useRef(callback);
  const controls = useAnimation();
  const intervalRef = useRef(null);

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = async () => {
      // Run animation sequence if configured
      if (animationConfig) {
        await controls.start(animationConfig.sequence);
      }
      
      // Execute the callback
      callback();
    };
  }, [callback, animationConfig, controls]);

  // Set up the interval with animation support
  useEffect(() => {
    const tick = () => {
      savedCallback.current();
    };

    if (delay !== null) {
      intervalRef.current = setInterval(tick, delay);
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [delay]);

  // Additional effect to handle animation when interval starts/stops
  useEffect(() => {
    if (delay !== null) {
      controls.start({
        opacity: 1,
        transition: { duration: 0.3 }
      });
    } else {
      controls.start({
        opacity: 0.5,
        transition: { duration: 0.3 }
      });
    }
  }, [delay, controls]);

  return {
    controls,
    stopInterval: () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    },
    startInterval: (newDelay) => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      intervalRef.current = setInterval(savedCallback.current, newDelay || delay);
    }
  };
}

/**
 * Example usage with Framer Motion:
 * 
 * const { controls } = useInterval(
 *   () => console.log('Interval tick'),
 *   1000,
 *   {
 *     sequence: {
 *       scale: [1, 1.1, 1],
 *       transition: { duration: 0.5 }
 *     }
 *   }
 * );
 * 
 * <motion.div animate={controls}>Animated Element</motion.div>
 */