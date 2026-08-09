import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/data/supabaseClient';

interface AuthContextValue {
  session: Session | null;
  isLoading: boolean;
  familyId: string | null;
  signUp: (email: string, password: string) => Promise<{ needsEmailConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  createFamilyAndJoin: (input: {
    familyName: string;
    ownerName: string;
    ownerColor: string;
    ownerEmoji: string;
  }) => Promise<string>;
  joinFamilyWithCode: (input: {
    code: string;
    memberName: string;
    memberColor: string;
    memberEmoji: string;
  }) => Promise<string>;
  createInviteCode: () => Promise<string>;
  createKidPairingCode: (memberId: string) => Promise<string>;
  claimKidProfile: (code: string) => Promise<string>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function generateInviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O/0/I/1 — avoids ambiguous characters
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [familyId, setFamilyId] = useState<string | null>(null);

  const resolveFamilyId = useCallback(async (userId: string) => {
    const { data } = await supabase.from('family_members').select('family_id').eq('user_id', userId).limit(1).maybeSingle();
    setFamilyId(data?.family_id ?? null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        resolveFamilyId(data.session.user.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        resolveFamilyId(nextSession.user.id);
      } else {
        setFamilyId(null);
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, [resolveFamilyId]);

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return { needsEmailConfirmation: !data.session };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const createFamilyAndJoin = useCallback(
    async (input: { familyName: string; ownerName: string; ownerColor: string; ownerEmoji: string }) => {
      const { data, error } = await supabase.rpc('create_family_with_owner', {
        family_name: input.familyName,
        owner_name: input.ownerName,
        owner_color: input.ownerColor,
        owner_emoji: input.ownerEmoji,
      });
      if (error) throw error;
      setFamilyId(data);
      return data as string;
    },
    []
  );

  const joinFamilyWithCode = useCallback(
    async (input: { code: string; memberName: string; memberColor: string; memberEmoji: string }) => {
      const { data, error } = await supabase.rpc('join_family_with_code', {
        invite_code: input.code.trim().toUpperCase(),
        member_name: input.memberName,
        member_color: input.memberColor,
        member_emoji: input.memberEmoji,
      });
      if (error) throw error;
      setFamilyId(data);
      return data as string;
    },
    []
  );

  const createInviteCode = useCallback(async () => {
    if (!familyId || !session) throw new Error('Must belong to a family to create an invite');
    const code = generateInviteCode();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(); // 7 days
    const { error } = await supabase
      .from('family_invites')
      .insert({ family_id: familyId, code, created_by: session.user.id, expires_at: expiresAt });
    if (error) throw error;
    return code;
  }, [familyId, session]);

  const createKidPairingCode = useCallback(
    async (memberId: string) => {
      if (!session) throw new Error('Must be signed in to create a pairing code');
      const code = generateInviteCode();
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1 hour
      const { error } = await supabase
        .from('kid_pairing_codes')
        .insert({ member_id: memberId, code, created_by: session.user.id, expires_at: expiresAt });
      if (error) throw error;
      return code;
    },
    [session]
  );

  const claimKidProfile = useCallback(async (code: string) => {
    if (!session) {
      const { error: anonError } = await supabase.auth.signInAnonymously();
      if (anonError) throw anonError;
    }
    const { data, error } = await supabase.rpc('claim_kid_profile', { pairing_code: code.trim().toUpperCase() });
    if (error) throw error;
    setFamilyId(data);
    return data as string;
  }, [session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isLoading,
      familyId,
      signUp,
      signIn,
      signOut,
      createFamilyAndJoin,
      joinFamilyWithCode,
      createInviteCode,
      createKidPairingCode,
      claimKidProfile,
    }),
    [
      session,
      isLoading,
      familyId,
      signUp,
      signIn,
      signOut,
      createFamilyAndJoin,
      joinFamilyWithCode,
      createInviteCode,
      createKidPairingCode,
      claimKidProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
