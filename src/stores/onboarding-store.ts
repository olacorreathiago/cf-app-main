// Zustand store for onboarding wizard state.
// Keeps sensitive data in memory — never passed via URL params.
import { create } from "zustand";
import type { ProfileType } from "@/types";

interface OnboardingState {
  // Step 1 — role selection
  profileType: ProfileType | null;
  // Step 2 — shared fields (pre-filled from Google if available)
  fullName: string;
  nickname: string;
  phone: string;
  // Professional-only fields
  professionalId: string;
  specialty: string;
  // Invite token carried through onboarding
  inviteToken: string | null;

  setProfileType: (type: ProfileType) => void;
  setFullName: (name: string) => void;
  setNickname: (nickname: string) => void;
  setPhone: (phone: string) => void;
  setProfessionalId: (id: string) => void;
  setSpecialty: (specialty: string) => void;
  setInviteToken: (token: string) => void;
  reset: () => void;
}

const initialState = {
  profileType: null,
  fullName: "",
  nickname: "",
  phone: "",
  professionalId: "",
  specialty: "",
  inviteToken: null,
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...initialState,
  setProfileType: (profileType) => set({ profileType }),
  setFullName: (fullName) => set({ fullName }),
  setNickname: (nickname) => set({ nickname }),
  setPhone: (phone) => set({ phone }),
  setProfessionalId: (professionalId) => set({ professionalId }),
  setSpecialty: (specialty) => set({ specialty }),
  setInviteToken: (inviteToken) => set({ inviteToken }),
  reset: () => set(initialState),
}));
