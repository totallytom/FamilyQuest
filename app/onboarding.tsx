import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useAppData } from '@/data/AppDataContext';
import { useAuth } from '@/data/AuthContext';
import { colors, fontSize, radius, spacing } from '@/theme/theme';
import { avatarEmojis, avatarPalette } from '@/theme/colors';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import type { Role } from '@/types/models';

interface DraftMember {
  name: string;
  role: Role;
  color: string;
  emoji: string;
}

type Step =
  | 'start'
  | 'create-auth'
  | 'family'
  | 'you'
  | 'members'
  | 'join-auth'
  | 'join-code'
  | 'join-you'
  | 'kid-code';

export default function Onboarding() {
  const { family, addMember, loadDemoFamily } = useAppData();
  const { session, signIn, signUp, createFamilyAndJoin, joinFamilyWithCode, claimKidProfile } = useAuth();

  const [step, setStep] = useState<Step>('start');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [awaitingFamilyLoad, setAwaitingFamilyLoad] = useState<'members' | 'tabs' | null>(null);

  // Shared auth fields (used by both the create and join flows, whichever needs them)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Create-a-family flow
  const [familyName, setFamilyName] = useState('');
  const [members, setMembers] = useState<DraftMember[]>([]);
  const [draftName, setDraftName] = useState('');
  const [draftRole, setDraftRole] = useState<Role>('kid');
  const [draftColor, setDraftColor] = useState<string>(avatarPalette[0]);
  const [draftEmoji, setDraftEmoji] = useState<string>(avatarEmojis[0]);

  // "Your own profile" fields, shared by the create-owner and join-member steps
  const [profileName, setProfileName] = useState('');
  const [profileColor, setProfileColor] = useState<string>(avatarPalette[0]);
  const [profileEmoji, setProfileEmoji] = useState<string>(avatarEmojis[0]);

  // Join-a-family flow
  const [joinCode, setJoinCode] = useState('');

  // Kid device pairing flow
  const [kidCode, setKidCode] = useState('');

  useEffect(() => {
    if (awaitingFamilyLoad === 'members' && family) {
      setAwaitingFamilyLoad(null);
      setIsSubmitting(false);
      setStep('members');
    }
  }, [awaitingFamilyLoad, family]);

  const handleTryDemo = async () => {
    await loadDemoFamily();
    router.replace('/(tabs)');
  };

  const handleSelectCreate = () => setStep(session ? 'family' : 'create-auth');
  const handleSelectJoin = () => setStep(session ? 'join-code' : 'join-auth');

  const handleAuthSubmit = async (nextStepIfSignedIn: Step) => {
    if (!email.trim() || password.length < 6) return;
    setIsSubmitting(true);
    try {
      if (nextStepIfSignedIn === 'family') {
        const { needsEmailConfirmation } = await signUp(email.trim(), password);
        if (needsEmailConfirmation) {
          Alert.alert('Check your email', 'Confirm your address, then come back and sign in.');
          return;
        }
      } else {
        await signIn(email.trim(), password);
      }
      setStep(nextStepIfSignedIn);
    } catch (error) {
      Alert.alert('Something went wrong', error instanceof Error ? error.message : String(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinueFromFamily = () => {
    if (!familyName.trim()) return;
    setStep('you');
  };

  const handleFinishOwnerProfile = async () => {
    if (!profileName.trim()) return;
    setIsSubmitting(true);
    try {
      await createFamilyAndJoin({
        familyName: familyName.trim(),
        ownerName: profileName.trim(),
        ownerColor: profileColor,
        ownerEmoji: profileEmoji,
      });
      setAwaitingFamilyLoad('members');
    } catch (error) {
      Alert.alert('Could not create family', error instanceof Error ? error.message : String(error));
      setIsSubmitting(false);
    }
  };

  const handleAddDraftMember = () => {
    if (!draftName.trim()) return;
    setMembers((prev) => [...prev, { name: draftName.trim(), role: draftRole, color: draftColor, emoji: draftEmoji }]);
    setDraftName('');
    setDraftRole('kid');
    setDraftColor(avatarPalette[(members.length + 1) % avatarPalette.length]);
    setDraftEmoji(avatarEmojis[(members.length + 1) % avatarEmojis.length]);
  };

  const handleRemoveDraftMember = (index: number) => {
    setMembers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFinish = async () => {
    for (const member of members) {
      await addMember(member);
    }
    router.replace('/(tabs)');
  };

  const handleClaimKidProfile = async () => {
    if (kidCode.trim().length < 4) return;
    setIsSubmitting(true);
    try {
      await claimKidProfile(kidCode.trim());
      router.replace('/');
    } catch (error) {
      Alert.alert('Could not claim profile', error instanceof Error ? error.message : String(error));
      setIsSubmitting(false);
    }
  };

  const handleJoinCodeSubmit = () => {
    if (joinCode.trim().length < 4) return;
    setStep('join-you');
  };

  const handleFinishJoinProfile = async () => {
    if (!profileName.trim()) return;
    setIsSubmitting(true);
    try {
      await joinFamilyWithCode({
        code: joinCode.trim(),
        memberName: profileName.trim(),
        memberColor: profileColor,
        memberEmoji: profileEmoji,
      });
      router.replace('/');
    } catch (error) {
      Alert.alert('Could not join family', error instanceof Error ? error.message : String(error));
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer style={styles.content}>
      <Text style={styles.eyebrow}>Welcome to</Text>
      <Text style={styles.appName}>FamilyQuest</Text>
      <Text style={styles.subtitle}>
        Share daily routines with your family and check in on each other&apos;s tasks — homework,
        chores, and everything in between.
      </Text>

      {step === 'start' && (
        <View style={styles.card}>
          <Button label="Create a family" onPress={handleSelectCreate} icon="people" fullWidth />
          <View style={styles.stackGap} />
          <Button label="I have an invite code" onPress={handleSelectJoin} variant="secondary" icon="key" fullWidth />
          <View style={styles.stackGap} />
          <Button label="I have a code from my parent" onPress={() => setStep('kid-code')} variant="secondary" icon="qr-code" fullWidth />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button label="Try a demo family" onPress={handleTryDemo} variant="secondary" icon="sparkles" fullWidth />

          {!session && (
            <>
              <View style={styles.stackGap} />
              <Button label="Already have an account? Sign in" onPress={() => router.push('/auth')} variant="ghost" fullWidth />
            </>
          )}
        </View>
      )}

      {(step === 'create-auth' || step === 'join-auth') && (
        <View style={styles.card}>
          <Text style={styles.label}>{step === 'create-auth' ? 'Create your account' : 'Sign in'}</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoFocus
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="At least 6 characters"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            secureTextEntry
            returnKeyType="done"
          />
          <Button
            label={step === 'create-auth' ? 'Continue' : 'Sign in'}
            onPress={() => handleAuthSubmit(step === 'create-auth' ? 'family' : 'join-code')}
            disabled={!email.trim() || password.length < 6}
            loading={isSubmitting}
            fullWidth
          />
          <View style={styles.stackGap} />
          <Button label="Back" onPress={() => setStep('start')} variant="ghost" fullWidth />
        </View>
      )}

      {step === 'family' && (
        <View style={styles.card}>
          <Text style={styles.label}>What&apos;s your family name?</Text>
          <TextInput
            value={familyName}
            onChangeText={setFamilyName}
            placeholder="e.g. The Rivera Family"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            autoFocus
            returnKeyType="next"
            onSubmitEditing={handleContinueFromFamily}
          />
          <Button label="Continue" onPress={handleContinueFromFamily} disabled={!familyName.trim()} fullWidth />
        </View>
      )}

      {step === 'kid-code' && (
        <View style={styles.card}>
          <Text style={styles.label}>Enter the code from your parent&apos;s phone</Text>
          <Text style={styles.helperText}>They can find it under your name in their Profile tab.</Text>
          <TextInput
            value={kidCode}
            onChangeText={setKidCode}
            placeholder="e.g. 7K3F2Q"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            autoCapitalize="characters"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleClaimKidProfile}
          />
          <Button label="Continue" onPress={handleClaimKidProfile} disabled={kidCode.trim().length < 4} loading={isSubmitting} fullWidth />
          <View style={styles.stackGap} />
          <Button label="Back" onPress={() => setStep('start')} variant="ghost" fullWidth />
        </View>
      )}

      {step === 'join-code' && (
        <View style={styles.card}>
          <Text style={styles.label}>Enter your family&apos;s invite code</Text>
          <Text style={styles.helperText}>Get this from a parent who&apos;s already set up the family.</Text>
          <TextInput
            value={joinCode}
            onChangeText={setJoinCode}
            placeholder="e.g. 7K3F2Q"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            autoCapitalize="characters"
            autoFocus
            returnKeyType="next"
            onSubmitEditing={handleJoinCodeSubmit}
          />
          <Button label="Continue" onPress={handleJoinCodeSubmit} disabled={joinCode.trim().length < 4} fullWidth />
        </View>
      )}

      {(step === 'you' || step === 'join-you') && (
        <View style={styles.card}>
          <Text style={styles.label}>What should we call you?</Text>
          <TextInput
            value={profileName}
            onChangeText={setProfileName}
            placeholder="Your name"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            autoFocus
          />

          <Text style={styles.pickerLabel}>Avatar</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiRow}>
            {avatarEmojis.map((emoji) => (
              <Pressable key={emoji} onPress={() => setProfileEmoji(emoji)}>
                <Avatar emoji={emoji} color={profileColor} size={40} ringColor={emoji === profileEmoji ? colors.primary : undefined} />
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.colorRow}>
            {avatarPalette.map((color) => (
              <Pressable
                key={color}
                onPress={() => setProfileColor(color)}
                style={[styles.colorSwatch, { backgroundColor: color }, profileColor === color && styles.colorSwatchActive]}
              />
            ))}
          </View>

          <Button
            label={step === 'you' ? 'Create family' : 'Join family'}
            onPress={step === 'you' ? handleFinishOwnerProfile : handleFinishJoinProfile}
            disabled={!profileName.trim()}
            loading={isSubmitting}
            fullWidth
          />
        </View>
      )}

      {step === 'members' && (
        <View style={styles.card}>
          <Text style={styles.label}>Who else is in {familyName}?</Text>
          <Text style={styles.helperText}>Add your kids — everyone can see each other&apos;s progress.</Text>

          {members.length > 0 && (
            <View style={styles.memberList}>
              {members.map((m, index) => (
                <View key={`${m.name}-${index}`} style={styles.memberRow}>
                  <Avatar emoji={m.emoji} color={m.color} size={40} />
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{m.name}</Text>
                    <Text style={styles.memberRole}>{m.role === 'parent' ? 'Parent' : 'Kid'}</Text>
                  </View>
                  <Pressable onPress={() => handleRemoveDraftMember(index)} hitSlop={8}>
                    <Ionicons name="close-circle" size={22} color={colors.textMuted} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          <View style={styles.draftForm}>
            <TextInput
              value={draftName}
              onChangeText={setDraftName}
              placeholder="Name"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              returnKeyType="done"
              onSubmitEditing={handleAddDraftMember}
            />

            <View style={styles.roleToggle}>
              {(['kid', 'parent'] as Role[]).map((role) => (
                <Pressable
                  key={role}
                  onPress={() => setDraftRole(role)}
                  style={[styles.roleOption, draftRole === role && styles.roleOptionActive]}
                >
                  <Text style={[styles.roleOptionText, draftRole === role && styles.roleOptionTextActive]}>
                    {role === 'kid' ? 'Kid' : 'Parent'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.pickerLabel}>Avatar</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiRow}>
              {avatarEmojis.map((emoji) => (
                <Pressable key={emoji} onPress={() => setDraftEmoji(emoji)}>
                  <Avatar emoji={emoji} color={draftColor} size={40} ringColor={emoji === draftEmoji ? colors.primary : undefined} />
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.colorRow}>
              {avatarPalette.map((color) => (
                <Pressable
                  key={color}
                  onPress={() => setDraftColor(color)}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color },
                    draftColor === color && styles.colorSwatchActive,
                  ]}
                />
              ))}
            </View>

            <Button label="Add family member" onPress={handleAddDraftMember} variant="secondary" icon="add" disabled={!draftName.trim()} fullWidth />
          </View>

          <View style={styles.finishRow}>
            <Button label="Finish setup" onPress={handleFinish} fullWidth />
          </View>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  eyebrow: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    fontWeight: '600',
  },
  appName: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.primaryDark,
    marginTop: 2,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  stackGap: {
    height: spacing.sm,
  },
  label: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  helperText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    marginBottom: spacing.lg,
    backgroundColor: colors.background,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: spacing.sm,
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  memberList: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  memberRole: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  draftForm: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.lg,
  },
  roleToggle: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radius.pill,
    padding: 4,
    marginBottom: spacing.lg,
  },
  roleOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.pill,
  },
  roleOptionActive: {
    backgroundColor: colors.primary,
  },
  roleOptionText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textMuted,
  },
  roleOptionTextActive: {
    color: colors.white,
  },
  pickerLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  emojiRow: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  colorRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchActive: {
    borderColor: colors.text,
  },
  finishRow: {
    marginTop: spacing.lg,
  },
});
