import { createContext, useContext, useState, ReactNode } from "react";

interface MuteContextType {
  muted: boolean;
  toggleMute: () => void;
}

const MuteContext = createContext<MuteContextType>({ muted: false, toggleMute: () => {} });

export function MuteProvider({ children }: { children: ReactNode }) {
  const [muted, setMuted] = useState(false);
  return (
    <MuteContext.Provider value={{ muted, toggleMute: () => setMuted(m => !m) }}>
      {children}
    </MuteContext.Provider>
  );
}

export const useMute = () => useContext(MuteContext);
