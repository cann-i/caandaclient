import React from 'react';
import { motion } from 'framer-motion';

const Button = ({ children, variant = 'primary', className, ...props }) => {
  const baseStyles = "inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-primary text-background hover:bg-white focus:ring-primary",
    secondary: "bg-surface border border-border text-primary hover:bg-surface-highlight focus:ring-border",
    accent: "bg-accent text-white hover:bg-blue-600 focus:ring-accent",
    ghost: "bg-transparent hover:bg-surface-highlight text-secondary hover:text-primary",
    danger: "bg-error/10 text-error hover:bg-error/20 border border-error/20",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
};

export default Button;
