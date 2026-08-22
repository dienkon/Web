import React from "react";
import CasioEmulator from "../../features/calculator/components/CasioEmulator";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSendToScratchpad?: (value: string) => void;
}

export default function CasioCalculator({ isOpen, onClose, onSendToScratchpad }: Props) {
  return (
    <CasioEmulator
      isOpen={isOpen}
      onClose={onClose}
      onSendToScratchpad={onSendToScratchpad}
    />
  );
}
