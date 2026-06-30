import React from 'react';

type Props = {
  children?: React.ReactNode;
  onClick?: (e?: any) => void;
  className?: string;
};

export default function BuyButton({ children, onClick, className = '' }: Props) {
  return (
    <button
      onClick={onClick}
      className={`bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-full px-4 py-1.5 text-sm shadow ${className}`}
    >
      {children || 'Buy'}
    </button>
  );
}
