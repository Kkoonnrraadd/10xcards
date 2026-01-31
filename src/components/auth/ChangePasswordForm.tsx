import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

const MIN_PASSWORD_LENGTH = 8;

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordStrength = useMemo(() => {
    if (newPassword.length === 0) return null;

    const checks = {
      length: newPassword.length >= MIN_PASSWORD_LENGTH,
      uppercase: /[A-Z]/.test(newPassword),
      lowercase: /[a-z]/.test(newPassword),
      number: /[0-9]/.test(newPassword),
      special: /[^A-Za-z0-9]/.test(newPassword),
    };

    return checks;
  }, [newPassword]);

  const passwordsMatch = useMemo(() => {
    if (confirmPassword.length === 0) return null;
    return newPassword === confirmPassword;
  }, [newPassword, confirmPassword]);

  const isFormValid = useMemo(() => {
    return currentPassword.length > 0 && passwordStrength?.length && passwordsMatch === true;
  }, [currentPassword, passwordStrength, passwordsMatch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Proszę wypełnić wszystkie pola.");
      return;
    }

    if (!passwordStrength?.length) {
      setError(`Nowe hasło musi mieć co najmniej ${MIN_PASSWORD_LENGTH} znaków.`);
      return;
    }

    if (passwordsMatch !== true) {
      setError("Nowe hasła nie są zgodne.");
      return;
    }

    if (currentPassword === newPassword) {
      setError("Nowe hasło musi być inne niż obecne hasło.");
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Implement Supabase auth integration
      // First verify current password by attempting to sign in
      // const { error: signInError } = await supabase.auth.signInWithPassword({
      //   email: user.email,
      //   password: currentPassword,
      // });

      // if (signInError) {
      //   throw new Error("Obecne hasło jest nieprawidłowe.");
      // }

      // Then update to new password
      // const { error } = await supabase.auth.updateUser({
      //   password: newPassword,
      // });

      // if (error) throw error;

      toast.success("Hasło zostało pomyślnie zmienione", {
        description: "Twoje nowe hasło jest już aktywne.",
      });

      // Reset form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // eslint-disable-next-line no-console
      console.log("Password changed successfully");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Wystąpił nieoczekiwany błąd podczas zmiany hasła.";
      setError(errorMessage);
      toast.error("Nie udało się zmienić hasła", {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Zmień hasło</CardTitle>
        <CardDescription>Zaktualizuj hasło do swojego konta</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Obecne hasło</Label>
            <Input
              id="currentPassword"
              type="password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">Nowe hasło</Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isLoading}
              aria-invalid={newPassword.length > 0 && !passwordStrength?.length ? "true" : "false"}
              autoComplete="new-password"
            />
            {newPassword.length > 0 && passwordStrength && (
              <div className="space-y-1 text-sm">
                <PasswordRequirement met={passwordStrength.length} text={`Co najmniej ${MIN_PASSWORD_LENGTH} znaków`} />
                <PasswordRequirement met={passwordStrength.uppercase} text="Jedna wielka litera" />
                <PasswordRequirement met={passwordStrength.lowercase} text="Jedna mała litera" />
                <PasswordRequirement met={passwordStrength.number} text="Jedna cyfra" />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Potwierdź nowe hasło</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              aria-invalid={confirmPassword.length > 0 && passwordsMatch === false ? "true" : "false"}
              autoComplete="new-password"
            />
            {confirmPassword.length > 0 && passwordsMatch !== null && (
              <PasswordRequirement
                met={passwordsMatch}
                text={passwordsMatch ? "Hasła są zgodne" : "Hasła nie są zgodne"}
              />
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>Błąd</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={!isFormValid || isLoading} className="w-full">
            {isLoading ? "Zmiana hasła..." : "Zmień hasło"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function PasswordRequirement({ met, text }: { met: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      {met ? (
        <CheckCircle2 className="size-4 text-green-600 dark:text-green-500" />
      ) : (
        <XCircle className="size-4 text-muted-foreground" />
      )}
      <span className={met ? "text-green-600 dark:text-green-500" : "text-muted-foreground"}>{text}</span>
    </div>
  );
}
